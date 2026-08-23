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
      <img
        src={`/icon.svg?v=20260824${showLetters ? '' : '-mark'}`}
        alt=""
        className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(239,68,68,0.32)]"
        draggable={false}
      />
    </span>
  );
}
