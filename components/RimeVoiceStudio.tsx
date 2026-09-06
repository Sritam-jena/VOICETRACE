"use client";

import { useState, useRef } from "react";
import {
  Play,
  Square,
  Volume2,
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Radio,
  Clock,
  Music,
} from "lucide-react";

interface VoiceConfig {
  id: string;
  name: string;
  speaker: string;
  gender: string;
  persona: string;
  accent: string;
  color: string;
  gradient: string;
  sampleText: string;
}

const RIME_VOICES: VoiceConfig[] = [
  {
    id: "astra",
    name: "Astra",
    speaker: "astra",
    gender: "Female",
    persona: "Conversational, warm & empathetic",
    accent: "US English",
    color: "#2CC3E9",
    gradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
    sampleText:
      "VoiceTrace observed-output consistency verified. Sub-100 millisecond neural speech synthesis active.",
  },
  {
    id: "albion",
    name: "Albion",
    speaker: "albion",
    gender: "Male",
    persona: "Executive, authoritative & crisp",
    accent: "UK / US English",
    color: "#00F0FF",
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
    sampleText:
      "User interrupted mid-booking. VoiceTrace safely aborted stale audio in 12 milliseconds without state leakage.",
  },
  {
    id: "celeste",
    name: "Celeste",
    speaker: "celeste",
    gender: "Female",
    persona: "Nuanced, storytelling & calm",
    accent: "US English",
    color: "#10B981",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    sampleText:
      "Welcome to the conversational runtime. All background tool dispatches are synchronized with monotonic state.",
  },
  {
    id: "amber",
    name: "Amber",
    speaker: "amber",
    gender: "Female",
    persona: "Fast, energetic & articulate",
    accent: "US English",
    color: "#F59E0B",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    sampleText:
      "Production voice agents require deterministic timing. VoiceTrace traps race conditions before they reach user ears.",
  },
];

const PRESET_PHRASES = [
  "VoiceTrace verified observed-output consistency across all versions.",
  "Barge-in detected! Aborting speech stream in 12 milliseconds.",
  "Welcome to the neural voice runtime. What would you like to build today?",
  "All edge invariants passed. Zero desynchronization detected.",
];

