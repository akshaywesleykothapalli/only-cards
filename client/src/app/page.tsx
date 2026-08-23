'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../store/useGameStore';
import { useAudio } from '../hooks/useAudio';
import BorderGlow from '../components/BorderGlow';
import ShinyText from '../components/ShinyText';
import AuthModal from '../components/AuthModal';
import FriendsModal from '../components/FriendsModal';
import ToastContainer from '../components/ToastContainer';
import ReconnectOverlay from '../components/ReconnectOverlay';
import { SharedNavbar } from '../components/SharedNavbar';
import { InteractiveGameCard } from '../components/ui/interactive-card';
import { ContainerScroll } from '../components/ui/container-scroll-animation';
import { animate, motion, useInView, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, useDragControls } from 'framer-motion';
import { Swords, ShieldAlert, Sparkles, Play, Gamepad2, User, Users, Zap, Trophy, Lock, Globe, Zap as Lightning, ArrowRight, Star } from 'lucide-react';

type CardColor = 'RED' | 'BLUE' | 'YELLOW' | 'GREEN' | 'WILD';

interface SwipeCardItem {
  id: number;
  color: string;
  type: 'wild' | 'action' | 'number';
  symbol?: string;
  value?: string;
  isSwiped: boolean;
  swipeDir: 'left' | 'right';
}

const AnimatedStatNumber = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  padStart = 0,
  className = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  padStart?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const count = useMotionValue(0);
  const smoothCount = useSpring(count, { stiffness: 90, damping: 24 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const unsubscribe = smoothCount.on('change', latest => setDisplayValue(latest));
    return unsubscribe;
  }, [smoothCount]);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, {
      duration: 1.35,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [count, inView, value]);

  const formattedValue = displayValue.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
  const visibleValue = padStart > 0 ? String(Math.round(displayValue)).padStart(padStart, '0') : formattedValue;

  return (
    <span ref={ref} className={className}>
      {prefix}{visibleValue}{suffix}
    </span>
  );
};

// Helper to generate a random card with unique id
const cardColors: CardColor[] = ['RED', 'BLUE', 'YELLOW', 'GREEN', 'WILD'];

const getRandomCard = (nextId: number): SwipeCardItem => {
  const randomColor = cardColors[Math.floor(Math.random() * cardColors.length)];
  let type: 'wild' | 'action' | 'number' = 'number';
  let symbol = '0';
  let value = undefined;

  if (randomColor === 'WILD') {
    type = 'wild';
    value = Math.random() > 0.5 ? '+4' : 'WILD';
  } else {
    const rand = Math.random();
    if (rand < 0.6) {
      type = 'number';
      symbol = Math.floor(Math.random() * 10).toString();
    } else {
      type = 'action';
      symbol = Math.random() > 0.5 ? '⊘' : '⇄';
      if (Math.random() * 10 > 7) {
        symbol = '+2';
      }
    }
  }

  const hexColor = randomColor === 'RED' ? '#ea4335'
                  : randomColor === 'BLUE' ? '#0099ff'
                  : randomColor === 'YELLOW' ? '#f59e0b'
                  : randomColor === 'GREEN' ? '#10b981'
                  : '#111115';

  return {
    id: nextId,
    color: hexColor,
    type,
    symbol: type === 'wild' ? undefined : symbol,
    value: type === 'wild' ? value : undefined,
    isSwiped: false,
    swipeDir: 'right' as const
  };
};

