'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { flagClient } from '@/lib/flagClient';
import { cn } from '@/lib/utils';

export function EvalConsole({ flagKey }: { flagKey: string | null }) {
  const [contextKey, setContextKey] = useState("user_042");
  const [evalResult, setEvalResult] = useState<{ enabled: boolean; reason: string } | null>(null);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagKey) return;
    const result = await flagClient.evaluate(flagKey, contextKey);
    setEvalResult(result);
  };

  return (
    <div className="shrink-0">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono mb-3">Target evaluator</div>
      <form onSubmit={handleEvaluate} className="flex items-center gap-3 w-full bg-zinc-950/50 p-2 rounded-xl border border-zinc-800/60 focus-within:border-zinc-500 transition-colors">
        <span className="text-zinc-500 font-mono text-sm pl-2 whitespace-nowrap">rpc.eval(</span>
        <input
          type="text"
          value={contextKey}
          onChange={e => setContextKey(e.target.value)}
          className="bg-transparent border-none outline-none text-zinc-200 font-mono text-sm flex-1 min-w-0"
          placeholder="context_key"
        />
        <span className="text-zinc-500 font-mono text-sm pr-2">)</span>
        <button type="submit" className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg text-zinc-300 transition-colors active:scale-95 whitespace-nowrap">
          Evaluate
        </button>
      </form>
      <div className="h-10 mt-3">
        <AnimatePresence>
          {evalResult && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className="bg-zinc-950/50 border border-zinc-800/60 p-3 rounded-lg flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className={cn("px-1.5 py-0.5 rounded flex items-center shrink-0", evalResult.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800/50 text-zinc-400")}>
                  {evalResult.enabled ? "ON" : "OFF"}
                </span>
                <span className="text-zinc-500 truncate">{"//"} {evalResult.reason}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
