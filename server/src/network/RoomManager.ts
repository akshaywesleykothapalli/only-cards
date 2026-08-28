import { Server, Socket } from 'socket.io';
import { randomBytes } from 'crypto';
import { GameState, Card, Player, MatchRules, AiDifficulty, AiPersonality } from 'cards-shared';
import { GameEngine } from '../game/GameEngine';
import { AiTurnController } from '../game/AiTurnController';
import { AuthService } from '../services/AuthService';
import { prisma } from '../services/db';
import { QueuedPlayer } from './MatchmakingQueue';

const validAiDifficulties = new Set<AiDifficulty>(['Easy', 'Medium', 'Hard', 'Expert']);
const validAiPersonalities = new Set<AiPersonality>(['Strategist', 'Aggressive', 'Defensive', 'Chaotic', 'Troll']);

// Cryptographically secure alphanumeric code, used for AI ids so they can't be
// brute-forced or predicted the way Math.random() output can.
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function secureCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function secureNumericCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += String(bytes[i] % 10);
  }
  return out;
}

export interface GameRoom {
  roomId: string;
  hostId: string;
  players: Player[];
  spectators: string[];
  rules: MatchRules;
  engine?: GameEngine;
  turnTimer?: NodeJS.Timeout;
  aiIntervals: Record<string, NodeJS.Timeout>; // Tracks AI timeout turns
  isStarted: boolean;
}

// Callbacks into cross-cutting concerns SocketManager still owns (session
// maps, masked-state broadcasting) that RoomManager needs but shouldn't own.
interface RoomManagerDeps {
  socketToRoom: Map<string, string>;
  socketToUser: Map<string, string>;
  emitGameState: (roomId: string, state: GameState) => void;
  maskedCards: (player: Player) => Card[];
  leaveCurrentRoom: (socket: Socket) => void;
  logAuditEvent: (event: string, details: any) => void;
}

