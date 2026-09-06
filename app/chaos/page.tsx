"use client";

import { useState } from "react";
import {
  Flame,
  Zap,
} from "lucide-react";

export default function ChaosVoicePage() {
  const [toolDelayMs, setToolDelayMs] = useState(600);
  const [ttsDelayMs, setTtsDelayMs] = useState(250);
  const [interruptAfterMs, setInterruptAfterMs] = useState(300);
  const [injectStaleTool, setInjectStaleTool] = useState(true);
  const [useGuards, setUseGuards] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const handleLaunchChaos = async () => {
    setIsRunning(true);
    setRunMessage("Injecting deterministic faults and starting voice session...");
    try {
      const res = await fetch("/api/chaos/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolDelayMs,
          ttsDelayMs,
          interruptAfterMs,
          injectStaleToolResponse: injectStaleTool,
          useGuards,
        }),
      }).then((r) => r.json());

      if (res.sessionId) {
        setRunMessage(`Chaos session launched: ${res.sessionId}. Redirecting to trace...`);
        setTimeout(() => {
          window.location.href = `/sessions/${res.sessionId}`;
        }, 1000);
      }
    } catch (err: any) {
      setRunMessage(`Error launching chaos run: ${err.message}`);
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#222227] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Flame className="w-6 h-6 text-zinc-300" />
          Chaos Voice Console
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Introduce deterministic tool delays, speech synthesis latency jitter, and user barge-ins
        </p>
      </div>

      {runMessage && (
        <div className="p-4 rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-200">
          {runMessage}
        </div>
      )}

      {/* Fault Injections Form */}
      <div className="p-6 rounded-lg mono-card space-y-6">
        <div className="flex items-center justify-between border-b border-[#222227] pb-3">
          <span className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-300" />
            Deterministic Fault Controls
          </span>
          <span className="text-xs uppercase px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 font-sfmono">
            TEST MODE ACTIVE
          </span>
        </div>

        {/* Fault 1: Tool Delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">1. Asynchronous Tool Delay</span>
            <span className="tabular text-white font-bold font-sfmono">{toolDelayMs}ms</span>
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={toolDelayMs}
            onChange={(e) => setToolDelayMs(Number(e.target.value))}
            className="w-full accent-zinc-200 bg-zinc-900"
          />
          <p className="text-xs text-zinc-400">
            Delays completion of background database or external API calls to induce race condition with user speech.
          </p>
        </div>

        {/* Fault 2: TTS Delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">2. Speech Synthesis Latency Jitter</span>
            <span className="tabular text-white font-bold font-sfmono">{ttsDelayMs}ms</span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            step={50}
            value={ttsDelayMs}
            onChange={(e) => setTtsDelayMs(Number(e.target.value))}
            className="w-full accent-zinc-200 bg-zinc-900"
          />
          <p className="text-xs text-zinc-400">
            Simulates transient network delay between the agent orchestrator and Rime TTS provider.
          </p>
        </div>

        {/* Fault 3: Interruption Timing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-200 font-medium">3. User Barge-in Offset</span>
            <span className="tabular text-white font-bold font-sfmono">{interruptAfterMs}ms</span>
          </div>
          <input
            type="range"
            min={100}
            max={1500}
            step={50}
            value={interruptAfterMs}
            onChange={(e) => setInterruptAfterMs(Number(e.target.value))}
            className="w-full accent-zinc-200 bg-zinc-900"
          />
          <p className="text-xs text-zinc-400">
            Simulates user speaking and changing parameters while previous audio is playing.
          </p>
        </div>

        {/* Fault 4: Invariant Guard Toggle */}
        <div className="p-4 rounded-md bg-zinc-950 border border-[#222227] flex items-center justify-between text-sm">
          <div className="space-y-0.5">
            <span className="font-bold text-zinc-100 block">
              State Version Guard (Fix Toggle)
            </span>
            <span className="text-xs text-zinc-400">
              {useGuards
                ? "Guarded (v2): Playback cancelled in <35ms and stale tools dropped."
                : "Unguarded (v1): Simulates broken baseline with delayed cancellation & stale output."}
            </span>
          </div>
          <input
            type="checkbox"
            checked={useGuards}
            onChange={(e) => setUseGuards(e.target.checked)}
            className="w-5 h-5 accent-zinc-200"
          />
        </div>

        <button
          onClick={handleLaunchChaos}
          disabled={isRunning}
          className="w-full py-3 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Flame className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Injecting Faults..." : "Inject Faults & Run Chaos Session"}
        </button>
      </div>
    </div>
  );
}
