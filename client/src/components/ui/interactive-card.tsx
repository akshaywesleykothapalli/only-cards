"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InteractiveGameCardProps extends React.HTMLAttributes<HTMLDivElement> {
  cardColor: string;
  cardType: 'wild' | 'action' | 'number';
  symbol?: string;
  value?: string;
  glowColor?: string;
}

export function InteractiveGameCard({
  className,
  cardColor,
  cardType,
  symbol,
  value,
  glowColor,
  ...props
}: InteractiveGameCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    const rotateX = (y - height / 2) / (height / 2) * -8;
    const rotateY = (x - width / 2) / (width / 2) * 8;
    const glow = getGlowColor();

    setIsHovered(true);

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
      boxShadow: `0 0 0 1px hsl(${glow} / 0.5), 0 18px 42px rgba(0, 0, 0, 0.42), 0 28px 55px hsl(${glow} / 0.2)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleMouseEnter = () => {
    const glow = getGlowColor();
    setIsHovered(true);
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1.03, 1.03, 1.03)",
      boxShadow: `0 0 0 1px hsl(${glow} / 0.42), 0 18px 42px rgba(0, 0, 0, 0.42), 0 28px 50px hsl(${glow} / 0.16)`,
      transition: "transform 0.18s ease-out, box-shadow 0.18s ease-out",
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      boxShadow: "0 18px 32px rgba(0, 0, 0, 0.34)",
      transition: "transform 0.4s ease-in-out, box-shadow 0.22s ease-out",
    });
  };

  const isWild = cardType === 'wild';

  // Determine glow color based on card color if not provided
  const getGlowColor = () => {
    if (glowColor) return glowColor;
    const colorMap: Record<string, string> = {
      '#ea4335': '0 100 50',
      '#0099ff': '210 100 50',
      '#f59e0b': '45 100 50',
      '#10b981': '150 100 40',
      '#111115': '0 0 85',
    };
    return colorMap[cardColor] || '0 0 85';
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        backgroundColor: cardColor,
        boxShadow: isHovered ? style.boxShadow : "0 18px 32px rgba(0, 0, 0, 0.34)",
      }}
      className={cn(
        "relative w-48 h-72 overflow-hidden rounded-3xl border border-white/15 transition-shadow duration-200",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {/* Corner Numbers */}
        <div 
          className="absolute top-4 left-4 text-base text-white card-corner-number"
        >
          {isWild && value !== '+4' ? (
            <div className="w-4 h-4 rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </div>
          ) : (
            value || symbol
          )}
        </div>
        <div 
          className="absolute bottom-4 right-4 text-base text-white card-corner-number rotate-180"
        >
          {isWild && value !== '+4' ? (
            <div className="w-4 h-4 rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </div>
          ) : (
            value || symbol
          )}
        </div>

        {/* Center Oval */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="card-oval-insert w-[76%] h-[60%]">
            {isWild ? (
              <div className="w-24 h-24 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45">
                <div className="bg-[#ef4444]" />
                <div className="bg-[#3b82f6]" />
                <div className="bg-[#10b981]" />
                <div className="bg-[#f59e0b]" />
              </div>
            ) : (
              <span className="card-oval-value text-5xl font-bold" style={{ color: cardColor }}>
                {symbol || value}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
