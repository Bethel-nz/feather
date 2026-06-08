import { useState } from 'react';
import { FeatureFlagProvider, useFeatureFlag } from '../feature-flags';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, Sparkles, BarChart3, Users,
  TrendingUp, DollarSign, Activity, ArrowUpRight,
} from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_FLAGS_URL || 'http://localhost:8080';

const STATS = [
  { label: 'Revenue', value: '$48,210', delta: '+12.4%', icon: DollarSign },
  { label: 'Active Users', value: '2,847', delta: '+5.1%', icon: Users },
  { label: 'Conversion', value: '3.6%', delta: '+0.8%', icon: TrendingUp },
  { label: 'Sessions', value: '18,204', delta: '+9.2%', icon: Activity },
];

const ROWS = [
  { name: 'Acme Corp', plan: 'Enterprise', mrr: '$2,400', status: 'active' },
  { name: 'Globex', plan: 'Pro', mrr: '$890', status: 'active' },
  { name: 'Initech', plan: 'Pro', mrr: '$890', status: 'trialing' },
  { name: 'Umbrella', plan: 'Starter', mrr: '$120', status: 'active' },
  { name: 'Hooli', plan: 'Enterprise', mrr: '$3,100', status: 'past_due' },
];

const CHART = [42, 58, 35, 70, 64, 88, 76, 95, 60, 82, 48, 90];

function cn(...c: (string | boolean | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function spring(stiffness = 400, damping = 30) {
  return { type: 'spring' as const, stiffness, damping };
}

function Dashboard() {
  const { contextKey } = useFeatureFlag('__root__', { defaultValue: false });
  const analytics = useFeatureFlag('advanced-analytics', { defaultValue: false });
  const exportFlag = useFeatureFlag('data-export', { defaultValue: false });
  const insights = useFeatureFlag('ai-insights', { defaultValue: false });
  const darkFlag = useFeatureFlag('dark-mode', { defaultValue: false });

  const dark = darkFlag.enabled;
  const surface = dark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200';
  const subtle = dark ? 'text-zinc-400' : 'text-zinc-500';
  const faint = dark ? 'text-zinc-600' : 'text-zinc-400';

  return (
    <div className={cn(
      'min-h-dvh w-full flex flex-col antialiased transition-colors duration-500',
      dark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
    )}>
      {/* header */}
      <header className={cn(
        'shrink-0 h-14 border-b flex items-center justify-between px-4 md:px-8',
        dark ? 'border-white/10 bg-zinc-950/80' : 'border-zinc-200 bg-white/80',
        'backdrop-blur-md',
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">A</span>
            </div>
            <span>Acme Analytics</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('hidden md:flex items-center gap-2 text-[11px] font-mono rounded-lg px-2.5 py-1.5 border',
            dark ? 'bg-zinc-900 border-white/10 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500')}>
            <span className={faint}>user</span>
            <span className={dark ? 'text-zinc-200' : 'text-zinc-700'}>{contextKey}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5 border',
            dark ? 'text-zinc-400 bg-zinc-900 border-white/10' : 'text-zinc-500 bg-white border-zinc-200')}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
          <a href="http://localhost:3000"
            className={cn('text-[11px] font-medium rounded-full px-3 py-1.5 border active:scale-95 hidden sm:block transition-colors',
              dark ? 'text-zinc-500 hover:text-zinc-300 bg-zinc-900 border-white/10'
                   : 'text-zinc-500 hover:text-zinc-800 bg-white border-zinc-200')}>
            Admin
          </a>
        </div>
      </header>

      {/* body */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">

          {/* toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
              <p className={cn('text-[13px]', subtle)}>Overview of your workspace</p>
            </div>
            {/* gated: export */}
            <AnimatePresence>
              {exportFlag.enabled && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  transition={spring()}
                  className="flex items-center gap-2 text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3.5 py-2 active:scale-95 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* stat cards (always on) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ...spring() }}
                className={cn('rounded-2xl border p-4', surface)}>
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('text-[11px] font-medium', subtle)}>{s.label}</span>
                  <s.icon className={cn('w-4 h-4', faint)} />
                </div>
                <div className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</div>
                <div className="text-[11px] font-medium text-emerald-500 mt-1 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />{s.delta}
                </div>
              </motion.div>
            ))}
          </div>

          {/* gated: AI insights */}
          <AnimatePresence>
            {insights.enabled && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={spring()}
                className={cn('rounded-2xl border p-5 relative overflow-hidden',
                  dark ? 'bg-gradient-to-br from-violet-950/40 to-zinc-900 border-violet-500/20'
                       : 'bg-gradient-to-br from-violet-50 to-white border-violet-200')}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span className="text-[13px] font-semibold">AI Insights</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-violet-500 bg-violet-500/10 rounded px-1.5 py-0.5">Beta</span>
                </div>
                <p className={cn('text-[13px] leading-relaxed', dark ? 'text-zinc-300' : 'text-zinc-600')}>
                  Revenue is trending <span className="font-medium text-emerald-500">+12.4%</span> this month, driven mostly
                  by Enterprise upgrades. Consider nudging the 3 trialing accounts before their window closes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* gated: advanced analytics */}
          <AnimatePresence>
            {analytics.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring()}
                className="overflow-hidden">
                <div className={cn('rounded-2xl border p-5', surface)}>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className={cn('w-4 h-4', faint)} />
                    <span className="text-[13px] font-semibold">Advanced Analytics</span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {CHART.map((h, i) => (
                      <motion.div key={i}
                        initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.03, ...spring(300, 24) }}
                        className="flex-1 rounded-t-md bg-emerald-500/70" />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* customers table (always on) */}
          <div className={cn('rounded-2xl border overflow-hidden', surface)}>
            <div className={cn('px-5 py-3 border-b text-[13px] font-semibold', dark ? 'border-white/10' : 'border-zinc-200')}>
              Customers
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className={cn('text-left', subtle)}>
                  <th className="font-medium px-5 py-2">Name</th>
                  <th className="font-medium px-5 py-2">Plan</th>
                  <th className="font-medium px-5 py-2">MRR</th>
                  <th className="font-medium px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.name} className={cn('border-t', dark ? 'border-white/5' : 'border-zinc-100')}>
                    <td className="px-5 py-2.5 font-medium">{r.name}</td>
                    <td className={cn('px-5 py-2.5', subtle)}>{r.plan}</td>
                    <td className="px-5 py-2.5 tabular-nums">{r.mrr}</td>
                    <td className="px-5 py-2.5">
                      <span className={cn('text-[11px] font-medium rounded-full px-2 py-0.5',
                        r.status === 'active' ? 'bg-emerald-500/10 text-emerald-500'
                        : r.status === 'trialing' ? 'bg-sky-500/10 text-sky-500'
                        : 'bg-rose-500/10 text-rose-500')}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AppRoot() {
  const [contextKey, setContextKey] = useState('user_042');

  return (
    <FeatureFlagProvider serverUrl={SERVER_URL} contextKey={contextKey}>
      <Dashboard />

      {/* user switcher */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col gap-2.5 min-w-[220px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-500 tracking-wide uppercase">Logged in as</span>
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-500">Simulator</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={contextKey}
              onChange={e => setContextKey(e.target.value)}
              placeholder="user_042"
              className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
            />
            <button
              onClick={() => setContextKey('user_' + Math.floor(Math.random() * 1000))}
              className="text-[10px] font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg px-2 py-1.5 active:scale-95 transition-colors"
            >
              Random
            </button>
          </div>
        </div>
      </div>
    </FeatureFlagProvider>
  );
}
