import { Card, CardColor, CardValue, GameState, MatchRules, Player, GameLogEntry, ReplayFrame, CardSide } from 'cards-shared';
import { createDeck, shuffle, isValidPlay, isValidJumpIn, getCardScore } from 'cards-shared';

const CHOOSABLE_COLORS: ReadonlySet<CardColor> = new Set(['RED', 'BLUE', 'YELLOW', 'GREEN']);

export class GameEngine {
  private state: GameState;
  private deck: Card[] = [];
  private replayFrames: ReplayFrame[] = [];
  private moveIndex = 0;
  private onStateChangeCallback?: (state: GameState) => void;
  private onGameOverCallback?: (winnerId: string, scores: Record<string, number>, placements: Record<string, number>, missedLastCardCalls: Record<string, number>) => void;
  private hasCalledLastCard: Record<string, boolean> = {}; // Tracks who called LAST CARD in their turn
  private missedLastCardCalls: Record<string, number> = {};
  private stateVersionCounter: number = 0; // Counter for state versioning

  constructor(roomId: string, players: Player[], rules: MatchRules) {
    this.state = {
      roomId,
      status: 'LOBBY',
      players: players.map(p => ({ ...p, cards: [], score: p.score || 0 })),
      currentPlayerIndex: 0,
      discardPile: [],
      drawPileCount: 0,
      activeColor: 'RED',
      activeValue: '0',
      direction: 'CW',
      drawStackCount: 0,
      winnerId: null,
      rules,
      logs: [],
      stateVersion: 0,
      activeSide: 'LIGHT'
    };
  }

  // Helper to get active face based on current side
  private getActiveFace(card: Card) {
    return this.state.activeSide === 'LIGHT' ? card.lightFace : card.darkFace;
  }

  public registerCallbacks(
    onStateChange: (state: GameState) => void,
    onGameOver: (winnerId: string, scores: Record<string, number>, placements: Record<string, number>, missedLastCardCalls: Record<string, number>) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onGameOverCallback = onGameOver;
  }

  public getState(): GameState {
    return this.state;
  }

  public getReplayLog(): ReplayFrame[] {
    return this.replayFrames;
  }

  // Starts the game
  public startMatch() {
    this.deck = createDeck(this.state.rules.flipMode);
    this.state.status = 'PLAYING';
    this.state.winnerId = null;
    this.state.direction = 'CW';
    this.state.activeSide = 'LIGHT';
    this.state.drawStackCount = 0;
    this.state.currentPlayerIndex = 0;
    this.state.discardPile = [];
    this.hasCalledLastCard = {};
    this.missedLastCardCalls = {};

    // Deal cards
    const startingHandSize = this.state.rules.startingHandSize || 7;
    for (const player of this.state.players) {
      player.cards = [];
      for (let i = 0; i < startingHandSize; i++) {
        const card = this.deck.pop();
        if (card) player.cards.push(card);
      }
    }

    // Flip first card
    let initialCard = this.deck.pop();
    while (initialCard && this.isBlockedInitialCard(initialCard)) {
      // Put back and shuffle if first card would make the opening turn awkward.
      this.deck.unshift(initialCard);
      this.deck = shuffle(this.deck);
      initialCard = this.deck.pop();
    }

    if (!initialCard) {
      initialCard = { 
        id: 'init', 
        lightFace: { color: 'RED', value: '0' },
        darkFace: { color: 'RED', value: '0' }
      };
    }

    const initialFace = this.getActiveFace(initialCard);
    this.state.discardPile.push(initialCard);
    this.state.activeColor = initialFace.color;
    this.state.activeValue = initialFace.value;
    this.state.drawPileCount = this.deck.length;

    this.addLog('SYSTEM', `Match started! Top card is ${initialFace.color} ${initialFace.value}`);

    // Apply immediate action if the first card is an action card
    this.applyInitialCardAction(initialCard);

    this.recordReplayFrame('START_MATCH');
    this.notifyStateChange();
  }

  private isBlockedInitialCard(card: Card): boolean {
    const face = this.getActiveFace(card);
    return face.color === 'WILD' || face.value === 'DRAW_TWO';
  }

