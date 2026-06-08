'use client';

import { cn } from '@/lib/utils';
import { Switch } from './switch';
import { Slider } from './slider';
import type { Flag } from '@/lib/flagClient';

export function FlagCard({
  flag,
  isSelected,
  onSelect,
  onToggle,
  onRollout,
}: {
  flag: Flag;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onRollout: (percentage: number) => void;
}) {
  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect();
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "flex flex-col text-left p-5 rounded-[20px] transition-all duration-200 text-sm group relative border cursor-pointer",
        isSelected
          ? "bg-zinc-900/80 border-white/5 shadow-[0_2px_16px_rgba(0,0,0,0.5)]"
          : "bg-transparent border-transparent hover:bg-zinc-900/30"
      )}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <span className={cn("font-medium tracking-tight transition-colors", isSelected ? "text-zinc-100" : "text-zinc-300")}>
          {flag.name}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={flag.enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      <p className="text-zinc-500 mb-6 leading-relaxed text-[13px] text-pretty pr-4">
        {flag.description}
      </p>

      <div className="flex flex-col gap-2.5 relative w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 tabular-nums uppercase tracking-wide">
          <span>Rollout</span>
          <span className={cn("transition-colors", flag.enabled ? "text-zinc-300" : "text-zinc-600")}>
            {flag.rolloutPercentage}%
          </span>
        </div>
        <Slider
          value={flag.rolloutPercentage}
          onChange={onRollout}
          disabled={!flag.enabled}
        />
      </div>
    </div>
  );
}
