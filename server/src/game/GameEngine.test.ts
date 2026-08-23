import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from './GameEngine';
import { Card, Player, MatchRules } from 'cards-shared';
import { isValidPlay, createDeck } from 'cards-shared';

describe('Card Rules and Deck Generation tests', () => {
  it('should generate a standard 108 card deck', () => {
    const deck = createDeck();
    expect(deck.length).toBe(108);
  });

  it('should validate normal matching cards play', () => {
    // Red 5 matches Red 2 (color match)
    expect(isValidPlay({ id: '1', lightFace: { color: 'RED', value: '5' }, darkFace: { color: 'RED', value: '5' } }, 'RED', '2', 0, { stacking: false, flipMode: false } as any, 'LIGHT')).toBe(true);
    // Green 9 matches Red 9 (value match)
    expect(isValidPlay({ id: '2', lightFace: { color: 'GREEN', value: '9' }, darkFace: { color: 'GREEN', value: '9' } }, 'RED', '9', 0, { stacking: false, flipMode: false } as any, 'LIGHT')).toBe(true);
    // Yellow skip matches Blue skip
    expect(isValidPlay({ id: '3', lightFace: { color: 'YELLOW', value: 'SKIP' }, darkFace: { color: 'YELLOW', value: 'SKIP' } }, 'BLUE', 'SKIP', 0, { stacking: false, flipMode: false } as any, 'LIGHT')).toBe(true);
    // Yellow reverse matches Blue 2 (invalid)
    expect(isValidPlay({ id: '4', lightFace: { color: 'YELLOW', value: 'REVERSE' }, darkFace: { color: 'YELLOW', value: 'REVERSE' } }, 'BLUE', '2', 0, { stacking: false, flipMode: false } as any, 'LIGHT')).toBe(false);
  });

  it('should validate stacking compliance rules', () => {
    const rules: MatchRules = {
      stacking: true,
      jumpIn: false,
      drawUntilPlayable: false,
      challengeWild4: false,
      timerMode: false,
      timerSeconds: 15,
      startingHandSize: 7,
      scoreLimit: 500,
      roundLimit: 5,
      flipMode: false
    };

    // Stacking +2 on top of +2 is valid
    const cardPlus2 = { id: 'c1', lightFace: { color: 'RED', value: 'DRAW_TWO' }, darkFace: { color: 'RED', value: 'DRAW_TWO' } } as any;
    expect(isValidPlay(cardPlus2, 'BLUE', 'DRAW_TWO', 2, rules, 'LIGHT')).toBe(true);

    // Stacking standard card on top of +2 is invalid if stack count is active
    const cardNormal = { id: 'c2', lightFace: { color: 'BLUE', value: '5' }, darkFace: { color: 'BLUE', value: '5' } } as any;
    expect(isValidPlay(cardNormal, 'BLUE', 'DRAW_TWO', 2, rules, 'LIGHT')).toBe(false);
  });
});

