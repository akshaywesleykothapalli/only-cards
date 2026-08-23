'use client';

import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Eye, ShieldAlert, Cpu, BarChart3 } from 'lucide-react';
import { CardSide } from 'cards-shared';

export default function AiOverlay() {
  const { aiTelemetry, aiThinkingPlayerId, gameState } = useGameStore();

  if (!gameState) return null;

  const thinkingPlayer = gameState.players.find(p => p.id === aiThinkingPlayerId);

  // Helper to get active face based on current side
  const getActiveFace = (card: any) => {
    return gameState.activeSide === 'LIGHT' ? card.lightFace : card.darkFace;
  };

  return (
    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4 border border-cyber-blue/20 shadow-neon-blue z-20 text-xs w-full">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="font-extrabold text-cyber-blue flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
          <Cpu className="w-3.5 h-3.5" /> AI ENGINE TELEMETRY OVERLAY
        </span>
        {aiThinkingPlayerId && (
          <span className="flex items-center gap-1 text-[9px] bg-cyber-purple/20 text-cyber-purple px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
            Thinking: {thinkingPlayer?.name}
          </span>
        )}
      </div>

      {!aiTelemetry ? (
        <div className="text-[10px] text-gray-500 font-semibold tracking-wider text-center py-4 uppercase">
          Waiting for next AI decision cycle...
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Reasoning */}
          <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
            <div className="font-bold text-gray-400 mb-1 flex items-center gap-1">
              <Eye className="w-3 h-3 text-gold" /> Strategic Intent
            </div>
            <p className="text-[11px] text-gray-200 leading-relaxed font-mono">
              {aiTelemetry.decision?.reasoning || 'No details.'}
            </p>
          </div>

          {/* Cards weights */}
          <div>
            <div className="font-bold text-gray-400 mb-1.5 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-cyber-blue" /> Priority Weights (Highest plays)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(aiTelemetry.decision?.telemetry?.playableCardsWeights || {}).map(([id, weight]) => {
                // Find card color/val
                const aiPlayer = gameState.players.find(p => p.id === aiTelemetry.playerId);
                const card = aiPlayer?.cards.find(c => c.id === id);
                if (!card) return null;
                const face = getActiveFace(card);
                return (
                  <div key={id} className="flex justify-between items-center p-2 bg-white/2 rounded-lg border border-white/5 font-mono">
                    <span className="text-[10px] font-semibold text-gray-300">
                      {face.color} {face.value}
                    </span>
                    <span className="font-bold text-cyber-blue">{(weight as number).toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Threat evaluations */}
          <div>
            <div className="font-bold text-gray-400 mb-1.5 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-cyber-red" /> Opponent Threat Index
            </div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(aiTelemetry.decision?.telemetry?.threatLevels || {}).map(([pId, level]) => {
                const player = gameState.players.find(p => p.id === pId);
                if (!player) return null;
                return (
                  <div key={pId} className="flex items-center gap-3">
                    <span className="w-16 truncate text-gray-300 font-semibold">{player.name}</span>
                    <div className="flex-grow bg-black/40 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          (level as number) >= 75
                            ? 'bg-cyber-red'
                            : (level as number) >= 40
                            ? 'bg-gold'
                            : 'bg-cyber-green'
                        }`}
                        style={{ width: `${level}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-400 w-8 text-right font-mono">{(level as number)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
