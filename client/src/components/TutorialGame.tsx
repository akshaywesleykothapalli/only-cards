"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Lightbulb, RotateCw, RotateCcw, Sparkles, ShieldAlert, Gamepad2 } from 'lucide-react';
import BorderGlow from './BorderGlow';
import { useAudio } from '../hooks/useAudio';
import confetti from 'canvas-confetti';
import { getCardSymbol, getCardBgHex, getCardGlowHsl, getCardGradientColors } from '../lib/cardColors';
import { SharedNavbar } from './SharedNavbar';

interface TutorialGameProps {
  onClose: () => void;
}

type CardColor = 'RED' | 'BLUE' | 'YELLOW' | 'GREEN' | 'WILD';

interface TutorialCard {
  id: string;
  color: CardColor;
  value: string;
}

export default function TutorialGame({ onClose }: TutorialGameProps) {
  const audio = useAudio();
  const [step, setStep] = useState(0);
  const [activeColor, setActiveColor] = useState<CardColor>('RED');
  const [activeValue, setActiveValue] = useState('7');
  const [direction, setDirection] = useState<'CW' | 'CCW'>('CW');
  const [soundMuted, setSoundMuted] = useState(false);
  const [viewport, setViewport] = useState({ width: 1024, height: 768, isTouch: false });
  const [victory, setVictory] = useState(false);
  const [opp1Hand, setOpp1Hand] = useState<TutorialCard[]>([
    { id: 'o1-blue3', color: 'BLUE', value: '3' },
    { id: 'o1-blue1', color: 'BLUE', value: '1' },
    { id: 'o1-green9', color: 'GREEN', value: '9' },
    { id: 'o1-red9', color: 'RED', value: '9' },
  ]);
  const [opp2Hand, setOpp2Hand] = useState<TutorialCard[]>([
    { id: 'o2-blue8', color: 'BLUE', value: '8' },
    { id: 'o2-blue5', color: 'BLUE', value: '5' },
    { id: 'o2-blue2', color: 'BLUE', value: '2' },
    { id: 'o2-yellow4', color: 'YELLOW', value: '4' },
  ]);
  const [flyingCard, setFlyingCard] = useState<{ card: TutorialCard; rect: DOMRect; dx: number; dy: number } | null>(null);
  const [hand, setHand] = useState<TutorialCard[]>([
    { id: 'c1', color: 'RED', value: '3' },
    { id: 'c2', color: 'BLUE', value: 'SKIP' },
    { id: 'c3', color: 'BLUE', value: 'REVERSE' },
    { id: 'c4', color: 'WILD', value: 'WILD' },
    { id: 'c5', color: 'WILD', value: 'WILD_DRAW_FOUR' },
    { id: 'c6', color: 'GREEN', value: '9' },
    { id: 'c7', color: 'GREEN', value: '5' },
  ]);

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

  const triggerAudio = (type: string) => {
    if (soundMuted) return;
    if (type === 'play') audio.playPlayCard();
    if (type === 'select') audio.playSelect();
    if (type === 'victory') audio.playVictory();
  };

  // Auto-advance tutorial based on step
  useEffect(() => {
    if (step === 0) return;

    const timings: { [key: number]: number } = {
      1: 2000,  // After Red 3
      2: 4500,  // After Skip animation
      3: 3000,  // After Reverse animation
      4: 3000,  // After Reverse shown
      5: 3000,  // Opponents play
      6: 2000,  // Player clicks Wild
      7: 2000,  // Wild +4 setup
      8: 2500,  // Player clicks Wild +4
      9: 2500,  // Opponent plays
      10: 2500,  // Player plays Green 9
    };

    if (!timings[step]) return;

    const timer = setTimeout(() => {
      advanceStep();
    }, timings[step]);

    return () => clearTimeout(timer);
  }, [step]);

  const advanceStep = () => {
    const nextStep = step + 1;

    if (nextStep === 1) {
      setActiveColor('RED');
      setActiveValue('3');
      triggerAudio('play');
    } else if (nextStep === 2) {
      setActiveColor('BLUE');
      setActiveValue('8');
      setOpp1Hand(prev => prev.filter(c => c.id !== 'o1-blue3'));
      setOpp2Hand(prev => prev.filter(c => c.id !== 'o2-blue8'));
      triggerAudio('play');
    } else if (nextStep === 3) {
      setActiveColor('BLUE');
      setActiveValue('SKIP');
      setHand(prev => prev.filter(c => c.id !== 'c2'));
      triggerAudio('play');
    } else if (nextStep === 4) {
      setActiveColor('BLUE');
      setActiveValue('5');
      setOpp2Hand(prev => prev.filter(c => c.id !== 'o2-blue5'));
    } else if (nextStep === 5) {
      setActiveColor('BLUE');
      setActiveValue('REVERSE');
      setHand(prev => prev.filter(c => c.id !== 'c3'));
      setDirection('CCW');
      triggerAudio('play');
    } else if (nextStep === 6) {
      setActiveColor('BLUE');
      setActiveValue('1');
      setOpp2Hand(prev => prev.filter(c => c.id !== 'o2-blue2'));
      setOpp1Hand(prev => prev.filter(c => c.id !== 'o1-blue1'));
      triggerAudio('play');
    } else if (nextStep === 7) {
      setActiveColor('YELLOW');
      setActiveValue('WILD');
      setHand(prev => prev.filter(c => c.id !== 'c4'));
      triggerAudio('play');
    } else if (nextStep === 8) {
      setActiveColor('GREEN');
      setActiveValue('WILD_DRAW_FOUR');
      setHand(prev => prev.filter(c => c.id !== 'c5'));
      triggerAudio('play');
    } else if (nextStep === 9) {
      setActiveColor('GREEN');
      setActiveValue('9');
      setOpp1Hand(prev => prev.filter(c => c.id !== 'o1-green9'));
      setOpp2Hand(prev => [
        ...prev,
        { id: 'o2-draw-red2', color: 'RED', value: '2' },
        { id: 'o2-draw-green4', color: 'GREEN', value: '4' },
        { id: 'o2-draw-yellow9', color: 'YELLOW', value: '9' },
        { id: 'o2-draw-blue6', color: 'BLUE', value: '6' },
      ]);
    } else if (nextStep === 10) {
      setActiveColor('GREEN');
      setActiveValue('9');
      setHand(prev => prev.filter(c => c.id !== 'c6'));
      triggerAudio('play');
    } else if (nextStep === 11) {
      setActiveColor('GREEN');
      setActiveValue('5');
    } else if (nextStep === 12) {
      setActiveColor('GREEN');
      setActiveValue('5');
      setHand([]);
      setVictory(true);
      triggerAudio('victory');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }

    setStep(nextStep);
  };

  const messages: { [key: number]: string } = {
    0: "Welcome to the tutorial! You'll learn to play 3-player UNO with color matching, skips, reverses, wild cards, and calling last card. Ready to start?",
    1: "The discard pile shows Red 7. Play is Clockwise: You → Opponent 1 → Opponent 2. Play your Red 3.",
    2: "Great! Opponent 1 played Blue 3, then Opponent 2 played Blue 8. It's your turn. Now let's learn SKIP—click your Blue Skip card.",
    3: "Perfect! You played Skip and Opponent 1's turn is skipped. Opponent 2 now plays Blue 5. Watch the table.",
    4: "Opponent 2 played Blue 5. It's your turn again. Let's learn REVERSE—click your Blue Reverse card to flip the direction.",
    5: "Excellent! You reversed to Counter-Clockwise: You → Opponent 2 → Opponent 1. Watch them play in the new direction.",
    6: "Opponent 2 played Blue 2, then Opponent 1 played Blue 1. It's your turn and you have no Blue cards left. Use your WILD card—click it.",
    7: "You played the Wild card! Opponents play. Now use your WILD +4 card to draw more cards—click it.",
    8: "Perfect! You played +4. Opponent 2 drew 4 cards. Watch as play continues.",
    9: "Opponent 1 played Green 9. It's your turn—play your matching Green 9.",
    10: "Great! You played Green 9. You have one card left. Now play your final Green 5 to win!",
    11: "Opponent 1 passed. It's your final turn. Play your Green 5!",
    12: "🎉 Victory! You've mastered UNO! You understand turn order, skips, reverses, wilds, and last card calls. You're ready to play for real!",
  };

  const canClickCard = (cardId: string) => {
    if (step === 1 && cardId === 'c1') return true; // Red 3
    if (step === 2 && cardId === 'c2') return true; // Blue Skip
    if (step === 4 && cardId === 'c3') return true; // Blue Reverse
    if (step === 6 && cardId === 'c4') return true; // Wild
    if (step === 8 && cardId === 'c5') return true; // Wild +4
    if (step === 10 && cardId === 'c6') return true; // Green 9
    if (step === 11 && cardId === 'c7') return true; // Green 5
    return false;
  };

  const handleCardClick = (card: TutorialCard, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!canClickCard(card.id)) return;
    triggerAudio('play');
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    setFlyingCard({ card, rect, dx, dy });
    window.setTimeout(() => advanceStep(), 260);
    window.setTimeout(() => setFlyingCard(null), 540);
  };

  const renderCardFace = (color: CardColor, value: string, className = '') => {
    const isWild = value === 'WILD' || value === 'WILD_DRAW_FOUR';
    const symbol = value === 'SKIP' ? '⊘' : value === 'REVERSE' ? '⇄' : value === 'WILD_DRAW_FOUR' ? '+4' : value === 'WILD' ? '●' : getCardSymbol(value);

    return (
      <BorderGlow
        edgeSensitivity={30}
        glowIntensity={1.35}
        glowColor={getCardGlowHsl(color)}
        backgroundColor={getCardBgHex(color)}
        colors={getCardGradientColors(color)}
        borderRadius={16}
        glowRadius={24}
        className={`relative rounded-2xl border-2 border-white/20 select-none ${className}`}
      >
        <div className="absolute top-2 left-2 text-xs sm:text-sm card-corner-number text-white">{symbol}</div>
        <div className="card-oval-insert w-[76%] h-[60%] flex items-center justify-center">
          {isWild ? (
            <motion.div
              className="h-10 w-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45 sm:h-16 sm:w-16"
              animate={{ rotate: [45, 48, 45] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="bg-[#ef4444]" />
              <div className="bg-[#3b82f6]" />
              <div className="bg-[#10b981]" />
              <div className="bg-[#f59e0b]" />
            </motion.div>
          ) : (
            <span className="card-oval-value text-2xl sm:text-3xl md:text-5xl font-extrabold">{symbol}</span>
          )}
        </div>
        <div className="absolute bottom-2 right-2 text-xs sm:text-sm card-corner-number rotate-180 text-white">{symbol}</div>
      </BorderGlow>
    );
  };

  const renderOpponentCards = (cards: TutorialCard[]) => (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-[0_18px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:gap-1.5 sm:rounded-3xl sm:p-2">
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          layout
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ delay: i * 0.04 }}
          className="relative"
        >
          {renderCardFace(card.color, card.value, 'h-16 w-11 rounded-xl sm:h-20 sm:w-14')}
        </motion.div>
      ))}
    </div>
  );

  const isPhonePortrait = viewport.isTouch && viewport.width < 768 && viewport.height > viewport.width;
  const isPhoneTable = viewport.width < 768 || (viewport.width <= 1024 && viewport.height <= 560);

  if (isPhonePortrait) {
    return (
      <main className="min-h-screen w-full bg-arena-gradient bg-grid text-gray-100 relative overflow-hidden select-none font-body">
        <div className="glow-effect h-[420px] w-[420px] bg-red-650 -top-32 -left-32 animate-pulse-glow" style={{ opacity: 0.12 }} />
        <div className="glow-effect h-[420px] w-[420px] bg-white -bottom-32 -right-32 animate-pulse-glow" style={{ opacity: 0.04 }} />
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
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-red-300">Rotate to learn</p>
            <h1 className="mt-3 font-display text-2xl font-black uppercase tracking-tight text-white">Turn your phone sideways</h1>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-300">
              Tutorial mode starts automatically in landscape so every card and instruction stays clear.
            </p>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-arena-gradient bg-grid text-gray-100 relative overflow-hidden select-none font-body">
      {/* Background glows */}
      <div className="glow-effect w-[550px] h-[550px] bg-red-650 top-1/4 left-1/4 animate-pulse-glow" style={{ opacity: 0.12 }} />
      <div className="glow-effect w-[550px] h-[550px] bg-white bottom-1/4 right-1/4 animate-pulse-glow" style={{ opacity: 0.04 }} />

      {/* Navbar */}
      <SharedNavbar showBackButton={true} onBackClick={() => { triggerAudio('play'); onClose(); }} showUserInfo={false} />

      {/* Guidance Panel */}
      <motion.div
        initial={{ opacity: 0, x: '-50%', y: -20 }}
        animate={{ opacity: 1, x: '-50%', y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute left-1/2 top-16 z-30 w-[min(92vw,720px)] glass-panel rounded-3xl p-4 sm:top-20 sm:p-6 flex gap-3 sm:gap-4 items-start border border-white/10 shadow-2xl"
      >
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 flex-shrink-0">
          <Lightbulb className="w-6 h-6" />
        </motion.div>
        <div className="flex-grow">
          <h4 className="font-display text-xs font-bold tracking-[0.22em] text-red-300 uppercase mb-2">Step {Math.min(step + 1, 13)}/13 - Tutorial</h4>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium max-w-[56ch]">{messages[step] || ""}</p>
          {step === 0 && (
            <motion.button onClick={() => advanceStep()} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-4 px-6 py-2 rounded-full font-black btn-arena-primary text-sm uppercase tracking-widest">
              Start Tutorial
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Game Table */}
      <div className="absolute inset-0 px-2 py-6 sm:px-6 sm:py-8" style={{ perspective: '1000px' }}>
        {/* Opponents */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-3 top-[36%] z-20 flex h-[32vh] min-h-44 w-24 flex-col items-center justify-center gap-2 sm:left-[3%] sm:top-[34%] sm:h-[38vh] sm:min-h-64 sm:w-36"
        >
          <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${step >= 10 ? 'bg-red-500/25 text-red-300 border border-red-500/40' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
            Opponent 1
          </div>
          {renderOpponentCards(opp1Hand)}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-3 top-[36%] z-20 flex h-[32vh] min-h-44 w-24 flex-col items-center justify-center gap-2 sm:right-[3%] sm:top-[34%] sm:h-[38vh] sm:min-h-64 sm:w-36"
        >
          <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${[6, 12].includes(step) ? 'bg-red-500/25 text-red-300 border border-red-500/40' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
            Opponent 2
          </div>
          {renderOpponentCards(opp2Hand)}
        </motion.div>

        {/* Center */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          transition={{ delay: 0.2, duration: 0.45, ease: 'easeOut' }}
          className="absolute left-1/2 top-[48%] z-20 flex items-center justify-center gap-3 sm:top-[49%] sm:gap-4"
          style={{ willChange: 'transform' }}
        >
          <motion.div animate={{ rotate: direction === 'CW' ? 360 : -360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }} className="absolute h-44 w-44 rounded-full border border-dashed border-white/5 flex items-center justify-center pointer-events-none sm:h-64 sm:w-64" style={{ willChange: 'transform' }}>
            <div className="w-full h-full flex items-center justify-between text-white/5 text-[9px] px-2 select-none pointer-events-none">
              {direction === 'CW' ? <RotateCw className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {direction === 'CW' ? <RotateCw className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </div>
          </motion.div>

          <motion.div
            className="absolute w-40 h-40 rounded-full blur-2xl pointer-events-none"
            style={{ backgroundColor: getCardBgHex(activeColor) }}
            animate={{ opacity: [0.08, 0.14, 0.08], scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative table-card-size rounded-2xl border border-white/10 bg-[#1a1d26]/80 flex items-center justify-center cursor-default shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <span className="font-display font-black italic text-sm md:text-lg text-white tracking-tighter transform -skew-x-12 select-none relative z-10">CARDS</span>
            <span className="absolute bottom-3 text-[9px] text-gray-400 font-extrabold uppercase font-mono tracking-wider">79</span>
          </div>

          {renderCardFace(activeColor, activeValue, 'table-card-size')}
        </motion.div>

        {/* Bottom tutorial actions */}
        <div
          className="absolute pointer-events-auto z-30 flex flex-wrap items-center gap-3 justify-center"
          style={{
            left: '50%',
            bottom: isPhoneTable ? 'clamp(78px, 22vh, 112px)' : 'clamp(235px, 33vh, 270px)',
            width: 'min(92vw, 620px)',
            minHeight: '50px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300 backdrop-blur-md">
            <Gamepad2 className="h-4 w-4 text-red-300" />
            {direction === 'CW' ? 'Clockwise turn order' : 'Counter-clockwise turn order'}
          </div>
          {hand.length === 1 && !victory && (
            <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-200 backdrop-blur-md">
              <ShieldAlert className="h-4 w-4" />
              Last card ready
            </div>
          )}
        </div>

      {/* Player Hand */}
        <div
          className="absolute pointer-events-auto z-10 flex justify-center items-end"
          style={{
            left: '50%',
            bottom: 'clamp(8px, 2vh, 24px)',
            width: 'min(94vw, 900px)',
            height: isPhoneTable ? 'clamp(82px, 21vh, 118px)' : 'clamp(150px, 22vh, 190px)',
            transform: 'translateX(-50%)',
          }}
        >
        <div className="relative isolate flex items-end justify-center -space-x-3 sm:-space-x-6 md:-space-x-10 overflow-visible py-10 px-4 sm:px-8">
          {hand.map(card => {
            const isClickable = canClickCard(card.id);
            return (
              <motion.button
                key={card.id}
                onClick={(event) => handleCardClick(card, event)}
                disabled={!isClickable}
                className={`relative flex-shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all ${
                  isClickable
                    ? 'cursor-pointer ring-2 ring-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)]'
                    : 'opacity-45 grayscale-[35%] cursor-default'
                }`}
                initial={{ y: 80, opacity: 0, rotate: -5 }}
                animate={{ y: 0, opacity: 1, rotate: -5 + hand.findIndex(c => c.id === card.id) * 2 }}
                whileHover={isClickable ? { y: -34, scale: 1.08, zIndex: 50 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
                style={{ transformOrigin: 'bottom center', willChange: 'transform' }}
                aria-label={`${card.color} ${card.value}`}
              >
                {renderCardFace(card.color, card.value, 'player-card-size')}
              </motion.button>
            );
          })}
        </div>
      </div>
      </div>

      <AnimatePresence>
        {flyingCard && (
          <motion.div
            className="fixed pointer-events-none z-[80]"
            style={{
              left: flyingCard.rect.left,
              top: flyingCard.rect.top,
              width: flyingCard.rect.width,
              height: flyingCard.rect.height,
            }}
            initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
            animate={{ x: flyingCard.dx, y: flyingCard.dy, rotate: 0, scale: 0.82, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderCardFace(flyingCard.card.color, flyingCard.card.value, 'h-full w-full')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory Modal */}
      <AnimatePresence>
        {victory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-card p-8 rounded-3xl text-center max-w-sm border border-white/10 flex flex-col gap-6 items-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <Sparkles className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight text-white uppercase mb-2">Tutorial Complete!</h3>
                <p className="text-xs text-gray-400 leading-relaxed uppercase">You're ready to play Only Cards!</p>
              </div>
              <button onClick={() => { triggerAudio('play'); onClose(); }} className="w-full py-3 rounded-xl font-bold btn-arena-primary text-white uppercase text-xs tracking-wider">
                Start Playing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sound Toggle */}
      <button onClick={() => setSoundMuted(!soundMuted)} className="fixed bottom-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all z-40 sm:top-6 sm:bottom-auto sm:right-6">
        {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </main>
  );
}
