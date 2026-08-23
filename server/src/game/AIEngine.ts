import { GameState, Card, Player, CardColor, AiPersonality, AiDifficulty, CardSide } from 'cards-shared';
import { isValidPlay } from 'cards-shared';

export interface AiDecision {
  action: 'PLAY' | 'DRAW' | 'PASS' | 'CALL_CARD';
  cardId?: string;
  chosenColor?: CardColor;
  targetPlayerId?: string;
  score: number;
  reasoning: string;
  telemetry: {
    playableCardsWeights: Record<string, number>;
    threatLevels: Record<string, number>;
    estimatedColorStrengths: Record<CardColor, number>;
  };
}

export class AIEngine {
  // Helper to get active face based on current side
  private static getActiveFace(card: Card, activeSide: CardSide) {
    return activeSide === 'LIGHT' ? card.lightFace : card.darkFace;
  }

  // Evaluates the best move for an AI player
  public static evaluateMove(
    state: GameState,
    aiPlayer: Player,
    difficulty: AiDifficulty = 'Medium',
    personality: AiPersonality = 'Strategist'
  ): AiDecision {
    const playableCards = aiPlayer.cards.filter(c =>
      isValidPlay(c, state.activeColor, state.activeValue, state.drawStackCount, state.rules, state.activeSide)
    );

    const threatLevels = this.calculateThreatLevels(state, aiPlayer.id);
    const estimatedColorStrengths = this.estimateColorStrengths(aiPlayer.cards, state.activeSide);

    // Initial telemetry structures
    const playableCardsWeights: Record<string, number> = {};
    for (const card of playableCards) {
      playableCardsWeights[card.id] = 0;
    }

    const decisionTelemetry = {
      playableCardsWeights,
      threatLevels,
      estimatedColorStrengths
    };

    // If stacking is active and AI has no playable stacking response, it must draw
    if (state.drawStackCount > 0 && playableCards.length === 0) {
      return {
        action: 'DRAW',
        score: 100,
        reasoning: `No matching draw cards in hand to stack against +${state.drawStackCount} penalty. Drawing.`,
        telemetry: decisionTelemetry
      };
    }

    // 1. Check if LAST CARD call is needed (AI has 2 cards and is playing 1)
    const isPlayingForLastCard = aiPlayer.cards.length === 2 && playableCards.length > 0;

    // If no playable cards, AI must draw
    if (playableCards.length === 0) {
      return {
        action: 'DRAW',
        score: 100,
        reasoning: 'No valid cards to play in current hand. Must draw.',
        telemetry: decisionTelemetry
      };
    }

    // 2. Score each playable card
    let bestCard: Card | null = null;
    let highestScore = -Infinity;
    let selectedReasoning = 'Default play';

    for (const card of playableCards) {
      let score = this.getBaseWeight(card, state.activeSide);

      const personalityWeight = this.getPersonalityWeights(card, personality, state, threatLevels, estimatedColorStrengths);

      // Apply difficulty modifiers. Easy bots are intentionally noisy, Medium
      // bots are balanced, and Hard/Expert bots lean harder into tactical blocks
      // and color-control decisions.
      if (difficulty === 'Easy') {
        score = score * 0.65 + Math.random() * 45;
      } else if (difficulty === 'Medium') {
        score += personalityWeight + Math.random() * 8;
      } else {
        score += personalityWeight * 1.25 + this.getHardModeWeights(card, state, threatLevels, estimatedColorStrengths);
      }

      playableCardsWeights[card.id] = score;

      if (score > highestScore) {
        highestScore = score;
        bestCard = card;
      }
    }

    if (!bestCard) {
      bestCard = playableCards[0];
      highestScore = 10;
    }

    // 3. Formulate the explanation
    const bestFace = this.getActiveFace(bestCard, state.activeSide);
    selectedReasoning = `Selected card ${bestFace.color} ${bestFace.value} with priority weight of ${highestScore.toFixed(1)}. [Mode: ${personality}]`;

    // 4. Decide on Wild Color choice
    let chosenColor: CardColor | undefined;
    if (bestFace.color === 'WILD') {
      chosenColor = this.selectBestColor(aiPlayer.cards, personality, state.activeSide);
      selectedReasoning += ` Called active color: ${chosenColor}.`;
    }

    // Return decision
    return {
      action: 'PLAY',
      cardId: bestCard.id,
      chosenColor,
      score: highestScore,
      reasoning: selectedReasoning,
      telemetry: decisionTelemetry
    };
  }

  // Calculate danger/threat values for all opponents based on card count
  private static calculateThreatLevels(state: GameState, aiId: string): Record<string, number> {
    const threats: Record<string, number> = {};
    for (const player of state.players) {
      if (player.id === aiId || player.isSpectator) continue;
      
      const cardsLeft = player.cards.length;
      if (cardsLeft === 1) {
        threats[player.id] = 100; // Critical danger
      } else if (cardsLeft === 2) {
        threats[player.id] = 75;  // High danger
      } else if (cardsLeft <= 4) {
        threats[player.id] = 40;  // Medium danger
      } else {
        threats[player.id] = 10;   // Low danger
      }
    }
    return threats;
  }

  // Count color distribution in AI's hand to play/hoard effectively
  private static estimateColorStrengths(cards: Card[], activeSide: CardSide): Record<CardColor, number> {
    const counts: Record<CardColor, number> = {
      RED: 0,
      BLUE: 0,
      YELLOW: 0,
      GREEN: 0,
      WILD: 0
    };
    for (const card of cards) {
      const face = this.getActiveFace(card, activeSide);
      counts[face.color]++;
    }
    return counts;
  }