  private applyInitialCardAction(card: Card) {
    const activePlayer = this.getCurrentPlayer();
    const face = this.getActiveFace(card);
    if (face.value === 'SKIP') {
      this.addLog('SKIP', `${activePlayer.name}'s first turn is skipped.`);
      this.advanceTurn();
    } else if (face.value === 'REVERSE') {
      this.state.direction = 'CCW';
      this.addLog('REVERSE', `Play direction reversed to Counter-Clockwise.`);
      // If 2 players, reverse works like skip, so the first dealer goes again or skipped.
      if (this.state.players.length === 2) {
        this.advanceTurn();
      }
    } else if (face.value === 'DRAW_TWO') {
      if (this.state.rules.stacking) {
        this.state.drawStackCount = 2;
        this.addLog('SYSTEM', `Initial stack contains +2. Stacking rules active.`);
      } else {
        this.addLog('SYSTEM', `${activePlayer.name} draws 2 cards due to initial setup.`);
        this.drawCardsForPlayer(activePlayer.id, 2);
        this.advanceTurn();
      }
    }
  }

  // Core play card operation
  public playCard(playerId: string, cardId: string, chosenColor?: CardColor): boolean {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    const player = this.state.players[playerIndex];
    const card = player.cards.find(c => c.id === cardId);
    if (!card) return false;

    const face = this.getActiveFace(card);

    // Wild color verification, checked before any state mutation below.
    // FLIP cards are also WILD-colored and (per the client's UX) require the
    // player to choose the new active color as part of playing them.
    if (face.color === 'WILD' && (!chosenColor || !CHOOSABLE_COLORS.has(chosenColor))) {
      return false; // must provide a real color selection
    }

    // Verify turn (unless Jump-In rules are enabled). All validation must
    // pass before currentPlayerIndex is mutated for a jump-in, otherwise a
    // rejected jump-in would leave the turn state corrupted.
    const isMyTurn = playerIndex === this.state.currentPlayerIndex;
    let isJumpIn = false;

    if (!isMyTurn) {
      // Jump-ins are disallowed while a draw-stack penalty is unresolved;
      // the current player must respond to the stack first.
      if (
        this.state.rules.jumpIn &&
        this.state.drawStackCount === 0 &&
        isValidJumpIn(card, this.state.activeColor, this.state.activeValue, this.state.activeSide)
      ) {
        isJumpIn = true;
      } else {
        return false;
      }
    } else if (!isValidPlay(card, this.state.activeColor, this.state.activeValue, this.state.drawStackCount, this.state.rules, this.state.activeSide)) {
      return false;
    }

    if (isJumpIn) {
      this.state.currentPlayerIndex = playerIndex; // turn shifts to jump-in player
      this.addLog('PLAY', `${player.name} JUMPED IN!`);
    }

    // Execute play
    player.cards = player.cards.filter(c => c.id !== cardId);
    this.state.discardPile.push(card);
    this.state.activeValue = face.value;
    this.state.activeColor = face.color === 'WILD' ? chosenColor! : face.color;

    this.addLog('PLAY', `${player.name} played ${face.color === 'WILD' ? `Wild (${chosenColor})` : `${face.color} ${face.value}`}`, player.id);

    // Track LAST CARD rules.
    // If player has exactly 1 card left and didn't call LAST CARD yet:
    if (player.cards.length === 1 && !this.hasCalledLastCard[player.id]) {
      // They have a brief moment or we allow other players to challenge.
      this.addLog('SYSTEM', `${player.name} has 1 card remaining!`);
    }

    // Resolve stacking draw penalty if this player plays a matching draw card
    if (this.state.drawStackCount > 0 && (face.value === 'DRAW_TWO' || face.value === 'WILD_DRAW_FOUR' || face.value === 'DRAW_FIVE' || face.value === 'WILD_DRAW_FIVE')) {
      // The new card's penalty will be added in processCardAction - reset old stack first
      this.state.drawStackCount = 0;
    }

    // Process card action
    this.processCardAction(card, player);

    // Check Win state
    if (player.cards.length === 0) {
      this.resolveRoundWinner(player.id);
      return true;
    }

    this.recordReplayFrame('PLAY_CARD', player.id, card, undefined, chosenColor);
    this.notifyStateChange();
    return true;
  }