// Owns room lifecycle: creation, joining (including spectating a started
// room), ready state, starting a match, the turn timer, AI/host handoff on
// disconnect, and cleanup. Extracted from SocketManager, which retains only
// session-tracking maps and game-action dispatch (which looks rooms up via
// getRoom()).
export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  constructor(
    private io: Server,
    private aiTurnController: AiTurnController,
    private deps: RoomManagerDeps
  ) {}

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  findRoomIdForPlayer(userId: string): string | undefined {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.some(p => p.id === userId)) return roomId;
    }
    return undefined;
  }

  hasValidRules(rules: MatchRules): boolean {
    return Boolean(rules)
      && typeof rules.stacking === 'boolean'
      && typeof rules.jumpIn === 'boolean'
      && typeof rules.drawUntilPlayable === 'boolean'
      && typeof rules.challengeWild4 === 'boolean'
      && typeof rules.timerMode === 'boolean'
      && typeof rules.flipMode === 'boolean'
      && Number.isInteger(rules.startingHandSize) && rules.startingHandSize >= 1 && rules.startingHandSize <= 20
      && Number.isInteger(rules.timerSeconds) && rules.timerSeconds >= 5 && rules.timerSeconds <= 120
      && Number.isInteger(rules.scoreLimit) && rules.scoreLimit >= 50 && rules.scoreLimit <= 5000
      && Number.isInteger(rules.roundLimit) && rules.roundLimit >= 1 && rules.roundLimit <= 50
      && (rules.maxPlayers === undefined || (Number.isInteger(rules.maxPlayers) && rules.maxPlayers >= 2 && rules.maxPlayers <= 8))
      && (rules.practiceMode === undefined || typeof rules.practiceMode === 'boolean');
  }

  private requireHost(socket: Socket, room: GameRoom): boolean {
    const userId = this.deps.socketToUser.get(socket.id);
    if (userId !== room.hostId) {
      socket.emit('action_error', 'Only the room host can change opponents');
      return false;
    }
    return true;
  }

  private createUniqueRoomCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      const roomId = secureNumericCode(6);
      if (!this.rooms.has(roomId)) return roomId;
    }
    throw new Error('Unable to allocate a unique room code');
  }

  async createRoom(socket: Socket, userId: string, data: { rules: MatchRules; isOffline?: boolean; aiDifficulty?: AiDifficulty }) {
    if (!this.hasValidRules(data?.rules)) {
      socket.emit('action_error', 'Invalid match settings');
      return;
    }

    if (data.rules.maxPlayers && data.rules.maxPlayers > 8) {
      socket.emit('action_error', 'Rooms can have a maximum of 8 players');
      return;
    }

    this.deps.leaveCurrentRoom(socket);

    let profile;
    try {
      profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
    } catch (err) {
      console.error('createRoom: failed to load profile', err);
      socket.emit('action_error', 'Unable to create room right now, please try again');
      return;
    }
    const username = profile?.user.username || 'Guest';

    let roomId: string;
    try {
      roomId = this.createUniqueRoomCode();
    } catch (err) {
      console.error('createRoom: failed to allocate room code', err);
      socket.emit('action_error', 'Unable to create room right now, please try again');
      return;
    }

    const players: Player[] = [
      {
        id: userId,
        name: username,
        avatar: profile?.avatar || 'avatar_1',
        isAi: false,
        isReady: true,
        cards: [],
        isSpectator: false,
        isDisconnected: false,
        score: 0
      }
    ];

    // If offline practice, pre-populate with enough AI players to match the
    // selected table size. `maxPlayers` is total seats, including the user.
    if (data.isOffline) {
      const personalities: AiPersonality[] = ['Strategist', 'Aggressive', 'Defensive', 'Chaotic', 'Troll', 'Strategist', 'Aggressive'];
      const defaultDifficulties: AiDifficulty[] = data.aiDifficulty && validAiDifficulties.has(data.aiDifficulty)
        ? Array(7).fill(data.aiDifficulty)
        : ['Easy', 'Medium', 'Hard', 'Medium', 'Hard', 'Easy', 'Expert'];
      const requestedSeats = Math.min(8, data.rules.maxPlayers ?? 4);
      const botCount = Math.max(1, Math.min(7, requestedSeats - 1));
      for (let i = 0; i < botCount; i++) {
        players.push({
          id: `ai_${i}_${secureCode(6)}`,
          name: `Bot ${i + 1}`,
          avatar: `avatar_ai_${i + 1}`,
          isAi: true,
          aiDifficulty: defaultDifficulties[i],
          aiPersonality: personalities[i],
          isReady: true,
          cards: [],
          isSpectator: false,
          isDisconnected: false,
          score: 0
        });
      }
    }

    const room: GameRoom = {
      roomId,
      hostId: userId,
      players,
      spectators: [],
      rules: data.rules,
      aiIntervals: {},
      isStarted: false
    };

    this.rooms.set(roomId, room);
    this.deps.socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('roomCreated', { roomId, hostId: room.hostId, players, rules: room.rules });
  }

  addAi(socket: Socket, roomId: string, data: { difficulty: AiDifficulty; personality: AiPersonality }) {
    const room = this.rooms.get(roomId);
    if (!room || room.isStarted || !this.requireHost(socket, room)) return;

    if (!validAiDifficulties.has(data?.difficulty) || !validAiPersonalities.has(data?.personality)) {
      socket.emit('action_error', 'Invalid AI settings');
      return;
    }

    if (room.players.length >= 8) {
      socket.emit('error_message', 'Room is full (max 8 players)');
      return;
    }

    const aiId = `ai_${secureCode(6)}`;
    const aiPlayer: Player = {
      id: aiId,
      name: `AI ${data.personality}`,
      avatar: `avatar_ai_${Math.floor(Math.random() * 3) + 1}`,
      isAi: true,
      aiDifficulty: data.difficulty,
      aiPersonality: data.personality,
      isReady: true,
      cards: [],
      isSpectator: false,
      isDisconnected: false,
      score: 0
    };

    room.players.push(aiPlayer);
    this.syncRoomState(roomId);
  }

  updateAiDifficulty(socket: Socket, roomId: string, data: { aiId: string; difficulty: AiDifficulty }) {
    const room = this.rooms.get(roomId);
    if (!room || room.isStarted || !this.requireHost(socket, room)) return;

    if (!validAiDifficulties.has(data?.difficulty)) {
      socket.emit('action_error', 'Invalid AI difficulty');
      return;
    }

    const ai = room.players.find(p => p.id === data?.aiId && p.isAi);
    if (!ai) {
      socket.emit('action_error', 'That bot could not be updated');
      return;
    }

    ai.aiDifficulty = data.difficulty;
    this.syncRoomState(roomId);
  }

  removeAi(socket: Socket, roomId: string, data: { aiId: string }) {
    const room = this.rooms.get(roomId);
    if (!room || room.isStarted || !this.requireHost(socket, room)) return;

    const ai = room.players.find(p => p.id === data?.aiId && p.isAi);
    if (!ai) {
      socket.emit('action_error', 'That opponent cannot be removed');
      return;
    }
    room.players = room.players.filter(p => p.id !== ai.id);
    this.syncRoomState(roomId);
  }

  async joinRoom(socket: Socket, userId: string, data: { roomId: string }) {
    const requestedRoomId = typeof data?.roomId === 'string' ? data.roomId.replace(/\D/g, '') : '';
    if (!/^\d{6}$/.test(requestedRoomId)) {
      socket.emit('join_error', { message: 'Enter a valid 6-digit room code' });
      return;
    }

    const room = this.rooms.get(requestedRoomId);
    if (!room) {
      socket.emit('join_error', { message: 'Room not found' });
      return;
    }

    if (room.isStarted) {
      // Join as spectator
      room.spectators.push(socket.id);
      this.deps.leaveCurrentRoom(socket);
      this.deps.socketToRoom.set(socket.id, requestedRoomId);
      socket.join(requestedRoomId);
      const state = room.engine?.getState();
      socket.emit('spectator_joined', { roomId: room.roomId, state: state ? { ...state, players: state.players.map(p => ({ ...p, cards: this.deps.maskedCards(p) })) } : undefined });
      return;
    }

    const maxPlayers = room.rules.maxPlayers ?? 8;
    if (room.players.length >= maxPlayers) {
      socket.emit('join_error', { message: 'Room is full' });
      return;
    }

    let profile;
    try {
      profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
    } catch (err) {
      console.error('joinRoom: failed to load profile', err);
      socket.emit('join_error', { message: 'Unable to join room right now, please try again' });
      return;
    }
    const player: Player = {
      id: userId,
      name: profile?.user.username || 'Guest',
      avatar: profile?.avatar || 'avatar_1',
      isAi: false,
      isReady: false,
      cards: [],
      isSpectator: false,
      isDisconnected: false,
      score: 0
    };

    if (room.players.some(p => p.id === userId)) {
      socket.emit('join_error', { message: 'You are already in this room' });
      return;
    }
    this.deps.leaveCurrentRoom(socket);
    room.players.push(player);
    this.deps.socketToRoom.set(socket.id, requestedRoomId);
    socket.join(requestedRoomId);

    this.syncRoomState(requestedRoomId);
    this.io.to(requestedRoomId).emit('room_announcement', `${player.name} joined the waiting lobby.`);
  }

  toggleReady(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === userId);
    if (player) {
      player.isReady = !player.isReady;
      this.syncRoomState(roomId);
    }
  }

  startGame(socket: Socket, roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== userId || room.isStarted) return;
    if (room.players.length < 2) {
      socket.emit('action_error', 'Add an opponent before starting the match');
      return;
    }
    const maxPlayers = room.rules.maxPlayers;
    if (maxPlayers && room.players.length < maxPlayers) {
      socket.emit('action_error', `Wait for ${maxPlayers} players to join`);
      return;
    }
    if (room.players.some(player => !player.isAi && !player.isReady)) {
      socket.emit('action_error', 'Wait for every player to be ready');
      return;
    }

    if (!this.startRoom(roomId)) {
      socket.emit('action_error', 'Unable to start this match');
    }
  }

  // Builds and starts a ranked room once the matchmaking queue pairs two
  // players. Called by MatchmakingQueue's onPairFound callback.
  createMatchmakingRoom(p1: QueuedPlayer, p2: QueuedPlayer) {
    const roomId = this.createUniqueRoomCode();
    const rules: MatchRules = {
      stacking: true,
      jumpIn: true,
      drawUntilPlayable: false,
      challengeWild4: true,
      timerMode: true,
      timerSeconds: 15,
      startingHandSize: 7,
      scoreLimit: 500,
      roundLimit: 5,
      flipMode: false
    };

    const room: GameRoom = {
      roomId,
      hostId: p1.userId,
      players: [
        {
          id: p1.userId,
          name: p1.username,
          avatar: 'avatar_1',
          isAi: false,
          isReady: true,
          cards: [],
          isSpectator: false,
          isDisconnected: false,
          score: 0
        },
        {
          id: p2.userId,
          name: p2.username,
          avatar: 'avatar_2',
          isAi: false,
          isReady: true,
          cards: [],
          isSpectator: false,
          isDisconnected: false,
          score: 0
        }
      ],
      spectators: [],
      rules,
      aiIntervals: {},
      isStarted: false
    };

    this.rooms.set(roomId, room);

    const socket1 = this.io.sockets.sockets.get(p1.socketId);
    const socket2 = this.io.sockets.sockets.get(p2.socketId);

    if (socket1) {
      socket1.join(roomId);
      this.deps.socketToRoom.set(p1.socketId, roomId);
    }
    if (socket2) {
      socket2.join(roomId);
      this.deps.socketToRoom.set(p2.socketId, roomId);
    }

    this.io.to(roomId).emit('roomCreated', { roomId, hostId: room.hostId, players: room.players, rules: room.rules });
    // Ranked matches are already matched and ready, so begin immediately
    // instead of making players wait in a lobby without a visible host.
    this.startRoom(roomId);
    console.log(`Matchmaking room created: ${roomId}`);
  }

  // Removes a player who intentionally leaves or is moved into another room.
  // A live match keeps its seat as an AI so the remaining players are not
  // blocked; a waiting-room departure simply removes the player.
  removePlayer(roomId: string, userId: string, socketId: string, reason: 'left' | 'disconnected') {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.spectators = room.spectators.filter(id => id !== socketId);
    const playerIndex = room.players.findIndex(player => player.id === userId);
    if (playerIndex === -1) return;

    if (!room.isStarted) {
      room.players.splice(playerIndex, 1);
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        return;
      }
      if (room.hostId === userId) {
        room.hostId = room.players.find(player => !player.isAi)?.id || room.players[0].id;
      }
      this.syncRoomState(roomId);
      return;
    }

    this.replacePlayerWithAi(room, userId, reason === 'left' ? 'left the game' : 'abandoned the game');
  }

  private replacePlayerWithAi(room: GameRoom, userId: string, action: string) {
    const playerIndex = room.players.findIndex(player => player.id === userId);
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    player.isAi = true;
    player.aiDifficulty = 'Medium';
    player.aiPersonality = 'Defensive';
    player.name = `${player.name} (AI)`;
    player.isDisconnected = false;

    // GameEngine owns the live hands, so update its player record too. The
    // room-player list is only lobby metadata and does not drive AI turns.
    const gamePlayer = room.engine?.getState().players.find(candidate => candidate.id === userId);
    if (gamePlayer) {
      gamePlayer.isAi = true;
      gamePlayer.aiDifficulty = 'Medium';
      gamePlayer.aiPersonality = 'Defensive';
      gamePlayer.name = player.name;
      gamePlayer.isDisconnected = false;
    }

    this.io.to(room.roomId).emit('room_announcement', `${player.name} ${action}. An AI has taken their place.`);
    this.syncRoomState(room.roomId);
    if (room.engine) {
      this.deps.emitGameState(room.roomId, room.engine.getState());
      if (room.engine.getState().currentPlayerIndex === playerIndex) {
        this.aiTurnController.trigger(room.roomId, room);
      }
    }
  }

  // Handle player abandoning connection completely (replaces player with AI or closes room)
  handlePermanentDisconnect(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === userId);
    if (playerIndex === -1) return;

    // If game has not started, just boot them
    if (!room.isStarted) {
      room.players = room.players.filter(p => p.id !== userId);
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        return;
      }

      // Host Migration
      if (room.hostId === userId) {
        const nextHuman = room.players.find(p => !p.isAi);
        if (nextHuman) room.hostId = nextHuman.id;
      }

      this.syncRoomState(roomId);
      return;
    }

    this.replacePlayerWithAi(room, userId, 'abandoned the game');
  }

  // Marks a connected player as disconnected (grace-period start) and
  // returns the room/player pair so the caller can schedule the permanent-
  // disconnect timer (disconnectTimers stays owned by SocketManager).
  markPlayerDisconnected(roomId: string, userId: string): { room: GameRoom; player: Player } | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const player = room.players.find(p => p.id === userId);
    if (!player) return undefined;
    player.isDisconnected = true;
    this.syncRoomState(roomId);
    this.deps.logAuditEvent('DISCONNECT', { userId, roomId });
    return { room, player };
  }

  private startRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.isStarted || room.players.length < 2) return false;

    room.isStarted = true;
    room.engine = new GameEngine(roomId, room.players, room.rules);
    room.engine.registerCallbacks(
      (state) => {
        this.deps.emitGameState(roomId, state);
        this.aiTurnController.trigger(roomId, room);
      },
      async (winnerId, scores, placements, missedLastCardCalls) => {
        // This callback is invoked without being awaited by GameEngine, so an
        // uncaught rejection here becomes a process-level unhandled rejection
        // that would crash the server and every other active room's game.
        // Isolate each player's stat update so one DB failure can't affect
        // the others or propagate.
        const results: Record<string, unknown> = {};
        for (const player of room.players) {
          if (!player.isAi) {
            try {
              const placement = placements[player.id] ?? room.players.length;
              const update = await AuthService.updateStats(
                player.id,
                placement,
                room.players.length,
                scores[player.id] || 0,
                missedLastCardCalls[player.id] || 0
              );
              if (update) {
                results[player.id] = {
                  outcome: !winnerId ? 'DRAW' : placement === 1 ? 'WIN' : 'LOSS',
                  placement,
                  playerCount: room.players.length,
                  roundPoints: scores[player.id] || 0,
                  score: update.profile.mmr,
                  scoreChange: update.scoreChange,
                  rank: update.profile.rankedTier,
                  unoPenalty: update.unoPenalty,
                  profile: update.profile
                };
              }
            } catch (err) {
              console.error(`Failed to update stats for player ${player.id}`, err);
            }
          }
        }
        this.io.to(roomId).emit('gameOver', { winnerId, scores, results });
        this.cleanupRoom(roomId);
      }
    );
    room.engine.startMatch();
    this.resetTurnTimer(roomId);
    return true;
  }

  // Resets turn timer count down
  resetTurnTimer(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.rules.timerMode) return;

    if (room.turnTimer) clearInterval(room.turnTimer);

    let timeLeft = room.rules.timerSeconds;
    this.io.to(roomId).emit('timerTick', { timeLeft, serverTimestamp: Date.now() });

    room.turnTimer = setInterval(() => {
      timeLeft--;
      this.io.to(roomId).emit('timerTick', { timeLeft, serverTimestamp: Date.now() });

      if (timeLeft <= 0) {
        clearInterval(room.turnTimer);
        if (room.engine) {
          room.engine.handleTimeout();
          this.resetTurnTimer(roomId);
        }
      }
    }, 1000);
  }

  private cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    // Clear all AI timers
    for (const timer of Object.values(room.aiIntervals)) {
      clearTimeout(timer);
    }
    room.aiIntervals = {};
    // Clear turn timer
    if (room.turnTimer) {
      clearInterval(room.turnTimer);
      room.turnTimer = undefined;
    }

    // Keep the final board briefly so clients receive the result, then release
    // the in-memory room and any socket mappings.
    setTimeout(() => {
      const finishedRoom = this.rooms.get(roomId);
      if (!finishedRoom || finishedRoom.engine?.getState().status !== 'GAME_OVER') return;
      for (const socketId of this.io.sockets.adapter.rooms.get(roomId) ?? []) {
        this.deps.socketToRoom.delete(socketId);
        this.io.sockets.sockets.get(socketId)?.leave(roomId);
      }
      this.rooms.delete(roomId);
    }, 120000);
  }

  syncRoomState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    this.io.to(roomId).emit('roomStateUpdate', {
      roomId: room.roomId,
      hostId: room.hostId,
      players: room.players.map(p => ({ ...p, cards: [] })), // do not leak card ids in waiting lobby
      rules: room.rules,
      isStarted: room.isStarted
    });
  }
}
