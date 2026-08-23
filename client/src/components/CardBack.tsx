"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface CardBackProps {
  count?: number;
  className?: string;
}

export function CardBack({ count, className = '' }: CardBackProps) {
  const sizeClasses = className.includes('w-') ? '' : 'w-24 h-36';
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`relative rounded-2xl bg-[#1a1d26] border-2 border-white/10 flex flex-col items-center justify-center shadow-lg ${sizeClasses} ${className}`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
      
      {/* Red glow effect */}
      <div className="absolute inset-0 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.15)]" />
      
      {/* CARDS text */}
      <span className="card-back-label font-sans font-black italic text-xl text-white tracking-tighter transform -skew-x-12 select-none relative z-10">
        CARDS
      </span>
      
      {/* Card count */}
      {count !== undefined && (
        <span className="absolute bottom-3 text-[10px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">
          {count}
        </span>
      )}
    </motion.div>
  );
}