  private processCardAction(card: Card, player: Player) {
    const face = this.getActiveFace(card);
    const nextPlayer = this.getNextPlayer();

    if (face.value === 'FLIP') {
      this.state.activeSide = this.state.activeSide === 'LIGHT' ? 'DARK' : 'LIGHT';
      this.addLog('SYSTEM', `🔃 ${player.name} flipped the deck to its ${this.state.activeSide.toLowerCase()} side.`);
      this.advanceTurn();
    } else if (face.value === 'SKIP') {
      this.addLog('SKIP', `${nextPlayer.name} was skipped.`);
      this.advanceTurn();
      this.advanceTurn();
    } else if (face.value === 'SKIP_EVERYONE') {
      // UNO Flip edition: skip all other players, current player plays again
      this.addLog('SKIP_EVERYONE', `${player.name} skipped everyone and plays again.`);
      // Don't advance turn - current player goes again
    } else if (face.value === 'REVERSE') {
      this.state.direction = this.state.direction === 'CW' ? 'CCW' : 'CW';
      this.addLog('REVERSE', `Play direction reversed.`);
      if (this.state.players.length === 2) {
        // In 2 player games, Reverse skips the other player, keeping it your turn
        this.addLog('SKIP', `${nextPlayer.name} was skipped.`);
        this.advanceTurn();
      }
    } else if (face.value === 'DRAW_TWO') {
      if (!this.state.rules.stacking) {
        this.addLog('SYSTEM', `${nextPlayer.name} must draw 2 and is skipped.`);
        this.drawCardsForPlayer(nextPlayer.id, 2);
        this.advanceTurn();
        this.advanceTurn();
      } else {
        if (this.state.drawStackCount === 0) this.state.drawStackCount = 2;
        this.addLog('SYSTEM', `Draw stack is now +${this.state.drawStackCount}. Pass to ${nextPlayer.name}`);
        this.advanceTurn();
      }
    } else if (face.value === 'DRAW_FIVE') {
      // UNO Flip edition: draw 5 cards
      if (!this.state.rules.stacking) {
        this.addLog('SYSTEM', `${nextPlayer.name} must draw 5 and is skipped.`);
        this.drawCardsForPlayer(nextPlayer.id, 5);
        this.advanceTurn();
        this.advanceTurn();
      } else {
        if (this.state.drawStackCount === 0) this.state.drawStackCount = 5;
        else this.state.drawStackCount += 5;
        this.addLog('SYSTEM', `Draw stack is now +${this.state.drawStackCount}. Pass to ${nextPlayer.name}`);
        this.advanceTurn();
      }
    } else if (face.value === 'WILD_DRAW_FOUR') {
      if (!this.state.rules.stacking) {
        this.addLog('SYSTEM', `${nextPlayer.name} must draw 4 and is skipped.`);
        this.drawCardsForPlayer(nextPlayer.id, 4);
        this.advanceTurn();
        this.advanceTurn();
      } else {
        if (this.state.drawStackCount === 0) this.state.drawStackCount = 4;
        else this.state.drawStackCount += 4;
        this.addLog('SYSTEM', `Draw stack is now +${this.state.drawStackCount}. Pass to ${nextPlayer.name}`);
        this.advanceTurn();
      }
    } else if (face.value === 'WILD_DRAW_FIVE') {
      // UNO Flip edition: wild draw 5
      if (!this.state.rules.stacking) {
        this.addLog('SYSTEM', `${nextPlayer.name} must draw 5 and is skipped.`);
        this.drawCardsForPlayer(nextPlayer.id, 5);
        this.advanceTurn();
        this.advanceTurn();
      } else {
        if (this.state.drawStackCount === 0) this.state.drawStackCount = 5;
        else this.state.drawStackCount += 5;
        this.addLog('SYSTEM', `Draw stack is now +${this.state.drawStackCount}. Pass to ${nextPlayer.name}`);
        this.advanceTurn();
      }
    } else {
      // Normal number card — advance turn.
      this.advanceTurn();
    }
  }

  // Draw card operation
  public drawCard(playerId: string): boolean {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1 || playerIndex !== this.state.currentPlayerIndex) return false;

    const player = this.state.players[playerIndex];

    // If there is an unresolved draw stack penalty
    if (this.state.drawStackCount > 0) {
      const penalty = this.state.drawStackCount;
      this.addLog('DRAW', `${player.name} draws penalty stack of ${penalty} cards.`, player.id);
      this.drawCardsForPlayer(player.id, penalty);
      this.state.drawStackCount = 0;
      this.hasCalledLastCard[player.id] = false;
      this.advanceTurn();
      this.recordReplayFrame('DRAW_CARD_STACK', player.id);
      this.notifyStateChange();
      return true;
    }

