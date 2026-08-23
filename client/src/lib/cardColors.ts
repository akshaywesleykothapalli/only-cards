import { CardColor } from 'cards-shared';

// Card visual helpers shared across GameTable, PlayerHand, and TutorialGame -
// previously duplicated identically in all three.

export function getCardSymbol(value: string): string {
  switch (value) {
    case 'SKIP': return '⊘';
    case 'SKIP_EVERYONE': return '⊘⊘';
    case 'REVERSE': return '⇄';
    case 'DRAW_TWO': return '+2';
    case 'DRAW_FIVE': return '+5';
    case 'WILD': return 'W';
    case 'WILD_DRAW_FOUR': return '+4';
    case 'WILD_DRAW_FIVE': return '+5';
    case 'FLIP': return '🔄';
    default: return value;
  }
}

export function getCardBgHex(color: CardColor): string {
  switch (color) {
    case 'RED': return '#ea4335';
    case 'BLUE': return '#0099ff';
    case 'YELLOW': return '#f59e0b';
    case 'GREEN': return '#10b981';
    default: return '#111115';
  }
}

export function getCardGlowHsl(color: CardColor): string {
  switch (color) {
    case 'RED': return '0 100 50';
    case 'BLUE': return '210 100 50';
    case 'YELLOW': return '45 100 50';
    case 'GREEN': return '150 100 40';
    default: return '0 0 85';
  }
}

export function getCardGradientColors(color: CardColor): string[] {
  switch (color) {
    case 'RED': return ['#ef4444', '#b91c1c', '#f87171'];
    case 'BLUE': return ['#3b82f6', '#1d4ed8', '#60a5fa'];
    case 'YELLOW': return ['#f59e0b', '#b45309', '#fbbf24'];
    case 'GREEN': return ['#10b981', '#047857', '#34d399'];
    default: return ['#ffffff', '#111115', '#4b5563'];
  }
}

export function getCardValueColor(color: CardColor): string {
  switch (color) {
    case 'RED': return 'text-[#ea4335]';
    case 'BLUE': return 'text-[#0099ff]';
    case 'YELLOW': return 'text-[#f59e0b]';
    case 'GREEN': return 'text-[#10b981]';
    default: return 'text-red-650';
  }
}
