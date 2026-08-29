'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useAudio } from '../hooks/useAudio';
import { AiDifficulty } from 'cards-shared';
import { Bot, CheckCircle2, Circle, Send, Plus, UserMinus, Play, Shield, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import ShinyText from './ShinyText';
import { SharedNavbar } from './SharedNavbar';
import FriendsModal from './FriendsModal';

export default function WaitingRoom() {
  const {
    user,
    roomState,
    addAi,
    updateAiDifficulty,
    removeAi,
    toggleReady,
    startGame,
    chatMessages,
    sendChat,
    logout
  } = useGameStore();

  const { playHover, playSelect } = useAudio();
  const [chatInput, setChatInput] = useState('');
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!roomState) return null;

  const isHost = roomState.hostId === user?.id;
  const me = roomState.players.find(p => p.id === user?.id);
  const allReady = roomState.players.every(p => p.isReady);
  const minPlayers = roomState.players.length >= 2;
  const selectedPlayerCount = roomState.rules.maxPlayers;
  const isPracticeRoom = Boolean(roomState.rules.practiceMode);
  const roomHasExpectedPlayers = selectedPlayerCount ? roomState.players.length >= selectedPlayerCount : true;
  const openSlots = selectedPlayerCount ? Math.max(0, selectedPlayerCount - roomState.players.length) : 0;
  const canAddAi = isHost && !selectedPlayerCount && !isPracticeRoom && roomState.players.length < 8;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput);
    setChatInput('');
  };

  const handleAddAi = () => {
    playSelect();
    const personalities: any[] = ['Strategist', 'Aggressive', 'Defensive', 'Chaotic', 'Troll'];
    const selectedPers = personalities[Math.floor(Math.random() * personalities.length)];
    addAi('Medium', selectedPers);
  };

  const handleRemovePlayer = (id: string) => {
    playSelect();
    removeAi(id);
  };

  const difficultyToLevel = (difficulty?: AiDifficulty) => {
    if (difficulty === 'Easy') return 1;
    if (difficulty === 'Hard' || difficulty === 'Expert') return 3;
    return 2;
  };

  const levelToDifficulty = (level: number): AiDifficulty => {
    if (level <= 1) return 'Easy';
    if (level >= 3) return 'Hard';
    return 'Medium';
  };

  const handleBotIqChange = (botId: string, level: number) => {
    updateAiDifficulty(botId, levelToDifficulty(level));
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
        showRoomCode={!isPracticeRoom}
        roomCode={roomState.roomId}
        showUserInfo={false}
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
            <span className="text-xs text-red-400 font-black uppercase tracking-[0.2em]">Waiting for players</span>
          </div>
        </motion.div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-6" style={{ textShadow: '0 0 60px rgba(239,68,68,0.3)' }}>
          <ShinyText text="LOBBY" color="#ef4444" cursorShine={true} />
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl leading-relaxed mb-10 sm:mb-12 font-medium">
          {isPracticeRoom
            ? "Practice against tuned AI bots. Start when you're ready."
            : selectedPlayerCount
            ? `Share the room code, wait for ${selectedPlayerCount} players, then everyone marks ready before the host starts.`
            : "Invite friends or add AI opponents. Mark yourself as ready when you're prepared to begin the match."}
        </p>

        {/* Players Grid */}
        <div className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 mb-8">
          {roomState.players.map((player, idx) => {
            const isPlayerHost = roomState.hostId === player.id;
            const isCurrentUser = player.id === user?.id;
            return (
              <motion.div
                key={player.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.06 }}
                className={`glass-card relative overflow-hidden rounded-2xl border p-4 text-left ${
                  player.isReady ? 'border-red-400/35 bg-red-500/[0.035]' : 'border-white/10'
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300/35 to-transparent" />
                <div className="flex min-h-[5.75rem] items-center gap-4">
                  <div className={`grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border ${
                    player.isReady
                      ? 'border-red-300/40 bg-red-500/16 text-red-100'
                      : 'border-white/10 bg-white/[0.045] text-gray-300'
                  }`}>
                    {player.isAi ? <Bot className="h-7 w-7" /> : <UserRound className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-base font-black text-white">{player.name}</h3>
                      {isPlayerHost && <Shield className="h-4 w-4 flex-shrink-0 text-red-300" />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                        {player.isAi ? `${player.aiDifficulty || 'Medium'} bot` : isPlayerHost ? 'Host' : 'Player'}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                        player.isReady
                          ? 'border-red-300/30 bg-red-500/14 text-red-100'
                          : 'border-white/10 bg-white/[0.035] text-gray-500'
                      }`}>
                        {player.isReady ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                        {player.isReady ? 'Ready' : 'Not ready'}
                      </span>
                    </div>
                  </div>
                  {isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => { playSelect(); toggleReady(); }}
                      className={`flex-shrink-0 rounded-full border px-4 py-2 font-display text-[10px] font-black uppercase tracking-[0.12em] transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        me?.isReady
                          ? 'border-white/10 bg-white/[0.04] text-gray-300 hover:text-white'
                          : 'border-red-300/40 bg-red-500/20 text-red-50 shadow-lg shadow-red-500/10 hover:bg-red-500/30'
                      }`}
                    >
                      {me?.isReady ? 'Unready' : 'Ready'}
                    </button>
                  )}
                </div>
                {isPracticeRoom && player.isAi && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Bot IQ</span>
                      <span className="rounded-full border border-red-400/25 bg-red-500/10 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-red-200">
                        {player.aiDifficulty || 'Medium'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={1}
                      value={difficultyToLevel(player.aiDifficulty)}
                      disabled={!isHost}
                      onChange={event => handleBotIqChange(player.id, Number(event.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-green-500/75 via-yellow-300/75 to-red-500/75 accent-red-400 disabled:cursor-default disabled:opacity-70"
                      aria-label={`${player.name} IQ`}
                    />
                    <div className="mt-2 flex items-center justify-between font-display text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">
                      <span>Easy</span>
                      <span>Hard</span>
                    </div>
                  </div>
                )}
                {isHost && player.isAi && !isPracticeRoom && (
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(player.id)}
                    className="absolute right-3 top-3 rounded-xl border border-red-900/30 bg-red-950/20 p-2 text-red-500 transition-all hover:bg-red-600 hover:text-white"
                    aria-label={`Remove ${player.name}`}
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}

          {Array.from({ length: openSlots }).map((_, idx) => (
            <motion.div
              key={`empty-slot-${idx}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: (roomState.players.length + idx) * 0.08 }}
              className="glass-card flex min-h-[7.75rem] items-center gap-4 rounded-2xl border border-dashed border-white/15 p-4 text-left opacity-75"
            >
              <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl font-black text-gray-600">
                +
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-gray-400">Open Seat</div>
                <div className="text-xs text-gray-600 font-black uppercase tracking-wider mt-1">Waiting to join</div>
              </div>
            </motion.div>
          ))}
          
          {/* Add AI Button */}
          {canAddAi && (
            <motion.button
              type="button"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: roomState.players.length * 0.1 }}
              onClick={handleAddAi}
              className="glass-card flex min-h-[7.75rem] cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-white/20 p-4 text-left transition-all hover:scale-[1.01] hover:border-red-500/40"
            >
              <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-400">
                <Plus className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-white">Add AI</div>
                <div className="text-xs text-gray-500 font-black uppercase tracking-wider mt-1">Opponent</div>
              </div>
            </motion.button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:gap-4">
          {isHost && (
            <button
              onClick={() => { playSelect(); startGame(); }}
              disabled={!allReady || !minPlayers || !roomHasExpectedPlayers}
              className="flex-grow justify-center px-8 py-4 rounded-full btn-arena-primary hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 text-sm uppercase tracking-wider disabled:opacity-40 disabled:scale-100 font-black"
            >
              <Play className="w-4 h-4 fill-white" />
              {roomHasExpectedPlayers ? 'START GAME' : `WAITING ${roomState.players.length}/${selectedPlayerCount}`}
            </button>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-full max-w-lg glass-card p-4 sm:p-6 rounded-2xl z-10 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-red-400">Lobby Chat</h2>
        </div>

        {/* Chat feed */}
        <div className="flex-grow overflow-hidden pr-1 flex flex-col gap-2 mb-4 max-h-[150px]">
          {chatMessages.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4 font-black tracking-wider uppercase">
              No messages yet
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isSys = msg.playerId === 'SYSTEM';
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs leading-relaxed font-semibold ${
                    isSys
                      ? 'bg-red-950/20 border border-red-500/20 text-red-350 text-center font-black uppercase tracking-wider'
                      : 'bg-white/5 border border-white/10 text-gray-300'
                  }`}
                >
                  {!isSys && <span className="font-black text-red-400 mr-1.5">{msg.sender}:</span>}
                  {msg.message}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Type chat..."
            className="flex-grow bg-black/40 border border-white/10 rounded-full px-4 py-3 text-xs focus:outline-none focus:border-red-500 text-white font-medium"
          />
          <button
            type="submit"
            className="p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      <FriendsModal isOpen={showFriendsModal} onClose={() => setShowFriendsModal(false)} />
    </main>
  );
}
