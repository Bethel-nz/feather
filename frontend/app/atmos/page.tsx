'use client';

import React, { useState, useEffect } from 'react';
import { FeatureFlagProvider, useFeatureFlag } from '@/lib/feature-flags';
import { RefreshCcw, Sparkles, Map, Wind, Droplets, Sun, Settings2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

const SERVER_URL = process.env.NEXT_PUBLIC_FLAGS_URL || 'http://localhost:3000';
const SDK_KEY = process.env.NEXT_PUBLIC_SDK_KEY || 'test-sdk-key';

function DebugRow({ flagKey }: { flagKey: string }) {
  const flag = useFeatureFlag(flagKey, { defaultValue: false });
  return (
    <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/5 last:border-0 py-1.5">
       <span className="text-zinc-500 truncate mr-2">{flagKey}</span>
       <span className={`px-1.5 py-0.5 rounded-[4px] shrink-0 ${flag.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
          {flag.enabled ? 'ON' : 'OFF'}
       </span>
    </div>
  )
}

function AtmosWeatherInner({ contextKeyStr, setContextKey }: { contextKeyStr: string, setContextKey: (k: string) => void }) {
  const [reloading, setReloading] = useState(false);
  const { refresh, isLoading: globalLoading } = useFeatureFlag('dummy', { defaultValue: false });

  const sensoryFlag = useFeatureFlag('sensory-background', { defaultValue: false });
  const aiForecastFlag = useFeatureFlag('ai-forecast', { defaultValue: false });
  const radarFlag = useFeatureFlag('radar-widget', { defaultValue: false });

  const handleRefresh = async () => {
    setReloading(true);
    await refresh();
    setTimeout(() => setReloading(false), 300);
  };

  const [time, setTime] = useState("");
  useEffect(() => {
     setTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
     const int = setInterval(() => setTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})), 1000);
     return () => clearInterval(int);
  }, []);

  return (
    <div className="h-screen w-full bg-zinc-950 font-sans text-zinc-100 flex flex-col relative selection:bg-zinc-800 overflow-hidden isolate">

       <AnimatePresence>
          {sensoryFlag.enabled && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 1 }}
               className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
             >
                <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-3xl z-10" />
                <motion.div
                   animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5], rotate: [0, 90, 0] }}
                   transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-600/30 mix-blend-screen blur-[120px]"
                />
                <motion.div
                   animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4], x: [0, 50, 0] }}
                   transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                   className="absolute top-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-sky-500/30 mix-blend-screen blur-[100px]"
                />
                <motion.div
                   animate={{ y: [0, -50, 0], opacity: [0.2, 0.4, 0.2] }}
                   transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-purple-600/20 mix-blend-screen blur-[120px]"
                />
             </motion.div>
          )}
       </AnimatePresence>

       <div className="w-full max-w-lg mx-auto flex-1 flex flex-col relative z-10 px-6 pt-12 pb-32 overflow-y-auto hide-scrollbar">

          <header className="flex justify-between items-center mb-8">
             <div className="flex flex-col">
                <h1 className="text-xl font-medium tracking-tight text-white drop-shadow-md">San Francisco</h1>
                <span className="text-sm text-zinc-400 flex items-center gap-2">
                   <span>{time}</span> • <span>Current Location</span>
                </span>
             </div>
             {globalLoading && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />}
          </header>

          <div className="flex flex-col items-center justify-center py-6 mb-8 relative">
             <motion.div layout className="text-[120px] font-light tracking-tighter text-white leading-none drop-shadow-xl relative flex items-start">
               62<span className="text-[60px] mt-4 font-normal mix-blend-overlay">°</span>
             </motion.div>
             <div className="text-xl font-medium text-zinc-300 drop-shadow flex items-center gap-2 mt-4">
               <Sun className="w-5 h-5 text-amber-300/80" /> Mostly Clear
             </div>
             <div className="flex items-center justify-center gap-6 mt-6 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5"><Wind className="w-4 h-4 opacity-50" /> 12 mph</span>
                <span className="flex items-center gap-1.5"><Droplets className="w-4 h-4 opacity-50" /> 45%</span>
             </div>
          </div>

          <div className="flex flex-col gap-4">
             <AnimatePresence mode="popLayout">
                {aiForecastFlag.enabled ? (
                   <motion.div
                     key="ai"
                     initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                     animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                     exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                     transition={{ type: "spring", stiffness: 450, damping: 35 }}
                     className="bg-white/10 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
                   >
                      <div className="flex items-center gap-2 text-indigo-300 mb-3 font-medium text-sm">
                         <Sparkles className="w-4 h-4" />
                         <span>Atmos Forecaster</span>
                      </div>
                      <p className="text-[15px] leading-relaxed text-zinc-100">
                         Expect the light cloud cover to burn off entirely by 11 AM. The afternoon will be exceptionally clear and crisp—perfect conditions for spending time outdoors. Light jacket recommended for the evening as temperatures will drop to 54°.
                      </p>
                   </motion.div>
                ) : (
                   <motion.div
                     key="hourly"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="bg-zinc-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5"
                   >
                      <div className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider text-[11px]">Today</div>
                      <div className="flex justify-between items-center text-center">
                         {[
                            {t: 'Now', temp: 62, icon: <Sun className="w-5 h-5 text-amber-300 mx-auto" />},
                            {t: '1 PM', temp: 64, icon: <Sun className="w-5 h-5 text-amber-300 mx-auto" />},
                            {t: '2 PM', temp: 66, icon: <Sun className="w-5 h-5 text-amber-300 mx-auto" />},
                            {t: '3 PM', temp: 67, icon: <Sun className="w-5 h-5 text-amber-300 mx-auto" />},
                            {t: '4 PM', temp: 65, icon: <Sun className="w-5 h-5 text-amber-300 mx-auto" />},
                         ].map(h => (
                            <div key={h.t} className="flex flex-col gap-2">
                               <span className="text-zinc-400 text-xs font-medium">{h.t}</span>
                               {h.icon}
                               <span className="text-zinc-100 font-medium">{h.temp}°</span>
                            </div>
                         ))}
                      </div>
                   </motion.div>
                )}
             </AnimatePresence>

             <AnimatePresence>
                {radarFlag.enabled && (
                   <motion.div
                     initial={{ opacity: 0, height: 0, scale: 0.95 }}
                     animate={{ opacity: 1, height: 'auto', scale: 1 }}
                     exit={{ opacity: 0, height: 0, scale: 0.95 }}
                     transition={{ type: "spring", stiffness: 450, damping: 35 }}
                     className="overflow-hidden"
                   >
                      <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col mt-2">
                         <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                               <Map className="w-4 h-4 text-emerald-400" />
                               Live Radar
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                            </span>
                         </div>
                         <div className="h-[200px] w-full relative bg-zinc-950 overflow-hidden isolate">
                            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

                            <motion.div
                               animate={{ rotate: 360 }}
                               transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                               className="absolute top-1/2 left-1/2 w-[150%] h-[150%] origin-top-left -ml-[0%] -mt-[0%] bg-gradient-to-r from-transparent via-emerald-500/10 to-emerald-500/40 border-r border-emerald-400/50 mix-blend-screen z-10 pointer-events-none"
                               style={{ borderRadius: '100% 0 0 0' }}
                            />

                            <div className="absolute top-[30%] left-[40%] w-24 h-24 bg-emerald-500/30 blur-2xl rounded-full mix-blend-screen" />
                            <div className="absolute top-[20%] left-[50%] w-16 h-16 bg-blue-500/40 blur-xl rounded-full mix-blend-screen" />
                            <div className="absolute top-[45%] left-[25%] w-32 h-32 bg-yellow-500/20 blur-2xl rounded-full mix-blend-screen" />

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                               <div className="absolute w-8 h-8 rounded-full border border-white/20" />
                               <div className="absolute w-4 h-4 rounded-full border border-white/30" />
                               <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            </div>
                         </div>
                      </div>
                   </motion.div>
                )}
             </AnimatePresence>
          </div>

       </div>

       <div className="fixed bottom-4 left-4 right-4 md:right-auto md:w-[320px] bg-zinc-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] z-50 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
             <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono tracking-wide uppercase">
                <Settings2 className="w-3.5 h-3.5" />
                Target User
             </div>
             <Link href="/demo" className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
               Flag Admin <ArrowRight className="w-3 h-3" />
             </Link>
          </div>

          <div className="flex flex-col gap-3 relative shrink-0">
             <div className="flex flex-col gap-1.5">
                <input
                   type="text"
                   value={contextKeyStr}
                   onChange={e => setContextKey(e.target.value)}
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors font-mono"
                   placeholder="e.g. user_042"
                />
             </div>

             <button
                onClick={handleRefresh}
                disabled={reloading || globalLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-zinc-950 text-[13px] font-semibold rounded-lg hover:bg-zinc-200 transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
             >
               <RefreshCcw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
               Re-evaluate Context
             </button>
          </div>

          <div className="pt-2 border-t border-white/5 flex flex-col overflow-y-auto pr-1">
             <DebugRow flagKey="sensory-background" />
             <DebugRow flagKey="ai-forecast" />
             <DebugRow flagKey="radar-widget" />
          </div>
       </div>

    </div>
  );
}

export default function AppRoot() {
  const [contextKey, setContextKey] = useState("user_042");

  return (
    <FeatureFlagProvider serverUrl={SERVER_URL} sdkKey={SDK_KEY} contextKey={contextKey}>
      <AtmosWeatherInner contextKeyStr={contextKey} setContextKey={setContextKey} />
    </FeatureFlagProvider>
  );
}
