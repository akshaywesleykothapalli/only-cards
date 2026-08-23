'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, Eye, Filter, Inbox, Lock, Search, ShieldCheck, Star } from 'lucide-react';
import { SharedNavbar } from '../../../components/SharedNavbar';
import ToastContainer from '../../../components/ToastContainer';
import { useGameStore } from '../../../store/useGameStore';

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'BUG_GLITCH', label: 'Bug / Glitch' },
  { value: 'GAMEPLAY_ISSUE', label: 'Gameplay issue' },
  { value: 'UI_MOBILE_ISSUE', label: 'UI / Mobile issue' },
  { value: 'FEATURE_SUGGESTION', label: 'Feature suggestion' },
  { value: 'GENERAL_FEEDBACK', label: 'General feedback' },
];

const STATUSES = ['NEW', 'INVESTIGATING', 'PLANNED', 'RESOLVED', 'CLOSED'] as const;

type FeedbackStatus = typeof STATUSES[number];

interface FeedbackSummary {
  id: string;
  category: string;
  status: FeedbackStatus;
  rating: number | null;
  message: string;
  page: string | null;
  roomId: string | null;
  username: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackDetail extends FeedbackSummary {
  appVersion: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  gameContext: Record<string, unknown> | null;
  userId: string | null;
}

const labelize = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, letter => letter.toUpperCase());

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { token, user, serverUrl, pushToast } = useGameStore();
  const [items, setItems] = useState<FeedbackSummary[]>([]);
  const [selected, setSelected] = useState<FeedbackDetail | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set('to', new Date(`${to}T23:59:59`).toISOString());
    params.set('limit', '75');
    return params.toString();
  }, [category, status, search, from, to]);

  useEffect(() => {
    if (!token) {
      setAccessMessage('Sign in with an admin account to view feedback.');
      return;
    }

    let ignore = false;
    const loadFeedback = async () => {
      setIsLoading(true);
      setAccessMessage(null);
      try {
        const response = await fetch(`${serverUrl}/api/admin/feedback?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load feedback');
        }
        if (!ignore) {
          setItems(data.items);
          setCounts(data.counts ?? {});
          setSelected(current => current && data.items.some((item: FeedbackSummary) => item.id === current.id) ? current : null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load feedback';
        if (!ignore) {
          setAccessMessage(message);
          setItems([]);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadFeedback();
    return () => {
      ignore = true;
    };
  }, [query, serverUrl, token]);

  const loadDetail = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${serverUrl}/api/admin/feedback/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load report');
      }
      setSelected(data.feedback);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to load report', 'error');
    }
  };

  const updateStatus = async (id: string, nextStatus: FeedbackStatus) => {
    if (!token) return;
    try {
      const response = await fetch(`${serverUrl}/api/admin/feedback/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update status');
      }
      setSelected(data.feedback);
      setItems(current => current.map(item => item.id === id ? { ...item, status: nextStatus, updatedAt: data.feedback.updatedAt } : item));
      pushToast('Feedback status updated.', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to update status', 'error');
    }
  };

  const newCount = counts.NEW ?? 0;

  return (
    <>
      <main className="font-body min-h-screen bg-arena-gradient bg-grid px-4 pb-10 pt-28 text-gray-100 sm:px-6">
        <SharedNavbar showBackButton onBackClick={() => router.push('/ready-to-play')} />
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mx-auto max-w-7xl"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-display flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-red-400">
                <ShieldCheck className="h-4 w-4" /> Admin
              </p>
              <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight text-white">Feedback dashboard</h1>
              <p className="font-body mt-2 text-sm font-medium text-gray-400">
                {user ? `Signed in as ${user.username}` : 'Admin session required'}
              </p>
            </div>
            <div className="glass-card rounded-2xl px-5 py-4">
              <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">New reports</p>
              <p className="font-display mt-1 flex items-center gap-2 text-3xl font-black text-white">
                <Inbox className="h-6 w-6 text-red-400" /> {newCount}
              </p>
            </div>
          </div>

          <section className="glass-panel mt-7 rounded-3xl p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.7fr_0.7fr]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="font-body h-11 w-full rounded-2xl border border-white/10 bg-black/35 pl-10 pr-4 text-sm font-bold text-white outline-none focus:border-red-400/50"
                  placeholder="Search message, user, page, room"
                />
              </label>
              <label className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <select value={category} onChange={event => setCategory(event.target.value)} className="font-body h-11 w-full rounded-2xl border border-white/10 bg-black/35 pl-10 pr-4 text-sm font-bold text-white outline-none focus:border-red-400/50">
                  {CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <select value={status} onChange={event => setStatus(event.target.value)} className="font-body h-11 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none focus:border-red-400/50">
                <option value="">All statuses</option>
                {STATUSES.map(item => <option key={item} value={item}>{labelize(item)}</option>)}
              </select>
              <label className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input type="date" value={from} onChange={event => setFrom(event.target.value)} className="font-body h-11 w-full rounded-2xl border border-white/10 bg-black/35 pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-red-400/50" />
              </label>
              <input type="date" value={to} onChange={event => setTo(event.target.value)} className="font-body h-11 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm font-bold text-white outline-none focus:border-red-400/50" />
            </div>
          </section>

          {accessMessage ? (
            <section className="glass-panel mt-6 rounded-3xl p-8 text-center">
              <Lock className="mx-auto h-10 w-10 text-red-400" />
              <h2 className="font-display mt-4 text-xl font-black uppercase text-white">Private area</h2>
              <p className="font-body mt-2 text-sm font-medium text-gray-400">{accessMessage}</p>
            </section>
          ) : (
            <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.92fr]">
              <div className="glass-panel overflow-hidden rounded-3xl">
                <div className="font-display border-b border-white/5 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  {isLoading ? 'Loading reports' : `${items.length} reports`}
                </div>
                <div className="max-h-[650px] overflow-y-auto">
                  {items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => loadDetail(item.id)}
                      className={`block w-full border-b border-white/5 px-5 py-4 text-left transition-colors hover:bg-white/[0.04] ${selected?.id === item.id ? 'bg-red-500/10' : ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-300">{labelize(item.category)}</span>
                        <span className="font-display rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-300">{labelize(item.status)}</span>
                        {item.rating && <span className="font-display inline-flex items-center gap-1 text-xs font-black text-yellow-200"><Star className="h-3.5 w-3.5" fill="currentColor" /> {item.rating}</span>}
                      </div>
                      <p className="font-body mt-3 line-clamp-2 text-sm font-medium leading-relaxed text-gray-200">{item.message}</p>
                      <p className="font-body mt-2 text-[11px] font-bold text-gray-500">{item.username ?? 'Anonymous'} · {new Date(item.createdAt).toLocaleString()}</p>
                    </button>
                  ))}
                  {!items.length && !isLoading && <p className="font-body px-5 py-10 text-center text-sm font-medium text-gray-500">No reports match these filters.</p>}
                </div>
              </div>

              <aside className="glass-panel rounded-3xl p-5">
                {selected ? (
                  <div>
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Report detail</p>
                        <h2 className="font-display mt-1 text-xl font-black text-white">{labelize(selected.category)}</h2>
                      </div>
                      <Eye className="h-5 w-5 text-red-300" />
                    </div>
                    <textarea readOnly value={selected.message} className="font-body h-44 w-full resize-none rounded-2xl border border-white/10 bg-black/35 p-4 text-sm font-semibold leading-relaxed text-gray-100 outline-none" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {STATUSES.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => updateStatus(selected.id, item)}
                          className={`font-display rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                            selected.status === item
                              ? 'border-red-400/60 bg-red-500/20 text-red-100'
                              : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white'
                          }`}
                        >
                          {labelize(item)}
                        </button>
                      ))}
                    </div>
                    <div className="font-body mt-5 grid gap-3 text-sm font-medium text-gray-300">
                      <p><span className="text-gray-500">User:</span> {selected.username ?? 'Anonymous'}</p>
                      <p><span className="text-gray-500">Page:</span> {selected.page ?? 'Unknown'}</p>
                      <p><span className="text-gray-500">Room:</span> {selected.roomId ?? 'None'}</p>
                      <p><span className="text-gray-500">Device:</span> {selected.browser ?? 'Unknown'} on {selected.os ?? 'Unknown'} · {selected.viewportWidth ?? '?'}x{selected.viewportHeight ?? '?'}</p>
                      <p><span className="text-gray-500">App:</span> {selected.appVersion ?? 'Unknown'}</p>
                      <p><span className="text-gray-500">Created:</span> {new Date(selected.createdAt).toLocaleString()}</p>
                    </div>
                    {selected.gameContext && (
                    <pre className="font-mono mt-5 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-black/35 p-4 text-xs font-semibold leading-relaxed text-gray-300">
                        {JSON.stringify(selected.gameContext, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <Inbox className="h-10 w-10 text-red-400" />
                    <h2 className="font-display mt-4 text-xl font-black uppercase text-white">Select a report</h2>
                    <p className="font-body mt-2 text-sm font-medium text-gray-500">Open any submission to inspect details and update its status.</p>
                  </div>
                )}
              </aside>
            </section>
          )}
        </motion.section>
      </main>
      <ToastContainer />
    </>
  );
}