describe('GameEngine State Machine tests', () => {
  const dummyPlayers: Player[] = [
    { id: 'p1', name: 'Alice', avatar: 'avatar_1', isAi: false, isReady: true, cards: [], isSpectator: false, isDisconnected: false, score: 0 },
    { id: 'p2', name: 'Bob', avatar: 'avatar_2', isAi: false, isReady: true, cards: [], isSpectator: false, isDisconnected: false, score: 0 }
  ];

  const dummyRules: MatchRules = {
    stacking: true,
    jumpIn: false,
    drawUntilPlayable: false,
    challengeWild4: false,
    timerMode: false,
    timerSeconds: 15,
    startingHandSize: 7,
    scoreLimit: 500,
    roundLimit: 5,
    flipMode: false
  };

  const makeCard = (id: string, color: Card['lightFace']['color'], value: Card['lightFace']['value']): Card => ({
    id,
    lightFace: { color, value },
    darkFace: { color, value },
  });

  const makePlayers = (count: number): Player[] => Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    avatar: `avatar_${index + 1}`,
    isAi: false,
    isReady: true,
    cards: [],
    isSpectator: false,
    isDisconnected: false,
    score: 0,
  }));

  it('should deal starting cards and set active top card on startMatch', () => {
    const engine = new GameEngine('room1', dummyPlayers, dummyRules);
    engine.startMatch();

    const state = engine.getState();
    expect(state.status).toBe('PLAYING');
    expect(state.players[0].cards.length).toBe(7);
    expect(state.players[1].cards.length).toBe(7);
    expect(state.discardPile.length).toBe(1);
    expect(state.activeColor).toBe(state.discardPile[0].lightFace.color);
  });

  it('should block wild and draw-two cards from opening the center deck', () => {
    const engine = new GameEngine('room_initial_card', dummyPlayers, dummyRules);
    const blocksInitialCard = (card: any) => (engine as any).isBlockedInitialCard(card);

    expect(blocksInitialCard({
      id: 'plus_two_start',
      lightFace: { color: 'RED', value: 'DRAW_TWO' },
      darkFace: { color: 'RED', value: 'DRAW_TWO' }
    })).toBe(true);

    expect(blocksInitialCard({
      id: 'wild_start',
      lightFace: { color: 'WILD', value: 'WILD' },
      darkFace: { color: 'WILD', value: 'WILD' }
    })).toBe(true);

    expect(blocksInitialCard({
      id: 'safe_start',
      lightFace: { color: 'BLUE', value: '7' },
      darkFace: { color: 'BLUE', value: '7' }
    })).toBe(false);
  });

  it('should successfully cycle turns', () => {
    const engine = new GameEngine('room2', dummyPlayers, dummyRules);
    engine.startMatch();

    const stateBefore = engine.getState();
    const activeIndexBefore = stateBefore.currentPlayerIndex;

    // The opening card is randomized and may be a draw action. Set up a
    // neutral turn so this test verifies turn advancement, not deck luck.
    stateBefore.activeColor = 'RED';
    stateBefore.activeValue = '3';
    stateBefore.drawStackCount = 0;

    // Give player a matching card to play
    const activePlayer = stateBefore.players[activeIndexBefore];
    activePlayer.cards.push({ id: 'cheat_card', lightFace: { color: 'RED', value: '3' }, darkFace: { color: 'RED', value: '3' } });

    const success = engine.playCard(activePlayer.id, 'cheat_card');
    expect(success).toBe(true);

    const stateAfter = engine.getState();
    expect(stateAfter.currentPlayerIndex).not.toBe(activeIndexBefore); // Turn advanced
  });

  it('should reject a wild play with an invalid chosenColor without mutating state', () => {
    const rules: MatchRules = { ...dummyRules, jumpIn: false };
    const engine = new GameEngine('room-wild', dummyPlayers, rules);
    engine.startMatch();

    const state = engine.getState();
    const activePlayer = state.players[state.currentPlayerIndex];
    activePlayer.cards.push({ id: 'wild_card', lightFace: { color: 'WILD', value: 'WILD' }, darkFace: { color: 'WILD', value: 'WILD' } });

    const beforeColor = state.activeColor;
    const success = engine.playCard(activePlayer.id, 'wild_card', 'WILD' as any);
    expect(success).toBe(false);
    expect(engine.getState().activeColor).toBe(beforeColor);
    expect(activePlayer.cards.some(c => c.id === 'wild_card')).toBe(true);
  });

  it('should reject a jump-in that does not match color and value, without corrupting currentPlayerIndex', () => {
    const rules: MatchRules = { ...dummyRules, jumpIn: true };
    const engine = new GameEngine('room-jumpin-1', dummyPlayers, rules);
    engine.startMatch();

    const state = engine.getState();
    state.activeColor = 'RED';
    state.activeValue = '3';
    state.drawStackCount = 0;
    const turnIndexBefore = state.currentPlayerIndex;
    const otherIndex = (turnIndexBefore + 1) % state.players.length;
    const otherPlayer = state.players[otherIndex];
    otherPlayer.cards.push({ id: 'mismatch_card', lightFace: { color: 'BLUE', value: '7' }, darkFace: { color: 'BLUE', value: '7' } });

    const success = engine.playCard(otherPlayer.id, 'mismatch_card');
    expect(success).toBe(false);
    expect(engine.getState().currentPlayerIndex).toBe(turnIndexBefore); // turn untouched
  });

  it('should block a jump-in while a draw-stack penalty is active', () => {
    const rules: MatchRules = { ...dummyRules, jumpIn: true, stacking: true };
    const engine = new GameEngine('room-jumpin-2', dummyPlayers, rules);
    engine.startMatch();

    const state = engine.getState();
    state.activeColor = 'RED';
    state.activeValue = 'DRAW_TWO';
    state.drawStackCount = 2;
    const turnIndexBefore = state.currentPlayerIndex;
    const otherIndex = (turnIndexBefore + 1) % state.players.length;
    const otherPlayer = state.players[otherIndex];
    // Exact color+value match for jump-in, but a stack is pending.
    otherPlayer.cards.push({ id: 'jumpin_during_stack', lightFace: { color: 'RED', value: 'DRAW_TWO' }, darkFace: { color: 'RED', value: 'DRAW_TWO' } });

    const success = engine.playCard(otherPlayer.id, 'jumpin_during_stack');
    expect(success).toBe(false);
    expect(engine.getState().currentPlayerIndex).toBe(turnIndexBefore);
  });

  it('uses the dark card face after a Flip card is played', () => {
    const engine = new GameEngine('room-flip', dummyPlayers, { ...dummyRules, flipMode: true });
    engine.startMatch();
    const state = engine.getState();
    state.activeColor = 'RED';
    state.activeValue = '3';
    const player = state.players[state.currentPlayerIndex];
    player.cards.push({ id: 'flip_card', lightFace: { color: 'WILD', value: 'FLIP' }, darkFace: { color: 'WILD', value: 'FLIP' } });

    expect(engine.playCard(player.id, 'flip_card', 'BLUE')).toBe(true);
    expect(engine.getState().activeSide).toBe('DARK');
    expect(engine.getState().activeColor).toBe('BLUE');
  });

  it('should clear drawStackCount when a timed-out player auto-draws the penalty stack', () => {
    const rules: MatchRules = { ...dummyRules, stacking: true, timerMode: true };
    const engine = new GameEngine('room-timeout', dummyPlayers, rules);
    engine.startMatch();

    const state = engine.getState();
    state.drawStackCount = 4;

    engine.handleTimeout();

    expect(engine.getState().drawStackCount).toBe(0);
  });

  it('accumulates +2 stacks across multiple players', () => {
    const engine = new GameEngine('room-stack-plus-two', makePlayers(4), dummyRules);
    engine.startMatch();
    const state = engine.getState();

    state.activeColor = 'RED';
    state.activeValue = 'DRAW_TWO';
    state.drawStackCount = 2;
    state.currentPlayerIndex = 1;

    state.players[1].cards = [makeCard('p2_plus2', 'GREEN', 'DRAW_TWO')];
    expect(engine.playCard('p2', 'p2_plus2')).toBe(true);
    expect(engine.getState().drawStackCount).toBe(4);
    expect(engine.getState().currentPlayerIndex).toBe(2);

    state.players[2].cards = [makeCard('p3_plus2', 'YELLOW', 'DRAW_TWO')];
    expect(engine.playCard('p3', 'p3_plus2')).toBe(true);
    expect(engine.getState().drawStackCount).toBe(6);
    expect(engine.getState().currentPlayerIndex).toBe(3);

    state.players[3].cards = [makeCard('p4_plus2', 'BLUE', 'DRAW_TWO')];
    expect(engine.playCard('p4', 'p4_plus2')).toBe(true);
    expect(engine.getState().drawStackCount).toBe(8);
    expect(engine.getState().currentPlayerIndex).toBe(0);
  });

  it('allows +4 on +2 but blocks +2 on +4', () => {
    const engine = new GameEngine('room-stack-plus-four', makePlayers(3), dummyRules);
    engine.startMatch();
    const state = engine.getState();

    state.activeColor = 'RED';
    state.activeValue = 'DRAW_TWO';
    state.drawStackCount = 2;
    state.currentPlayerIndex = 1;

    state.players[1].cards = [makeCard('p2_plus4', 'WILD', 'WILD_DRAW_FOUR')];
    expect(engine.playCard('p2', 'p2_plus4', 'BLUE')).toBe(true);
    expect(engine.getState().drawStackCount).toBe(6);
    expect(engine.getState().activeValue).toBe('WILD_DRAW_FOUR');

    state.players[2].cards = [makeCard('p3_plus2', 'GREEN', 'DRAW_TWO')];
    expect(engine.playCard('p3', 'p3_plus2')).toBe(false);
    expect(engine.getState().drawStackCount).toBe(6);
  });

  it('skip advances over exactly one player', () => {
    const engine = new GameEngine('room-skip-one', makePlayers(4), dummyRules);
    engine.startMatch();
    const state = engine.getState();

    state.currentPlayerIndex = 0;
    state.direction = 'CW';
    state.activeColor = 'RED';
    state.activeValue = '5';
    state.players[0].cards = [makeCard('skip_card', 'RED', 'SKIP')];

    expect(engine.playCard('p1', 'skip_card')).toBe(true);
    expect(engine.getState().currentPlayerIndex).toBe(2);
  });

  it('reverse changes direction and sends play to the previous player', () => {
    const engine = new GameEngine('room-reverse-path', makePlayers(4), dummyRules);
    engine.startMatch();
    const state = engine.getState();

    state.currentPlayerIndex = 1;
    state.direction = 'CW';
    state.activeColor = 'GREEN';
    state.activeValue = '7';
    state.players[1].cards = [makeCard('reverse_card', 'GREEN', 'REVERSE')];

    expect(engine.playCard('p2', 'reverse_card')).toBe(true);
    expect(engine.getState().direction).toBe('CCW');
    expect(engine.getState().currentPlayerIndex).toBe(0);
  });

  it('attaches playerId to CARD_CALL and DRAW log entries (needed for client-side per-player UI state)', () => {
    const engine = new GameEngine('room-log-playerid', dummyPlayers, dummyRules);
    engine.startMatch();

    const state = engine.getState();
    const player = state.players[state.currentPlayerIndex];
    player.cards = player.cards.slice(0, 1);

    engine.callLastCard(player.id);
    const callLog = engine.getState().logs.find(l => l.type === 'CARD_CALL');
    expect(callLog?.playerId).toBe(player.id);

    const drawLog = (() => {
      engine.drawCard(player.id);
      return engine.getState().logs.filter(l => l.type === 'DRAW').pop();
    })();
    expect(drawLog?.playerId).toBe(player.id);
  });
});
