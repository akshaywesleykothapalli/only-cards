import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, MatchRules, Player, CardColor, AiDifficulty, AiPersonality } from 'cards-shared';

interface ChatMessage {
  id: string;
  playerId: string;
  sender: string;
  message: string;
  timestamp: number;
}

interface ReactionBubble {
  id: string;
  playerId: string;
  emoji: string;
}

export interface Toast {
  id: string;
  message: string;
  variant: 'error' | 'success' | 'info';
}

export interface MatchResult {
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  placement: number;
  playerCount: number;
  roundPoints: number;
  score: number;
  scoreChange: number;
  rank: string;
  unoPenalty: number;
  profile: any;
}

interface GameStore {
  socket: Socket | null;
  token: string | null;
  user: { id: string; username: string; provider?: 'GUEST' | 'PASSWORD'; profile: any } | null;
  roomState: { roomId: string; hostId: string; players: Player[]; rules: MatchRules; isStarted: boolean } | null;
  gameState: GameState | null;
  timerLeft: number;
  timerServerTimestamp?: number;
  aiThinkingPlayerId: string | null;
  aiTelemetry: { playerId: string; decision: any } | null;
  reactions: ReactionBubble[];
  chatMessages: ChatMessage[];
  isQueued: boolean;
  leaderboard: any[];
  friends: any[];
  pendingRequests: any[];
  serverUrl: string;
  toasts: Toast[];
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'offline';
  matchResult: MatchResult | null;

  generateRequestId: () => string;
  pushToast: (message: string, variant?: Toast['variant']) => void;
  dismissToast: (id: string) => void;
  initSocket: () => void;
  loginGuest: (username?: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  createRoom: (rules: MatchRules, isOffline?: boolean, aiDifficulty?: AiDifficulty) => void;
  joinRoom: (roomId: string) => void;
  addAi: (difficulty: AiDifficulty, personality: AiPersonality) => void;
  updateAiDifficulty: (aiId: string, difficulty: AiDifficulty) => void;
  removeAi: (aiId: string) => void;
  toggleReady: () => void;
  startGame: () => void;
  playCard: (cardId: string, chosenColor?: CardColor) => void;
  drawCard: () => void;
  passTurn: () => void;
  callLastCard: () => void;
  challengeLastCard: (targetPlayerId: string) => void;
  sendChat: (message: string) => void;
  sendReaction: (emoji: string) => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  leaveRoom: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  sendFriendRequest: (friendUsername: string) => Promise<void>;
  fetchFriends: () => Promise<void>;
  acceptFriendRequest: (friendId: string) => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  resetRoom: () => void;
  logout: () => void;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  token: null,
  user: null,
  roomState: null,
  gameState: null,
  timerLeft: 0,
  timerServerTimestamp: undefined,
  aiThinkingPlayerId: null,
  aiTelemetry: null,
  reactions: [],
  chatMessages: [],
  isQueued: false,
  leaderboard: [],
  friends: [],
  pendingRequests: [],
  serverUrl: SERVER_URL,
  toasts: [],
  connectionStatus: 'connecting',
  matchResult: null,

  // Helper to generate unique request IDs
  generateRequestId: () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,

  pushToast: (message: string, variant: Toast['variant'] = 'error') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },

  dismissToast: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  initSocket: () => {
    if (get().socket) return;

    const socket = io(SERVER_URL, { reconnection: true, reconnectionAttempts: 8, timeout: 8000 });

    socket.on('connect', () => {
      console.log('Connected to game server');
      set({ connectionStatus: 'connected' });
      const token = get().token;
      const user = get().user;
      if (token && user) {
        socket.emit('auth', { token });
      }
    });

    socket.on('connect_error', () => set({ connectionStatus: 'offline' }));
    socket.io.on('reconnect_attempt', () => set({ connectionStatus: 'reconnecting' }));
    socket.on('disconnect', (reason) => {
      set({ connectionStatus: reason === 'io server disconnect' ? 'offline' : 'reconnecting' });
    });

    socket.on('auth_error', (err: { message?: string }) => {
      set({ connectionStatus: 'offline' });
      get().pushToast(err?.message || 'Your session could not be restored. Please sign in again.', 'error');
    });

    socket.on('roomCreated', (data) => {
      set({ roomState: { ...data, isStarted: false }, gameState: null, chatMessages: [], matchResult: null });
    });

    socket.on('roomStateUpdate', (data) => {
      set({ roomState: data });
    });

    socket.on('spectator_joined', (data) => {
      set({ roomState: { roomId: data.roomId, hostId: '', players: [], rules: data.state.rules, isStarted: true }, gameState: data.state });
    });

    socket.on('gameStateUpdate', (state: GameState) => {
      const current = get().gameState;
      const viewerId = get().user?.id;
      const nextState: GameState = viewerId && current
        ? {
            ...state,
            players: state.players.map(player => {
              const existingPlayer = current.players.find(p => p.id === player.id);
              const isViewerMaskedHand =
                player.id === viewerId &&
                player.cards.length > 0 &&
                player.cards.every(card => card.id.startsWith(`hidden-${player.id}-`));

              return isViewerMaskedHand && existingPlayer
                ? { ...player, cards: existingPlayer.cards }
                : player;
            }),
          }
        : state;

      set({ gameState: nextState, aiThinkingPlayerId: null });
    });

    // Server broadcasts one fully-masked gameStateUpdate to the whole room,
    // then sends each real player their own hand separately as a small
    // delta. Merge it into the current gameState rather than waiting for
    // the next full broadcast.
    socket.on('hand_update', (data: { playerId: string; cards: GameState['players'][number]['cards']; stateVersion: number }) => {
      const current = get().gameState;
      if (!current || current.stateVersion !== data.stateVersion) return;
      set({
        gameState: {
          ...current,
          players: current.players.map(p => p.id === data.playerId ? { ...p, cards: data.cards } : p)
        }
      });
    });

    socket.on('timerTick', (data: { timeLeft: number; serverTimestamp: number }) => {
      set({ timerLeft: data.timeLeft, timerServerTimestamp: data.serverTimestamp });
    });

    socket.on('aiThinking', (data: { playerId: string }) => {
      set({ aiThinkingPlayerId: data.playerId });
    });

    socket.on('aiTelemetry', (telemetry: { playerId: string; decision: any }) => {
      set({ aiTelemetry: telemetry });
    });

    socket.on('reaction_relay', (data: { playerId: string; emoji: string }) => {
      const bubble: ReactionBubble = {
        id: `react_${Date.now()}_${Math.random()}`,
        playerId: data.playerId,
        emoji: data.emoji
      };
      set((state) => ({ reactions: [...state.reactions.slice(-10), bubble] }));
    });

    socket.on('chatMessageRelay', (msg: ChatMessage) => {
      set((state) => ({ chatMessages: [...state.chatMessages, msg] }));
    });

    socket.on('queueJoined', () => {
      set({ isQueued: true });
    });

    socket.on('queueLeft', () => {
      set({ isQueued: false });
    });

    socket.on('room_announcement', (announcement: string) => {
      const systemMsg: ChatMessage = {
        id: `announcement_${Date.now()}`,
        playerId: 'SYSTEM',
        sender: 'SYSTEM',
        message: announcement,
        timestamp: Date.now()
      };
      set((state) => ({ chatMessages: [...state.chatMessages, systemMsg] }));
      get().pushToast(announcement, 'info');
    });

    socket.on('gameOver', (data: { winnerId: string | null; results?: Record<string, MatchResult> }) => {
      const result = data.results?.[get().user?.id ?? ''] ?? null;
      set((state) => ({
        timerLeft: 0,
        aiThinkingPlayerId: null,
        matchResult: result,
        user: result && state.user ? { ...state.user, profile: result.profile } : state.user
      }));
    });

    socket.on('join_error', (err: { message: string }) => {
      get().pushToast(err.message, 'error');
    });

    socket.on('action_error', (err: string) => {
      console.warn(`Action error: ${err}`);
      get().pushToast(err, 'error');
    });

    set({ socket });
  },

