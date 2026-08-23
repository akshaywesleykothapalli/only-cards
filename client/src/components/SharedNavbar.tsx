"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useGameStore } from '../store/useGameStore';
import { useAudio } from '../hooks/useAudio';
import { SpotlightNavbar } from './SpotlightNavbar';
import { AnimatePresence, motion } from 'framer-motion';
import { Gamepad2, User, ArrowLeft, Lock, UserPlus, X, Menu, Copy, Check } from 'lucide-react';

export interface SharedNavbarProps {
  showBackButton?: boolean;
  onBackClick?: () => void;
  showRoomCode?: boolean;
  roomCode?: string;
  showUserInfo?: boolean;
  customItems?: any[];
  onHomeClick?: () => void;
  onRulesClick?: () => void;
  onLeaderboardClick?: () => void;
  onFriendsClick?: () => void;
  onSignInClick?: () => void;
  onTutorialClick?: () => void;
  rightActions?: React.ReactNode;
}

export function SharedNavbar({
  showBackButton = false,
  onBackClick,
  showRoomCode = false,
  roomCode,
  showUserInfo = true,
  customItems,
  onHomeClick,
  onRulesClick,
  onLeaderboardClick,
  onFriendsClick,
  onSignInClick,
  onTutorialClick,
  rightActions,
}: SharedNavbarProps) {
  const { user, logout } = useGameStore();
  const { playHover, playSelect } = useAudio();
  const router = useRouter();
  const pathname = usePathname();
  const [showGuestFriendsDialog, setShowGuestFriendsDialog] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = React.useState(false);
  const isGuestUser = user?.provider === 'GUEST' || user?.username?.startsWith('Guest_');

  const handleBackClick = () => {
    playSelect();
    onBackClick?.();
  };

  const handleLogout = () => {
    playSelect();
    logout();
  };

  const handleCopyRoomCode = async () => {
    if (!roomCode) return;
    playSelect();
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 1600);
    } catch {
      setCopiedRoomCode(false);
    }
  };

  const handleItemClick = (item: any, index: number) => {
    playHover();
    setIsMobileMenuOpen(false);
    if (typeof item.onClick === 'function') {
      item.onClick();
    } else if (item.href?.startsWith('/')) {
      router.push(item.href);
    } else if (item.label === "Home") {
      onHomeClick?.();
    } else if (item.label === "Rules" || item.label === "How to Play?") {
      onRulesClick?.();
    } else if (item.label === "Leaderboard") {
      onLeaderboardClick?.();
    } else if (item.label === "Friends") {
      if (isGuestUser) {
        playSelect();
        setShowGuestFriendsDialog(true);
        return;
      }
      onFriendsClick?.();
    } else if (item.label === "Sign In") {
      onSignInClick?.();
    } else if (item.label === "Tutorial") {
      onTutorialClick?.();
    }
  };

  // Use custom items if provided, otherwise use default items
  const allNavItems = [
    { label: "Home", href: "/" },
    { label: "Rules", href: "/rules" },
    ...(user ? [{ label: "Friends", href: "#friends" }] : []),
    ...(user ? [] : [{ label: "Tutorial", href: "/tutorial" }, { label: "Sign In", href: "#signin" }]),
  ];

  // Filter out the current page from nav items (but keep hash/modal links)
  const navItems = customItems || allNavItems.filter(item => {
    // Keep hash links (modal triggers) always visible
    if (item.href.startsWith('#')) return true;
    // Hide the current page route
    return item.href !== pathname;
  });

  return (
    <nav className="fixed top-0 left-0 right-0 w-full max-w-6xl mx-auto flex items-center z-50 px-3 py-3 sm:px-4 md:py-4 lg:px-0">
      <SpotlightNavbar
        className="pt-0"
        fullWidth={true}
      >
        {/* Left side - Only Cards */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              onMouseEnter={playHover}
              className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <Gamepad2 className="h-5 w-5 flex-shrink-0 text-red-500 sm:h-6 sm:w-6" />
            <span className="flex items-center gap-1 truncate text-base font-black tracking-tight text-white sm:text-lg">
              ONLY <span className="text-red-500">CARDS</span>
            </span>
          </div>
        </div>

        {/* Room code */}
        {showRoomCode && roomCode && (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-red-500/30 px-3 py-1 font-mono text-xs font-black uppercase tracking-widest text-red-400">
              ROOM CODE
            </span>
            <span className="font-mono text-lg font-black tracking-widest text-white transition-colors hover:text-red-400 lg:text-xl">
              {roomCode}
            </span>
            <button
              type="button"
              onClick={handleCopyRoomCode}
              onMouseEnter={playHover}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-colors hover:border-red-400/40 hover:bg-red-500/15 hover:text-white"
              aria-label="Copy room code"
              title={copiedRoomCode ? 'Copied' : 'Copy room code'}
            >
              {copiedRoomCode ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Right side - Navigation items and user info */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Navigation items */}
          <div className="hidden items-center gap-3 md:flex">
            {navItems.map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleItemClick(item, idx);
                }}
                className={`px-4 py-2 text-sm font-black uppercase tracking-wider transition-colors duration-200 rounded-full ${
                  item.label === 'Friends' && isGuestUser
                    ? 'text-gray-500 hover:text-red-300 border border-white/5 bg-white/[0.02]'
                    : 'text-white hover:text-red-400'
                }`}
                aria-disabled={item.label === 'Friends' && isGuestUser}
              >
                {item.label}
              </a>
            ))}
          </div>

          {rightActions && (
            <div className="hidden shrink-0 items-center sm:flex">
              {rightActions}
            </div>
          )}

          {/* User info */}
          {showUserInfo && user && (
            <button
              type="button"
              onClick={() => {
                playSelect();
                router.push('/profile');
              }}
              onMouseEnter={playHover}
              className="hidden items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400/50 sm:flex"
              aria-label="Open profile settings"
              title="Profile settings"
            >
              <User className="w-4 h-4 text-red-400" />
              <span className="text-sm font-black text-red-400 uppercase tracking-wider">{user.username}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playSelect();
              setIsMobileMenuOpen(value => !value);
            }}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </SpotlightNavbar>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-3 right-3 top-[calc(100%+0.25rem)] z-[70] rounded-3xl border border-white/10 bg-[#07070b]/95 p-3 shadow-2xl backdrop-blur-xl md:hidden"
          >
            {showRoomCode && roomCode && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-red-300">Room</span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate pl-3 font-mono text-sm font-black tracking-[0.18em] text-white">{roomCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition-colors hover:bg-white/10"
                    aria-label="Copy room code"
                  >
                    {copiedRoomCode ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              {navItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleItemClick(item, idx);
                  }}
                  className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wider transition-colors ${
                    item.label === 'Friends' && isGuestUser
                      ? 'border border-white/5 bg-white/[0.02] text-gray-500'
                      : 'text-white hover:bg-white/[0.06] hover:text-red-300'
                  }`}
                  aria-disabled={item.label === 'Friends' && isGuestUser}
                >
                  {item.label}
                </a>
              ))}
              {showUserInfo && user && (
                <button
                  type="button"
                  onClick={() => {
                    playSelect();
                    setIsMobileMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-left text-sm font-black uppercase tracking-wider text-red-300"
                >
                  Profile · {user.username}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showGuestFriendsDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowGuestFriendsDialog(false)}
          >
            <motion.div
              initial={{ y: 16, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#08080c]/95 p-6 text-center shadow-2xl"
            >
              <button
                onClick={() => setShowGuestFriendsDialog(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-red-400/30 bg-red-500/10 text-red-300">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-white">Create an account</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-gray-400">
                Create an account to add friends, send requests, and keep your friend list saved.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowGuestFriendsDialog(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-300 transition-all hover:bg-white/[0.08] hover:text-white"
                >
                  Not now
                </button>
                <button
                  onClick={() => {
                    setShowGuestFriendsDialog(false);
                    if (onSignInClick) {
                      onSignInClick();
                    } else {
                      router.push('/#signin');
                    }
                  }}
                  className="flex-1 rounded-2xl bg-red-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-400"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Sign up
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
