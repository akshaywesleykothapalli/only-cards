'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { X, Gamepad2, ArrowRight, Sparkles, CheckCircle2, XCircle, Loader2, Dices } from 'lucide-react';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

type Mode = 'auth' | 'guest-username';

export default function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('auth');
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Guest username picker state
  const [guestUsername, setGuestUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { signUp, signIn, loginGuest } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(username, password);
      } else {
        await signIn(username, password);
      }
      onClose();
      onAuthenticated?.();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }
    const valid = /^[a-zA-Z0-9_]{3,24}$/.test(value.trim());
    if (!valid) {
      setUsernameStatus('invalid');
      setUsernameMessage('3–24 characters, letters, numbers and underscores only');
      return;
    }
    setUsernameStatus('checking');
    setUsernameMessage('');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/auth/check-username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: value.trim() })
        });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available!');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(data.message || 'Username is already taken');
        }
      } catch {
        setUsernameStatus('idle');
      }
    }, 450);
  }, []);

  const handleGuestUsernameChange = (value: string) => {
    setGuestUsername(value);
    checkUsername(value);
  };

  const generateRandomUsername = () => {
    const adjectives = ['Swift', 'Rapid', 'Sharp', 'Brave', 'Dark', 'Wild', 'Cool', 'Fire', 'Ice', 'Storm', 'Cyber', 'Neon', 'Void', 'Chaos', 'Echo', 'Sonic', 'Titan', 'Nova', 'Apex', 'Venom'];
    const nouns = ['Player', 'Slayer', 'Fighter', 'Striker', 'Dragon', 'Phantom', 'Ninja', 'Shadow', 'Blade', 'Vortex', 'Surge', 'Pulse', 'Gamer', 'Master', 'Baron', 'King', 'Hawk', 'Wolf', 'Beast', 'Knight'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 900) + 100;
    return `${adjective}${noun}${number}`;
  };

  const handleGenerateUsername = () => {
    const newUsername = generateRandomUsername();
    setGuestUsername(newUsername);
    checkUsername(newUsername);
  };

  const handleContinueAsGuest = async (skipUsername = false) => {
    setLoading(true);
    setError('');
    try {
      const name = skipUsername || !guestUsername.trim() ? undefined : guestUsername.trim();
      await loginGuest(name);
      onClose();
      onAuthenticated?.();
    } catch (err: any) {
      setError(err.message || 'Could not start guest session');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('auth');
    setGuestUsername('');
    setUsernameStatus('idle');
    setError('');
    onClose();
  };

  const canSubmitGuest =
    !guestUsername.trim() || usernameStatus === 'available';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.98, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-3xl bg-white/[0.03] p-5 sm:p-7 border border-white/10 backdrop-blur-sm">

              {/* ─── Guest Username Picker ─────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {mode === 'guest-username' ? (
                  <motion.div
                    key="guest-username"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-red-300">
                        <Sparkles className="mr-1.5 h-3 w-3" /> GUEST ACCESS
                      </div>
                      <button
                        type="button"
                        aria-label="Close dialog"
                        onClick={handleClose}
                        className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="text-center mb-5">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gamepad2 className="w-7 h-7 text-red-400" />
                        <span className="font-black text-xl text-white">ONLY CARDS</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 uppercase tracking-tight">CHOOSE YOUR NAME</h2>
                      <p className="text-gray-400 text-xs sm:text-sm font-medium">
                        Pick a username or skip to get a random one. Guest accounts are temporary and deleted when you leave.
                      </p>
                    </div>

                    {/* Username input */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-black text-gray-300 mb-2 uppercase tracking-wider">
                          Username <span className="text-gray-600 normal-case font-medium tracking-normal">(optional)</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={guestUsername}
                              onChange={(e) => handleGuestUsernameChange(e.target.value)}
                              className="w-full px-4 py-2.5 pr-10 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                              placeholder="e.g. CoolPlayer99"
                              maxLength={24}
                              autoFocus
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                              {usernameStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="w-4 h-4 text-red-400" />}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateUsername}
                            className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl hover:border-red-500/50 hover:bg-red-500/10 transition-all flex items-center justify-center"
                            title="Generate random username"
                          >
                            <Dices className="w-5 h-5 text-red-400" />
                          </button>
                        </div>
                        <AnimatePresence>
                          {usernameMessage && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className={`mt-1.5 text-xs font-semibold ${usernameStatus === 'available' ? 'text-green-400' : 'text-red-400'}`}
                            >
                              {usernameMessage}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm font-medium">
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button
                        type="button"
                        disabled={loading || (!!guestUsername.trim() && usernameStatus !== 'available')}
                        onClick={() => handleContinueAsGuest(false)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 btn-arena-primary text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            CONNECTING...
                          </span>
                        ) : (
                          <span className="relative flex items-center justify-center gap-2">
                            {guestUsername.trim() ? 'JOIN AS ' + guestUsername.trim().toUpperCase() : 'PLAY AS GUEST'} <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </motion.button>

                      {guestUsername.trim() && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleContinueAsGuest(true)}
                          className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm font-semibold uppercase tracking-wider transition-colors"
                        >
                          Skip — Use Random Name
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => { setMode('auth'); setError(''); setGuestUsername(''); setUsernameStatus('idle'); }}
                        className="w-full py-1.5 text-gray-600 hover:text-gray-400 text-xs font-semibold uppercase tracking-wider transition-colors"
                      >
                        ← Back to Sign In
                      </button>
                    </div>
                  </motion.div>

                ) : (
                  /* ─── Auth (Sign In / Sign Up) ──────────────────────────── */
                  <motion.div
                    key="auth"
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    {/* Header */}
                    <motion.div
                      key={isSignUp ? 'signup-header' : 'signin-header'}
                      initial={{ y: 6 }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                      className="text-center mb-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <motion.div
                          initial={{ scale: 0.96 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.14, ease: 'easeOut' }}
                          className="inline-flex items-center rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-red-300"
                        >
                          <Sparkles className="mr-1.5 h-3 w-3" /> PLAYER ACCESS
                        </motion.div>

                        <button
                          type="button"
                          aria-label="Close sign-in dialog"
                          onClick={handleClose}
                          className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gamepad2 className="w-7 h-7 text-red-400" />
                        <span className="font-black text-xl text-white">ONLY CARDS</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 uppercase tracking-tight">
                        {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
                      </h2>
                      <p className="text-gray-400 text-xs sm:text-sm font-medium">
                        {isSignUp ? 'Sign up to save your progress and add friends' : 'Sign in to continue your journey'}
                      </p>
                    </motion.div>

                    {/* Form */}
                    <motion.form
                      key={isSignUp ? 'signup-form' : 'signin-form'}
                      initial="hidden"
                      animate="visible"
                      variants={{ visible: { transition: { staggerChildren: 0.035 } }, hidden: {} }}
                      onSubmit={handleSubmit}
                      className="space-y-3"
                    >
                      <motion.div variants={{ hidden: { y: 6 }, visible: { y: 0 } }}>
                        <label className="block text-xs font-black text-gray-300 mb-2 uppercase tracking-wider">
                          Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                          placeholder="Enter your username"
                          required
                        />
                      </motion.div>

                      <motion.div variants={{ hidden: { y: 6 }, visible: { y: 0 } }}>
                        <label className="block text-xs font-black text-gray-300 mb-2 uppercase tracking-wider">
                          Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                          placeholder="Enter your password"
                          required
                          minLength={8}
                        />
                      </motion.div>

                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm font-medium">
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button
                        variants={{ hidden: { y: 6 }, visible: { y: 0 } }}
                        type="submit"
                        disabled={loading}
                        whileHover={loading ? {} : { scale: 1.02 }}
                        whileTap={loading ? {} : { scale: 0.98 }}
                        className="w-full py-3 btn-arena-primary text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {isSignUp ? 'CREATING ACCOUNT...' : 'SIGNING IN...'}
                          </span>
                        ) : (
                          <span className="relative flex items-center justify-center gap-2">
                            {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'} <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </motion.button>
                    </motion.form>

                    {/* Toggle */}
                    <div className="mt-4 text-center">
                      <p className="text-gray-400 text-sm font-medium">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <button
                          type="button"
                          onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                          }}
                          className="ml-2 text-red-400 hover:text-red-300 font-black uppercase tracking-wider transition-colors"
                        >
                          {isSignUp ? 'SIGN IN' : 'SIGN UP'}
                        </button>
                      </p>
                    </div>

                    {/* Guest Option */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <motion.button
                        onClick={() => { setMode('guest-username'); setError(''); }}
                        disabled={loading}
                        whileHover={loading ? {} : { scale: 1.01 }}
                        whileTap={loading ? {} : { scale: 0.99 }}
                        className="w-full py-3 text-gray-400 hover:text-white text-sm font-semibold uppercase tracking-wider transition-colors"
                      >
                        Continue as Guest →
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
