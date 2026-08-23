import { Server, Socket } from 'socket.io';
import { GameState, Card, Player, MatchRules, CardColor, AiDifficulty, AiPersonality } from 'cards-shared';
import { AuthService } from '../services/AuthService';
import { prisma } from '../services/db';
import { RateLimiter } from './RateLimiter';
import { MatchmakingQueue } from './MatchmakingQueue';
import { AiTurnController } from '../game/AiTurnController';
import { RoomManager } from './RoomManager';

export class SocketManager {
  private io: Server;
  private socketToRoom: Map<string, string> = new Map(); // SocketID -> RoomID
  private socketToUser: Map<string, string> = new Map(); // SocketID -> UserID
  private userToSocket: Map<string, Socket> = new Map(); // UserID -> Socket (prevent duplicate connections)
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map(); // UserID -> Timer
  private rateLimiter: RateLimiter = new RateLimiter();
  private aiTurnController: AiTurnController;
  private roomManager: RoomManager;
  private matchmakingQueue: MatchmakingQueue;

  constructor(io: Server) {
    this.io = io;
    this.aiTurnController = new AiTurnController(this.io, (roomId) => this.roomManager.resetTurnTimer(roomId));
    this.roomManager = new RoomManager(this.io, this.aiTurnController, {
      socketToRoom: this.socketToRoom,
      socketToUser: this.socketToUser,
      emitGameState: (roomId, state) => this.emitGameState(roomId, state),
      maskedCards: (player) => this.maskedCards(player),
      leaveCurrentRoom: (socket) => this.leaveCurrentRoom(socket),
      logAuditEvent: (event, details) => this.logAuditEvent(event, details)
    });
    this.matchmakingQueue = new MatchmakingQueue((p1, p2) => this.roomManager.createMatchmakingRoom(p1, p2));
  }

