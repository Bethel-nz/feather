'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function Slider({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    onChange(Math.round(percent * 100));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-6 w-full items-center touch-none",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-ew-resize"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        if (isDragging) handlePointerMove(e);
      }}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-300 transition-all duration-75 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      <div
        className="absolute top-1/2 -mt-2 h-4 w-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-transform duration-75 border-4 border-zinc-900"
        style={{ left: `calc(${value}% - 8px)`, scale: isDragging ? 1.2 : 1 }}
      />
    </div>
  );
}
