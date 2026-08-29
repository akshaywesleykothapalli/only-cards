'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../store/useGameStore';
import { useAudio } from '../hooks/useAudio';
import { MatchRules } from 'cards-shared';
import { Trophy, Shield, Users, X, DoorOpen, PlusCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ShinyText from './ShinyText';
import { SharedNavbar } from './SharedNavbar';
import FriendsModal from './FriendsModal';

export default function Lobby() {
  const {
    user,
    isQueued,
    joinQueue,
    leaveQueue,
    createRoom,
    joinRoom,
    leaderboard,
    fetchLeaderboard,
    logout,
    loginGuest,
    initSocket,
    roomState,
    gameState
  } = useGameStore();
  const router = useRouter();

  const { playHover, playSelect } = useAudio();
  const [roomCodeDigits, setRoomCodeDigits] = useState<string[]>(Array(6).fill(''));
  const roomCodeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const roomCodeInput = roomCodeDigits.join('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [customMode, setCustomMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [customPlayerCount, setCustomPlayerCount] = useState(2);
  const [customStartingCards, setCustomStartingCards] = useState(7);
  const [practicePlayerCount, setPracticePlayerCount] = useState(4);
  const [practiceStartingCards, setPracticeStartingCards] = useState(7);
  
  // Custom match rules options
  const [rules, setRules] = useState<MatchRules>({
    stacking: true,
    jumpIn: true,
    drawUntilPlayable: false,
    challengeWild4: true,
    timerMode: true,
    timerSeconds: 15,
    startingHandSize: 7,
    scoreLimit: 500,
    roundLimit: 5,
    flipMode: false
  });

  useEffect(() => {
    initSocket();
    if (!user) {
      loginGuest();
    }
    fetchLeaderboard();
  }, [initSocket, user, loginGuest, fetchLeaderboard]);

  useEffect(() => {
    if (roomState || gameState) router.push('/game');
  }, [roomState, gameState, router]);

  const handleOpenPracticeSetup = () => {
    playSelect();
    setShowPracticeModal(true);
  };

  const handleCreatePracticeRoom = () => {
    playSelect();
    const practiceSeats = Math.min(8, Math.max(2, practicePlayerCount));
    createRoom({
      ...rules,
      stacking: true,
      jumpIn: true,
      drawUntilPlayable: false,
      challengeWild4: true,
      timerMode: true,
      timerSeconds: 15,
      startingHandSize: practiceStartingCards,
      scoreLimit: 500,
      roundLimit: 5,
      flipMode: false,
      practiceMode: true,
      maxPlayers: practiceSeats,
    }, true); // creates practice lobby with selected AI count
    setShowPracticeModal(false);
  };

  const handleCreateCustom = () => {
    playSelect();
    const customSeats = Math.min(8, Math.max(2, customPlayerCount));
    createRoom({
      ...rules,
      stacking: true,
      jumpIn: true,
      drawUntilPlayable: false,
      challengeWild4: true,
      timerMode: true,
      timerSeconds: 15,
      startingHandSize: customStartingCards,
      scoreLimit: 500,
      roundLimit: 5,
      flipMode: false,
      maxPlayers: customSeats,
    }, false); // custom lobby
    setShowCustomModal(false);
    setCustomMode('choice');
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCodeInput.length !== 6) return;
    playSelect();
    joinRoom(roomCodeInput);
    setShowCustomModal(false);
    setCustomMode('choice');
    setRoomCodeDigits(Array(6).fill(''));
  };

  const updateRoomCodeDigit = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    const nextDigits = [...roomCodeDigits];
    if (!digits) {
      nextDigits[index] = '';
      setRoomCodeDigits(nextDigits);
      return;
    }

    digits.slice(0, 6 - index).split('').forEach((digit, offset) => {
      nextDigits[index + offset] = digit;
    });
    setRoomCodeDigits(nextDigits);
    roomCodeInputRefs.current[Math.min(5, index + digits.length)]?.focus();
  };

  const handleRoomCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !roomCodeDigits[index] && index > 0) {
      roomCodeInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      roomCodeInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      roomCodeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleRoomCodePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    updateRoomCodeDigit(index, e.clipboardData.getData('text'));
  };

  return (
    <main className="min-h-screen w-full bg-arena-gradient bg-grid text-gray-100 flex flex-col items-center justify-between px-4 py-6 sm:p-6 relative overflow-hidden select-none font-sans">
      {/* Dynamic backdrop glows (Red & White Theme) */}
      <div className="glow-effect w-[550px] h-[550px] bg-red-650 top-1/4 left-1/4 animate-pulse-glow" style={{ opacity: 0.12 }} />
      <div className="glow-effect w-[550px] h-[550px] bg-white bottom-1/4 right-1/4 animate-pulse-glow" style={{ opacity: 0.04 }} />

      {/* Navbar */}
      <SharedNavbar
        showBackButton={true}
        onBackClick={logout}
        showUserInfo={true}
        onFriendsClick={() => setShowFriendsModal(true)}
      />

      {/* Hero Section */}
      <div className="flex-grow flex flex-col items-center justify-center max-w-5xl w-full text-center z-10 mt-20 sm:mt-12 mb-12 sm:mb-16">
        {/* Tagline Badge */}
        <motion.div 
          className="inline-block mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2">
            <span className="text-xs text-red-400 font-black uppercase tracking-[0.2em]">Choose your arena</span>
          </div>
        </motion.div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-6" style={{ textShadow: '0 0 60px rgba(239,68,68,0.3)' }}>
          <ShinyText text="READY TO" color="#ffffff" hoverColor="#ef4444" /> <ShinyText text="PLAY" color="#ef4444" cursorShine={true} />
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl leading-relaxed mb-10 sm:mb-12 font-medium">
          Select your game mode and jump into the action. Compete globally, practice with AI, or create custom rooms with friends.
        </p>

        {/* Game Mode Cards */}
        <div className="ready-mode-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full max-w-5xl mb-12">
          {/* Ranked Match */}
          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.985 }}
            onMouseEnter={playHover}
            onClick={() => { playSelect(); joinQueue(); }}
            className="ready-custom-room-card group glass-card relative flex min-h-[13rem] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-green-300/38 bg-white/[0.035] p-7 text-left font-sans shadow-[0_18px_48px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.07)] transition-all hover:-translate-y-1 hover:border-green-200/65 hover:bg-white/[0.055] hover:shadow-[0_24px_70px_rgba(0,0,0,0.38),0_0_34px_rgba(34,197,94,0.10)] focus:outline-none focus:ring-2 focus:ring-green-200/35 sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-100/55 to-transparent" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-green-400/30 bg-gradient-to-br from-green-500/25 to-black/20 text-green-300 shadow-inner shadow-white/5 transition-colors group-hover:border-green-200/50 group-hover:text-green-100">
                <Trophy className="h-6 w-6" />
              </div>
              <span className="rounded-full border border-green-300/20 bg-green-400/10 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.14em] text-green-200/80">Ranked</span>
            </div>
            <div className="relative z-10">
              <h3 className="mb-2 text-xl font-black uppercase tracking-wider text-white transition-colors group-hover:text-green-200">Ranked Match</h3>
              <p className="max-w-[16rem] text-sm font-semibold leading-relaxed text-gray-400 transition-colors group-hover:text-gray-300">Compete globally and climb the score ladder.</p>
            </div>
            <div className="relative z-10 mt-5 flex items-center justify-between rounded-full border border-green-200/20 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-green-100 transition-colors group-hover:bg-green-400/10">
              <span>Play now</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
            {isQueued && (
              <motion.div className="relative z-10 flex items-center gap-2 text-green-400 text-xs font-black uppercase tracking-wider">
                <motion.div
                  className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Searching...
              </motion.div>
            )}
          </motion.button>

          {/* Practice AI */}
          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.985 }}
            onMouseEnter={playHover}
            className="group glass-card relative flex min-h-[13rem] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-red-300/38 bg-white/[0.035] p-7 text-left font-sans shadow-[0_18px_48px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.07)] transition-all hover:-translate-y-1 hover:border-red-200/65 hover:bg-white/[0.055] hover:shadow-[0_24px_70px_rgba(0,0,0,0.38),0_0_34px_rgba(239,68,68,0.12)] focus:outline-none focus:ring-2 focus:ring-red-200/40 sm:p-8"
            onClick={handleOpenPracticeSetup}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-100/55 to-transparent" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-400/30 bg-gradient-to-br from-red-500/25 to-black/20 text-red-300 shadow-inner shadow-white/5 transition-colors group-hover:border-red-200/50 group-hover:text-red-100">
                <Shield className="h-6 w-6" />
              </div>
              <span className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.14em] text-red-200/80">Practice</span>
            </div>
            <div className="relative z-10">
              <h3 className="mb-2 text-xl font-black uppercase tracking-wider text-white transition-colors group-hover:text-red-200">Practice AI</h3>
              <p className="max-w-[16rem] text-sm font-semibold leading-relaxed text-gray-400 transition-colors group-hover:text-gray-300">Train against tactical AI opponents.</p>
            </div>
            <div className="relative z-10 mt-5 flex items-center justify-between rounded-full border border-red-200/20 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-100 transition-colors group-hover:bg-red-400/10">
              <span>Set up</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.button>

          {/* Custom Room */}
          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.985 }}
            onMouseEnter={playHover}
            className="group glass-card relative flex min-h-[13rem] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-blue-300/38 bg-white/[0.035] p-7 text-left font-sans shadow-[0_18px_48px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.07)] transition-all hover:-translate-y-1 hover:border-blue-200/65 hover:bg-white/[0.055] hover:shadow-[0_24px_70px_rgba(0,0,0,0.38),0_0_34px_rgba(59,130,246,0.12)] focus:outline-none focus:ring-2 focus:ring-blue-200/40 sm:p-8"
            onClick={() => { playSelect(); setShowCustomModal(true); }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-100/55 to-transparent" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-500/25 to-black/20 text-blue-300 shadow-inner shadow-white/5 transition-colors group-hover:border-blue-200/50 group-hover:text-blue-100">
                <Users className="h-6 w-6" />
              </div>
              <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.14em] text-blue-200/80">Private</span>
            </div>
            <div className="relative z-10">
              <h3 className="mb-2 text-xl font-black uppercase tracking-wider text-white transition-colors group-hover:text-blue-200">Custom Room</h3>
              <p className="max-w-[16rem] text-sm font-semibold leading-relaxed text-gray-400 transition-colors group-hover:text-gray-300">Create or join private rooms with friends.</p>
            </div>
            <div className="relative z-10 mt-5 flex items-center justify-between rounded-full border border-blue-200/20 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-blue-100 transition-colors group-hover:bg-blue-400/10">
              <span>Open room</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.button>
        </div>

      </div>

      {/* Practice AI Setup Modal */}
      {showPracticeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowPracticeModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="glass-panel w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden p-5 sm:p-8 rounded-[1.75rem] border border-white/15 shadow-2xl flex flex-col gap-6 relative font-body"
          >
            <motion.div
              className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            />
            <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-red-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-[11px] font-bold text-red-300 uppercase tracking-[0.28em] block mb-2">Training Arena</span>
                <h2 className="font-display text-3xl font-bold text-white uppercase tracking-[-0.02em]">Practice AI</h2>
              </div>
              <motion.button
                onClick={() => setShowPracticeModal(false)}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-300 transition-colors border border-white/10 hover:border-red-500/30"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                  <span className="font-display text-[13px] font-bold text-white uppercase tracking-[0.12em]">No. of players</span>
                    <input
                      type="number"
                      min={2}
                    max={8}
                    value={practicePlayerCount}
                    onChange={e => setPracticePlayerCount(Math.min(8, Math.max(2, parseInt(e.target.value) || 4)))}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-center font-display text-2xl font-bold text-red-300 transition-colors focus:outline-none focus:border-red-400/60"
                  />
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">2 to 8 players · You + bots</p>
                </label>

                <label className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                  <span className="font-display text-[13px] font-bold text-white uppercase tracking-[0.12em]">No. of cards</span>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={practiceStartingCards}
                    onChange={e => setPracticeStartingCards(Math.min(15, Math.max(1, parseInt(e.target.value) || 7)))}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-center font-display text-2xl font-bold text-red-300 transition-colors focus:outline-none focus:border-red-400/60"
                  />
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Starting hand size</p>
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setShowPracticeModal(false)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-display text-xs font-bold uppercase tracking-[0.12em] text-gray-300 transition-all hover:bg-white/[0.07] hover:text-white"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleCreatePracticeRoom}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 rounded-2xl btn-arena-primary py-4 font-display text-sm font-bold uppercase tracking-[0.08em] border border-red-400/30 shadow-lg shadow-red-500/20 transition-all"
                >
                  Create Practice Lobby
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Custom Room Modal */}
      {showCustomModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { setShowCustomModal(false); setCustomMode('choice'); }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="glass-panel w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden p-5 sm:p-8 rounded-[1.75rem] border border-white/15 shadow-2xl flex flex-col gap-6 relative font-body"
          >
            <motion.div
              className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            />
            <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-red-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-[11px] font-bold text-red-300 uppercase tracking-[0.28em] block mb-2">Private Arena</span>
                <h2 className="font-display text-3xl font-bold text-white uppercase tracking-[-0.02em]">
                  {customMode === 'choice' && 'Custom Room'}
                  {customMode === 'create' && 'Create Room'}
                  {customMode === 'join' && 'Join Room'}
                </h2>
              </div>
              <motion.button
                onClick={() => { setShowCustomModal(false); setCustomMode('choice'); }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors border border-white/10 hover:border-red-500/30"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {customMode === 'choice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.button
                  onClick={() => { playSelect(); setCustomMode('create'); }}
                  onMouseEnter={playHover}
                  whileHover={{ y: -4, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-3xl border border-red-400/30 bg-red-500/[0.10] p-6 text-left shadow-[0_18px_45px_rgba(127,29,29,0.18)] transition-all hover:border-red-300/60"
                >
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300/70 to-transparent" />
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-red-300/30 bg-red-400/20 text-red-100 transition-transform group-hover:rotate-[-5deg] group-hover:scale-110">
                    <PlusCircle className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white">Create Room</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-400">Pick player count and starting cards, then invite friends into a waiting lobby.</p>
                </motion.button>

                <motion.button
                  onClick={() => { playSelect(); setCustomMode('join'); }}
                  onMouseEnter={playHover}
                  whileHover={{ y: -4, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-left transition-all hover:border-blue-300/45 hover:bg-blue-500/[0.08]"
                >
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-blue-300/25 bg-blue-400/15 text-blue-100 transition-transform group-hover:rotate-[5deg] group-hover:scale-110">
                    <DoorOpen className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white">Join Room</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-gray-400">Enter a friend’s room code and jump into their waiting lobby.</p>
                </motion.button>
              </div>
            )}

            {customMode === 'create' && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                    <span className="font-display text-[13px] font-bold text-white uppercase tracking-[0.12em]">No. of users</span>
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={customPlayerCount}
                      onChange={e => setCustomPlayerCount(Math.min(8, Math.max(2, parseInt(e.target.value) || 2)))}
                      className="mt-4 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-center font-display text-2xl font-bold text-red-300 transition-colors focus:outline-none focus:border-red-400/60"
                    />
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">2 to 8 players</p>
                  </label>

                  <label className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                    <span className="font-display text-[13px] font-bold text-white uppercase tracking-[0.12em]">No. of cards</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={customStartingCards}
                      onChange={e => setCustomStartingCards(Math.min(15, Math.max(1, parseInt(e.target.value) || 7)))}
                      className="mt-4 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-center font-display text-2xl font-bold text-red-300 transition-colors focus:outline-none focus:border-red-400/60"
                    />
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Starting hand size</p>
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => setCustomMode('choice')}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-display text-xs font-bold uppercase tracking-[0.12em] text-gray-300 transition-all hover:bg-white/[0.07] hover:text-white"
                  >
                    Back
                  </button>
                  <motion.button
                    onClick={handleCreateCustom}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 rounded-2xl btn-arena-primary py-4 font-display text-sm font-bold uppercase tracking-[0.08em] border border-red-400/30 shadow-lg shadow-red-500/20 transition-all"
                  >
                    Create Room
                  </motion.button>
                </div>
              </div>
            )}

            {customMode === 'join' && (
              <form onSubmit={handleJoinByCode} className="flex flex-col gap-5">
                <label className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                  <span className="font-display text-[13px] font-bold text-white uppercase tracking-[0.12em]">Room code</span>
                  <div className="mt-4 grid grid-cols-6 gap-2 sm:gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <input
                        key={index}
                        ref={element => { roomCodeInputRefs.current[index] = element; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        value={roomCodeDigits[index] ?? ''}
                        onChange={e => updateRoomCodeDigit(index, e.target.value)}
                        onKeyDown={e => handleRoomCodeKeyDown(index, e)}
                        onPaste={e => handleRoomCodePaste(index, e)}
                        maxLength={1}
                        aria-label={`Room code digit ${index + 1}`}
                        className="aspect-square w-full rounded-2xl border border-white/10 bg-black/35 text-center font-mono text-2xl font-black text-white shadow-inner shadow-black/20 transition-colors focus:border-red-400/70 focus:bg-red-500/10 focus:outline-none sm:text-3xl"
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Enter the 6-digit code</p>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setCustomMode('choice')}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-display text-xs font-bold uppercase tracking-[0.12em] text-gray-300 transition-all hover:bg-white/[0.07] hover:text-white"
                  >
                    Back
                  </button>
                  <motion.button
                    type="submit"
                    disabled={roomCodeInput.length !== 6}
                    onMouseEnter={playHover}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 rounded-2xl btn-arena-primary py-4 font-display text-sm font-bold uppercase tracking-[0.08em] border border-red-400/30 shadow-lg shadow-red-500/20 transition-all disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                  >
                    Join Room
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
      <FriendsModal isOpen={showFriendsModal} onClose={() => setShowFriendsModal(false)} />
    </main>
  );
}
