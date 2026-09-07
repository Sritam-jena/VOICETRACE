"use client";

import { useState } from "react";
import {
  AudioLines,
  Cpu,
  Shield,
  Volume2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Sliders,
  Terminal,
  Activity,
  Zap,
} from "lucide-react";

interface PipelineNode {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: any;
  latencyBudget: string;
  description: string;
  technicalSpecs: string[];
  color: string;
}

const PIPELINE_NODES: PipelineNode[] = [
  {
    id: "dsp",
    number: 1,
    title: "DSP Audio Pre-Amp",
    subtitle: "Hardware & Low-Quality Mic Filter",
    icon: Sliders,
    latencyBudget: "< 2ms",
    description:
      "Cleans low-quality and laptop mics via 85Hz High-Pass filter (cuts rumble hum), Dynamics Compressor Node (amplifies faint whispers), and +8dB software gain boost.",
    technicalSpecs: [
      "85Hz Biquad highpass filter",
      "Dynamics compressor (-24dB threshold)",
      "Adaptive ambient noise floor calibration",
      "Software gain pre-amp (1.0x - 4.0x)",
    ],
    color: "#2CC3E9",
  },
  {
    id: "vad",
    number: 2,
    title: "VAD & Speech Recognition",
    subtitle: "Continuous Sentence Accumulator",
    icon: AudioLines,
    latencyBudget: "550ms pause",
    description:
      "Web Speech API with automated silence auto-commit (550ms) and continuous watchdog recovery. Prevents premature sentence cutoffs while maintaining snappy turn-taking.",
    technicalSpecs: [
      "Dual continuous transcript accumulator",
      "Fast 550ms natural conversational pause auto-commit",
      "Chromium onend 80ms debounced auto-restart",
      "1500ms stalled recognition watchdog",
    ],
    color: "#00F0FF",
  },
  {
    id: "qwen",
    number: 3,
    title: "Qwen 2.5 AI Brain",
    subtitle: "Generative Reasoning Engine",
    icon: Sparkles,
    latencyBudget: "300 - 600ms",
    description:
      "Full generative conversational intelligence powered by Qwen 2.5 (qwen-plus & qwen2.5-72b). Understands arbitrary questions, reasons over context, and invokes tools.",
    technicalSpecs: [
      "Qwen 2.5 REST runtime",
      "LiveKit low-latency audio streaming",
      "Zero API key exposure client-side architecture",
      "Structured function calling for booking & query tools",
    ],
    color: "#00F0FF",
  },
  {
    id: "guard",
    number: 4,
    title: "VoiceTrace Version Guard",
    subtitle: "Monotonic State & Invariant Engine",
    icon: Shield,
    latencyBudget: "< 15ms abort",
    description:
      "Guarantees Observed-Output Consistency. Enforces monotonic state versioning (v1 → v2), aborts active audio playback in <15ms upon barge-in, and discards stale tool payloads.",
    technicalSpecs: [
      "Atomic state version epoch locks",
      "<15ms instant audio cancellation via GainNode",
      "Rejection of stale async tool promises (v_tool < v_active)",
      "Failure traps: Stale audio leaks, divergent tool writes",
    ],
    color: "#10B981",
  },
  {
    id: "rime",
    number: 5,
    title: "Rime Arcana Neural TTS",
    subtitle: "Sub-100ms Conversational Voice",
    icon: Volume2,
    latencyBudget: "< 120ms TTFB",
    description:
      "Ultra-low latency expressive neural voice synthesis by Rime.ai. Generates natural, human-grade conversational audio in Astra, Coda, Mist, and Amber voices.",
    technicalSpecs: [
      "Direct Rime REST streaming endpoint",
      "Astra, Coda, Mist & Amber neural speaker models",
      "Adaptive speedAlpha tuning (0.8x - 1.4x)",
      "48kHz high-fidelity MP3/PCM audio buffers",
    ],
    color: "#2CC3E9",
  },
  {
    id: "output",
    number: 6,
    title: "Observed Output Verification",
    subtitle: "Synchronized Turn Execution",
    icon: CheckCircle2,
    latencyBudget: "Zero desync",
    description:
      "Speaker audio playback perfectly mirrors the latest user intent and state epoch. Telemetry events are persisted into PostgreSQL for regression replay.",
    technicalSpecs: [
      "Relational PostgreSQL event logs",
      "Deterministic session replay capture",
      "Sub-150ms total recovery SLA",
      "100% invariant verified observed output",
    ],
    color: "#00F0FF",
  },
];

export function InteractivePipelineMap() {
  const [activeNodeId, setActiveNodeId] = useState<string>("guard");

  const activeNode = PIPELINE_NODES.find((n) => n.id === activeNodeId) || PIPELINE_NODES[3];

  return (
    <div className="rime-glass rounded-2xl p-6 sm:p-7 border border-white/10 space-y-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Interactive 6-Stage Pipeline Architecture
              </h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 font-semibold whitespace-nowrap shrink-0 inline-flex items-center">
              Live Flow Map
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Click any node in the voice pipeline to inspect invariants, signal processing, and latency budgets.
          </p>
        </div>

        <div className="text-xs font-sfmono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/10">
          Total Target Latency: <span className="text-emerald-400 font-bold">&lt; 850ms E2E</span>
        </div>
      </div>

      {/* Pipeline Nodes Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {PIPELINE_NODES.map((node, index) => {
          const isActive = node.id === activeNodeId;
          const IconComponent = node.icon;

          return (
            <div
              key={node.id}
              onClick={() => setActiveNodeId(node.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left relative overflow-hidden ${
                isActive
                  ? "bg-zinc-900 border-[#2CC3E9]/80 shadow-[0_0_20px_-4px_rgba(44,195,233,0.3)] translate-y-[-2px]"
                  : "bg-zinc-950/70 border-white/10 hover:border-white/20 hover:bg-zinc-900/60"
              }`}
            >
              {/* Active top line */}
              <div
                className={`absolute inset-x-0 top-0 h-1 transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
                style={{ backgroundColor: node.color }}
              ></div>

              <div className="flex items-center justify-between text-xs font-sfmono mb-2">
                <span className="text-zinc-500">STAGE {node.number}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                  {node.latencyBudget}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{
                    backgroundColor: `${node.color}20`,
                    color: node.color,
                  }}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="font-bold text-xs text-white truncate">{node.title}</div>
              </div>

              <div className="text-[11px] text-zinc-400 truncate font-sans">{node.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Selected Node Deep Dive Inspector */}
      <div className="p-5 rounded-xl bg-zinc-950/90 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-950 font-bold shadow-lg"
              style={{ backgroundColor: activeNode.color }}
            >
              {activeNode.number}
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                {activeNode.title}
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-sfmono font-normal">
                  {activeNode.latencyBudget}
                </span>
              </div>
              <div className="text-xs text-zinc-400 font-sfmono">{activeNode.subtitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-sfmono text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Invariant:</span>
            <span className="text-zinc-200 font-semibold">
              {activeNode.id === "guard"
                ? "Observed-Output Consistency"
                : activeNode.id === "rime"
                ? "Sub-100ms Neural TTFB"
                : activeNode.id === "qwen"
                ? "Contextual Reasoning"
                : activeNode.id === "dsp"
                ? "No Acoustic Saturation"
                : "Continuous Recognition"}
            </span>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed font-sans">{activeNode.description}</p>

        {/* Technical Specifications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
          {activeNode.technicalSpecs.map((spec, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-zinc-900/80 border border-white/5 flex items-start gap-2 text-xs font-sfmono text-zinc-300"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{spec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
