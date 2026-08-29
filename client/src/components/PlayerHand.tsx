'use client';

import React from 'react';
import { Card, CardSide } from 'cards-shared';
import { motion } from 'framer-motion';
import { useAudio } from '../hooks/useAudio';
import BorderGlow from './BorderGlow';
import { getCardSymbol, getCardBgHex, getCardGlowHsl, getCardGradientColors, getCardValueColor } from '../lib/cardColors';

interface PlayerHandProps {
  cards: Card[];
  playableCardIds: string[];
  onPlayCard: (cardId: string) => void;
  disabled: boolean;
  activeSide?: CardSide;
  compact?: boolean;
}

export default function PlayerHand({ cards, playableCardIds, onPlayCard, disabled, activeSide = 'LIGHT', compact = false }: PlayerHandProps) {
  const { playHover, playPlayCard } = useAudio();
  const cardRadius = compact ? 11 : 18;
  const handSpacing = compact
    ? (cards.length > 9 ? '-space-x-6' : cards.length > 6 ? '-space-x-4' : '-space-x-2')
    : cards.length > 10
      ? '-space-x-6 sm:-space-x-8 md:-space-x-12'
      : '-space-x-4 sm:-space-x-6 md:-space-x-10';
  const handCenter = (cards.length - 1) / 2;
  const rotationStep = compact
    ? (cards.length > 10 ? 0.45 : cards.length > 7 ? 0.65 : 0.9)
    : (cards.length > 10 ? 0.7 : cards.length > 7 ? 1 : 1.35);
  const maxRotation = compact
    ? (cards.length > 10 ? 3.8 : cards.length > 7 ? 5 : 7)
    : (cards.length > 10 ? 6 : cards.length > 7 ? 8 : 10);
  const getCardRotation = (index: number) => {
    const rotation = (index - handCenter) * rotationStep;
    return Math.max(-maxRotation, Math.min(maxRotation, rotation));
  };

  const getActiveFace = (card: Card) => {
    return activeSide === 'LIGHT' ? card.lightFace : card.darkFace;
  };

  const renderCardFace = (card: Card, isPlayable: boolean, fill = false) => {
    const face = getActiveFace(card);

    return (
      <BorderGlow
        edgeSensitivity={isPlayable ? 45 : 0}
        glowIntensity={isPlayable ? 1.5 : 0}
        glowColor={getCardGlowHsl(face.color)}
        backgroundColor={getCardBgHex(face.color)}
        colors={getCardGradientColors(face.color)}
        borderRadius={cardRadius}
        glowRadius={compact ? 18 : 28}
        className={`relative ${fill ? 'h-full w-full' : 'player-card-size'} rounded-2xl border-2 select-none transition-all backdrop-blur-sm opacity-100 ${
          isPlayable
            ? 'border-white/40'
            : 'border-white/10'
        }`}
      >
        <div className={`absolute left-[10%] top-[7%] text-xs sm:text-sm card-corner-number ${face.color === 'WILD' ? 'text-white' : ''}`}>
          {face.value === 'WILD' ? (
            <div className="card-wild-corner-symbol rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </div>
          ) : (
            getCardSymbol(face.value)
          )}
        </div>

        <div className="card-oval-insert w-[76%] h-[60%] flex items-center justify-center">
          {face.value === 'WILD' || face.value === 'WILD_DRAW_FOUR' || face.value === 'WILD_DRAW_FIVE' ? (
            <motion.div
              className="card-wild-symbol rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45"
              animate={{ rotate: [45, 48, 45] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ willChange: 'transform' }}
            >
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </motion.div>
          ) : (
            <span className={`card-oval-value font-extrabold ${getCardValueColor(face.color)}`}>
              {getCardSymbol(face.value)}
            </span>
          )}
        </div>

        <div className={`absolute bottom-[7%] right-[10%] text-xs sm:text-sm card-corner-number rotate-180 ${face.color === 'WILD' ? 'text-white' : ''}`}>
          {face.value === 'WILD' ? (
            <div className="card-wild-corner-symbol rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </div>
          ) : (
            getCardSymbol(face.value)
          )}
        </div>

        {!isPlayable && !disabled && (
          <div className="absolute inset-0 bg-black/20 rounded-2xl pointer-events-none backdrop-blur-[2px]" />
        )}
      </BorderGlow>
    );
  };

  const handleCardClick = (card: Card) => {
    if (disabled) return;
    const isPlayable = playableCardIds.includes(card.id);
    if (!isPlayable) return;

    playPlayCard();
    onPlayCard(card.id);
  };

  return (
    <div className={`w-full flex justify-center items-end px-4 py-2 relative overflow-visible select-none font-sans ${compact ? 'compact-player-hand' : ''}`}>
      {/* This deliberately has no scroll/overflow container: a scrolling box
          clips the raised card and its glow before Framer Motion can display it. */}
      <div className={`relative isolate flex items-end justify-center ${handSpacing} overflow-visible py-10 px-4 sm:px-8`}>
        {cards.map((card, index) => {
          const face = getActiveFace(card);
          const isPlayable = playableCardIds.includes(card.id) && !disabled;
          const cardRotation = getCardRotation(index);

          return (
            <motion.div
              key={card.id}
              initial={{ y: 80, opacity: 0, rotate: cardRotation }}
              animate={{ y: 0, opacity: 1, rotate: cardRotation }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              whileHover={{
                y: compact ? -12 : -35,
                rotate: cardRotation,
                scale: compact ? 1.04 : 1.08,
                zIndex: 50,
                transition: { duration: 0.2, ease: 'easeOut' }
              }}
              whileTap={isPlayable ? { scale: 0.95 } : {}}
              style={{
                transformOrigin: 'bottom center',
                willChange: 'transform'
              }}
              className="flex-shrink-0"
            >
              <div
                onClick={() => handleCardClick(card)}
                onMouseEnter={playHover}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isPlayable) {
                    e.preventDefault();
                    handleCardClick(card);
                  }
                }}
                role="button"
                tabIndex={isPlayable ? 0 : -1}
                aria-label={`${face.color !== 'WILD' ? face.color : 'Wild'} ${getCardSymbol(face.value)}${isPlayable ? '' : ' (not playable)'}`}
                aria-disabled={!isPlayable}
                className="relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-3xl"
              >
                {renderCardFace(card, isPlayable)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
