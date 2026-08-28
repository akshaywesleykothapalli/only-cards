'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../store/useGameStore';
import { useAudio } from '../hooks/useAudio';
import { MatchRules } from 'cards-shared';
import { Trophy, Shield, Users, Swords, X, DoorOpen, PlusCircle } from 'lucide-react';
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
        <div className="ready-mode-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mb-12">
          {/* Ranked Match */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -8 }}
            className="ready-custom-room-card group relative glass-card p-8 rounded-3xl flex flex-col gap-4 text-left cursor-pointer border border-white/10 overflow-hidden"
            onClick={() => { playSelect(); joinQueue(); }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <div className="relative z-10 flex items-start justify-between">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/30 to-green-500/10 flex items-center justify-center text-green-400 border border-green-500/30"
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                <Trophy className="w-7 h-7" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="text-xs font-black text-green-400 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30"
              >
                COMPETITIVE
              </motion.span>
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black text-white tracking-wider mb-2 uppercase group-hover:text-green-300 transition-colors">RANKED MATCH</h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium group-hover:text-gray-300 transition-colors">Compete globally and climb the score ladder</p>
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
            <motion.div
              className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-green-400 to-transparent"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              style={{ originX: 0 }}
            />
          </motion.div>

          {/* Practice AI */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -8 }}
            className="group relative glass-card p-8 rounded-3xl flex flex-col gap-4 text-left cursor-pointer border border-white/10 overflow-hidden"
            onClick={handleOpenPracticeSetup}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <div className="relative z-10 flex items-start justify-between">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/30 to-red-500/10 flex items-center justify-center text-red-400 border border-red-500/30"
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                <Shield className="w-7 h-7" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="text-xs font-black text-red-400 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30"
              >
                TRAINING
              </motion.span>
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black text-white tracking-wider mb-2 uppercase group-hover:text-red-300 transition-colors">PRACTICE AI</h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium group-hover:text-gray-300 transition-colors">Train against tactical AI opponents</p>
            </div>
            <motion.div
              className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-red-400 to-transparent"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              style={{ originX: 0 }}
            />
          </motion.div>

          {/* Custom Room */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -8 }}
            className="group relative glass-card p-8 rounded-3xl flex flex-col gap-4 text-left cursor-pointer border border-white/10 overflow-hidden"
            onClick={() => { playSelect(); setShowCustomModal(true); }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            <div className="relative z-10 flex items-start justify-between">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/30"
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                <Users className="w-7 h-7" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="text-xs font-black text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30"
              >
                CUSTOM
              </motion.span>
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black text-white tracking-wider mb-2 uppercase group-hover:text-blue-300 transition-colors">CUSTOM ROOM</h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium group-hover:text-gray-300 transition-colors">Create or join private rooms with friends</p>
            </div>
            <motion.div
              className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-transparent"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              style={{ originX: 0 }}
            />
          </motion.div>
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