// Swipeable Card Wrapper component preserving tilt hover, border glow, and supporting tap-to-dismiss
const SwipeableCardWrapper = ({
  id,
  index,
  cards,
  isSwiped,
  swipeDir,
  playCardMove,
  onSwipeOff,
  onRemoveCard,
  children
}: {
  id: number;
  index: number;
  cards: any[];
  isSwiped: boolean;
  swipeDir: 'left' | 'right';
  playCardMove: () => void;
  onSwipeOff: (id: number, dir: 'left' | 'right') => void;
  onRemoveCard: (id: number) => void;
  children: React.ReactNode;
}) => {
  const x = useMotionValue(0);
  const dragControls = useDragControls();

  const rotateRaw = useTransform(x, [-150, 150], [-18, 18]);
  const dragOpacity = useTransform(x, [-150, 0, 150], [0, 1, 0]);

  // Calculate visual stack position using active cards only to prevent jumps when cards leave
  const activeCards = cards.filter((c) => !c.isSwiped);
  const activeIndex = activeCards.findIndex((c) => c.id === id);
  const distanceFromTop = activeIndex >= 0 ? (activeCards.length - 1) - activeIndex : 0;

  const isFront = activeCards.length > 0 && id === activeCards[activeCards.length - 1].id;

  const rotate = useTransform(rotateRaw, (r) => {
    const offset = id % 2 === 0 ? 5 : -5;
    return `${r + offset}deg`;
  });

  const maxVisibleCards = 4;
  const spacing = -24; // px spacing for stacked cards to shift to the left

  const targetMarginLeft = isSwiped
    ? '0px'
    : `${Math.min(distanceFromTop, maxVisibleCards - 1) * spacing}px`;

  const targetScale = isSwiped
    ? 1
    : 1 - Math.min(distanceFromTop, maxVisibleCards - 1) * 0.04;

  const targetOpacity = isSwiped
    ? 0
    : distanceFromTop >= maxVisibleCards ? 0 : 1;

  const showDragOpacity = isFront && !isSwiped;

  const handleDragEnd = () => {
    const currentX = x.get();
    if (Math.abs(currentX) > 80) {
      playCardMove();
      const dir = currentX > 0 ? 'right' : 'left';
      onSwipeOff(id, dir);
    }
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (isFront && !isSwiped) {
      dragControls.start(event);
    }
  };

  const handleTap = () => {
    if (isFront && !isSwiped) {
      playCardMove();
      // Direction matches the card's visual tilt: even id tilts +5deg (right), odd tilts -5deg (left)
      const dir: 'left' | 'right' = id % 2 === 0 ? 'right' : 'left';
      onSwipeOff(id, dir);
    }
  };

  return (
    <motion.div
      draggable={false}
      onPointerDown={handlePointerDown}
      onTap={handleTap}
      onAnimationComplete={() => {
        if (isSwiped) {
          onRemoveCard(id);
        }
      }}
      className="absolute origin-bottom touch-none select-none hover:cursor-grab active:cursor-grabbing"
      style={{
        gridRow: 1,
        gridColumn: 1,
        zIndex: index,
        pointerEvents: isFront && !isSwiped ? "auto" : "none",
        x,
        opacity: showDragOpacity ? dragOpacity : undefined,
        rotate,
      }}
      animate={{
        scale: targetScale,
        marginLeft: targetMarginLeft,
        opacity: targetOpacity,
        x: isSwiped ? (swipeDir === 'left' ? -350 : 350) : 0,
      }}
      transition={{
        x: { type: "spring", stiffness: 220, damping: 24 },
        marginLeft: { type: "spring", stiffness: 180, damping: 22 },
        scale: { type: "spring", stiffness: 180, damping: 22 },
        opacity: { duration: 0.25, ease: "easeInOut" }
      }}
      drag={isFront && !isSwiped ? "x" : false}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
};

export default function Page() {
  const router = useRouter();
  const {
    user,
    initSocket
  } = useGameStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#signin') {
      setShowAuthModal(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Swipe cards stack state
  const [swipeCards, setSwipeCards] = useState<SwipeCardItem[]>([
    { id: 1, color: '#10b981', type: 'action', symbol: '+2', isSwiped: false, swipeDir: 'right' },
    { id: 2, color: '#f59e0b', type: 'number', symbol: '7', isSwiped: false, swipeDir: 'right' },
    { id: 3, color: '#0099ff', type: 'action', symbol: '⇄', isSwiped: false, swipeDir: 'right' },
    { id: 4, color: '#ea4335', type: 'action', symbol: '⊘', isSwiped: false, swipeDir: 'right' },
    { id: 5, color: '#111115', type: 'wild', value: '+4', isSwiped: false, swipeDir: 'right' },
  ]);

  const nextCardIdRef = useRef(6);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Swipe off handler: triggers animate off-screen and puts a new random card at bottom
  const handleSwipeOff = (id: number, dir: 'left' | 'right') => {
    setSwipeCards(pv => pv.map(c => c.id === id ? { ...c, isSwiped: true, swipeDir: dir } : c));
    
    // Generate new random card and prepend it (it sits at the bottom of stack)
    const newCard = getRandomCard(nextCardIdRef.current++);
    setSwipeCards(pv => [newCard, ...pv]);
  };

  const handleSwipeTopCard = () => {
    const activeCards = swipeCards.filter(card => !card.isSwiped);
    const topCard = activeCards[activeCards.length - 1];
    if (!topCard) return;
    playPlayCard();
    handleSwipeOff(topCard.id, topCard.id % 2 === 0 ? 'right' : 'left');
  };

  // Remove completely from DOM after swipe out animation completes
  const handleRemoveCard = (id: number) => {
    setSwipeCards(pv => pv.filter(c => c.id !== id));
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const springParallax = useSpring(parallaxY, { stiffness: 100, damping: 30 });

  const cursorX = useMotionTemplate`${mouseX}px - 128px`;
  const cursorY = useMotionTemplate`${mouseY}px - 128px`;

  const { playSelect, playHover, playPlayCard } = useAudio();

  // Mouse move effect for cursor following
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  const handleStartPlaying = () => {
    playSelect();
    if (user) {
      router.push('/ready-to-play');
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <ToastContainer />
      <ReconnectOverlay />
      <>
          <main ref={containerRef} className="min-h-screen w-full bg-arena-gradient bg-grid text-gray-100 flex flex-col items-center justify-between px-4 py-6 sm:p-6 relative overflow-visible select-none font-sans">
            {/* Dynamic backdrop glows (Red & White Theme) */}
            <div className="glow-effect w-[550px] h-[550px] bg-red-650 top-1/4 left-1/4 animate-pulse-glow" style={{ opacity: 0.12 }} />
            <div className="glow-effect w-[550px] h-[550px] bg-white bottom-1/4 right-1/4 animate-pulse-glow" style={{ opacity: 0.04 }} />

            {/* Navbar */}
            <SharedNavbar
              showUserInfo={true}
              onSignInClick={() => setShowAuthModal(true)}
              onTutorialClick={() => router.push('/tutorial')}
            />

            {/* Hero Section with Scroll Animation */}
            <div className="relative z-20">
              <ContainerScroll
                titleComponent={
                  <div className="flex flex-col items-center justify-center max-w-3xl w-full px-2 text-center sm:px-0">
                    {/* Tagline Badge */}
                    <div className="mb-6 rounded-full border border-red-500/15 bg-transparent sm:mb-8">
                      <div className="px-4 py-2 text-[10px] text-red-400 font-black uppercase tracking-[0.22em] flex items-center gap-2 sm:px-6 sm:text-xs sm:tracking-[0.3em]">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Live Multiplayer Gaming
                      </div>
                    </div>

                    {/* Heading */}
                    <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-6 sm:mb-8" style={{ textShadow: '0 0 60px rgba(239,68,68,0.3)' }}>
                      <ShinyText text="DOMINATE" color="#ffffff" hoverColor="#ef4444" /> <br />
                      <ShinyText text="THE" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="DECK" color="#ef4444" cursorShine={true} defaultGradient="linear-gradient(135deg, #ef4444 0%, #ffffff 50%, #ef4444 100%)" />
                    </h1>

                    {/* Description */}
                    <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl leading-relaxed mb-8 sm:mb-10 font-medium">
                      Browser-based card battles with private rooms, quick practice, and real-time turns.
                      No downloads. No fake numbers. Just play.
                    </p>

                    {/* Feature Row */}
                    <div className="grid grid-cols-3 items-start justify-center gap-3 sm:flex sm:items-center sm:gap-8 md:gap-16 mb-10 sm:mb-12">
                      {[
                        { value: '6 DIGIT', label: 'Private Rooms', color: 'text-red-400' },
                        { value: 'REAL-TIME', label: 'Turn Sync', color: 'text-blue-400' },
                        { value: 'NO INSTALL', label: 'Browser Play', color: 'text-green-400' }
                      ].map((stat, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="text-center"
                        >
                          <div className={`text-2xl sm:text-3xl md:text-4xl font-black ${stat.color} mb-1`}>
                            {stat.value}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold">
                            {stat.label}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 relative z-20 mb-8">
                        <motion.button
                          onClick={handleStartPlaying}
                          onMouseEnter={playHover}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-full px-8 py-4 rounded-full btn-arena-primary text-sm uppercase tracking-[0.2em] relative overflow-hidden group font-black sm:w-auto sm:px-10"
                        >
                          <motion.span
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                          />
                          <span className="relative flex items-center gap-2">
                            PLAY NOW <ArrowRight className="w-5 h-5" />
                          </span>
                        </motion.button>
                    </div>
                  </div>
                }
              >
                {/* Card Deck Container */}
                <motion.div
                  className="relative w-full h-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Top-Left Red 7 Card */}
                  <motion.div
                    className="absolute"
                    style={{
                      left: '5%',
                      top: '-8%',
                    }}
                    initial={{ opacity: 0, rotate: -15, y: -20 }}
                    animate={{ opacity: 1, rotate: -12, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    <BorderGlow
                      edgeSensitivity={35}
                      glowColor="0 100 50"
                      backgroundColor="#ea4335"
                      borderRadius={20}
                      glowRadius={24}
                      glowIntensity={1.2}
                      coneSpread={24}
                      colors={['#ef4444', '#b91c1c', '#f87171']}
                      className="w-32 h-48 sm:w-40 sm:h-56 border border-white/20 select-none cursor-default"
                    >
                      <div className="absolute top-2 left-2 text-sm sm:text-base text-white card-corner-number font-black">7</div>
                      <div className="card-oval-insert w-[76%] h-[60%]">
                        <span className="card-oval-value text-2xl sm:text-3xl font-bold text-[#ea4335]">7</span>
                      </div>
                      <div className="absolute bottom-2 right-2 text-sm sm:text-base text-white card-corner-number rotate-180 font-black">7</div>
                    </BorderGlow>
                  </motion.div>

                  {/* Top-Right Blue Skip Card */}
                  <motion.div
                    className="absolute"
                    style={{
                      right: '5%',
                      top: '-5%',
                    }}
                    initial={{ opacity: 0, rotate: 20, y: -20 }}
                    animate={{ opacity: 1, rotate: 15, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    <BorderGlow
                      edgeSensitivity={35}
                      glowColor="210 100 50"
                      backgroundColor="#0099ff"
                      borderRadius={20}
                      glowRadius={24}
                      glowIntensity={1.2}
                      coneSpread={24}
                      colors={['#3b82f6', '#1d4ed8', '#60a5fa']}
                      className="w-32 h-48 sm:w-40 sm:h-56 border border-white/20 select-none cursor-default"
                    >
                      <div className="absolute top-2 left-2 text-sm sm:text-base text-white card-corner-number font-black">⊘</div>
                      <div className="card-oval-insert w-[76%] h-[60%]">
                        <span className="card-oval-value text-2xl sm:text-3xl font-bold text-[#0099ff]">⊘</span>
                      </div>
                      <div className="absolute bottom-2 right-2 text-sm sm:text-base text-white card-corner-number rotate-180 font-black">⊘</div>
                    </BorderGlow>
                  </motion.div>

                  {/* Bottom-Left Yellow +2 Card */}
                  <motion.div
                    className="absolute"
                    style={{
                      left: '8%',
                      bottom: '0%',
                    }}
                    initial={{ opacity: 0, rotate: 25, y: 20 }}
                    animate={{ opacity: 1, rotate: 18, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <BorderGlow
                      edgeSensitivity={35}
                      glowColor="45 100 50"
                      backgroundColor="#f59e0b"
                      borderRadius={20}
                      glowRadius={24}
                      glowIntensity={1.2}
                      coneSpread={24}
                      colors={['#f59e0b', '#b45309', '#fbbf24']}
                      className="w-32 h-48 sm:w-40 sm:h-56 border border-white/20 select-none cursor-default"
                    >
                      <div className="absolute top-2 left-2 text-sm sm:text-base text-white card-corner-number font-black">+2</div>
                      <div className="card-oval-insert w-[76%] h-[60%]">
                        <span className="card-oval-value text-2xl sm:text-3xl font-bold text-[#f59e0b]">+2</span>
                      </div>
                      <div className="absolute bottom-2 right-2 text-sm sm:text-base text-white card-corner-number rotate-180 font-black">+2</div>
                    </BorderGlow>
                  </motion.div>

                  {/* Bottom-Right Green Reverse Card */}
                  <motion.div
                    className="absolute"
                    style={{
                      right: '8%',
                      bottom: '-5%',
                    }}
                    initial={{ opacity: 0, rotate: -20, y: 20 }}
                    animate={{ opacity: 1, rotate: -15, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    <BorderGlow
                      edgeSensitivity={35}
                      glowColor="150 100 40"
                      backgroundColor="#10b981"
                      borderRadius={20}
                      glowRadius={24}
                      glowIntensity={1.2}
                      coneSpread={24}
                      colors={['#10b981', '#047857', '#34d399']}
                      className="w-32 h-48 sm:w-40 sm:h-56 border border-white/20 select-none cursor-default"
                    >
                      <div className="absolute top-2 left-2 text-sm sm:text-base text-white card-corner-number font-black">⇄</div>
                      <div className="card-oval-insert w-[76%] h-[60%]">
                        <span className="card-oval-value text-2xl sm:text-3xl font-bold text-[#10b981]">⇄</span>
                      </div>
                      <div className="absolute bottom-2 right-2 text-sm sm:text-base text-white card-corner-number rotate-180 font-black">⇄</div>
                    </BorderGlow>
                  </motion.div>

                  {/* Center: Main 3D Animated +4 Card */}
                  <motion.div
                    className="relative z-10"
                    initial={{ y: 30, opacity: 0, scale: 0.85 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                  >
                    <BorderGlow
                      edgeSensitivity={45}
                      glowColor="0 0 85"
                      backgroundColor="#111115"
                      borderRadius={28}
                      glowRadius={40}
                      glowIntensity={1.6}
                      coneSpread={32}
                      colors={['#ffffff', '#111115', '#4b5563']}
                      className="w-48 h-72 sm:w-56 sm:h-80 md:w-72 md:h-96 lg:w-80 lg:h-[28rem] border-2 border-white/30 select-none cursor-default"
                    >
                      <div className="absolute top-4 left-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white card-corner-number font-black">+4</div>
                      <div className="card-oval-insert w-[76%] h-[60%] flex items-center justify-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 rotate-45">
                          <div className="bg-[#ef4444]" />
                          <div className="bg-[#3b82f6]" />
                          <div className="bg-[#10b981]" />
                          <div className="bg-[#f59e0b]" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 right-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white card-corner-number rotate-180 font-black">+4</div>
                    </BorderGlow>
                  </motion.div>
                </motion.div>
              </ContainerScroll>
            </div>
      </main>

      {/* Feature Sections */}
      <section className="min-h-screen bg-arena-gradient bg-grid text-gray-100 px-4 py-20 sm:px-6 md:py-32 relative overflow-hidden">
        <div className="glow-effect w-[500px] h-[500px] bg-red-650 top-20 right-20 animate-pulse-glow" style={{ opacity: 0.08 }} />
        <div className="glow-effect w-[400px] h-[400px] bg-blue-500 bottom-20 left-20 animate-pulse-glow" style={{ opacity: 0.06 }} />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center mb-14 md:mb-24"
          >
            <motion.div
              className="inline-block mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2">
                <span className="text-xs text-red-400 font-black uppercase tracking-[0.2em]">How It Wins</span>
              </div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-6"
              style={{ textShadow: '0 0 60px rgba(239,68,68,0.3)' }}
            >
              <ShinyText text="READ" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="THE" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="TABLE" color="#ef4444" cursorShine={true} />
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-base text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium"
            >
              Every turn is a decision: protect your hand, pressure the next player, or flip the round before someone calls last card.
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Game Rules Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-6"
          >
              <div className="space-y-5">
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-white">TURN RULES INTO MOVES</h3>
                  <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-gray-400">
                    Simple matching keeps the pace fast. The skill is knowing when to burn a card, when to hold it, and who to make draw next.
                  </p>
                </div>
                
                <div className="grid gap-3">
                  {[
                    ['01', 'Match Fast, Think Ahead', 'Play by color or number, but keep an escape card ready for the next color swing.'],
                    ['02', 'Break Their Tempo', 'Skip, Reverse, and Draw cards are pressure tools. Use them when someone is close to going out.'],
                    ['03', 'Save Wilds For Control', 'Wilds reset the table. Hold them for a bad hand, a color trap, or one final push.'],
                    ['04', 'Call Last Card, Close Clean', 'Drop to one card, survive the table’s response, then finish before the round turns on you.'],
                  ].map(([number, title, body], index) => (
                    <motion.div
                      key={number}
                      initial={{ opacity: 0, x: -24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      whileHover={{ x: 8, borderColor: 'rgba(239,68,68,0.34)', backgroundColor: 'rgba(255,255,255,0.055)' }}
                      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className="flex gap-4 items-start rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <motion.div
                        whileHover={{ scale: 1.08, rotate: -4 }}
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm"
                      >
                        {number}
                      </motion.div>
                      <div>
                        <h4 className="text-white font-bold mb-1">{title}</h4>
                        <p className="text-gray-400 text-sm">{body}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Interactive Card Stack */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex justify-center items-center relative min-h-[420px] w-full"
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ y: [0, -6, 0] }}
                whileHover={{ y: -10, scale: 1.04, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.07)' }}
                viewport={{ once: true }}
                transition={{ opacity: { duration: 0.35, delay: 0.35 }, scale: { duration: 0.35, delay: 0.35 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
                className="group absolute left-4 top-4 hidden min-w-60 overflow-hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-md md:block"
              >
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-red-400 via-white/60 to-red-500 opacity-70" />
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-red-300 transition-transform duration-300 group-hover:scale-110">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Current Read</p>
                    <p className="mt-1 text-sm font-black text-white">Opponent down to 2</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ y: [0, 6, 0] }}
                whileHover={{ y: 2, scale: 1.04, borderColor: 'rgba(248,113,113,0.55)', backgroundColor: 'rgba(239,68,68,0.16)' }}
                viewport={{ once: true }}
                transition={{ opacity: { duration: 0.35, delay: 0.5 }, scale: { duration: 0.35, delay: 0.5 }, y: { duration: 4.4, repeat: Infinity, ease: 'easeInOut' } }}
                className="group absolute right-2 top-20 hidden min-w-48 overflow-hidden rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-left shadow-[0_18px_42px_rgba(127,29,29,0.24)] backdrop-blur-md md:block"
              >
                <span className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-red-400/20 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-red-300/20 bg-red-400/15 text-red-200 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">Best Move</p>
                    <p className="mt-1 text-sm font-black text-white">Hold the Wild</p>
                  </div>
                </div>
              </motion.div>
              <motion.button
                type="button"
                onClick={handleSwipeTopCard}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                animate={{ opacity: [0.78, 1, 0.78] }}
                whileHover={{ y: -3, scale: 1.04, borderColor: 'rgba(255,255,255,0.24)', backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.97 }}
                viewport={{ once: true }}
                transition={{ opacity: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }, y: { duration: 0.35, delay: 0.7 } }}
                className="group absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300 shadow-[0_14px_34px_rgba(0,0,0,0.26)] backdrop-blur-md transition-colors md:flex"
              >
                <Lightning className="h-3.5 w-3.5 text-red-300 transition-transform duration-300 group-hover:scale-125" />
                Drag or tap the top card
                <ArrowRight className="h-3.5 w-3.5 text-white/60 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
              <div className="relative w-48 h-72 grid place-items-center">
                {swipeCards.map((card, idx) => (
                  <SwipeableCardWrapper
                    key={card.id}
                    id={card.id}
                    index={idx}
                    cards={swipeCards}
                    isSwiped={card.isSwiped}
                    swipeDir={card.swipeDir}
                    playCardMove={playPlayCard}
                    onSwipeOff={handleSwipeOff}
                    onRemoveCard={handleRemoveCard}
                  >
                    <InteractiveGameCard
                      cardColor={card.color}
                      cardType={card.type}
                      value={card.value}
                      symbol={card.symbol}
                      className="cursor-grab active:cursor-grabbing"
                    />
                  </SwipeableCardWrapper>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Card Showcase */}
      <section className="min-h-screen bg-arena-gradient bg-grid text-gray-100 py-32 px-6 relative overflow-hidden">
        <div className="glow-effect w-[600px] h-[600px] bg-white bottom-20 left-20 animate-pulse-glow" style={{ opacity: 0.04 }} />
        <div className="glow-effect w-[400px] h-[400px] bg-red-650 top-20 right-20 animate-pulse-glow" style={{ opacity: 0.06 }} />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center mb-24"
          >
            <motion.div
              className="inline-block mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2">
                <span className="text-xs text-red-400 font-black uppercase tracking-[0.2em]">Player Progress</span>
              </div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-6"
              style={{ textShadow: '0 0 60px rgba(239,68,68,0.3)' }}
            >
              <ShinyText text="KNOW" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="YOUR" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="EDGE" color="#ef4444" cursorShine={true} />
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-base text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium"
            >
              Track your Score, compare with friends, and turn every match into a climb. The table remembers who wins under pressure.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
            { color: '#ea4335', label: 'LIVE SCORE', value: 1840, detail: 'Watch your rating move after every win, loss, streak, and comeback.', glow: '0 100 50', count: 'Score', delay: 0 },
            { color: '#0099ff', label: 'FRIEND RIVALS', value: 3, prefix: '#', padStart: 2, detail: 'Compare ranks with friends and see who owns the table this week.', glow: '210 100 50', count: 'Rank', delay: 0.1 },
            { color: '#10b981', label: 'WIN STREAKS', value: 5, prefix: 'x', detail: 'Keep momentum visible so every round feels like part of a run.', glow: '150 100 40', count: 'Streak', delay: 0.2 },
            { color: '#f59e0b', label: 'MATCH HISTORY', value: 24, suffix: 'h', detail: 'Review recent games, round points, and the plays that changed them.', glow: '45 100 50', count: 'Log', delay: 0.3 }
            ].map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{
                  y: -12,
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: card.delay, ease: "easeOut" }}
                className="cursor-pointer"
              >
                <div className="relative">
                  <BorderGlow
                    edgeSensitivity={35}
                    glowColor={card.glow}
                    backgroundColor={card.color}
                    borderRadius={20}
                    glowRadius={28}
                    glowIntensity={1.3}
                    coneSpread={25}
                    colors={[card.color, card.color, card.color]}
                    className="min-h-[17rem] border border-white/20 p-5 backdrop-blur-sm shadow-2xl"
                  >
                    <div className="flex h-full w-full flex-col items-start justify-between text-left">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: card.delay + 0.35 }}
                        className="text-4xl font-black text-white tracking-tight"
                      >
                        <AnimatedStatNumber
                          value={card.value}
                          prefix={card.prefix}
                          suffix={card.suffix}
                          padStart={card.padStart}
                        />
                      </motion.div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                          {card.label}
                        </p>
                        <p className="mt-3 text-sm font-semibold leading-relaxed text-white/82">
                          {card.detail}
                        </p>
                      </div>
                    </div>
                  </BorderGlow>
                  <div className="absolute -top-3 -right-3 rounded-full border border-white/20 bg-red-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(239,68,68,0.35)]">
                    {card.count}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="min-h-[60vh] bg-arena-gradient bg-grid text-gray-100 py-32 px-6 relative overflow-hidden flex items-center">
        <motion.div
          style={{ y: springParallax }}
          className="glow-effect w-[700px] h-[700px] bg-red-650 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-glow"
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <motion.div
              className="inline-block mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2">
                <span className="text-xs text-red-400 font-black uppercase tracking-[0.2em]">Join Now</span>
              </div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-8"
              style={{ textShadow: '0 0 60px rgba(239,68,68,0.3)' }}
            >
              <ShinyText text="READY TO" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="DOMINATE?" color="#ef4444" cursorShine={true} />
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-base text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Create a private room, invite friends with a six-digit code, or jump into practice.
              Your next match starts with a single click.
            </motion.p>
            <motion.button
              onClick={handleStartPlaying}
              onMouseEnter={playHover}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-5 rounded-full btn-arena-primary text-sm uppercase tracking-[0.2em] relative overflow-hidden group font-black"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
              />
              <span className="relative flex items-center gap-3 text-base">
                START YOUR JOURNEY <ArrowRight className="w-6 h-6" />
              </span>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-arena-gradient bg-grid text-gray-400 py-20 px-6 border-t border-white/5 relative overflow-hidden">
        <motion.div
          className="glow-effect w-[400px] h-[400px] bg-red-650 bottom-0 right-0 animate-pulse-glow"
          style={{ opacity: 0.05 }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-4 gap-12 mb-16"
          >
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Gamepad2 className="w-8 h-8 text-red-500" />
                <span className="font-black text-2xl text-white">ONLY CARDS</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-md">
                The ultimate competitive card gaming platform. Real-time multiplayer, ranked leaderboards, and strategic gameplay. Join thousands of players worldwide.
              </p>
              <div className="flex items-center gap-4">
                {['Twitter', 'Discord', 'Instagram'].map((social, index) => (
                  <motion.a
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <span className="text-xs font-black">{social[0]}</span>
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="text-xs text-gray-500">
              © 2024 Only Cards. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-xs">
              {[
                { label: 'Home', href: '/' },
                { label: 'Rules', href: '/rules' },
                { label: 'Sign In', href: '#' }
              ].map((item, index) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className="text-gray-500 hover:text-red-400 transition-colors relative group"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  {item.label}
                  <motion.span
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-red-400 group-hover:w-full transition-all duration-300"
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </footer>

      {/* Custom Cursor Glow Effect */}
      <motion.div
        className="fixed w-64 h-64 rounded-full pointer-events-none z-50 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
          x: cursorX,
          y: cursorY,
        }}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={() => router.push('/ready-to-play')}
      />
      <FriendsModal isOpen={showFriendsModal} onClose={() => setShowFriendsModal(false)} />
      </>
  </>
  );
}
