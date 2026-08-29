'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useAudio } from '../hooks/useAudio';
import { Card, CardColor, Player, CardSide } from 'cards-shared';
import PlayerHand from './PlayerHand';
import OpponentHand from './OpponentHand';
import BorderGlow from './BorderGlow';
import { SharedNavbar } from './SharedNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, ShieldAlert, MessagesSquare, RotateCw, RotateCcw, AlertTriangle, Gamepad2, Send, X, Zap, ArrowLeft } from 'lucide-react';
import { getCardSymbol, getCardBgHex, getCardGlowHsl, getCardGradientColors, getCardValueColor } from '../lib/cardColors';

type OpponentSeatPosition = 'top' | 'left' | 'right' | 'bottom';

interface OpponentSeat {
  player: Player;
  handPosition: OpponentSeatPosition;
  style: React.CSSProperties;
  enterFrom: { x?: number; y?: number };
}

type OpponentSeatBase = Omit<OpponentSeat, 'player' | 'enterFrom'>;
type OpponentSeatTemplate = Omit<OpponentSeat, 'player'>;

const seatStyle = (
  style: React.CSSProperties,
  handPosition: OpponentSeatPosition,
  compact = false,
): OpponentSeatBase => ({
  handPosition,
  style: {
    width: handPosition === 'top' || handPosition === 'bottom'
      ? (compact ? 'clamp(118px, 34vw, 170px)' : 'clamp(240px, 30vw, 440px)')
      : (compact ? 'clamp(58px, 16vw, 82px)' : 'clamp(128px, 13vw, 180px)'),
    height: handPosition === 'top' || handPosition === 'bottom'
      ? (compact ? 'clamp(56px, 12vh, 78px)' : 'clamp(120px, 17vh, 170px)')
      : (compact ? 'clamp(118px, 26vh, 168px)' : 'clamp(250px, 38vh, 430px)'),
    ...style,
  },
});

const getOpponentSeatLayout = (count: number, compact = false, largeTable = false): OpponentSeatTemplate[] => {
  const topCenter = seatStyle({ left: '50%', top: compact ? '6%' : '7%', transform: 'translateX(-50%)' }, 'top', compact);
  const topLeft = seatStyle({ left: compact ? '34%' : '25%', top: compact ? '6%' : '8%', transform: 'translateX(-50%)' }, 'top', compact);
  const topRight = seatStyle({ right: compact ? '34%' : '25%', top: compact ? '6%' : '8%', transform: 'translateX(50%)' }, 'top', compact);
  const leftMiddle = seatStyle({ left: compact ? '1.1rem' : '2.5%', top: compact ? '36%' : '34%' }, 'left', compact);
  const rightMiddle = seatStyle({ right: compact ? '1.1rem' : '2.5%', top: compact ? '36%' : '34%' }, 'right', compact);
  const leftUpper = seatStyle({ left: compact ? '1.1rem' : '6%', top: compact ? '26%' : '24%' }, 'left', compact);
  const rightUpper = seatStyle({ right: compact ? '1.1rem' : '6%', top: compact ? '26%' : '24%' }, 'right', compact);
  const leftLower = seatStyle({ left: compact ? '10%' : '8%', bottom: compact ? '19%' : '16%' }, 'bottom', compact);
  const rightLower = seatStyle({ right: compact ? '10%' : '8%', bottom: compact ? '19%' : '16%' }, 'bottom', compact);

  if (largeTable) {
    const largeSeat = (
      style: React.CSSProperties,
      handPosition: OpponentSeatPosition,
    ): OpponentSeatBase => ({
      handPosition,
      style: {
        width: compact ? 'clamp(76px, 11vw, 94px)' : 'clamp(110px, 9vw, 138px)',
        height: compact ? 'clamp(106px, 30vh, 128px)' : 'clamp(156px, 22vh, 184px)',
        ...style,
      },
    });
    const largeTopCenter = largeSeat({ left: '50%', top: compact ? '4.5%' : '14%', transform: 'translateX(-50%)' }, 'top');
    const largeTopLeft = largeSeat({ left: compact ? '22%' : '24%' }, 'top');
    largeTopLeft.style.top = compact ? '5%' : '15%';
    largeTopLeft.style.transform = 'translateX(-50%)';
    const largeTopRight = largeSeat({ right: compact ? '22%' : '24%' }, 'top');
    largeTopRight.style.top = compact ? '5%' : '15%';
    largeTopRight.style.transform = 'translateX(50%)';
    const largeLeftMiddle = largeSeat({ left: compact ? '0.55rem' : '4%', top: compact ? '31%' : '38%' }, 'left');
    const largeRightMiddle = largeSeat({ right: compact ? '0.55rem' : '4%', top: compact ? '31%' : '38%' }, 'right');
    const largeLeftUpper = largeSeat({ left: compact ? '0.55rem' : '5%', top: compact ? '18%' : '27%' }, 'left');
    const largeRightUpper = largeSeat({ right: compact ? '0.55rem' : '5%', top: compact ? '18%' : '27%' }, 'right');
    const largeLeftLowerSide = largeSeat({ left: compact ? '0.55rem' : '5%', top: compact ? '46%' : '50%' }, 'left');
    const largeRightLowerSide = largeSeat({ right: compact ? '0.55rem' : '5%', top: compact ? '46%' : '50%' }, 'right');

    const largeLayouts: OpponentSeatBase[][] = [
      [],
      [largeTopCenter],
      [largeLeftMiddle, largeRightMiddle],
      [largeTopCenter, largeLeftMiddle, largeRightMiddle],
      [largeTopLeft, largeTopRight, largeLeftMiddle, largeRightMiddle],
      [largeLeftLowerSide, largeLeftUpper, largeTopCenter, largeRightUpper, largeRightLowerSide],
      [largeLeftLowerSide, largeLeftUpper, largeTopLeft, largeTopRight, largeRightUpper, largeRightLowerSide],
      [largeLeftLowerSide, largeLeftUpper, largeTopLeft, largeTopCenter, largeTopRight, largeRightUpper, largeRightLowerSide],
    ];

    return largeLayouts[Math.min(count, largeLayouts.length - 1)].map(seat => ({
      ...seat,
      enterFrom:
        seat.handPosition === 'left' ? { x: -40 } :
        seat.handPosition === 'right' ? { x: 40 } :
        { y: -40 },
    }));
  }

  const layouts: OpponentSeatBase[][] = [
    [],
    [topCenter],
    [leftMiddle, rightMiddle],
    [topCenter, leftMiddle, rightMiddle],
    [topLeft, topRight, leftMiddle, rightMiddle],
    [topCenter, leftUpper, rightUpper, leftLower, rightLower],
    [topLeft, topRight, leftMiddle, rightMiddle, leftLower, rightLower],
    [topCenter, leftUpper, rightUpper, leftMiddle, rightMiddle, leftLower, rightLower],
  ];

  return layouts[Math.min(count, layouts.length - 1)].map(seat => ({
    ...seat,
    enterFrom:
      seat.handPosition === 'left' ? { x: -40 } :
      seat.handPosition === 'right' ? { x: 40 } :
      seat.style.bottom ? { y: 40 } :
      { y: -40 },
  }));
};