  private requireAuthenticatedSocket(socket: Socket): string | null {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) {
      socket.emit('action_error', 'Please reconnect and sign in before taking an action');
      return null;
    }
    return userId;
  }

  // Helper: Sanitize chat input (prevent XSS)
  private sanitizeChatInput(message: string): string {
    if (typeof message !== 'string') return '';
    return message
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 200) // Limit length
      .trim();
  }

  /**
   * A game state contains every hand on the server. Never broadcast that raw
   * object: each connected player should only receive their own cards.
   *
   * Rather than computing and emitting a full per-viewer payload for every
   * connected socket (spectators included), broadcast one fully-masked state
   * to the whole room, then send each actual player a small `hand_update`
   * with just their own cards. This is one broadcast plus N tiny deltas
   * instead of N full-payload emits.
   */
  private emitGameState(roomId: string, state: GameState) {
    const sockets = this.io.sockets.adapter.rooms.get(roomId);
    if (!sockets || sockets.size === 0) return;

    const publicState: GameState = {
      ...state,
      players: state.players.map(player => ({ ...player, cards: this.maskedCards(player) })),
      discardPile: [...state.discardPile],
      logs: [...state.logs]
    };
    this.io.to(roomId).emit('gameStateUpdate', publicState);

    for (const player of state.players) {
      const viewerSocket = this.userToSocket.get(player.id);
      if (viewerSocket && sockets.has(viewerSocket.id)) {
        viewerSocket.emit('hand_update', { playerId: player.id, cards: player.cards, stateVersion: state.stateVersion });
      }
    }
  }

  // Sends a fresh masked gameStateUpdate + this player's own hand_update to
  // one specific socket. Used when a player reconnects mid-game: the normal
  // reconnect path only re-emits the lobby-shape roomStateUpdate, which
  // omits cards entirely, leaving a returning player stuck without a hand
  // or board until the next natural state change.
  private emitGameStateToSocket(socket: Socket, userId: string, state: GameState) {
    const publicState: GameState = {
      ...state,
      players: state.players.map(player => ({ ...player, cards: this.maskedCards(player) })),
      discardPile: [...state.discardPile],
      logs: [...state.logs]
    };
    socket.emit('gameStateUpdate', publicState);

    const me = state.players.find(p => p.id === userId);
    if (me) {
      socket.emit('hand_update', { playerId: me.id, cards: me.cards, stateVersion: state.stateVersion });
    }
  }

  private maskedCards(player: Player): Card[] {
    return player.cards.map((_, index) => ({
      id: `hidden-${player.id}-${index}`,
      lightFace: { color: 'WILD', value: 'WILD' },
      darkFace: { color: 'WILD', value: 'WILD' }
    }));
  }

  private leaveCurrentRoom(socket: Socket) {
    const previousRoomId = this.socketToRoom.get(socket.id);
    const userId = this.socketToUser.get(socket.id);
    if (!previousRoomId) return;
    if (userId) {
      this.roomManager.removePlayer(previousRoomId, userId, socket.id, 'left');
    }
    socket.leave(previousRoomId);
    this.socketToRoom.delete(socket.id);
  }

  // Helper: Log audit event
  private logAuditEvent(event: string, details: any) {
    console.log(`[AUDIT] ${Date.now()} - ${event}:`, JSON.stringify(details));
    // In production, this would go to a persistent log store
  }

  public handleConnection(socket: Socket) {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Heartbeat
    socket.on('ping', (cb) => {
      if (typeof cb === 'function') cb();
    });

    // Auth & Register Session
    socket.on('auth', async (data: { token?: string }) => {
      const decoded = typeof data?.token === 'string' ? AuthService.verifyToken(data.token) : null;
      const userId = decoded?.userId;

      if (!userId) {
        socket.emit('auth_error', { message: 'Invalid credentials' });
        this.logAuditEvent('AUTH_FAILED', { socketId: socket.id, reason: 'Invalid credentials' });
        return;
      }

      // Prevent duplicate socket connections
      const existingSocket = this.userToSocket.get(userId);
      if (existingSocket && existingSocket.id !== socket.id) {
        console.log(`Disconnecting duplicate socket for user ${userId}`);
        existingSocket.disconnect();
        this.logAuditEvent('DUPLICATE_SOCKET_DISCONNECTED', { userId, oldSocketId: existingSocket.id, newSocketId: socket.id });
      }

      this.socketToUser.set(socket.id, userId);
      this.userToSocket.set(userId, socket);

      // Reconnect validation
      const activeRoomId = this.socketToRoom.get(socket.id);
      if (activeRoomId) {
        console.log(`User ${userId} rejoined their active room`);
        this.logAuditEvent('RECONNECT', { userId, roomId: activeRoomId });
        return;
      }

      // Check if user was disconnected and has a pending timer
      const pendingTimer = this.disconnectTimers.get(userId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.disconnectTimers.delete(userId);

        // Find which room they were in and re-attach
        const rid = this.roomManager.findRoomIdForPlayer(userId);
        const room = rid ? this.roomManager.getRoom(rid) : undefined;
        if (rid && room) {
          const player = room.players.find(p => p.id === userId);
          if (player) {
            player.isDisconnected = false;
            this.socketToRoom.set(socket.id, rid);
            socket.join(rid);
            this.roomManager.syncRoomState(rid);
            // If the match is already underway, the lobby-shape
            // roomStateUpdate above carries no cards - push this socket a
            // full masked game state directly so it doesn't have to wait
            // for the next natural state change to see the board again.
            if (room.engine) {
              this.emitGameStateToSocket(socket, userId, room.engine.getState());
            }
            this.io.to(rid).emit('room_announcement', `${player.name} reconnected!`);
            this.logAuditEvent('RECONNECT_SUCCESS', { userId, roomId: rid });
          }
        }
      }

      this.logAuditEvent('AUTH_SUCCESS', { userId, socketId: socket.id });
    });

    // Create Room
    socket.on('createRoom', async (data: { rules: MatchRules; isOffline?: boolean; aiDifficulty?: AiDifficulty }) => {
      const userId = this.requireAuthenticatedSocket(socket);
      if (!userId) return;
      await this.roomManager.createRoom(socket, userId, data);
    });

    // Add AI Opponent
    socket.on('addAi', (data: { difficulty: AiDifficulty; personality: AiPersonality }) => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      this.roomManager.addAi(socket, roomId, data);
    });

    socket.on('updateAiDifficulty', (data: { aiId: string; difficulty: AiDifficulty }) => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      this.roomManager.updateAiDifficulty(socket, roomId, data);
    });

    // Remove AI Opponent
    socket.on('removeAi', (data: { aiId: string }) => {
      const roomId = this.socketToRoom.get(socket.id);
      if (!roomId) return;
      this.roomManager.removeAi(socket, roomId, data);
    });

    // Join Room Code
    socket.on('joinRoom', async (data: { roomId: string }) => {
      const userId = this.socketToUser.get(socket.id);
      if (!userId) return;
      await this.roomManager.joinRoom(socket, userId, data);
    });

    // Toggle Ready State
    socket.on('toggleReady', () => {
      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (!roomId || !userId) return;
      this.roomManager.toggleReady(roomId, userId);
    });

    // Start Game
    socket.on('startGame', () => {
      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (!roomId || !userId) return;
      this.roomManager.startGame(socket, roomId, userId);
    });

    // Play Card Action
    socket.on('playCard', (data: { cardId: string; chosenColor?: CardColor; requestId?: string }) => {
      // Rate limiting
      if (!this.rateLimiter.checkRateLimit(socket.id)) {
        socket.emit('action_error', 'Rate limit exceeded');
        return;
      }

      // Replay attack prevention
      if (this.rateLimiter.isRequestProcessed(data.requestId || '')) {
        socket.emit('action_error', 'Duplicate request');
        return;
      }

      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (!roomId || !userId) return;

      const room = this.roomManager.getRoom(roomId);
      if (!room || !room.engine) return;

      // Race condition prevention
      if (!this.rateLimiter.acquireActionLock(userId)) {
        socket.emit('action_error', 'Action already in progress');
        return;
      }

      try {
        const success = room.engine.playCard(userId, data.cardId, data.chosenColor);
        if (success) {
          this.roomManager.resetTurnTimer(roomId);
          this.logAuditEvent('PLAY_CARD', { userId, roomId, cardId: data.cardId, chosenColor: data.chosenColor });
        } else {
          socket.emit('action_error', 'Invalid card play sequence');
          this.logAuditEvent('PLAY_CARD_FAILED', { userId, roomId, cardId: data.cardId, reason: 'Invalid play' });
        }
      } finally {
        this.rateLimiter.releaseActionLock(userId);
      }
    });

    // Draw Card Action
    socket.on('drawCard', (data: { requestId?: string }) => {
      // Rate limiting
      if (!this.rateLimiter.checkRateLimit(socket.id)) {
        socket.emit('action_error', 'Rate limit exceeded');
        return;
      }

      // Replay attack prevention
      if (this.rateLimiter.isRequestProcessed(data.requestId || '')) {
        socket.emit('action_error', 'Duplicate request');
        return;
      }

      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (!roomId || !userId) return;

      const room = this.roomManager.getRoom(roomId);
      if (!room || !room.engine) return;

      // Race condition prevention
      if (!this.rateLimiter.acquireActionLock(userId)) {
        socket.emit('action_error', 'Action already in progress');
        return;
      }

      try {
        const success = room.engine.drawCard(userId);
        if (success) {
          this.roomManager.resetTurnTimer(roomId);
          this.logAuditEvent('DRAW_CARD', { userId, roomId });
        }
      } finally {
        this.rateLimiter.releaseActionLock(userId);
      }
    });

    // Pass Turn Action
    socket.on('passTurn', (data: { requestId?: string }) => {
      // Rate limiting
      if (!this.rateLimiter.checkRateLimit(socket.id)) {
        socket.emit('action_error', 'Rate limit exceeded');
        return;
      }

      // Replay attack prevention
      if (this.rateLimiter.isRequestProcessed(data.requestId || '')) {
        socket.emit('action_error', 'Duplicate request');
        return;
      }

      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (!roomId || !userId) return;

      const room = this.roomManager.getRoom(roomId);
      if (!room || !room.engine) return;

      // Race condition prevention
      if (!this.rateLimiter.acquireActionLock(userId)) {
        socket.emit('action_error', 'Action already in progress');
        return;
      }

      try {
        const success = room.engine.passTurn(userId);
        if (success) {
          this.roomManager.resetTurnTimer(roomId);
          this.logAuditEvent('PASS_TURN', { userId, roomId });
        }
      } finally {
        this.rateLimiter.releaseActionLock(userId);
      }
    });

    // Call LAST CARD Action
    socket.on('callLastCard', (data: { requestId?: string }) => {
      // Rate limiting
      if (!this.rateLimiter.checkRateLimit(socket.id)) {
        socket.emit('action_error', 'Rate limit exceeded');
        return;
      }

      // Replay attack prevention
      if (this.rateLimiter.isRequestProcessed(data.requestId || '')) {
        socket.emit('action_error', 'Duplicate request');
        return;
      }

      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (!roomId || !userId) return;

      const room = this.roomManager.getRoom(roomId);
      if (!room || !room.engine) return;

      room.engine.callLastCard(userId);
      this.logAuditEvent('CALL_LAST_CARD', { userId, roomId });
    });

    // Challenge LAST CARD Call Action
    socket.on('challengeLastCard', (data: { targetPlayerId: string; requestId?: string }) => {
      // Rate limiting
      if (!this.rateLimiter.checkRateLimit(socket.id)) {
        socket.emit('action_error', 'Rate limit exceeded');
        return;
      }

      // Replay attack prevention
      if (this.rateLimiter.isRequestProcessed(data.requestId || '')) {
        socket.emit('action_error', 'Duplicate request');
        return;
      }

      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (!roomId || !userId) return;

      const room = this.roomManager.getRoom(roomId);
      if (!room || !room.engine) return;

      room.engine.challengeLastCard(userId, data.targetPlayerId);
      this.logAuditEvent('CHALLENGE_LAST_CARD', { userId, roomId, targetPlayerId: data.targetPlayerId });
    });

    // Emoji/Reaction Relays
    socket.on('reaction', (data: { emoji: string }) => {
      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      const allowedReactions = new Set(['🔥', '💩', '😂', '😭', '😮', '👑']);
      if (!roomId || !userId || !allowedReactions.has(data?.emoji)) return;

      const room = this.roomManager.getRoom(roomId);
      const isPlayer = room?.players.some(p => p.id === userId);
      if (!isPlayer) return; // spectators/non-players cannot react

      this.io.to(roomId).emit('reaction_relay', { playerId: userId, emoji: data.emoji });
    });

    // Chat Message Relays
    socket.on('chatMessage', (data: { message: string }) => {
      const roomId = this.socketToRoom.get(socket.id);
      const userId = this.socketToUser.get(socket.id);
      if (roomId && userId) {
        const room = this.roomManager.getRoom(roomId);
        const player = room?.players.find(p => p.id === userId);
        if (player) {
          const sanitizedMessage = this.sanitizeChatInput(data.message);
          if (sanitizedMessage.length === 0) return; // Empty after sanitization

          this.io.to(roomId).emit('chatMessageRelay', {
            id: `chat_${Date.now()}`,
            playerId: userId,
            sender: player.name,
            message: sanitizedMessage,
            timestamp: Date.now()
          });
          this.logAuditEvent('CHAT_MESSAGE', { userId, roomId, messageLength: sanitizedMessage.length });
        }
      }
    });

    // Matchmaking Join Queue
    socket.on('joinQueue', async () => {
      const userId = this.socketToUser.get(socket.id);
      if (!userId) return;

      // Ensure not already in queue
      if (this.matchmakingQueue.has(userId)) return;

      let profile;
      try {
        profile = await prisma.profile.findUnique({ where: { userId }, include: { user: true } });
      } catch (err) {
        console.error('joinQueue: failed to load profile', err);
        socket.emit('action_error', 'Unable to join matchmaking right now, please try again');
        return;
      }
      this.matchmakingQueue.join({
        socketId: socket.id,
        userId,
        username: profile?.user.username || 'Guest'
      });

      socket.emit('queueJoined');
      console.log(`Player queued: ${profile?.user.username}`);
    });

    // Leave Queue
    socket.on('leaveQueue', () => {
      this.matchmakingQueue.leaveBySocket(socket.id);
      socket.emit('queueLeft');
    });

    // Deliberately leaving is different from a dropped connection: remove the
    // player immediately instead of leaving a disconnected seat behind for 15s.
    socket.on('leaveRoom', (ack?: (result: { success: boolean }) => void) => {
      this.matchmakingQueue.leaveBySocket(socket.id);
      this.leaveCurrentRoom(socket);
      ack?.({ success: true });
    });

    // Connection Drop Tracker
    socket.on('disconnect', () => {
      const userId = this.socketToUser.get(socket.id);
      const roomId = this.socketToRoom.get(socket.id);

      console.log(`🔌 Client disconnected: ${socket.id} (User: ${userId})`);

      // Clean up mappings
      this.socketToRoom.delete(socket.id);
      this.socketToUser.delete(socket.id);
      if (userId) {
        this.userToSocket.delete(userId);
      }
      this.rateLimiter.clearSocket(socket.id);
      this.matchmakingQueue.leaveBySocket(socket.id);

      if (roomId && userId) {
        const marked = this.roomManager.markPlayerDisconnected(roomId, userId);
        if (marked) {
          // Set 15 second disconnect grace period
          const timer = setTimeout(() => {
            this.roomManager.handlePermanentDisconnect(roomId, userId);
            // After being removed from the room, clean up guest account
            AuthService.deleteGuestUser(userId);
          }, 15000);

          this.disconnectTimers.set(userId, timer);
        }
      } else if (userId) {
        // Not in a room — delete guest account immediately
        AuthService.deleteGuestUser(userId);
      }
    });
  }
}
