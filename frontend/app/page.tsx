"use client";

import { useState, useEffect } from "react";
import { flagClient, Flag } from "@/lib/flagClient";
import { Plus, Zap } from "lucide-react";
import { FlagCard } from "@/components/flag-card";
import { BucketGrid } from "@/components/bucket-grid";
import { EvalConsole } from "@/components/eval-console";
import { CreateFlagModal } from "@/components/create-flag-modal";

export default function FeatherPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [selectedFlagKey, setSelectedFlagKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    flagClient.listFlags().then((f) => {
      setFlags(f);
      if (f.length > 0) setSelectedFlagKey(f[0].key);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (key: string, enabled: boolean) => {
    setFlags(flags.map((f) => (f.key === key ? { ...f, enabled } : f)));
    await flagClient.toggleFlag(key, enabled);
  };

  const handleRollout = async (key: string, percentage: number) => {
    setFlags(
      flags.map((f) =>
        f.key === key ? { ...f, rolloutPercentage: percentage } : f,
      ),
    );
    await flagClient.updateRollout(key, percentage);
  };

  const handleCreated = (flag: Flag) => {
    setFlags([flag, ...flags]);
    setSelectedFlagKey(flag.key);
    setIsCreating(false);
  };

  const selectedFlag = flags.find((f) => f.key === selectedFlagKey);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:h-screen min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 gap-8 container mx-auto">
      <div className="flex-1 flex flex-col min-w-0 md:max-w-md h-full">
        <header className="flex items-center justify-between pb-8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800">
              <Zap className="w-4 h-4 text-zinc-400" />
            </div>
            <h1 className="text-[17px] font-medium tracking-tight text-white mb-0.5">
              Feather
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New flag</span>
          </button>
        </header>

        <div className="flex flex-col gap-3 overflow-y-auto pb-8 -mx-2 px-2 scrollbar-hide flex-1">
          {flags.map((flag) => (
            <FlagCard
              key={flag.key}
              flag={flag}
              isSelected={selectedFlagKey === flag.key}
              onSelect={() => setSelectedFlagKey(flag.key)}
              onToggle={(c) => handleToggle(flag.key, c)}
              onRollout={(v) => handleRollout(flag.key, v)}
            />
          ))}
        </div>
      </div>

      <BucketGrid selectedFlag={selectedFlag} />

      <CreateFlagModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
