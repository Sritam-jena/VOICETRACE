"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Volume2,
  VolumeX,
  Clock,
  ArrowRight,
} from "lucide-react";

export function InteractiveLatencySimulator() {
  const [mode, setMode] = useState<"guarded" | "unguarded">("guarded");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0); // 0 to 2400ms
  const [audioFeedback, setAudioFeedback] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Playhead simulation loop
  const startSimulation = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setProgressMs(0);
    setAudioFeedback(null);

    const totalDuration = 2400;
    const intervalTime = 30; // update every 30ms
    const stepSize = (totalDuration / (totalDuration / intervalTime));

    let current = 0;
    timerRef.current = setInterval(() => {
      current += stepSize * 1.2;
      if (current >= totalDuration) {
        current = totalDuration;
        clearInterval(timerRef.current!);
        setIsPlaying(false);
      }
      setProgressMs(current);
    }, intervalTime);
  };

  const resetSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setProgressMs(0);
    setAudioFeedback(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Events in timeline
  // 0ms: Agent starts speaking "I'm booking a table for 4 guests at Bella..."
  // 700ms: User interrupts: "Wait! Change to 2 guests!"
  // 715ms (Guarded): Audio killed in 15ms. State v1 -> v2.
  // 700ms - 1900ms (Unguarded): Audio keeps playing over the user!
  // 1600ms: Background booking tool finishes with 4 guests.
  //   Guarded: Discarded as stale (v1 < v2)
  //   Unguarded: Accepted into state! (Corrupted)
  // 2100ms: Agent speaks final confirmation:
  //   Guarded: "Confirmed for 2 guests."
  //   Unguarded: "Confirmed for 4 guests."

  const isInterruptionTriggered = progressMs >= 700;
  const isToolFinished = progressMs >= 1600;
  const isTurnComplete = progressMs >= 2200;

  return (
    <div className="rime-glass rounded-2xl p-6 sm:p-7 border border-white/10 space-y-6 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-pulse"></span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Interactive Latency &amp; Race Simulator
              </h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 font-semibold whitespace-nowrap shrink-0 inline-flex items-center">
              Deterministic Invariants
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Simulate what happens inside the audio runtime when mid-turn barge-in races against a slow background API.
          </p>
        </div>

        {/* Mode Selector & Action Button */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-zinc-950 border border-white/10 flex items-center text-xs font-semibold">
            <button
              onClick={() => {
                setMode("guarded");
                resetSimulation();
              }}
              disabled={isPlaying}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === "guarded"
                  ? "bg-[#2CC3E9] text-zinc-950 font-bold shadow-[0_0_15px_rgba(44,195,233,0.3)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              VoiceTrace Guarded
            </button>
            <button
              onClick={() => {
                setMode("unguarded");
                resetSimulation();
              }}
              disabled={isPlaying}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === "unguarded"
                  ? "bg-red-500 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Unguarded Baseline
            </button>
          </div>

          <button
            onClick={startSimulation}
            disabled={isPlaying}
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_-4px_rgba(255,255,255,0.3)] disabled:opacity-50"
          >
            {isPlaying ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Simulate Live Race
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Timeline Track */}
      <div className="space-y-2 p-5 rounded-xl bg-zinc-950/80 border border-white/10">
        <div className="flex items-center justify-between text-xs font-sfmono text-zinc-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Timeline Position:</span>
            <span className="text-white font-bold tabular">{Math.round(progressMs)}ms</span>
            <span className="text-zinc-500">/ 2400ms</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 font-sfmono">
              Status:{" "}
              <strong className={mode === "guarded" ? "text-emerald-400" : "text-amber-400"}>
                {progressMs === 0
                  ? "Ready to run"
                  : progressMs < 700
                  ? "Turn 1 Speaking"
                  : progressMs < 1600
                  ? mode === "guarded"
                    ? "Aborted in 12ms (Clean)"
                    : "Audio Leaking (Collision)"
                  : progressMs < 2200
                  ? mode === "guarded"
                    ? "Discarded Stale Tool Result"
                    : "State Divergence / Corruption"
                  : "Turn 2 Finalized"}
              </strong>
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="relative w-full h-3.5 rounded-full bg-zinc-900 border border-white/10 overflow-hidden">
          {/* Fill Bar */}
          <div
            className={`h-full transition-all duration-75 ${
              mode === "guarded"
                ? "bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 shadow-[0_0_12px_rgba(44,195,233,0.5)]"
                : "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            }`}
            style={{ width: `${(progressMs / 2400) * 100}%` }}
          ></div>

          {/* Key Event Markers on Timeline */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
            style={{ left: `${(700 / 2400) * 100}%` }}
            title="700ms: Barge-in Interruption"
          ></div>
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-purple-400 z-10"
            style={{ left: `${(1600 / 2400) * 100}%` }}
            title="1600ms: Tool Result Returns"
          ></div>
        </div>

        {/* Timeline Marker Labels */}
        <div className="flex justify-between text-[11px] font-sfmono text-zinc-500 pt-1">
          <span>0ms (T1 Start)</span>
          <span className="text-amber-400">700ms (Barge-In)</span>
          <span className="text-purple-400">1600ms (Tool Result)</span>
          <span>2400ms (Resolved)</span>
        </div>
      </div>

      {/* Visual Pipeline Event Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stage 1: Audio Playback Cancellation */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isInterruptionTriggered
              ? mode === "guarded"
                ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_-4px_rgba(16,185,129,0.2)]"
                : "bg-red-950/30 border-red-500/60 shadow-[0_0_20px_-4px_rgba(239,68,68,0.2)]"
              : "bg-zinc-950/40 border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-sfmono mb-2">
            <span className="text-zinc-400">STAGE 1: AUDIO CUTOFF</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {progressMs >= 700 ? "Active" : "Pending"}
            </span>
          </div>

          <div className="text-sm font-bold text-white">
            {mode === "guarded" ? "Instant Interruption Abort" : "Uncoordinated Audio Leak"}
          </div>

          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {mode === "guarded"
              ? "AudioContext gain ramped to 0 in 12ms. Outgoing stream cancelled without audio bleed."
              : "Agent continues blaring stale speech for +1,200ms over the user's new utterance."}
          </p>

          <div className="mt-3 text-xs font-sfmono">
            {isInterruptionTriggered ? (
              mode === "guarded" ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Latency: 12ms (Target &lt; 35ms)
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  Leak Duration: +1420ms collision
                </div>
              )
            ) : (
              <span className="text-zinc-500">Waiting for barge-in...</span>
            )}
          </div>
        </div>

        {/* Stage 2: Monotonic State Increment */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isInterruptionTriggered
              ? mode === "guarded"
                ? "bg-cyan-950/20 border-[#2CC3E9]/50 shadow-[0_0_20px_-4px_rgba(44,195,233,0.2)]"
                : "bg-red-950/30 border-red-500/60 shadow-[0_0_20px_-4px_rgba(239,68,68,0.2)]"
              : "bg-zinc-950/40 border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-sfmono mb-2">
            <span className="text-zinc-400">STAGE 2: STATE VERSION</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {progressMs >= 700 ? (mode === "guarded" ? "v1 → v2" : "v1 (static)") : "v1"}
            </span>
          </div>

          <div className="text-sm font-bold text-white">
            {mode === "guarded" ? "Monotonic Version Bump" : "No State Partitioning"}
          </div>

          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {mode === "guarded"
              ? "State version atomically increments from v1 to v2 upon barge-in signal detection."
              : "Single mutable state. All async tool promises share the same unversioned context."}
          </p>

          <div className="mt-3 text-xs font-sfmono">
            {isInterruptionTriggered ? (
              mode === "guarded" ? (
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  Epoch Locked: v2 Active
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Unprotected Race Condition
                </div>
              )
            ) : (
              <span className="text-zinc-500">Awaiting state transition...</span>
            )}
          </div>
        </div>

        {/* Stage 3: Tool Race Invariant Check */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isToolFinished
              ? mode === "guarded"
                ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_-4px_rgba(16,185,129,0.2)]"
                : "bg-red-950/30 border-red-500/60 shadow-[0_0_20px_-4px_rgba(239,68,68,0.2)]"
              : "bg-zinc-950/40 border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-sfmono mb-2">
            <span className="text-zinc-400">STAGE 3: TOOL PAYLOAD</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {progressMs >= 1600 ? "Evaluated" : "In Flight"}
            </span>
          </div>

          <div className="text-sm font-bold text-white">
            {mode === "guarded" ? "Stale Payload Discarded" : "Corrupt Payload Applied"}
          </div>

          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {mode === "guarded"
              ? "Booking result for 4 guests tagged with v1 is smaller than current v2. Discarded!"
              : "Booking result for 4 guests writes to active memory, overriding user's request for 2!"}
          </p>

          <div className="mt-3 text-xs font-sfmono">
            {isToolFinished ? (
              mode === "guarded" ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Observed Output: 100% Consistent
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  Output Contradiction: CRITICAL
                </div>
              )
            ) : (
              <span className="text-zinc-500">Tool API running (400ms)...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
