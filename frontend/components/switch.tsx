'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function Switch({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (c: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        checked ? "bg-zinc-200" : "bg-zinc-800",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm ring-0",
          checked ? "bg-zinc-900" : "bg-zinc-400"
        )}
        initial={false}
        animate={{ x: checked ? 16 : 0 }}
      />
    </button>
  );
}