  loginGuest: async (username?: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username?.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Unable to start a guest session');
      }
      set({ token: data.token, user: data.user });
      const sock = get().socket;
      if (sock) {
        sock.emit('auth', { token: data.token });
      }
    } catch (e) {
      console.error('Failed to login guest session', e);
      get().pushToast(e instanceof Error ? e.message : 'Unable to reach the game server', 'error');
      throw e;
    }
  },

  signUp: async (username: string, password: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        set({ token: data.token, user: data.user });
        const sock = get().socket;
        if (sock) {
          sock.emit('auth', { token: data.token });
        }
      } else {
        throw new Error(data.message);
      }
    } catch (e) {
      console.error('Failed to sign up', e);
      throw e;
    }
  },

  signIn: async (username: string, password: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        set({ token: data.token, user: data.user });
        const sock = get().socket;
        if (sock) {
          sock.emit('auth', { token: data.token });
        }
      } else {
        throw new Error(data.message);
      }
    } catch (e) {
      console.error('Failed to sign in', e);
      throw e;
    }
  },

  createRoom: (rules: MatchRules, isOffline = false, aiDifficulty?: AiDifficulty) => {
    const sock = get().socket;
    if (sock) sock.emit('createRoom', { rules, isOffline, aiDifficulty });
  },

  joinRoom: (roomId: string) => {
    const sock = get().socket;
    if (sock) sock.emit('joinRoom', { roomId });
  },

  addAi: (difficulty: AiDifficulty, personality: AiPersonality) => {
    const sock = get().socket;
    if (sock) sock.emit('addAi', { difficulty, personality });
  },

  updateAiDifficulty: (aiId: string, difficulty: AiDifficulty) => {
    const sock = get().socket;
    if (sock) sock.emit('updateAiDifficulty', { aiId, difficulty });
  },

  removeAi: (aiId: string) => {
    const sock = get().socket;
    if (sock) sock.emit('removeAi', { aiId });
  },

  toggleReady: () => {
    const sock = get().socket;
    if (sock) sock.emit('toggleReady');
  },

  startGame: () => {
    const sock = get().socket;
    if (sock) sock.emit('startGame');
  },

  playCard: (cardId: string, chosenColor?: CardColor) => {
    const sock = get().socket;
    const requestId = get().generateRequestId();
    if (sock) sock.emit('playCard', { cardId, chosenColor, requestId });
  },

  drawCard: () => {
    const sock = get().socket;
    const requestId = get().generateRequestId();
    if (sock) sock.emit('drawCard', { requestId });
  },

  passTurn: () => {
    const sock = get().socket;
    const requestId = get().generateRequestId();
    if (sock) sock.emit('passTurn', { requestId });
  },

  callLastCard: () => {
    const sock = get().socket;
    const requestId = get().generateRequestId();
    if (sock) sock.emit('callLastCard', { requestId });
  },

  challengeLastCard: (targetPlayerId: string) => {
    const sock = get().socket;
    const requestId = get().generateRequestId();
    if (sock) sock.emit('challengeLastCard', { targetPlayerId, requestId });
  },

  sendChat: (message: string) => {
    const sock = get().socket;
    if (sock && message.trim()) sock.emit('chatMessage', { message });
  },

  sendReaction: (emoji: string) => {
    const sock = get().socket;
    if (sock) sock.emit('reaction', { emoji });
  },

  joinQueue: () => {
    const sock = get().socket;
    if (sock) sock.emit('joinQueue');
  },

  leaveQueue: () => {
    const sock = get().socket;
    if (sock) sock.emit('leaveQueue');
  },

  leaveRoom: () => new Promise((resolve) => {
    const clearLocalGame = () => set({
      roomState: null,
      gameState: null,
      chatMessages: [],
      isQueued: false,
      aiTelemetry: null,
      aiThinkingPlayerId: null,
      timerLeft: 0
    });
    const sock = get().socket;

    // A local reset is intentional here: it lets a player return to the lobby
    // even if their network has already dropped. The server also removes the
    // player immediately whenever it receives this event.
    if (!sock?.connected) {
      clearLocalGame();
      resolve();
      return;
    }

    sock.timeout(5000).emit('leaveRoom', (err: Error | null) => {
      if (err) get().pushToast('Left locally. The server will finish cleaning up when the connection returns.', 'info');
      clearLocalGame();
      resolve();
    });
  }),

  fetchLeaderboard: async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/leaderboard`);
      const data = await res.json();
      if (data.success) {
        set({ leaderboard: data.leaderboard });
      }
    } catch (e) {
      console.error('Failed to load leaderboard data', e);
    }
  },

  resetRoom: () => {
    set({ roomState: null, gameState: null, chatMessages: [], isQueued: false, aiTelemetry: null, aiThinkingPlayerId: null, timerLeft: 0 });
  },

  logout: () => {
    set({ user: null, token: null, roomState: null, gameState: null, chatMessages: [], isQueued: false, aiTelemetry: null, toasts: [] });
  },

  sendFriendRequest: async (friendUsername: string) => {
    try {
      const token = get().token;
      if (!token) throw new Error('User not logged in');
      
      const res = await fetch(`${SERVER_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendUsername })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
    } catch (e) {
      console.error('Failed to send friend request', e);
      throw e;
    }
  },

  fetchFriends: async () => {
    try {
      const token = get().token;
      if (!token) return;
      
      const res = await fetch(`${SERVER_URL}/api/friends`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        set({ friends: data.friends });
      }
    } catch (e) {
      console.error('Failed to fetch friends', e);
    }
  },

  acceptFriendRequest: async (friendId: string) => {
    try {
      const token = get().token;
      if (!token) throw new Error('User not logged in');
      
      const res = await fetch(`${SERVER_URL}/api/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      // Refresh friends list
      get().fetchFriends();
      get().fetchPendingRequests();
    } catch (e) {
      console.error('Failed to accept friend request', e);
      throw e;
    }
  },

  fetchPendingRequests: async () => {
    try {
      const token = get().token;
      if (!token) return;
      
      const res = await fetch(`${SERVER_URL}/api/friends/pending`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        set({ pendingRequests: data.requests });
      }
    } catch (e) {
      console.error('Failed to fetch pending requests', e);
    }
  }
}));
