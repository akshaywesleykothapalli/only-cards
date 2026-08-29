'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CardBack } from './CardBack';

interface OpponentHandProps {
  playerName: string;
  cardCount: number;
  position: 'top' | 'left' | 'right' | 'bottom';
  isCurrentTurn?: boolean;
  compact?: boolean;
  largeTable?: boolean;
  isAi?: boolean;
}

export default function OpponentHand({ playerName, cardCount, position, isCurrentTurn, compact = false, largeTable = false, isAi = false }: OpponentHandProps) {
  // Determine rotation and spacing based on position
  const getContainerStyle = () => {
    switch (position) {
      case 'top':
        return 'rotate-180'; // Opponent at top looks down at their hand
      case 'left':
        return 'rotate-90'; // Opponent at left looks right
      case 'right':
        return '-rotate-90'; // Opponent at right looks left
      case 'bottom':
        return ''; // Lower corner opponents face toward the middle like the player
      default:
        return '';
    }
  };

  if (largeTable) {
    const cardWidthClass = compact ? 'w-[4.2rem]' : 'w-[5.75rem]';
    const nameTextClass = compact ? 'text-[7.5px]' : 'text-[8.5px]';
    const logoTextClass = compact ? 'text-[0.78rem]' : 'text-[1.02rem]';
    const cardInner = (
      <div className={`opponent-mini-card relative flex aspect-[7/10] flex-col overflow-hidden shadow-[0_10px_22px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors ${
        isCurrentTurn
          ? 'opponent-mini-card-active rounded-[0.78rem] bg-[#1a1d26] text-red-50'
          : 'rounded-[0.78rem] bg-[#1a1d26] text-white'
      }`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.055),transparent_42%)]" />
        <div className="absolute inset-0 shadow-[inset_0_0_24px_rgba(0,0,0,0.32)]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-[12%] pt-[18%]">
          <span className={`font-sans ${logoTextClass} font-black italic leading-none text-white/92 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] -skew-x-12`}>
            CARDS
          </span>
          <span className={`mt-3 rounded-full px-2.5 py-1 font-mono text-[0.68rem] font-extrabold leading-none ${
            isCurrentTurn
              ? 'bg-red-100/8 text-red-100/78'
              : 'bg-black/20 text-white/48'
          }`}>
            {cardCount}
          </span>
        </div>
        <div className="relative z-10 px-[9%] pb-[11%]">
          <span className={`block truncate rounded-full px-1.5 py-1 text-center font-display font-black uppercase tracking-[0.055em] ${nameTextClass} ${
            isCurrentTurn
              ? 'bg-white/[0.055] text-red-50/90'
              : 'bg-black/22 text-white/66'
          }`}>
            {playerName}
          </span>
        </div>
        <span className={`absolute right-2 top-2 h-2 w-2 rounded-full border border-black/40 ${
          isCurrentTurn ? 'bg-red-200 shadow-[0_0_10px_rgba(252,165,165,0.55)]' : 'bg-emerald-300/65'
        }`} />
        {isCurrentTurn && (
          <span className="absolute inset-x-[22%] bottom-1 h-px bg-red-100/28" />
        )}
      </div>
    );

    return (
      <div className="flex h-full w-full items-center justify-center">
        <motion.div
          initial={{ y: 12, opacity: 0, scale: 0.94 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: isCurrentTurn ? 1.04 : 1,
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`group relative ${cardWidthClass}`}
          title={`${playerName}: ${cardCount} cards`}
        >
          <span className={`opponent-stack-card absolute inset-0 translate-x-1.5 rotate-[5deg] rounded-[0.78rem] transition-transform group-hover:translate-x-2 group-hover:rotate-[7deg] ${
            isCurrentTurn
              ? 'border border-transparent bg-[#181820] shadow-[0_10px_22px_rgba(0,0,0,0.2)]'
              : 'border border-transparent bg-[#181820] shadow-[0_10px_22px_rgba(0,0,0,0.2)]'
          }`} />
          <span className={`opponent-stack-card absolute inset-0 -translate-x-1.5 rotate-[-5deg] rounded-[0.78rem] transition-transform group-hover:-translate-x-2 group-hover:rotate-[-7deg] ${
            isCurrentTurn
              ? 'border border-transparent bg-[#14151c]'
              : 'border border-transparent bg-[#14151c]'
          }`} />
          {cardInner}
        </motion.div>
      </div>
    );
  }

  const displayCount = Math.min(cardCount, compact ? 4 : 8);

  // Match player hand spacing logic based on card count
  const getSpacing = () => {
    if (displayCount > 6) {
      // Tighter spacing for more cards
      return compact ? '-space-x-8' : '-space-x-8 sm:-space-x-14';
    } else {
      // Normal spacing for fewer cards
      return compact ? '-space-x-5' : '-space-x-5 sm:-space-x-10';
    }
  };

  return (
    <div className={`flex items-center justify-center w-full h-full ${getContainerStyle()}`}>
      <div className={`relative isolate flex items-center justify-center ${getSpacing()} overflow-visible`}>
        {Array.from({ length: displayCount }).map((_, i) => (
          <motion.div
            key={`opp-card-${i}`}
            initial={{ y: 40, opacity: 0, rotate: -5 + (i % 3) * 2 }}
            animate={{ y: 0, opacity: 1, rotate: -5 + (i % 3) * 2 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.05 }}
            style={{
              transformOrigin: 'bottom center',
              willChange: 'transform'
            }}
            className="flex-shrink-0"
          >
            <div className="relative cursor-default focus:outline-none">
              <CardBack className="opponent-card-size" />
            </div>
          </motion.div>
        ))}
        {cardCount > displayCount && (
          <div className="text-xs font-bold text-gray-400 px-2 whitespace-nowrap">
            +{cardCount - displayCount}
          </div>
        )}
      </div>
    </div>
  );
}