export function RimeVoiceStudio() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig>(RIME_VOICES[0]);
  const [customText, setCustomText] = useState<string>(RIME_VOICES[0].sampleText);
  const [selectedModel, setSelectedModel] = useState<string>("coda");
  const [speedAlpha, setSpeedAlpha] = useState<number>(1.0);
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingVoice(null);
  };

  const synthesizeAndPlay = async (voice: VoiceConfig, textToSpeak?: string) => {
    const text = textToSpeak || customText || voice.sampleText;

    // If already playing this voice, stop it
    if (playingVoice === voice.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingVoice(voice.id);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/rime/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          speaker: voice.speaker,
          model: selectedModel,
          speedAlpha,
        }),
      }).then((r) => r.json());

      if (!res.success) {
        throw new Error(res.error || "Synthesis failed");
      }

      setLastLatency(res.latencyMs);

      if (res.audioDataUrl) {
        const audio = new Audio(res.audioDataUrl);
        audioRef.current = audio;
        setPlayingVoice(voice.id);

        audio.onended = () => {
          setPlayingVoice(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingVoice(null);
          audioRef.current = null;
        };

        await audio.play();
      }
    } catch (err: any) {
      console.error("Rime voice studio error:", err);
      setErrorMsg(err.message || "Failed to synthesize voice");
    } finally {
      setLoadingVoice(null);
    }
  };

  return (
    <div className="rime-glass rounded-2xl p-6 sm:p-7 border border-white/10 relative overflow-hidden space-y-6">
      {/* Background ambient radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2CC3E9] animate-pulse"></div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Rime Neural Voice Studio
              </h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#2CC3E9]/15 text-[#2CC3E9] border border-[#2CC3E9]/35 font-semibold whitespace-nowrap shrink-0 inline-flex items-center">
              Live Audition
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Experience Rime&apos;s conversational models built for real-time turn-taking and sub-100ms TTFB.
          </p>
        </div>

        {/* Global Latency / Performance pill */}
        <div className="flex items-center gap-3">
          {lastLatency !== null && (
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-[#2CC3E9]/40 text-xs font-sfmono text-zinc-200 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#2CC3E9]" />
              <span>TTFB:</span>
              <span className="text-[#2CC3E9] font-bold">{lastLatency}ms</span>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-sfmono text-zinc-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Rime Core Online</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-950/40 text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-white ml-2 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Voice Showcase Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {RIME_VOICES.map((voice) => {
          const isSelected = selectedVoice.id === voice.id;
          const isPlaying = playingVoice === voice.id;
          const isLoading = loadingVoice === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => {
                setSelectedVoice(voice);
                setCustomText(voice.sampleText);
              }}
              className={`group relative p-4 rounded-xl border backdrop-blur-xl transition-all cursor-pointer select-none ${
                isSelected
                  ? "bg-white/[0.08] border-[#2CC3E9]/60 shadow-[0_8px_24px_-4px_rgba(44,195,233,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
              }`}
            >
              {/* Subtle top accent gradient */}
              <div
                className={`absolute inset-x-0 top-0 h-1 rounded-t-xl transition-opacity ${
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                }`}
                style={{ backgroundColor: voice.color }}
              ></div>

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner"
                    style={{
                      backgroundColor: `${voice.color}15`,
                      color: voice.color,
                      border: `1px solid ${voice.color}40`,
                    }}
                  >
                    {voice.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      {voice.name}
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2CC3E9]"></span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-sfmono">
                      {voice.gender} • {voice.accent}
                    </div>
                  </div>
                </div>

                {/* Animated Dancing Equalizer Bars when playing */}
                {isPlaying ? (
                  <div className="flex items-end gap-1 h-5 px-2 py-0.5 rounded bg-zinc-900/90 border border-[#2CC3E9]/40">
                    <span className="eq-bar animate-eq-1 h-full"></span>
                    <span className="eq-bar animate-eq-2 h-full"></span>
                    <span className="eq-bar animate-eq-3 h-full"></span>
                    <span className="eq-bar animate-eq-4 h-full"></span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVoice(voice);
                      synthesizeAndPlay(voice);
                    }}
                    disabled={isLoading}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-[#2CC3E9] text-white hover:text-zinc-950 flex items-center justify-center transition-all duration-200"
                    title="Audition Voice"
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>
                )}
              </div>

              <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px] leading-relaxed">
                {voice.persona}
              </p>

              {/* Action Button Inside Card */}
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-sfmono text-zinc-500">
                  model: {selectedModel}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVoice(voice);
                    synthesizeAndPlay(voice);
                  }}
                  disabled={isLoading}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isPlaying
                      ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                      : "bg-white/10 hover:bg-white text-zinc-200 hover:text-zinc-950"
                  }`}
                >
                  {isLoading ? (
                    <span className="animate-spin text-xs">⟳</span>
                  ) : isPlaying ? (
                    <>
                      <Square className="w-2.5 h-2.5 fill-current" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" />
                      Audition
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Spoken Prompt Studio */}
      <div className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2CC3E9]" />
            <span className="text-sm font-bold text-white">
              Interactive Spoken Prompt Studio
            </span>
            <span className="text-[11px] text-zinc-400 font-sfmono">
              Speaking in:{" "}
              <strong className="text-[#2CC3E9]">{selectedVoice.name}</strong>
            </span>
          </div>

          {/* Preset Quick-Picks */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-zinc-500 text-[11px] shrink-0 font-sfmono">Presets:</span>
            {PRESET_PHRASES.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => setCustomText(phrase)}
                className="px-2.5 py-1 rounded-md bg-zinc-900/90 border border-white/10 hover:border-[#2CC3E9]/50 text-zinc-300 hover:text-white text-[11px] whitespace-nowrap transition-colors"
              >
                Preset {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea Input */}
        <div className="relative">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#2CC3E9]/60 focus:ring-1 focus:ring-[#2CC3E9]/30 transition-all font-sans"
            placeholder="Type any sentence for Rime neural synthesis..."
          />
        </div>

        {/* Controls Bar: Model, Speed, and Speak Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4 text-xs font-sfmono text-zinc-400 flex-wrap">
            {/* Model Selector */}
            <div className="flex items-center gap-1.5">
              <span>Model:</span>
              <div className="flex items-center rounded-md bg-zinc-900 border border-zinc-800 p-0.5">
                <button
                  onClick={() => setSelectedModel("coda")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    selectedModel === "coda"
                      ? "bg-[#2CC3E9] text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  coda
                </button>
                <button
                  onClick={() => setSelectedModel("arcana")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    selectedModel === "arcana"
                      ? "bg-[#2CC3E9] text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  arcana
                </button>
              </div>
            </div>

            {/* Speed Alpha Slider */}
            <div className="flex items-center gap-2">
              <span>Speed:</span>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={speedAlpha}
                onChange={(e) => setSpeedAlpha(parseFloat(e.target.value))}
                className="w-20 accent-[#2CC3E9] cursor-pointer"
              />
              <span className="text-zinc-200 tabular">{speedAlpha.toFixed(2)}x</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => synthesizeAndPlay(selectedVoice, customText)}
            disabled={loadingVoice !== null}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-4px_rgba(255,255,255,0.3)] disabled:opacity-50"
          >
            {loadingVoice ? (
              <>
                <span className="animate-spin text-xs">⟳</span>
                Synthesizing Neural Speech...
              </>
            ) : playingVoice === selectedVoice.id ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Playback
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Speak with {selectedVoice.name}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
