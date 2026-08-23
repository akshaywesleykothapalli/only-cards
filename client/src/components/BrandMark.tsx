'use client';

import React from 'react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showLetters?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-7',
  md: 'h-8 w-9',
  lg: 'h-10 w-12',
};

export function BrandMark({ size = 'md', showLetters = true }: BrandMarkProps) {
  return (
    <span className={`relative inline-grid ${sizeClasses[size]} flex-shrink-0 place-items-center`} aria-hidden="true">
      <span className="absolute h-[78%] w-[58%] -translate-x-1 rotate-[-14deg] rounded-[0.35rem] border border-blue-300/50 bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.25)]" />
      <span className="absolute h-[82%] w-[60%] translate-x-1 rotate-[12deg] rounded-[0.35rem] border border-red-200/60 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]" />
      <span className="absolute grid h-[76%] w-[56%] place-items-center rounded-[0.35rem] border border-white/80 bg-white text-[0.55rem] font-black tracking-[-0.04em] text-red-600 shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
        {showLetters ? 'OC' : '1'}
      </span>
    </span>
  );
}
