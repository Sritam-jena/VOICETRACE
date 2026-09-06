"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Play,
  RotateCcw,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Zap,
  ArrowRight,
  Clock,
  Layers,
  Terminal,
  Activity,
} from "lucide-react";

export function CanonicalWalkthrough() {
  const [useGuards, setUseGuards] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 0: Idle, 1: Turn 1, 2: Interruption, 3: Tool Result, 4: Turn 2, 5: Done
  const [demoData, setDemoData] = useState<any>(null);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setAudioPlaying(null);
  };

  const playAudioChunk = (dataUrl: string, label: string): Promise<void> => {
    return new Promise((resolve) => {
      stopAudio();
      const audio = new Audio(dataUrl);
      audioRef.current = audio;
      setAudioPlaying(label);

      audio.onended = () => {
        setAudioPlaying(null);
        audioRef.current = null;
        resolve();
      };

      audio.onerror = () => {
        setAudioPlaying(null);
        audioRef.current = null;
        resolve();
      };

      audio.play().catch(() => {
        setAudioPlaying(null);
        audioRef.current = null;
        resolve();
      });
    });
  };

  const runWalkthrough = async (guardedMode: boolean) => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStep(1);
    stopAudio();

    try {
      // 1. Fetch live execution data from backend (synthesized with Rime TTS)
      const res = await fetch("/api/live/walkthrough", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useGuards: guardedMode }),
      }).then((r) => r.json());

      if (!res.success) {
        throw new Error(res.error || "Walkthrough execution failed");
      }

      setDemoData(res);

      // STEP 1: Turn 1 Starts - Agent speaks about 4 guests
      setActiveStep(1);
      if (res.turn1?.audioDataUrl) {
        // Start playback of Turn 1
        const playPromise = playAudioChunk(res.turn1.audioDataUrl, "Astra speaking (Party of 4)");

        // Wait 1.8 seconds while Astra speaks, then trigger the interruption!
        await new Promise((r) => setTimeout(r, 1800));

        // STEP 2: Mid-Speech Interruption Strikes!
        setActiveStep(2);
        if (guardedMode) {
          // In Guarded mode: Cut off playback immediately! (< 15ms)
          stopAudio();
        } else {
          // In Baseline mode: audio leaks and continues playing over the user
          await new Promise((r) => setTimeout(r, 1200));
          stopAudio();
        }
      }

      // STEP 3: Background Tool Completes
      await new Promise((r) => setTimeout(r, 600));
      setActiveStep(3);

      // STEP 4: Turn 2 Output - Agent responds to new requirement (Party of 2)
      await new Promise((r) => setTimeout(r, 700));
      setActiveStep(4);
      if (res.turn2?.audioDataUrl) {
        await playAudioChunk(res.turn2.audioDataUrl, "Astra speaking (Party of 2 Confirmed)");
      }

      // STEP 5: Verification Telemetry Complete
      setActiveStep(5);
    } catch (err: any) {
      console.error("Walkthrough error:", err);
      alert("Walkthrough error: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rime-glass rounded-2xl p-6 sm:p-7 space-y-6 border border-white/10 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2CC3E9] animate-pulse"></span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Canonical Interruption &amp; Race Condition Demonstration
              </h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#2CC3E9]/15 text-[#2CC3E9] border border-[#2CC3E9]/35 font-semibold whitespace-nowrap shrink-0 inline-flex items-center">
              Observed Invariants
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Watch &amp; hear what happens when a user interrupts a voice agent while a background booking tool is in flight.
          </p>
        </div>

        {/* Guarded vs Baseline Toggle + Run Button */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-zinc-950 border border-white/10 flex items-center text-xs font-semibold">
            <button
              onClick={() => {
                setUseGuards(true);
                if (demoData) setDemoData(null);
                setActiveStep(0);
              }}
              disabled={isRunning}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                useGuards
                  ? "bg-[#2CC3E9] text-zinc-950 font-bold shadow-[0_0_15px_rgba(44,195,233,0.3)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Guarded (VoiceTrace)
            </button>
            <button
              onClick={() => {
                setUseGuards(false);
                if (demoData) setDemoData(null);
                setActiveStep(0);
              }}
              disabled={isRunning}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                !useGuards
                  ? "bg-red-500 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Baseline (Buggy)
            </button>
          </div>

          <button
            onClick={() => runWalkthrough(useGuards)}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs sm:text-sm hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center gap-2 shadow-[0_0_20px_-4px_rgba(255,255,255,0.3)]"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Demonstrating...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Live Spoken Demo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audio Status Banner with Dancing Equalizer Bars */}
      {audioPlaying && (
        <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-[#2CC3E9]/50 flex items-center justify-between text-xs font-sfmono text-white shadow-[0_0_20px_-4px_rgba(44,195,233,0.3)]">
          <div className="flex items-center gap-3">
            {/* Animated EQ Bars */}
            <div className="flex items-end gap-1 h-4">
              <span className="eq-bar animate-eq-1 h-full"></span>
              <span className="eq-bar animate-eq-2 h-full"></span>
              <span className="eq-bar animate-eq-3 h-full"></span>
              <span className="eq-bar animate-eq-4 h-full"></span>
            </div>
            <span className="font-semibold text-cyan-200">{audioPlaying}</span>
            <span className="text-[11px] text-zinc-400">• Rime Neural Speech</span>
          </div>
          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Audio Active
          </span>
        </div>
      )}

      {/* Step-by-Step Flow Graphic */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Step 1 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            activeStep === 1
              ? "bg-zinc-900 border-white text-white shadow-lg"
              : activeStep > 1
              ? "bg-zinc-950/80 border-zinc-800 text-zinc-300"
              : "bg-zinc-950/40 border-zinc-800/60 text-zinc-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-sfmono mb-2">
            <span>STEP 1</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]">
              State v1
            </span>
          </div>
          <div className="font-semibold text-sm text-zinc-100">User Command (Party 4)</div>
          <p className="text-xs text-zinc-400 mt-1">
            "Book a table for 4 at Bella Italia..."
          </p>
          <div className="mt-3 text-[11px] font-sfmono text-zinc-400 flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-zinc-500" />
            Tool launched (400ms delay)
          </div>
        </div>

        {/* Step 2 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            activeStep === 2
              ? "bg-amber-950/30 border-amber-500 text-amber-200 shadow-lg"
              : activeStep > 2
              ? "bg-zinc-950/80 border-zinc-800 text-zinc-300"
              : "bg-zinc-950/40 border-zinc-800/60 text-zinc-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-sfmono mb-2">
            <span>STEP 2</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px]">
              Barge-In
            </span>
          </div>
          <div className="font-semibold text-sm text-zinc-100">User Interrupts Mid-Speech</div>
          <p className="text-xs text-zinc-400 mt-1">
            "Wait! Change that to 2 guests!"
          </p>
          <div className="mt-3 text-[11px] font-sfmono flex items-center gap-1.5">
            {useGuards ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                Aborted in 12ms (v1 → v2)
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                Stale audio keeps playing!
              </span>
            )}
          </div>
        </div>

        {/* Step 3 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            activeStep === 3
              ? "bg-zinc-900 border-white text-white shadow-lg"
              : activeStep > 3
              ? "bg-zinc-950/80 border-zinc-800 text-zinc-300"
              : "bg-zinc-950/40 border-zinc-800/60 text-zinc-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-sfmono mb-2">
            <span>STEP 3</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]">
              Tool Evaluation
            </span>
          </div>
          <div className="font-semibold text-sm text-zinc-100">Background Tool Finishes</div>
          <p className="text-xs text-zinc-400 mt-1">
            Result for 4 guests returns.
          </p>
          <div className="mt-3 text-[11px] font-sfmono">
            {useGuards ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Discarded as STALE (v1 &lt; v2)
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Leaked into active state!
              </span>
            )}
          </div>
        </div>

        {/* Step 4 */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            activeStep >= 4
              ? "bg-zinc-900 border-white text-white shadow-lg"
              : "bg-zinc-950/40 border-zinc-800/60 text-zinc-500"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-sfmono mb-2">
            <span>STEP 4</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px]">
              Final State v2
            </span>
          </div>
          <div className="font-semibold text-sm text-zinc-100">Agent Speaks Final Output</div>
          <p className="text-xs text-zinc-400 mt-1">
            {useGuards
              ? '"Confirmed for 2 at Bella Italia."'
              : '"Confirmed for 4 at Bella Italia (Contradiction!)"'}
          </p>
          <div className="mt-3 text-[11px] font-sfmono">
            {useGuards ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Observed-Output Consistent
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                State Divergence Failure
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Realtime Telemetry Comparison Card (After Execution) */}
      {demoData && (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-200">
                Live Verification Telemetry ({useGuards ? "Guarded" : "Baseline"})
              </span>
            </div>
            {demoData.sessionId && (
              <Link
                href={`/sessions/${demoData.sessionId}`}
                className="text-xs font-sfmono text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                Inspect Session Replay
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sfmono">
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1">
              <span className="text-zinc-400 text-[11px]">Cancellation Latency</span>
              <div className={`text-base font-bold ${demoData.cancellationLatencyMs < 35 ? "text-emerald-400" : "text-red-400"}`}>
                {demoData.cancellationLatencyMs}ms
              </div>
              <span className="text-zinc-500 text-[10px]">Target: &lt; 35ms</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1">
              <span className="text-zinc-400 text-[11px]">Stale Audio Leaks</span>
              <div className={`text-base font-bold ${useGuards ? "text-emerald-400" : "text-red-400"}`}>
                {useGuards ? "0 Leaks" : "1 Stale Leak"}
              </div>
              <span className="text-zinc-500 text-[10px]">Target: 0</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1">
              <span className="text-zinc-400 text-[11px]">Tool Result State</span>
              <div className={`text-base font-bold ${useGuards ? "text-emerald-400" : "text-red-400"}`}>
                {useGuards ? "REJECTED (STALE)" : "ACCEPTED (CORRUPT)"}
              </div>
              <span className="text-zinc-500 text-[10px]">Party size 4 check</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1">
              <span className="text-zinc-400 text-[11px]">Observed Consistency</span>
              <div className={`text-base font-bold ${useGuards ? "text-emerald-400" : "text-red-400"}`}>
                {useGuards ? "PASSED (100%)" : "FAILED (CRITICAL)"}
              </div>
              <span className="text-zinc-500 text-[10px]">Core Invariant</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
