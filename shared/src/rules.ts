import { Card, CardColor, CardValue, MatchRules, CardSide } from './types';

// Helper to get active face based on side
function getActiveFace(card: Card, activeSide: CardSide) {
  return activeSide === 'LIGHT' ? card.lightFace : card.darkFace;
}

// Generate a fresh 108 card deck (for flip mode, each card has two faces)
export function createDeck(flipMode: boolean = false): Card[] {
  const colors: CardColor[] = ['RED', 'BLUE', 'YELLOW', 'GREEN'];
  const values: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP', 'REVERSE', 'DRAW_TWO'];
  const darkValues: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP_EVERYONE', 'REVERSE', 'DRAW_FIVE'];
  const deck: Card[] = [];

  let idCounter = 1;
  const nextId = () => `card_${idCounter++}`;

  if (flipMode) {
    // Flip mode: create dual-face cards with different dark side values (UNO Flip edition style)
    for (const color of colors) {
      // Zeroes (1 of each color) - same on both sides
      deck.push({
        id: nextId(),
        lightFace: { color, value: '0' },
        darkFace: { color, value: '0' }
      });

      // 1-9 and action cards (2 of each per color)
      // Light side: standard values, Dark side: more powerful values
      for (let i = 0; i < values.length; i++) {
        const lightValue = values[i];
        const darkValue = darkValues[i];
        
        deck.push({
          id: nextId(),
          lightFace: { color, value: lightValue },
          darkFace: { color, value: darkValue }
        });
        deck.push({
          id: nextId(),
          lightFace: { color, value: lightValue },
          darkFace: { color, value: darkValue }
        });
      }
    }

    // Wild cards (4 of each)
    for (let i = 0; i < 4; i++) {
      deck.push({
        id: nextId(),
        lightFace: { color: 'WILD', value: 'WILD' },
        darkFace: { color: 'WILD', value: 'WILD' }
      });
      deck.push({
        id: nextId(),
        lightFace: { color: 'WILD', value: 'WILD_DRAW_FOUR' },
        darkFace: { color: 'WILD', value: 'WILD_DRAW_FIVE' }
      });
    }

    // Add Flip cards (8 total) - these toggle the side
    for (let i = 0; i < 8; i++) {
      deck.push({
        id: nextId(),
        lightFace: { color: 'WILD', value: 'FLIP' },
        darkFace: { color: 'WILD', value: 'FLIP' }
      });
    }
  } else {
    // Standard mode: create single-face cards (lightFace only)
    for (const color of colors) {
      // Zeroes (1 of each color)
      deck.push({
        id: nextId(),
        lightFace: { color, value: '0' },
        darkFace: { color, value: '0' }
      });

      // 1-9 and action cards (2 of each per color)
      for (const value of values) {
        deck.push({
          id: nextId(),
          lightFace: { color, value },
          darkFace: { color, value }
        });
        deck.push({
          id: nextId(),
          lightFace: { color, value },
          darkFace: { color, value }
        });
      }
    }

    // Wild cards (4 of each)
    for (let i = 0; i < 4; i++) {
      deck.push({
        id: nextId(),
        lightFace: { color: 'WILD', value: 'WILD' },
        darkFace: { color: 'WILD', value: 'WILD' }
      });
      deck.push({
        id: nextId(),
        lightFace: { color: 'WILD', value: 'WILD_DRAW_FOUR' },
        darkFace: { color: 'WILD', value: 'WILD_DRAW_FOUR' }
      });
    }
  }

  return shuffle(deck);
}

// Fisher-Yates Shuffle
export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Rule validator for playing cards
export function isValidPlay(
  card: Card,
  activeColor: CardColor,
  activeValue: CardValue,
  drawStackCount: number,
  rules: MatchRules,
  activeSide: CardSide = 'LIGHT'
): boolean {
  const face = getActiveFace(card, activeSide);

  // If there's an active penalty stack (e.g. player needs to resolve stacking draw penalty)
  if (drawStackCount > 0) {
    if (!rules.stacking) return false;

    // When stacking is enabled, only matching or stronger draw cards can be played.
    // Standard: +2 on +2, +4 on +4, +4 on +2. Flip Mode: +5 on +5, +5 on +2/+4.
    if (activeValue === 'DRAW_TWO') {
      return face.value === 'DRAW_TWO' || face.value === 'WILD_DRAW_FOUR' || face.value === 'DRAW_FIVE' || face.value === 'WILD_DRAW_FIVE';
    }
    if (activeValue === 'DRAW_FIVE') {
      return face.value === 'DRAW_FIVE' || face.value === 'WILD_DRAW_FIVE';
    }
    if (activeValue === 'WILD_DRAW_FOUR') {
      return face.value === 'WILD_DRAW_FOUR' || face.value === 'WILD_DRAW_FIVE';
    }
    if (activeValue === 'WILD_DRAW_FIVE') {
      return face.value === 'WILD_DRAW_FIVE';
    }
    return false;
  }

  // Normal turn (no draw stack active)
  // Wilds can be played on anything
  if (face.color === 'WILD') {
    return true;
  }

  // Matching color
  if (face.color === activeColor) {
    return true;
  }

  // Matching value
  if (face.value === activeValue) {
    return true;
  }

  return false;
}

// Rule check for Jump-In (must match BOTH value and color exactly)
export function isValidJumpIn(
  card: Card,
  activeColor: CardColor,
  activeValue: CardValue,
  activeSide: CardSide = 'LIGHT'
): boolean {
  const face = getActiveFace(card, activeSide);
  if (face.color === 'WILD') return false; // wild cards cannot be jumped in directly as color isn't matched prior to playing
  return face.color === activeColor && face.value === activeValue;
}

// Calculate the score of a player's remaining hand (for round scoring)
export function getCardScore(card: Card, activeSide: CardSide = 'LIGHT'): number {
  const face = getActiveFace(card, activeSide);
  if (face.color === 'WILD') {
    return 50; // Wild and Wild Draw Four/Five are 50 pts
  }
  if (
    face.value === 'SKIP' ||
    face.value === 'REVERSE' ||
    face.value === 'DRAW_TWO' ||
    face.value === 'SKIP_EVERYONE' ||
    face.value === 'FLIP'
  ) {
    return 20; // Light-side action cards are 20 pts
  }
  if (face.value === 'DRAW_FIVE') {
    return 30; // Flip mode heavy draw cards are 30 pts
  }
  return parseInt(face.value, 10) || 0; // Number cards are face value
}
