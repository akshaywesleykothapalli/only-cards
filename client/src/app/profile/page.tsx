'use client';

import { motion } from 'framer-motion';
import { BarChart3, LogOut, Shield, Trophy, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SharedNavbar } from '../../components/SharedNavbar';
import { useGameStore } from '../../store/useGameStore';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useGameStore();

  if (!user) {
    return (
      <main className="min-h-screen bg-arena-gradient bg-grid px-6 pt-28 text-center text-white">
        <SharedNavbar showUserInfo={false} />
        <h1 className="text-4xl font-black uppercase">Profile settings</h1>
        <p className="mt-3 text-gray-400">Sign in to view your player profile.</p>
        <button onClick={() => router.push('/')} className="mt-8 rounded-xl bg-red-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white">
          Go home
        </button>
      </main>
    );
  }

  const profile = user.profile ?? {};
  const gamesPlayed = profile.gamesPlayed ?? 0;
  const gamesWon = profile.gamesWon ?? 0;
  const winRate = gamesPlayed ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  const stats = [
    { label: 'Rank', value: profile.rankedTier?.replace('_', ' ') ?? 'BRONZE I', icon: Trophy },
    { label: 'Score', value: profile.mmr ?? 1000, icon: Shield },
    { label: 'Win rate', value: `${winRate}%`, icon: BarChart3 },
  ];


  return (
    <main className="min-h-screen bg-arena-gradient bg-grid px-6 pb-10 pt-28 text-gray-100">
      <SharedNavbar />
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="mx-auto max-w-4xl"
      >
        <p className="text-xs font-black uppercase tracking-[0.24em] text-red-400">Player profile</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white">Profile settings</h1>
        <p className="mt-2 text-gray-400">Your account, rank, and saved match progress.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-[1.1fr_1.9fr]">
          <section className="glass-panel rounded-3xl p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-2xl font-black text-red-300">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-red-400" />
              <h2 className="text-2xl font-black text-white">{user.username}</h2>
            </div>
            <p className="mt-2 text-sm text-gray-400">Level {profile.level ?? 1} · {profile.xp ?? 0} XP</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="glass-card rounded-2xl p-5">
                <Icon className="h-5 w-5 text-red-400" />
                <p className="mt-5 text-xs font-black uppercase tracking-wider text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-black text-white">{value}</p>
              </div>
            ))}
          </section>
        </div>


        <section className="glass-panel mt-5 rounded-3xl p-6">
          <h2 className="text-lg font-black uppercase text-white">Match record</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div><p className="text-xs font-black uppercase text-gray-500">Games played</p><p className="mt-1 text-2xl font-black text-white">{gamesPlayed}</p></div>
            <div><p className="text-xs font-black uppercase text-gray-500">Games won</p><p className="mt-1 text-2xl font-black text-white">{gamesWon}</p></div>
            <div><p className="text-xs font-black uppercase text-gray-500">Avatar</p><p className="mt-1 text-sm font-black text-white">{profile.avatar ?? 'avatar_1'}</p></div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => { logout(); router.push('/'); }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-5 py-3 text-sm font-black uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </motion.section>
    </main>
  );
}
