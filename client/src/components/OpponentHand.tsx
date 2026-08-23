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
}

export default function OpponentHand({ playerName, cardCount, position, isCurrentTurn, compact = false }: OpponentHandProps) {
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