const getSeatNamePosition = (position: OpponentSeatPosition, compact = false): React.CSSProperties => {
  if (position === 'left') {
    return compact
      ? { left: '50%', bottom: '-0.5rem', transform: 'translate(-50%, 100%)' }
      : { right: '-0.75rem', top: '50%', transform: 'translate(100%, -50%)' };
  }
  if (position === 'right') {
    return compact
      ? { left: '50%', bottom: '-0.5rem', transform: 'translate(-50%, 100%)' }
      : { left: '-0.75rem', top: '50%', transform: 'translate(-100%, -50%)' };
  }
  if (position === 'bottom') {
    return { left: '50%', top: '-0.75rem', transform: 'translate(-50%, -100%)' };
  }
  return { left: '50%', bottom: '-0.75rem', transform: 'translate(-50%, 100%)' };
};

export default function GameTable() {
  const {
    user,
    gameState,
    timerLeft,
    aiThinkingPlayerId,
    reactions,
    chatMessages,
    playCard,
    drawCard,
    passTurn,
    callLastCard,
    challengeLastCard,
    sendChat,
    sendReaction,
    leaveRoom,
    matchResult
  } = useGameStore();

  const audio = useAudio();
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
  const [drawnPlayableCardId, setDrawnPlayableCardId] = useState<string | null>(null);
  const [pendingPlayCardId, setPendingPlayCardId] = useState<string | null>(null);
  const [lastCardActionCoolingDown, setLastCardActionCoolingDown] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatText, setChatText] = useState('');
  const [soundMuted, setSoundMuted] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [previousSide, setPreviousSide] = useState<'LIGHT' | 'DARK'>('LIGHT');
  const [prevCardCount, setPrevCardCount] = useState<number | null>(null);
  const [prevTurnIndex, setPrevTurnIndex] = useState<number | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [viewport, setViewport] = useState({ width: 1024, height: 768, isTouch: false });
  const discardSnapshotRef = useRef<{ length: number; lastCardId: string | null } | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const [tableCardFlight, setTableCardFlight] = useState<{
    id: string;
    card: Card;
    activeSide: CardSide;
    from: { x: number; y: number };
    to: { x: number; y: number };
    width: number;
    height: number;
    rotate: number;
  } | null>(null);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        isTouch: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
      });
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!showChatPanel) return;
    chatListRef.current?.scrollTo({
      top: chatListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages, showChatPanel]);

  const handleConfirmExit = async () => {
    setIsLeaving(true);
    audio.playSelect();
    await leaveRoom();
  };

  useEffect(() => {
    if (!gameState) return;
    if (timerLeft > 0 && timerLeft <= 3 && gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === user?.id)) {
      audio.playTimerAlert();
    }
  }, [timerLeft, gameState, user?.id, audio]);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'GAME_OVER') {
      if (gameState.winnerId === user?.id) {
        audio.playVictory();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        audio.playDefeat();
      }
    }
  }, [gameState?.status, gameState?.winnerId, user?.id, audio]);

  // Detect when it's our turn: if cards increased by 1 and the new card is playable, mark it
  useEffect(() => {
    if (!gameState) return;
    const me = gameState.players.find(p => p.id === user?.id);
    const myIndex = gameState.players.findIndex(p => p.id === user?.id);
    const isMyTurn = gameState.currentPlayerIndex === myIndex;
    const currentCount = me?.cards.length ?? 0;

    // Reset drawnPlayableCardId when turn changes
    if (prevTurnIndex !== null && prevTurnIndex !== gameState.currentPlayerIndex) {
      setDrawnPlayableCardId(null);
      setPrevCardCount(currentCount);
      setPrevTurnIndex(gameState.currentPlayerIndex);
      return;
    }

    setPrevTurnIndex(gameState.currentPlayerIndex);

    // Detect a draw: it's our turn and our card count just went up by 1
    if (isMyTurn && prevCardCount !== null && currentCount === prevCardCount + 1 && me) {
      const newestCard = me.cards[me.cards.length - 1];
      const face = gameState.activeSide === 'LIGHT' ? newestCard.lightFace : newestCard.darkFace;
      const canPlay = face.color === 'WILD' || face.color === gameState.activeColor || face.value === gameState.activeValue;
      if (canPlay && gameState.drawStackCount === 0) {
        setDrawnPlayableCardId(newestCard.id);
      }
    }

    setPrevCardCount(currentCount);
  }, [gameState, user?.id, prevCardCount, prevTurnIndex]);

  // Detect flip events and trigger animations
  useEffect(() => {
    if (gameState && gameState.activeSide !== previousSide) {
      setIsFlipping(true);
      setPreviousSide(gameState.activeSide);
      audio.playFlip(); // Play flip sound effect
      
      // Reset flip animation after it completes
      setTimeout(() => {
        setIsFlipping(false);
      }, 600);
    }
  }, [gameState?.activeSide, previousSide, audio]);

  useEffect(() => {
    setPendingPlayCardId(null);
  }, [gameState]);

  const isCompactPhoneTable = viewport.width < 768 || (viewport.width <= 1024 && viewport.height <= 560);

  useEffect(() => {
    if (!gameState) return;

    const lastCard = gameState.discardPile[gameState.discardPile.length - 1];
    const previous = discardSnapshotRef.current;
    const currentSnapshot = {
      length: gameState.discardPile.length,
      lastCardId: lastCard?.id ?? null,
    };

    discardSnapshotRef.current = currentSnapshot;

    if (!previous || !lastCard) return;
    const discardAdvanced =
      gameState.discardPile.length > previous.length &&
      lastCard.id !== previous.lastCardId;

    if (!discardAdvanced) return;

    const latestPlayLog = [...gameState.logs].reverse().find(log => log.type === 'PLAY' && log.playerId);
    const playerId = latestPlayLog?.playerId;

    const animationFrame = window.requestAnimationFrame(() => {
      const targetElement = document.querySelector<HTMLElement>('[data-card-play-target]');
      const originElement = playerId
        ? document.querySelector<HTMLElement>(`[data-player-seat-id="${playerId.replace(/"/g, '\\"')}"]`)
        : null;

      const targetRect = targetElement?.getBoundingClientRect();
      const originRect = originElement?.getBoundingClientRect();
      const width = targetRect?.width || (isCompactPhoneTable ? 62 : 112);
      const height = targetRect?.height || (isCompactPhoneTable ? 88 : 160);
      const from = originRect
        ? {
            x: originRect.left + originRect.width / 2,
            y: originRect.top + originRect.height / 2,
          }
        : {
            x: window.innerWidth / 2,
            y: window.innerHeight - height,
          };
      const to = targetRect
        ? {
            x: targetRect.left + targetRect.width / 2,
            y: targetRect.top + targetRect.height / 2,
          }
        : {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          };
      const flightId = `${lastCard.id}-${gameState.stateVersion}`;

      setTableCardFlight({
        id: flightId,
        card: lastCard,
        activeSide: gameState.activeSide,
        from,
        to,
        width,
        height,
        rotate: from.x > to.x ? -9 : 9,
      });

      window.setTimeout(() => setTableCardFlight(current => (
        current?.id === flightId ? null : current
      )), isCompactPhoneTable ? 560 : 680);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [gameState?.discardPile, gameState?.logs, gameState?.stateVersion, gameState?.activeSide, isCompactPhoneTable]);

  if (!gameState) return null;

  // Theme classes based on active side
  const themeClasses = gameState.activeSide === 'LIGHT' 
    ? 'bg-gradient-to-br from-gray-100 to-gray-200' 
    : 'bg-gradient-to-br from-gray-900 to-black';

  const textThemeClass = gameState.activeSide === 'LIGHT' ? 'text-gray-900' : 'text-white';

  const me = gameState.players.find(p => p.id === user?.id);
  const myIndex = gameState.players.findIndex(p => p.id === user?.id);
  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = gameState.currentPlayerIndex === myIndex;
  const isPhonePortrait = viewport.isTouch && viewport.width < 768 && viewport.height > viewport.width;
  const isPhoneTable = isCompactPhoneTable;
  const isLargeTable = gameState.players.length >= 5;
  const compactCenterTop = isLargeTable ? '51.5%' : '44%';

  const hasPlayerCalledLastCard = (playerId?: string) => {
    if (!playerId) return false;
    for (let i = gameState.logs.length - 1; i >= 0; i--) {
      const log = gameState.logs[i];
      if (log.playerId !== playerId) continue;
      if (log.type === 'CARD_CALL') return true;
      if (log.type === 'DRAW') return false;
    }
    return false;
  };

  const hasCalledLastCard = Boolean(me && me.cards.length <= 2 && hasPlayerCalledLastCard(me.id));
  const challengeableOpponent = gameState.players.find(
    p => p.id !== user?.id && p.cards.length === 1 && !hasPlayerCalledLastCard(p.id)
  );
  const lastCardThreatOpponent = challengeableOpponent || gameState.players.find(
    p => p.id !== user?.id && p.cards.length === 2
  );

  const getViewRelativeOpponentOrder = () => {
    if (myIndex === -1) return gameState.players.filter(p => p.id !== user?.id);

    const numPlayers = gameState.players.length;
    const turnStep = gameState.direction === 'CW' ? 1 : -1;

    return Array.from({ length: numPlayers - 1 }, (_, i) => {
      const nextTurnOffset = turnStep * (i + 1);
      const idx = (myIndex + nextTurnOffset + numPlayers) % numPlayers;
      return gameState.players[idx];
    });
  };

  const orderedOpponents = getViewRelativeOpponentOrder();
  const opponentSeats: OpponentSeat[] = getOpponentSeatLayout(orderedOpponents.length, isPhoneTable, isLargeTable).map((seat, index) => ({
    ...seat,
    player: orderedOpponents[index],
  }));

  const playableCardIds = me
    ? me.cards
        .filter(c => {
          if (showColorSelector) return false;
          const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
          if (!topDiscard) return true;
          
          const face = gameState.activeSide === 'LIGHT' ? c.lightFace : c.darkFace;
          
          if (gameState.drawStackCount > 0) {
            if (!gameState.rules.stacking) return false;
            if (gameState.activeValue === 'DRAW_TWO') {
              return face.value === 'DRAW_TWO' || face.value === 'WILD_DRAW_FOUR' || face.value === 'WILD_DRAW_FIVE';
            }
            if (gameState.activeValue === 'DRAW_FIVE') {
              return face.value === 'DRAW_FIVE' || face.value === 'WILD_DRAW_FIVE';
            }
            if (gameState.activeValue === 'WILD_DRAW_FOUR') {
              return face.value === 'WILD_DRAW_FOUR' || face.value === 'WILD_DRAW_FIVE';
            }
            if (gameState.activeValue === 'WILD_DRAW_FIVE') {
              return face.value === 'WILD_DRAW_FIVE';
            }
            return false;
          }
          return face.color === 'WILD' || face.color === gameState.activeColor || face.value === gameState.activeValue;
        })
        .map(c => c.id)
    : [];
  const canCallLastCard = Boolean(
    me &&
    !hasCalledLastCard &&
    (me.cards.length === 1 || (isMyTurn && me.cards.length === 2 && playableCardIds.length > 0))
  );

  // Only allow drawing when it's our turn, we have no playable cards, and haven't drawn yet this turn
  const canDraw = isMyTurn && playableCardIds.length === 0 && drawnPlayableCardId === null;

  const handleCardPlayAttempt = (cardId: string) => {
    if (pendingPlayCardId) return;

    const card = me?.cards.find(c => c.id === cardId);
    if (!card) return;

    const face = gameState.activeSide === 'LIGHT' ? card.lightFace : card.darkFace;

    if (face.color === 'WILD') {
      setPendingWildCardId(cardId);
      setShowColorSelector(true);
    } else {
      audio.playPlayCard();
      setPendingPlayCardId(cardId);
      playCard(cardId);
      setDrawnPlayableCardId(null);
    }
  };

  const handleSelectColor = (color: CardColor) => {
    if (!pendingWildCardId) return;
    if (pendingPlayCardId) return;

    audio.playPlayCard();
    setPendingPlayCardId(pendingWildCardId);
    playCard(pendingWildCardId, color);
    setShowColorSelector(false);
    setPendingWildCardId(null);
    setDrawnPlayableCardId(null);
  };

  const handleDrawCard = () => {
    audio.playDraw();
    setDrawnPlayableCardId(null);
    drawCard();
  };

  const handleSendChatText = (e: React.FormEvent) => {
    e.preventDefault();
    const message = chatText.trim();
    if (!message) return;
    sendChat(message);
    setChatText('');
  };

  const handleSendQuickChat = (message: string) => {
    sendChat(message);
  };

  const triggerLastCardActionCooldown = () => {
    setLastCardActionCoolingDown(true);
    window.setTimeout(() => setLastCardActionCoolingDown(false), 350);
  };

  const actionCardClass = (enabled: boolean, active = false, compactAction = false) =>
    `${compactAction ? 'h-11 min-w-[7.2rem] gap-1.5 rounded-full px-4 text-[9px]' : 'h-12 min-w-[8.8rem] gap-2 rounded-xl px-4 text-[10px] sm:h-14 sm:min-w-[9.6rem]'} inline-flex touch-manipulation items-center justify-center border font-display font-black uppercase tracking-[0.12em] shadow-xl transition-all active:scale-95 ${
      active
        ? 'border-emerald-300/70 bg-emerald-500/25 text-emerald-100 ring-2 ring-emerald-300/30'
        : enabled
          ? 'border-red-200/70 bg-red-500/30 text-white ring-2 ring-red-300/35 hover:-translate-y-1 hover:bg-red-500 hover:shadow-red-500/30'
          : 'cursor-not-allowed border-white/10 bg-black/35 text-gray-600 opacity-55'
    }`;

  const toggleMute = () => {
    const nextMute = !soundMuted;
    setSoundMuted(nextMute);
    audio.setMute(nextMute);
  };

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const tableCardRadius = isPhoneTable ? 10 : 16;
  const handleCallLastCardAction = () => {
    if (!canCallLastCard || lastCardActionCoolingDown) return;
    triggerLastCardActionCooldown();
    audio.playLastCardCall();
    callLastCard();
  };
  const handleChallengeLastCardAction = () => {
    if (!challengeableOpponent || lastCardActionCoolingDown) return;
    triggerLastCardActionCooldown();
    challengeLastCard(challengeableOpponent.id);
  };
  const renderLastCardActions = (compactAction = false) => (
    <>
      <button
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return;
          handleCallLastCardAction();
        }}
        onClick={handleCallLastCardAction}
        disabled={!canCallLastCard || lastCardActionCoolingDown}
        aria-label={hasCalledLastCard ? 'Last card already called' : 'Call last card'}
        aria-pressed={hasCalledLastCard}
        title={hasCalledLastCard ? 'Last card already called' : 'Call last card'}
        style={{ touchAction: 'manipulation' }}
        className={actionCardClass(canCallLastCard && !lastCardActionCoolingDown, hasCalledLastCard, compactAction)}
      >
        <span className={compactAction ? 'text-sm leading-none' : 'text-base leading-none'}>{hasCalledLastCard ? '✓' : '1'}</span>
        <span>{compactAction ? 'Call' : 'Call Last'}</span>
      </button>
      <button
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return;
          handleChallengeLastCardAction();
        }}
        onClick={handleChallengeLastCardAction}
        disabled={!challengeableOpponent || lastCardActionCoolingDown}
        aria-label="Challenge last card"
        title={
          challengeableOpponent
            ? `Challenge ${challengeableOpponent.name}`
            : lastCardThreatOpponent
              ? `${lastCardThreatOpponent.name} is close to LAST CARD`
              : 'No LAST CARD threat'
        }
        style={{ touchAction: 'manipulation' }}
        className={actionCardClass(Boolean(challengeableOpponent) && !lastCardActionCoolingDown, Boolean(challengeableOpponent), compactAction)}
      >
        <Zap className={compactAction ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        <span>{compactAction ? 'Challenge' : 'Challenge'}</span>
      </button>
    </>
  );

  const getActiveFace = (card: Card) => {
    return gameState.activeSide === 'LIGHT' ? card.lightFace : card.darkFace;
  };

  const renderFlyingCard = (card: Card, activeSide: CardSide) => {
    const face = activeSide === 'LIGHT' ? card.lightFace : card.darkFace;

    return (
      <BorderGlow
        edgeSensitivity={20}
        glowIntensity={1.2}
        glowColor={getCardGlowHsl(face.color)}
        backgroundColor={getCardBgHex(face.color)}
        colors={getCardGradientColors(face.color)}
        borderRadius={isPhoneTable ? 10 : 18}
        glowRadius={18}
        className={`relative h-full w-full rounded-2xl border-2 select-none ${
          face.color === 'WILD' ? 'border-red-500/40' : 'border-white/30'
        }`}
      >
        <div className={`absolute left-[10%] top-[7%] text-xs sm:text-sm card-corner-number ${face.color === 'WILD' ? 'text-white' : ''}`}>
          {face.value === 'WILD' ? (
            <div className="card-wild-corner-symbol rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </div>
          ) : (
            getCardSymbol(face.value)
          )}
        </div>
        <div className="card-oval-insert flex items-center justify-center">
          {face.value === 'WILD' || face.value === 'WILD_DRAW_FOUR' || face.value === 'WILD_DRAW_FIVE' ? (
            <motion.div
              className="card-wild-symbol rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45"
              animate={{ rotate: [45, 48, 45] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ willChange: 'transform' }}
            >
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </motion.div>
          ) : (
            <span className={`card-oval-value font-extrabold ${getCardValueColor(face.color)}`}>
              {getCardSymbol(face.value)}
            </span>
          )}
        </div>
        <div className={`absolute bottom-[7%] right-[10%] text-xs sm:text-sm card-corner-number rotate-180 ${face.color === 'WILD' ? 'text-white' : ''}`}>
          {face.value === 'WILD' ? (
            <div className="card-wild-corner-symbol rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </div>
          ) : (
            getCardSymbol(face.value)
          )}
        </div>
      </BorderGlow>
    );
  };

  const gameNavActions = (
    <>
      <div className={`hidden lg:block px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-wider ${gameState.activeSide === 'LIGHT' ? 'bg-gray-200 border-gray-300 text-gray-700' : 'bg-white/5 border-white/10 text-gray-300'}`}>
        <span className={isMyTurn ? (gameState.activeSide === 'LIGHT' ? 'text-red-600' : 'text-red-400') : (gameState.activeSide === 'LIGHT' ? 'text-gray-900' : 'text-white')}>
          {isMyTurn ? 'Your turn' : `${currentTurnPlayer?.name}'s turn`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
          title={soundMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </>
  );

  if (isPhonePortrait) {
    return (
      <main className={`min-h-screen w-full ${themeClasses} bg-grid ${textThemeClass} relative overflow-hidden select-none font-sans transition-colors duration-600`}>
        <div className={`glow-effect h-[420px] w-[420px] ${gameState.activeSide === 'LIGHT' ? 'bg-red-500' : 'bg-red-650'} -top-32 -left-32`} style={{ opacity: gameState.activeSide === 'LIGHT' ? 0.15 : 0.12 }} />
        <div className={`glow-effect h-[420px] w-[420px] ${gameState.activeSide === 'LIGHT' ? 'bg-blue-400' : 'bg-white'} -bottom-32 -right-32`} style={{ opacity: gameState.activeSide === 'LIGHT' ? 0.08 : 0.04 }} />
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-[2rem] border border-red-300/20 bg-black/75 p-6 text-center shadow-2xl backdrop-blur-xl"
          >
            <motion.div
              animate={{ rotate: [0, 0, 90, 90, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl border border-red-400/30 bg-red-500/15 text-red-200"
            >
              <Gamepad2 className="h-9 w-9" />
            </motion.div>
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-red-300">Rotate to play</p>
            <h1 className="mt-3 font-display text-2xl font-black uppercase tracking-tight text-white">Turn your phone sideways</h1>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-300">
              The match will begin automatically once your phone is in landscape. This keeps every card, name, and action button readable.
            </p>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen w-full ${themeClasses} bg-grid ${textThemeClass} relative overflow-hidden select-none font-sans scrollbar-hide transition-colors duration-600`}>
      {/* Background glowing gradients */}
      <div className={`glow-effect w-[550px] h-[550px] ${gameState.activeSide === 'LIGHT' ? 'bg-red-500' : 'bg-red-650'} -top-40 -left-40`} style={{ opacity: gameState.activeSide === 'LIGHT' ? 0.15 : 0.12 }} />
      <div className={`glow-effect w-[550px] h-[550px] ${gameState.activeSide === 'LIGHT' ? 'bg-blue-400' : 'bg-white'} -bottom-40 -right-40`} style={{ opacity: gameState.activeSide === 'LIGHT' ? 0.08 : 0.04 }} />

      {isPhoneTable ? (
        <div className="fixed left-0 right-0 top-0 z-50 flex items-start justify-between px-3 py-3">
          <button
            onClick={() => setShowExitDialog(true)}
            aria-label="Back"
            title="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/55 text-white shadow-xl backdrop-blur-xl transition-all hover:border-red-300/60 hover:bg-red-500/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={toggleMute}
            aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
            title={soundMuted ? 'Unmute sound' : 'Mute sound'}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/55 text-gray-100 shadow-xl backdrop-blur-xl transition-all hover:border-red-300/60 hover:bg-red-500/20"
          >
            {soundMuted ? <VolumeX className="h-5 w-5 text-red-300" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      ) : (
        <SharedNavbar
          showBackButton
          onBackClick={() => setShowExitDialog(true)}
          customItems={[]}
          rightActions={gameNavActions}
        />
      )}

      {/* Game Table - Single Center Point Coordinate System */}
      <div className="absolute inset-0 px-2 py-6 sm:px-6 sm:py-8" style={{ perspective: '1000px' }}>

        {/* CENTER - Draw and Discard Piles: Fixed pixel positioning */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, x: '-50%', y: '-50%' }}
          animate={{
            opacity: 1,
            scale: 1,
            rotateY: isFlipping ? 180 : 0,
            x: '-50%',
            y: '-50%',
          }}
          transition={{ delay: 0.2, duration: 0.45, ease: 'easeOut' }}
          className="absolute z-20 flex gap-3 sm:gap-4 items-center justify-center"
          style={{
            left: '50%',
            top: isPhoneTable ? compactCenterTop : '46%',
            width: isPhoneTable ? 'min(42vw, 156px)' : 'clamp(220px, 24vw, 300px)',
            height: isPhoneTable ? 'clamp(84px, 19vh, 108px)' : 'clamp(150px, 22vh, 190px)',
            willChange: 'transform'
          }}
        >
          {/* Direction indicator ring - absolute overlay */}
          <motion.div
            className="absolute h-32 w-32 rounded-full border border-dashed border-white/5 flex items-center justify-center pointer-events-none sm:h-64 sm:w-64"
            animate={{ rotate: gameState.direction === 'CW' ? 360 : -360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            style={{ willChange: 'transform' }}
          >
            <div className="w-full h-full flex items-center justify-between text-white/5 text-[9px] px-2 select-none pointer-events-none">
              {gameState.direction === 'CW' ? <RotateCw className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {gameState.direction === 'CW' ? <RotateCw className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </div>
          </motion.div>

          {/* Active color light ray backdrop */}
          <motion.div
            className="absolute w-40 h-40 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: getCardBgHex(gameState.activeColor), willChange: 'transform, opacity' }}
            animate={{
              opacity: [0.08, 0.12, 0.08],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          ></motion.div>

          {/* Draw pile */}
          <motion.div
              onClick={canDraw ? handleDrawCard : undefined}
              onKeyDown={(event) => {
                if (canDraw && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  handleDrawCard();
                }
              }}
              role={canDraw ? 'button' : undefined}
              tabIndex={canDraw ? 0 : -1}
              aria-label={canDraw ? 'Draw a card' : 'Draw pile'}
              className={`relative table-card-size rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-sm ${
                canDraw
                  ? 'bg-red-950/80 border-red-400 ring-2 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-105'
                  : 'bg-[#1a1d26]/80 border-white/10 opacity-90 cursor-default'
              }`}
              whileHover={canDraw ? { scale: 1.05 } : { scale: 1.01 }}
              whileTap={canDraw ? { scale: 0.98 } : {}}
              style={{ willChange: 'transform' }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
              <span className="font-sans font-black italic text-sm md:text-lg text-white tracking-tighter transform -skew-x-12 select-none relative z-10">
                CARDS
              </span>
              <span className="absolute bottom-3 text-[9px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">
                {gameState.drawPileCount}
              </span>
            </motion.div>

            {/* Discard top card */}
            <motion.div
              data-card-play-target
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ willChange: 'transform, opacity' }}
            >
              <BorderGlow
                edgeSensitivity={30}
                glowIntensity={1.5}
                glowColor={getCardGlowHsl(gameState.activeColor)}
                backgroundColor={getCardBgHex(gameState.activeColor)}
                colors={getCardGradientColors(gameState.activeColor)}
                borderRadius={tableCardRadius}
                glowRadius={28}
                className={`relative table-card-size rounded-2xl border-2 select-none cursor-default ${
                  gameState.activeColor === 'WILD' ? 'border-red-500/40' : 'border-white/20'
                }`}
              >
                {topDiscard ? (
                  (() => {
                    const face = getActiveFace(topDiscard);
                    return (
                      <>
                        <div className={`absolute top-2 left-2 text-xs sm:text-sm card-corner-number ${face.color === 'WILD' ? 'text-white' : ''}`}>
                          {face.value === 'WILD' ? (
                            <div className="card-wild-corner-symbol rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
                              <div className="bg-[#ef4444]" />
                              <div className="bg-[#3b82f6]" />
                              <div className="bg-[#10b981]" />
                              <div className="bg-[#f59e0b]" />
                            </div>
                          ) : (
                            getCardSymbol(face.value)
                          )}
                        </div>
                        
                        <div className="card-oval-insert w-[76%] h-[60%] flex items-center justify-center">
                          {face.value === 'WILD' || face.value === 'WILD_DRAW_FOUR' || face.value === 'WILD_DRAW_FIVE' ? (
                            <motion.div 
                              className="card-wild-symbol rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45"
                              animate={{ rotate: [45, 48, 45] }}
                              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                              style={{ willChange: 'transform' }}
                            >
                              <div className="bg-[#ef4444]" />
                              <div className="bg-[#3b82f6]" />
                              <div className="bg-[#10b981]" />
                              <div className="bg-[#f59e0b]" />
                            </motion.div>
                          ) : (
                            <span className={`card-oval-value font-extrabold ${getCardValueColor(gameState.activeColor)}`}>
                              {getCardSymbol(face.value)}
                            </span>
                          )}
                        </div>

                        <div className={`absolute bottom-2 right-2 text-xs sm:text-sm card-corner-number rotate-180 ${face.color === 'WILD' ? 'text-white' : ''}`}>
                          {face.value === 'WILD' ? (
                            <div className="card-wild-corner-symbol rounded-full overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/25">
                              <div className="bg-[#ef4444]" />
                              <div className="bg-[#3b82f6]" />
                              <div className="bg-[#10b981]" />
                              <div className="bg-[#f59e0b]" />
                            </div>
                          ) : (
                            getCardSymbol(face.value)
                          )}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div className="text-[10px] text-gray-500 font-bold uppercase text-center pt-8">Empty</div>
                )}
              </BorderGlow>
            </motion.div>

          {/* Stacking indicator overlay */}
          {gameState.drawStackCount > 0 && !isPhoneTable && (
            <motion.div
              initial={{ scale: 0.9, y: 5, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 whitespace-nowrap bg-red-950/70 text-red-200 border border-red-500/40 px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              <ShieldAlert className="w-4 h-4" /> STACK ACTIVE: +{gameState.drawStackCount}
            </motion.div>
          )}
        </motion.div>
        {/* END CENTER - Draw and Discard Piles */}

        {isPhoneTable && (
          <div
            className="absolute pointer-events-auto z-40 flex flex-col gap-2"
            style={{
              left: 'clamp(190px, 31vw, 290px)',
              top: '49.5%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {renderLastCardActions(true)}
          </div>
        )}

        {isPhoneTable && gameState.drawStackCount > 0 && (
          <motion.div
            initial={{ scale: 0.92, opacity: 0, x: 8 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-40 flex items-center gap-2 rounded-full border border-red-500/35 bg-red-950/70 px-3 py-2 font-display text-[9px] font-black uppercase tracking-[0.14em] text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.22)] backdrop-blur-xl"
            style={{
              right: 'clamp(190px, 31vw, 290px)',
              top: '49.5%',
              transform: 'translate(50%, -50%)',
            }}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Stack +{gameState.drawStackCount}</span>
          </motion.div>
        )}

        {/* OPPONENT SEATS - Responsive around-the-table positioning */}
        {opponentSeats.map((seat, index) => {
          const isSeatTurn = gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === seat.player.id);
          return (
          <div
            key={seat.player.id}
            data-player-seat-id={seat.player.id}
            className="absolute pointer-events-auto z-20"
            style={seat.style}
          >
            {!isLargeTable && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: isSeatTurn ? 1.08 : 1,
                  boxShadow: isSeatTurn
                    ? '0 0 28px rgba(239,68,68,0.42)'
                    : '0 0 0 rgba(0,0,0,0)',
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`absolute z-30 max-w-[190px] rounded-full border px-3 py-1.5 text-center font-display text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur-xl sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.16em] ${
                  isSeatTurn
                    ? 'border-red-300/60 bg-red-500/25 text-red-50 ring-2 ring-red-400/35'
                    : 'border-white/10 bg-black/35 text-gray-300'
                }`}
                style={getSeatNamePosition(seat.handPosition, isPhoneTable)}
              >
                <span className="block truncate">{seat.player.name}</span>
                {isSeatTurn && (
                  <span className="mt-0.5 block text-[8px] tracking-[0.18em] text-red-100/80">TURN</span>
                )}
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, ...seat.enterFrom }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.24 + index * 0.04, duration: 0.45 }}
              className="flex h-full w-full flex-col items-center justify-center gap-1"
              style={{ willChange: 'transform' }}
            >
              <OpponentHand
                playerName={seat.player.name}
                cardCount={seat.player.cards.length}
                position={seat.handPosition}
                isCurrentTurn={isSeatTurn}
                compact={isPhoneTable}
                largeTable={isLargeTable}
                isAi={seat.player.isAi}
              />
              {aiThinkingPlayerId === seat.player.id && !isPhoneTable && (
                <div className="rounded border border-red-500/20 bg-red-650/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-red-400 animate-pulse">
                  THINKING
                </div>
              )}
            </motion.div>
          </div>
          );
        })}

        {/* BOTTOM CONTROLS - Pass turn only; LAST CARD controls sit above the player name. */}
        <div
          className={`absolute pointer-events-auto z-30 flex flex-wrap items-center gap-2 sm:gap-3 justify-center ${isPhoneTable ? 'compact-action-row' : ''}`}
          style={{
            left: '50%',
            bottom: isPhoneTable ? 'clamp(92px, 23vh, 118px)' : 'clamp(235px, 33vh, 270px)',
            width: isPhoneTable ? 'min(64vw, 320px)' : 'min(92vw, 620px)',
            minHeight: '50px',
            transform: 'translateX(-50%)',
            willChange: 'transform'
          }}
        >
          {isPhoneTable ? (
            <>
              <div className={`rounded-full border px-3 py-1.5 text-center font-display text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-xl ${
                isMyTurn
                  ? 'border-red-300/60 bg-red-500/25 text-red-50 ring-1 ring-red-400/35'
                  : 'border-white/10 bg-black/45 text-gray-300'
              }`}>
                <span className="block max-w-[145px] truncate">{me?.name || 'You'}</span>
              </div>
              {isMyTurn && drawnPlayableCardId !== null && (
                <button
                  onClick={() => { audio.playSelect(); setDrawnPlayableCardId(null); passTurn(); }}
                  aria-label="Pass turn"
                  title="Pass turn"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/45 text-sm font-black text-gray-200 transition-all hover:bg-white hover:text-black"
                >
                  →
                </button>
              )}
            </>
          ) : (
            <>
              {/* Pass turn - only shown after player draws a matching card */}
              {isMyTurn && drawnPlayableCardId !== null && (
                <button
                  onClick={() => { audio.playSelect(); setDrawnPlayableCardId(null); passTurn(); }}
                  className="px-4 py-1.5 rounded-full font-bold bg-white/10 hover:bg-white text-gray-300 hover:text-black text-xs tracking-wider uppercase transition-all"
                >
                  PASS TURN
                </button>
              )}
            </>
          )}
        </div>
        {/* END BOTTOM CONTROLS */}

        {/* PLAYER HAND - Fixed pixel positioning at bottom center */}
        <div
          data-player-seat-id={me?.id}
          className="absolute pointer-events-auto z-10 flex justify-center items-end"
          style={{
            left: '50%',
            bottom: 'clamp(8px, 2vh, 24px)',
            width: isPhoneTable ? 'min(88vw, 700px)' : 'min(94vw, 900px)',
            height: isPhoneTable ? 'clamp(104px, 24vh, 126px)' : 'clamp(150px, 22vh, 190px)',
            margin: '0',
            transform: 'translateX(-50%)'
          }}
        >
          {me && !isPhoneTable && (
            <div className="absolute -top-32 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2 sm:-top-36">
              <div className="flex items-end justify-center gap-2">
                {renderLastCardActions(false)}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isMyTurn ? 1.08 : 1,
                  boxShadow: isMyTurn
                    ? '0 0 28px rgba(239,68,68,0.42)'
                    : '0 0 0 rgba(0,0,0,0)',
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`max-w-[220px] rounded-full border px-3 py-1.5 text-center font-display text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-xl sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.16em] ${
                  isMyTurn
                    ? 'border-red-300/60 bg-red-500/25 text-red-50 ring-2 ring-red-400/35'
                    : 'border-white/10 bg-black/35 text-gray-300'
                }`}
              >
                <span className="block truncate">{me.name || 'You'}</span>
                {isMyTurn && (
                  <span className="mt-0.5 block text-[8px] tracking-[0.18em] text-red-100/80">YOUR TURN</span>
                )}
              </motion.div>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.48, ease: 'easeOut' }}
            style={{ willChange: 'transform' }}
          >
            {/* Player Hands list slider */}
            <PlayerHand
              cards={me?.cards || []}
              playableCardIds={playableCardIds}
              onPlayCard={handleCardPlayAttempt}
              disabled={!isMyTurn || pendingPlayCardId !== null}
              activeSide={gameState.activeSide}
              compact={isPhoneTable}
            />
          </motion.div>
        </div>
        {/* END PLAYER HAND */}

      </div>
      {/* END GAME TABLE */}

      <AnimatePresence>
        {tableCardFlight && (
          <motion.div
            key={tableCardFlight.id}
            className="fixed pointer-events-none z-[55]"
            style={{
              left: tableCardFlight.from.x - tableCardFlight.width / 2,
              top: tableCardFlight.from.y - tableCardFlight.height / 2,
              width: tableCardFlight.width,
              height: tableCardFlight.height,
              willChange: 'transform, opacity',
            }}
            initial={{ x: 0, y: 0, rotate: 0, scale: 0.92, opacity: 0.96 }}
            animate={{
              x: tableCardFlight.to.x - tableCardFlight.from.x,
              y: tableCardFlight.to.y - tableCardFlight.from.y,
              rotate: tableCardFlight.rotate,
              scale: [0.92, 1.04, 0.98],
              opacity: [0.96, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: isPhoneTable ? 0.5 : 0.62,
              ease: [0.16, 1, 0.3, 1],
              opacity: { times: [0, 0.78, 1], duration: isPhoneTable ? 0.5 : 0.62 },
              scale: { times: [0, 0.55, 1], duration: isPhoneTable ? 0.5 : 0.62 },
            }}
          >
            {renderFlyingCard(tableCardFlight.card, tableCardFlight.activeSide)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action HUD overlays */}
      <AnimatePresence>
        {showExitDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-game-title"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              className="glass-panel max-w-sm w-full rounded-3xl p-7 text-center border border-white/15 shadow-2xl"
            >
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-4" />
              <h2 id="exit-game-title" className="text-xl font-black text-white">Leave this game?</h2>
              <p className="text-sm text-gray-300 mt-2">Your seat will be handed to an AI so the match can continue.</p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => { audio.playSelect(); setShowExitDialog(false); }}
                  disabled={isLeaving}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 py-3 text-sm font-black text-white transition-colors disabled:opacity-50"
                >
                  NO, STAY
                </button>
                <button
                  onClick={handleConfirmExit}
                  disabled={isLeaving}
                  className="rounded-xl bg-red-600 hover:bg-red-500 py-3 text-sm font-black text-white transition-colors disabled:opacity-50"
                >
                  {isLeaving ? 'LEAVING…' : 'YES, LEAVE'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {gameState.status === 'GAME_OVER' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="glass-panel max-w-sm w-full rounded-3xl p-8 text-center border border-white/15 shadow-2xl">
              <div className="text-5xl mb-3">{matchResult?.outcome === 'WIN' ? '🏆' : matchResult?.outcome === 'DRAW' ? '🤝' : '🎴'}</div>
              <h2 className="text-2xl font-black text-white">{matchResult?.outcome === 'WIN' ? 'You won!' : matchResult?.outcome === 'DRAW' ? 'Match drawn' : `Placed ${matchResult?.placement ?? 'last'} of ${matchResult?.playerCount ?? gameState.players.length}`}</h2>
              <p className="text-sm text-gray-300 mt-2">{matchResult ? `Round points: ${matchResult.roundPoints}` : `Round points: ${me?.score ?? 0}`}</p>
              {matchResult && (
                <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Score change</p><p className={`mt-1 text-lg font-black ${matchResult.scoreChange > 0 ? 'text-emerald-400' : matchResult.scoreChange < 0 ? 'text-red-400' : 'text-gray-300'}`}>{matchResult.scoreChange > 0 ? '+' : ''}{matchResult.scoreChange}</p></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Current rank</p><p className="mt-1 text-sm font-black text-white">{matchResult.rank.replace('_', ' ')}</p><p className="text-xs font-semibold text-gray-400">Score {matchResult.score}</p></div>
                </div>
              )}
              {matchResult && matchResult.unoPenalty > 0 && <p className="mt-3 text-xs font-bold text-amber-300">LAST CARD penalty: −{matchResult.unoPenalty} Score</p>}
              <button
                onClick={() => { audio.playSelect(); void leaveRoom(); }}
                className="mt-6 w-full rounded-xl bg-red-600 hover:bg-red-500 py-3 text-sm font-black tracking-wider text-white transition-colors"
              >
                RETURN TO HOME
              </button>
            </div>
          </motion.div>
        )}
      {/* Wild color selector */}
        {showColorSelector && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-40"
          >
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4 text-center max-w-sm border border-white/10">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-white">CHOOSE WILD ACTIVE COLOR</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleSelectColor('RED')} className="py-3.5 rounded-xl font-bold bg-[#ea4335] hover:brightness-110 text-white uppercase text-xs transition-all">Red</button>
                <button onClick={() => handleSelectColor('BLUE')} className="py-3.5 rounded-xl font-bold bg-[#0099ff] hover:brightness-110 text-white uppercase text-xs transition-all">Blue</button>
                <button onClick={() => handleSelectColor('YELLOW')} className="py-3.5 rounded-xl font-bold bg-[#f59e0b] hover:brightness-110 text-white uppercase text-xs transition-all">Yellow</button>
                <button onClick={() => handleSelectColor('GREEN')} className="py-3.5 rounded-xl font-bold bg-[#10b981] hover:brightness-110 text-white uppercase text-xs transition-all">Green</button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {!showChatPanel && (
        <button
          onClick={() => { audio.playSelect(); setShowChatPanel(true); }}
          className="absolute bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/65 text-red-100 shadow-2xl backdrop-blur-xl transition-all hover:border-red-400/60 hover:bg-red-600 sm:bottom-7 sm:right-7"
          title="Chat"
          aria-label="Open chat"
        >
          <MessagesSquare className="h-5 w-5" />
        </button>
      )}

      {/* Chat popover */}
      {showChatPanel && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          className="absolute bottom-5 right-3 z-40 flex h-[min(58vh,460px)] w-[calc(100vw-1.5rem)] max-w-sm flex-col rounded-2xl border border-red-400/20 bg-[#090607]/90 p-3 shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:bottom-7 sm:right-7 sm:w-96"
        >
          <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2">
            <div>
              <h3 className="font-display text-sm font-black uppercase tracking-[0.14em] text-white">Chat</h3>
              <p className="mt-0.5 text-[10px] font-semibold text-gray-500">Table messages and quick reactions</p>
            </div>
            <button
              type="button"
              onClick={() => { audio.playSelect(); setShowChatPanel(false); }}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition-colors hover:bg-white hover:text-black"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={chatListRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/5 bg-black/25 p-2">
            {chatMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-xs font-semibold text-gray-500">
                No messages yet.
              </div>
            ) : (
              chatMessages.slice(-80).map(msg => {
                const isMine = msg.playerId === user?.id;
                const isSystem = msg.playerId === 'SYSTEM';
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl border px-3 py-2 text-[11px] leading-normal shadow-lg ${
                      isSystem
                        ? 'border-white/10 bg-white/[0.04] text-gray-300'
                        : isMine
                          ? 'border-red-400/40 bg-red-600 text-white'
                          : 'border-white/10 bg-white/[0.06] text-gray-200'
                    }`}>
                      <div className={`mb-0.5 text-[9px] font-black uppercase tracking-wider ${isMine ? 'text-red-100' : isSystem ? 'text-gray-500' : 'text-red-300'}`}>
                        {isMine ? 'You' : msg.sender}
                      </div>
                      <div className="break-words">{msg.message}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-2 flex gap-1.5 border-t border-white/5 pt-2">
            {['🔥', '😂', '😭', '😮', '👑'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => { handleSendQuickChat(emoji); sendReaction(emoji); }}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-sm transition-transform hover:scale-110 hover:bg-white/10"
                aria-label={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={handleSendChatText} className="flex gap-1.5 mt-2 border-t border-white/5 pt-2">
            <input
              type="text"
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              placeholder="Chat message..."
              maxLength={200}
              className="min-w-0 flex-grow rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatText.trim()}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-red-500/20 bg-red-600 text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-gray-600"
              title="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </motion.div>
      )}

    </main>
  );
}
