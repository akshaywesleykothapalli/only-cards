import { Server } from 'socket.io';
import { GameEngine } from './GameEngine';
import { AIEngine } from './AIEngine';

// Minimal shape AiTurnController needs from a room - defined locally rather
// than importing SocketManager's GameRoom to avoid a circular dependency;
// GameRoom already satisfies this structurally.
export interface AiHostRoom {
  engine?: GameEngine;
  isStarted: boolean;
  turnTimer?: NodeJS.Timeout;
  aiIntervals: Record<string, NodeJS.Timeout>;
}

// Evaluates and executes AI turns on a delay (to simulate human reaction
// time), including auto LAST-CARD calls.
// Extracted from SocketManager so AI decision-application logic isn't
// tangled up with socket/room lifecycle code.
export class AiTurnController {
  constructor(
    private io: Server,
    private resetTurnTimer: (roomId: string) => void
  ) {}

  trigger(roomId: string, room: AiHostRoom) {
    if (!room.engine || !room.isStarted) return;

    const state = room.engine.getState();
    if (state.status !== 'PLAYING') {
      if (room.turnTimer) clearInterval(room.turnTimer);
      return;
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer.isAi) return;

    // Simulate human reaction thinking delay
    const thinkTime = 1500 + Math.random() * 1500;

    // Send typing indicators
    this.io.to(roomId).emit('aiThinking', { playerId: currentPlayer.id });

    // Clear any pending triggers
    if (room.aiIntervals[currentPlayer.id]) clearTimeout(room.aiIntervals[currentPlayer.id]);

    room.aiIntervals[currentPlayer.id] = setTimeout(() => {
      // Re-check state inside setTimeout to avoid race conditions
      if (!room.engine) return;
      const freshState = room.engine.getState();
      if (freshState.status !== 'PLAYING') return;

      const freshCurrentPlayer = freshState.players[freshState.currentPlayerIndex];
      if (!freshCurrentPlayer.isAi || freshCurrentPlayer.id !== currentPlayer.id) return;

      const decision = AIEngine.evaluateMove(
        freshState,
        freshCurrentPlayer,
        freshCurrentPlayer.aiDifficulty,
        freshCurrentPlayer.aiPersonality
      );

      // Emit decision telemetry data for debugging overlay
      this.io.to(roomId).emit('aiTelemetry', { playerId: freshCurrentPlayer.id, decision });

      // Simulate typing message or emoji occasionally if personality is Troll or Aggressive
      if (freshCurrentPlayer.aiPersonality === 'Troll' && Math.random() > 0.7) {
        this.io.to(roomId).emit('reaction_relay', { playerId: freshCurrentPlayer.id, emoji: '💩' });
      }

      // Apply action on the engine
      if (decision.action === 'PLAY' && decision.cardId) {
        const success = room.engine.playCard(freshCurrentPlayer.id, decision.cardId, decision.chosenColor);
        if (success) {
          this.resetTurnTimer(roomId);
        }
      } else if (decision.action === 'DRAW') {
        room.engine.drawCard(freshCurrentPlayer.id);
        const afterDrawState = room.engine.getState();
        const afterDrawCurrentPlayer = afterDrawState.players[afterDrawState.currentPlayerIndex];
        if (afterDrawState.status === 'PLAYING' && afterDrawCurrentPlayer?.id === freshCurrentPlayer.id) {
          room.engine.passTurn(freshCurrentPlayer.id);
        }
        this.resetTurnTimer(roomId);
      } else if (decision.action === 'PASS') {
        room.engine.passTurn(freshCurrentPlayer.id);
        this.resetTurnTimer(roomId);
      }

      // AI calls LAST CARD if cards = 1 (check after action)
      const afterState = room.engine.getState();
      const aiPlayerAfter = afterState.players.find(p => p.id === freshCurrentPlayer.id);
      if (aiPlayerAfter && aiPlayerAfter.cards.length === 1) {
        const lastCardTimerKey = `${freshCurrentPlayer.id}:last-card`;
        if (room.aiIntervals[lastCardTimerKey]) clearTimeout(room.aiIntervals[lastCardTimerKey]);
        room.aiIntervals[lastCardTimerKey] = setTimeout(() => {
          if (!room.engine) return;
          const latest = room.engine.getState();
          const latestAi = latest.players.find(p => p.id === freshCurrentPlayer.id);
          if (latest.status === 'PLAYING' && latestAi?.cards.length === 1) {
            room.engine.callLastCard(freshCurrentPlayer.id);
          }
        }, 1800);
      }
    }, thinkTime);
  }
}
