'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { flagClient, Flag } from '@/lib/flagClient';
import { X } from 'lucide-react';

export function CreateFlagModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (flag: Flag) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const flag = await flagClient.createFlag(newName, newDesc);
    onCreated(flag);
    setNewName('');
    setNewDesc('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, y: 12, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="relative w-full max-w-sm bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-[28px] p-2 shadow-[0_16px_64px_-12px_rgba(0,0,0,0.6)]"
          >
            <form onSubmit={handleCreate} className="flex flex-col">
              <div className="px-4 py-3.5 flex items-center justify-between">
                <h3 className="text-[14px] font-medium text-white tracking-tight">Create feature flag</h3>
                <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors rounded-full p-1 -mr-1 hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-zinc-950/50 rounded-[20px] border border-white/5 p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Flag name"
                    className="bg-transparent border-none px-1 py-1 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0 transition-all font-sans font-medium"
                  />
                </div>
                <div className="h-px bg-white/5 -mx-4" />
                <div className="flex flex-col gap-1">
                  <textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="What does this flag control?"
                    rows={2}
                    className="bg-transparent border-none px-1 py-1 text-[13px] text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:ring-0 transition-all font-sans resize-none"
                  />
                </div>
              </div>

              <div className="px-4 py-3.5 flex items-center justify-end gap-3 mt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-4 py-1.5 bg-white text-zinc-950 text-[13px] font-medium rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                >
                  Add flag
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