    // Normal draw
    if (this.state.rules.drawUntilPlayable) {
      let drawnCard: Card | null = null;
      let count = 0;
      do {
        drawnCard = this.drawSingleCard();
        if (drawnCard) {
          player.cards.push(drawnCard);
          count++;
        }
      } while (
        drawnCard &&
        !isValidPlay(drawnCard, this.state.activeColor, this.state.activeValue, 0, this.state.rules, this.state.activeSide) &&
        this.deck.length > 0
      );

      this.addLog('DRAW', `${player.name} drew ${count} cards until playable found.`, player.id);
    } else {
      const card = this.drawSingleCard();
      if (card) {
        player.cards.push(card);
        this.addLog('DRAW', `${player.name} draws a card.`, player.id);

        // Check if the drawn card can be played immediately.
        // If it is playable, we let them play or pass. If not playable, we auto-advance turn.
        const canPlayDrawn = isValidPlay(card, this.state.activeColor, this.state.activeValue, 0, this.state.rules, this.state.activeSide);
        if (!canPlayDrawn) {
          this.advanceTurn();
        }
      }
    }

    this.hasCalledLastCard[player.id] = false;
    this.recordReplayFrame('DRAW_CARD', player.id);
    this.notifyStateChange();
    return true;
  }

  // Draw card and pass turn if player decides not to play the drawn card
  public passTurn(playerId: string): boolean {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1 || playerIndex !== this.state.currentPlayerIndex) return false;

    this.addLog('SYSTEM', `${this.state.players[playerIndex].name} passes turn.`);
    this.advanceTurn();
    this.recordReplayFrame('PASS_TURN', playerId);
    this.notifyStateChange();
    return true;
  }

  // Call LAST CARD
  public callLastCard(playerId: string): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    this.hasCalledLastCard[playerId] = true;
    this.addLog('CARD_CALL', `📣 ${player.name} calls LAST CARD!`, playerId);
    this.recordReplayFrame('CARD_CALL', playerId);
    this.notifyStateChange();
    return true;
  }

  // Challenge player who forgot to call LAST CARD
  public challengeLastCard(challengerId: string, targetPlayerId: string): boolean {
    const challenger = this.state.players.find(p => p.id === challengerId);
    const target = this.state.players.find(p => p.id === targetPlayerId);
    if (!challenger || !target) return false;

    // A challenge is valid if the target player has exactly 1 card left, and did NOT call LAST CARD.
    if (target.cards.length === 1 && !this.hasCalledLastCard[target.id]) {
      this.addLog('CHALLENGE', `💥 ${challenger.name} challenged ${target.name} for forgetting to call LAST CARD! Penalty +2 cards.`);
      this.drawCardsForPlayer(target.id, 2);
      this.missedLastCardCalls[target.id] = (this.missedLastCardCalls[target.id] || 0) + 1;
      this.hasCalledLastCard[target.id] = true; // prevent double penalty
      this.recordReplayFrame('CHALLENGE_SUCCESS', challengerId, undefined, targetPlayerId);
      this.notifyStateChange();
      return true;
    }

    // False challenge penalty
    this.addLog('CHALLENGE', `❌ False challenge by ${challenger.name}. Penalty +2 cards.`);
    this.drawCardsForPlayer(challenger.id, 2);
    this.recordReplayFrame('CHALLENGE_FAIL', challengerId);
    this.notifyStateChange();
    return true;
  }

  // Auto play card/draw on timer runout
  public handleTimeout() {
    const currentPlayer = this.getCurrentPlayer();
    this.addLog('SYSTEM', `⏱️ ${currentPlayer.name} ran out of time! Auto drawing card.`);
    const prevCardCount = currentPlayer.cards.length;
    this.drawCard(currentPlayer.id);

    // If player drew a playable card but didn't act, auto-pass to prevent stalling
    const newCardCount = currentPlayer.cards.length;
    if (newCardCount > prevCardCount && this.state.currentPlayerIndex === this.state.players.findIndex(p => p.id === currentPlayer.id)) {
      // Still the same player's turn after draw (drew a playable card), auto-pass
      this.passTurn(currentPlayer.id);
    }
  }

  private drawSingleCard(): Card | null {
    if (this.deck.length === 0) {
      // Check if discard pile is also exhausted (complete deck exhaustion)
      if (this.state.discardPile.length <= 1) {
        this.addLog('SYSTEM', 'Deck completely exhausted. Game ends in draw.');
        this.state.status = 'GAME_OVER';
        this.state.winnerId = null; // No winner, it's a draw
        if (this.onGameOverCallback) {
          this.onGameOverCallback('', {}, this.calculatePlacements(''), this.missedLastCardCalls); // Empty scores for draw
        }
        return null;
      }

      // Re-populate from discard pile
      const topDiscard = this.state.discardPile.pop();
      if (!topDiscard) return null;

      this.deck = shuffle(this.state.discardPile);
      this.state.discardPile = [topDiscard];
      this.addLog('SYSTEM', `Shuffled discard pile back into draw deck.`);
    }

    const card = this.deck.pop();
    this.state.drawPileCount = this.deck.length;
    return card || null;
  }

  private drawCardsForPlayer(playerId: string, count: number) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    for (let i = 0; i < count; i++) {
      const card = this.drawSingleCard();
      if (card) player.cards.push(card);
    }
  }

  private advanceTurn() {
    const numPlayers = this.state.players.length;
    if (this.state.direction === 'CW') {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % numPlayers;
    } else {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex - 1 + numPlayers) % numPlayers;
    }
  }

  private resolveRoundWinner(winnerId: string) {
    this.state.winnerId = winnerId;
    this.state.status = 'GAME_OVER';

    // Calculate score of round
    let roundPoints = 0;
    const scoresMap: Record<string, number> = {};

    for (const player of this.state.players) {
      if (player.id !== winnerId) {
        const handPoints = player.cards.reduce((sum, c) => sum + getCardScore(c, this.state.activeSide), 0);
        roundPoints += handPoints;
      }
    }

    const winner = this.state.players.find(p => p.id === winnerId);
    if (winner) {
      winner.score += roundPoints;
      this.addLog('SYSTEM', `🏆 ${winner.name} wins the round and gains ${roundPoints} points! (Total score: ${winner.score})`);
    }

    for (const p of this.state.players) {
      scoresMap[p.id] = p.score;
    }

    if (this.onGameOverCallback) {
      this.onGameOverCallback(winnerId, scoresMap, this.calculatePlacements(winnerId), this.missedLastCardCalls);
    }
  }

  private calculatePlacements(winnerId: string): Record<string, number> {
    const handValue = (player: Player) => player.cards.reduce((total, card) => total + getCardScore(card, this.state.activeSide), 0);
    const orderedPlayers = [...this.state.players].sort((a, b) => {
      if (a.id === winnerId) return -1;
      if (b.id === winnerId) return 1;
      return (a.cards.length - b.cards.length) || (handValue(a) - handValue(b));
    });
    return orderedPlayers.reduce<Record<string, number>>((placements, player, index) => {
      placements[player.id] = index + 1;
      return placements;
    }, {});
  }

  private getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  private getNextPlayer(): Player {
    const numPlayers = this.state.players.length;
    let nextIndex: number;
    if (this.state.direction === 'CW') {
      nextIndex = (this.state.currentPlayerIndex + 1) % numPlayers;
    } else {
      nextIndex = (this.state.currentPlayerIndex - 1 + numPlayers) % numPlayers;
    }
    return this.state.players[nextIndex];
  }

  private addLog(type: GameLogEntry['type'], message: string, playerId?: string) {
    const log: GameLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      type,
      message,
      playerId
    };
    this.state.logs.push(log);
    if (this.state.logs.length > 50) {
      this.state.logs.shift(); // keep size constrained
    }
  }

  private recordReplayFrame(actionType: string, playerId?: string, card?: Card, targetPlayerId?: string, calledColor?: CardColor) {
    const { discardPile, ...rest } = this.state;
    const topDiscard = discardPile[discardPile.length - 1] || null;

    this.replayFrames.push({
      timestamp: Date.now(),
      moveIndex: this.moveIndex++,
      action: {
        type: actionType,
        playerId,
        card,
        targetPlayerId,
        calledColor
      },
      stateSnapshot: {
        ...rest,
        discardPileTop: topDiscard
      }
    });

    // Unlike logs, this had no cap and could grow unbounded for the life of
    // a long game. Mirror the same size-constraining pattern used for logs.
    if (this.replayFrames.length > 500) {
      this.replayFrames.shift();
    }
  }

  private notifyStateChange() {
    this.stateVersionCounter++;
    this.state.stateVersion = this.stateVersionCounter;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ ...this.state });
    }
  }
}
