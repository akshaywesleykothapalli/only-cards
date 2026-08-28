'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquareWarning, Send, Star, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { BrandMark } from './BrandMark';
import { useGameStore } from '../store/useGameStore';

const CATEGORIES = [
  { value: 'BUG_GLITCH', label: 'Bug / Glitch' },
  { value: 'GAMEPLAY_ISSUE', label: 'Gameplay issue' },
  { value: 'UI_MOBILE_ISSUE', label: 'UI / Mobile issue' },
  { value: 'FEATURE_SUGGESTION', label: 'Feature suggestion' },
  { value: 'GENERAL_FEEDBACK', label: 'General feedback' },
] as const;

const getBrowserName = (ua: string) => {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Unknown';
};

const getOsName = (ua: string) => {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
};

export default function FeedbackWidget() {
  const pathname = usePathname();
  const { serverUrl, token, user, roomState, gameState, pushToast } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<typeof CATEGORIES[number]['value']>('BUG_GLITCH');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isGameContext = pathname === '/game' || Boolean(gameState || roomState);

  const gameContext = useMemo(() => {
    if (!gameState && !roomState) return null;
    return {
      status: gameState?.status,
      activeColor: gameState?.activeColor,
      activeSide: gameState?.activeSide,
      activeValue: gameState?.activeValue,
      currentTurn: gameState?.currentPlayerIndex,
      playerCount: gameState?.players.length ?? roomState?.players.length,
      roomId: roomState?.roomId,
      rules: roomState?.rules ?? gameState?.rules,
      recentEventIds: gameState?.logs.slice(-6).map(log => `${log.type}:${log.playerId ?? 'system'}:${log.timestamp}`),
    };
  }, [gameState, roomState]);

  const resetForm = () => {
    setCategory('BUG_GLITCH');
    setRating(null);
    setMessage('');
    setError(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    resetForm();
  };

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      setError('Tell us a little more so we can fix or evaluate it.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const userAgent = navigator.userAgent;
      const response = await fetch(`${serverUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category,
          rating,
          message: trimmedMessage,
          page: pathname,
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'local',
          userAgent,
          browser: getBrowserName(userAgent),
          os: getOsName(userAgent),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          roomId: roomState?.roomId,
          gameContext,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to submit feedback');
      }
      pushToast('Feedback sent. Thank you for helping improve Only Cards.', 'success');
      setIsOpen(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit feedback right now';
      setError(message);
      pushToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`font-display fixed z-[45] inline-flex items-center justify-center rounded-full border border-white/10 bg-black/65 text-red-100 shadow-2xl backdrop-blur-xl transition-all hover:border-red-400/60 hover:bg-red-600 ${
          isGameContext
            ? 'bottom-5 left-5 h-11 w-11 p-0 sm:bottom-7 sm:left-7'
            : 'bottom-5 left-5 h-11 gap-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] sm:bottom-7 sm:left-7 sm:px-4'
        }`}
        aria-label="Send feedback or report an issue"
        title="Feedback / Report issue"
      >
        <MessageSquareWarning className="h-4 w-4" />
        {!isGameContext && <span className="hidden sm:inline">Feedback</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.form
              initial={{ y: 16, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onSubmit={submitFeedback}
              onClick={(event) => event.stopPropagation()}
              className="font-body relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-gray-100 shadow-2xl backdrop-blur-sm sm:p-7"
            >
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-4 top-4 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close feedback form"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-5 flex items-center justify-between">
                <div className="font-display inline-flex items-center rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-red-300">
                  <MessageSquareWarning className="mr-1.5 h-3 w-3" /> Feedback
                </div>
              </div>

              <div className="mb-5 text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <BrandMark size="md" />
                  <span className="font-display text-xl font-black text-white">ONLY CARDS</span>
                </div>
                <h2 className="font-display mb-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">REPORT FEEDBACK</h2>
                <p className="font-body mx-auto max-w-sm text-xs font-medium leading-relaxed text-gray-400 sm:text-sm">
                  Share glitches, gameplay issues, mobile problems, suggestions, or a quick review.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory(item.value)}
                    className={`font-display rounded-2xl border px-4 py-3 text-left text-xs font-black uppercase tracking-wider transition-all ${
                      category === item.value
                        ? 'border-red-400/60 bg-red-500/20 text-red-100 ring-2 ring-red-400/20'
                        : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <p className="font-display mb-2 text-xs font-black uppercase tracking-wider text-gray-300">Rating optional</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(rating === value ? null : value)}
                      className={`grid h-10 w-10 place-items-center rounded-full border transition-all ${
                        rating && value <= rating
                          ? 'border-yellow-300/60 bg-yellow-400/15 text-yellow-200'
                          : 'border-white/10 bg-white/[0.03] text-gray-500 hover:text-white'
                      }`}
                      aria-label={`${value} star rating`}
                    >
                      <Star className="h-4 w-4" fill={rating && value <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-5 block">
                <span className="font-display text-xs font-black uppercase tracking-wider text-gray-300">Details</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="font-body mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold leading-relaxed text-white outline-none transition-colors placeholder:text-gray-600 focus:border-red-400/50 focus:ring-2 focus:ring-red-400/20"
                  placeholder="What happened, what felt off, or what would make the game better?"
                />
              </label>

              <div className="font-body mt-2 flex items-center justify-between gap-3 text-[11px] font-bold text-gray-500">
                <span>{user?.username ? `Submitting as ${user.username}` : 'Submitting anonymously'}</span>
                <span>{message.length}/2000</span>
              </div>

              {error && (
                <p className="font-body mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-medium text-red-400">
                  {error}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="font-display flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-300 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-display flex-1 rounded-2xl bg-red-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" />
                    {isSubmitting ? 'Sending' : 'Submit'}
                  </span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
