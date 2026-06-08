'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getBucket, generateUserId } from '@/lib/flagClient';
import type { Flag } from '@/lib/flagClient';
import { EvalConsole } from './eval-console';

const USERS = Array.from({ length: 100 }).map((_, i) => generateUserId(i));

export function BucketGrid({ selectedFlag }: { selectedFlag: Flag | undefined }) {
  const [buckets, setBuckets] = useState<number[]>([]);

  const flagKey = selectedFlag?.key;
  useEffect(() => {
    if (!flagKey) {
      setBuckets([]);
      return;
    }
    Promise.all(USERS.map((id) => getBucket(flagKey, id))).then(setBuckets);
  }, [flagKey]);

  const dots = useMemo(() => USERS.map((id, i) => ({
    id,
    bucket: buckets[i] ?? 0,
  })), [buckets]);

  const totalEnabled = selectedFlag
    ? (selectedFlag.enabled ? dots.filter((d) => d.bucket < selectedFlag.rolloutPercentage).length : 0)
    : 0;

  return (
    <div className="flex-[1.5] flex flex-col bg-zinc-900/30 rounded-[28px] border border-white/5 p-6 md:p-10 relative shadow-2xl h-full">
      <div className="flex items-end justify-between mb-12 shrink-0">
        <div>
          <h2 className="text-[13px] font-medium text-zinc-500 mb-2">Live Simulation</h2>
          <div className="text-3xl font-medium tracking-tight text-white flex items-baseline gap-2 tabular-nums">
            <span className="flex items-center justify-end w-[44px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={totalEnabled}
                  initial={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: 20, opacity: 0, filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="inline-block"
                >
                  {totalEnabled}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-zinc-600 font-normal">/</span>
            <span className="text-zinc-400 font-normal">100</span>
            <span className="text-lg text-zinc-500 font-normal ml-1">users active</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-mono">
          <span>Deterministic</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="grid grid-cols-10 gap-2.5 sm:gap-4 md:gap-5 lg:gap-6 w-full max-w-lg mx-auto">
          {dots.map((dot) => {
            const isActive = selectedFlag ? (selectedFlag.enabled && dot.bucket < selectedFlag.rolloutPercentage) : false;
            let reason = "";
            if (!selectedFlag) reason = "No flag selected";
            else if (!selectedFlag.enabled) reason = "Flag is disabled globally";
            else if (dot.bucket < selectedFlag.rolloutPercentage) reason = `In rollout bucket (${dot.bucket} < ${selectedFlag.rolloutPercentage})`;
            else reason = `Out of bucket (${dot.bucket} ≥ ${selectedFlag.rolloutPercentage})`;

            return (
              <div
                key={dot.id}
                className="relative group flex items-center justify-center w-full aspect-square cursor-crosshair"
              >
                <motion.div
                  layout
                  initial={false}
                  animate={{
                    backgroundColor: isActive ? "#34d399" : "#27272a",
                    scale: isActive ? 1 : 0.85,
                    boxShadow: isActive ? "0 0 16px -2px rgba(52, 211, 153, 0.4)" : "0 0 0px rgba(0,0,0,0)",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 35,
                  }}
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 rounded-full"
                />

                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 px-3 py-2 bg-zinc-800 text-zinc-200 text-xs rounded-xl border border-zinc-700/50 shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-150 origin-bottom z-50 min-w-max">
                  <div className="font-mono text-zinc-400 mb-1">{dot.id} (Bucket {dot.bucket})</div>
                  <div className="font-medium text-[11px] text-zinc-300">{reason}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <EvalConsole flagKey={selectedFlag?.key ?? null} />
      </div>
    </div>
  );
}