  // Standard value index weights
  private static getBaseWeight(card: Card, activeSide: CardSide): number {
    const face = this.getActiveFace(card, activeSide);
    if (face.color === 'WILD') return 20; // Save wilds if possible
    if (face.value === 'SKIP' || face.value === 'SKIP_EVERYONE') return 15;
    if (face.value === 'REVERSE') return 14;
    if (face.value === 'DRAW_TWO') return 18;
    if (face.value === 'DRAW_FIVE') return 22; // Dark side heavy draw - high value
    if (face.value === 'FLIP') return 12; // Flip is situational
    return 10 + (parseInt(face.value, 10) || 0); // Standard value weights
  }

  // Modifies card score based on personality traits
  private static getPersonalityWeights(
    card: Card,
    personality: AiPersonality,
    state: GameState,
    threats: Record<string, number>,
    colorStrengths: Record<CardColor, number>
  ): number {
    let modifier = 0;
    const face = this.getActiveFace(card, state.activeSide);
    const nextPlayerIndex = (state.currentPlayerIndex + (state.direction === 'CW' ? 1 : -1) + state.players.length) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const isNextPlayerThreat = threats[nextPlayer?.id] >= 75;

    switch (personality) {
      case 'Strategist':
        // Plays cards matching color strengths to drain hand
        if (face.color !== 'WILD') {
          modifier += colorStrengths[face.color] * 3;
        }
        // Save Wild Draw Four until absolute threat or end
        if (face.value === 'WILD_DRAW_FOUR') {
          modifier -= 15;
        }
        // Increase action card weight to block low-card opponents
        if (isNextPlayerThreat && (face.value === 'SKIP' || face.value === 'REVERSE' || face.value === 'DRAW_TWO' || face.value === 'WILD_DRAW_FOUR')) {
          modifier += 25;
        }
        break;

      case 'Aggressive':
        // Loves playing penalty card multipliers (+2, +4, +5)
        if (face.value === 'DRAW_TWO' || face.value === 'WILD_DRAW_FOUR' || face.value === 'DRAW_FIVE' || face.value === 'WILD_DRAW_FIVE') {
          modifier += 30;
        }
        // Loves skipping others
        if (face.value === 'SKIP' || face.value === 'SKIP_EVERYONE') {
          modifier += 20;
        }
        break;

      case 'Defensive':
        // Prefers number matching to hoard block action cards in hand
        if (
          face.value !== 'SKIP' && face.value !== 'SKIP_EVERYONE' &&
          face.value !== 'REVERSE' &&
          face.value !== 'DRAW_TWO' && face.value !== 'DRAW_FIVE' &&
          face.value !== 'WILD_DRAW_FOUR' && face.value !== 'WILD_DRAW_FIVE'
        ) {
          modifier += 15;
        }
        // Wilds used for emergencies only
        if (face.color === 'WILD') {
          modifier -= 25;
        }
        // Avoid playing FLIP card unless in danger
        if (face.value === 'FLIP') {
          modifier -= 10;
        }
        break;

      case 'Chaotic':
        // Adds large random fluctuations
        modifier += Math.random() * 40 - 20;
        break;

      case 'Troll':
        // Holds drawer cards until someone calls LAST CARD, then slams it on them
        if (face.value === 'DRAW_TWO' || face.value === 'WILD_DRAW_FOUR' || face.value === 'DRAW_FIVE' || face.value === 'WILD_DRAW_FIVE') {
          if (isNextPlayerThreat) {
            modifier += 50; // punish them!
          } else {
            modifier -= 20; // save it to troll them later
          }
        }
        // Loves skipping/reversing when opponent has small hands
        if (isNextPlayerThreat && (face.value === 'SKIP' || face.value === 'SKIP_EVERYONE' || face.value === 'REVERSE')) {
          modifier += 40;
        }
        break;
    }

    return modifier;
  }

  private static getHardModeWeights(
    card: Card,
    state: GameState,
    threats: Record<string, number>,
    colorStrengths: Record<CardColor, number>
  ): number {
    const face = this.getActiveFace(card, state.activeSide);
    const nextPlayerIndex = (state.currentPlayerIndex + (state.direction === 'CW' ? 1 : -1) + state.players.length) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];
    const nextThreat = threats[nextPlayer?.id] || 0;
    let modifier = 0;

    if (face.color !== 'WILD') {
      modifier += colorStrengths[face.color] * 2;
    }

    if (nextThreat >= 75 && ['SKIP', 'SKIP_EVERYONE', 'REVERSE', 'DRAW_TWO', 'DRAW_FIVE', 'WILD_DRAW_FOUR', 'WILD_DRAW_FIVE'].includes(face.value)) {
      modifier += 28;
    }

    if (face.color === 'WILD') {
      const strongestColorCount = Math.max(colorStrengths.RED, colorStrengths.BLUE, colorStrengths.YELLOW, colorStrengths.GREEN);
      modifier += strongestColorCount >= 3 ? 10 : -8;
    }

    return modifier;
  }

  // Choose colors with maximum cards in hand
  private static selectBestColor(cards: Card[], personality: AiPersonality, activeSide: CardSide = 'LIGHT'): CardColor {
    const counts = this.estimateColorStrengths(cards, activeSide);
    let best: CardColor = 'RED';
    let max = -1;

    // Pick colored with highest representation
    const colors: CardColor[] = ['RED', 'BLUE', 'YELLOW', 'GREEN'];
    if (personality === 'Chaotic') {
      return colors[Math.floor(Math.random() * colors.length)];
    }

    for (const color of colors) {
      if (counts[color] > max) {
        max = counts[color];
        best = color;
      }
    }
    return best;
  }

}
