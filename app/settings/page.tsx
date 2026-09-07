"use client";

import { useEffect, useState, useRef } from "react";
import {
  Settings,
  Volume2,
  Database,
  Lock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Key,
  Save,
  RefreshCw,
  Zap,
  Sparkles,
  ArrowRight,
  Layers,
  Radio,
  ExternalLink,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Rime API Key Form State
  const [inputKey, setInputKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Rime Test Synthesis State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Qwen AI Brain State
  const [llmConfig, setLlmConfig] = useState<{
    configured: boolean;
    provider: "qwen" | null;
    model: string;
    maskedKey: string;
  }>({ configured: false, provider: null, model: "qwen-plus", maskedKey: "" });
  const [selectedModel, setSelectedModel] = useState<string>("qwen-plus");
  const [inputLlmKey, setInputLlmKey] = useState("");
  const [isSavingLlmKey, setIsSavingLlmKey] = useState(false);
  const [llmSaveMessage, setLlmSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Qwen Test State
  const [llmTestPrompt, setLlmTestPrompt] = useState("Can you fix code and explain how you work?");
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<any>(null);

  // LiveKit Realtime Transport State
  const [livekitConfig, setLivekitConfig] = useState<{
    isConfigured: boolean;
    url: string;
    hasApiKey: boolean;
    hasApiSecret: boolean;
  }>({ isConfigured: false, url: "", hasApiKey: false, hasApiSecret: false });
  const [inputLivekitUrl, setInputLivekitUrl] = useState("");
  const [inputLivekitKey, setInputLivekitKey] = useState("");
  const [inputLivekitSecret, setInputLivekitSecret] = useState("");
  const [isSavingLivekit, setIsSavingLivekit] = useState(false);
  const [livekitSaveMessage, setLivekitSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchHealthAndKeys = async () => {
    try {
      setLoading(true);
      const [hRes, kRes, llmRes, lkRes] = await Promise.all([
        fetch("/api/health").then((r) => r.json()),
        fetch("/api/settings/rime-key").then((r) => r.json()),
        fetch("/api/settings/llm-key").then((r) => r.json()),
        fetch("/api/settings/livekit").then((r) => r.json()).catch(() => null),
      ]);
      setHealth(hRes);
      if (llmRes) {
        setLlmConfig(llmRes);
        if (llmRes.model) setSelectedModel(llmRes.model);
      }
      if (lkRes) {
        setLivekitConfig(lkRes);
        if (lkRes.url) setInputLivekitUrl(lkRes.url);
      }
      setInputKey("");
      setInputLlmKey("");
      setInputLivekitKey("");
      setInputLivekitSecret("");
    } catch (err) {
      console.error("Failed to load settings data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndKeys();
  }, []);

  const handleSaveRimeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey || inputKey.includes("••••")) {
      setSaveMessage({ type: "error", text: "Please enter a valid API key to update." });
      return;
    }

    setIsSavingKey(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/settings/rime-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: inputKey.trim() }),
      }).then((r) => r.json());

      if (res.success) {
        setSaveMessage({ type: "success", text: "Rime API key successfully activated and live!" });
        setInputKey("");
        await fetchHealthAndKeys();
      } else {
        setSaveMessage({ type: "error", text: res.error || "Failed to save key" });
      }
    } catch (err: any) {
      setSaveMessage({ type: "error", text: err.message });
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleSaveLlmKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLlmKey || inputLlmKey.includes("••••")) {
      setLlmSaveMessage({ type: "error", text: "Please enter a valid Qwen API key to update." });
      return;
    }

    setIsSavingLlmKey(true);
    setLlmSaveMessage(null);
    try {
      const res = await fetch("/api/settings/llm-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "qwen",
          apiKey: inputLlmKey.trim(),
          model: selectedModel,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setLlmSaveMessage({
          type: "success",
          text: `Qwen 2.5 AI Brain (${selectedModel}) successfully activated! Astra can now answer any question and debug code freely.`,
        });
        setInputLlmKey("");
        await fetchHealthAndKeys();
      } else {
        setLlmSaveMessage({ type: "error", text: res.error || "Failed to activate Qwen key" });
      }
    } catch (err: any) {
      setLlmSaveMessage({ type: "error", text: err.message });
    } finally {
      setIsSavingLlmKey(false);
    }
  };

  const handleSaveLiveKit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLivekit(true);
    setLivekitSaveMessage(null);
    try {
      const res = await fetch("/api/settings/livekit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: inputLivekitUrl.trim(),
          apiKey: inputLivekitKey.trim(),
          apiSecret: inputLivekitSecret.trim(),
        }),
      }).then((r) => r.json());

      if (res.success) {
        setLivekitSaveMessage({
          type: "success",
          text: "LiveKit Realtime Transport configuration successfully updated!",
        });
        setInputLivekitKey("");
        setInputLivekitSecret("");
        await fetchHealthAndKeys();
      } else {
        setLivekitSaveMessage({ type: "error", text: res.error || "Failed to save LiveKit configuration" });
      }
    } catch (err: any) {
      setLivekitSaveMessage({ type: "error", text: err.message });
    } finally {
      setIsSavingLivekit(false);
    }
  };

  const handleTestLlm = async () => {
    setIsTestingLlm(true);
    setLlmTestResult(null);
    try {
      const res = await fetch("/api/settings/llm-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: llmTestPrompt }),
      }).then((r) => r.json());

      setLlmTestResult(res);
    } catch (err: any) {
      setLlmTestResult({ success: false, error: err.message });
    } finally {
      setIsTestingLlm(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const payload: any = {};
      if (inputKey && !inputKey.includes("••••")) {
        payload.apiKey = inputKey.trim();
      }

      const res = await fetch("/api/rime/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      setTestResult(res);
      if (res.success) {
        await fetchHealthAndKeys();
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleTestAudio = () => {
    if (!testResult?.audioDataUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(testResult.audioDataUrl);
      audioRef.current.onended = () => setIsPlayingTestAudio(false);
    }

    if (isPlayingTestAudio) {
      audioRef.current.pause();
      setIsPlayingTestAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingTestAudio(true);
    }
  };

  const rimeMeta = health?.services?.rime?.metadata;
  const isKeyActive = health?.services?.rime?.status === "configured" || rimeMeta?.isConfigured;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#222227] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-zinc-300" />
          Settings &amp; AI Engine Configuration
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure Astra&apos;s speech vocal cords (Rime TTS), LiveKit Realtime Transport, and Qwen 2.5 AI Brain
        </p>
      </div>

      {/* 1. Qwen AI Brain (LLM Engine) Card */}
      <div className="p-6 rounded-lg mono-card space-y-6 border border-zinc-800 bg-[#101012]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222227] pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#00F0FF]" />
            <h2 className="text-base font-bold uppercase tracking-wider text-white">
              Qwen 2.5 AI Brain &amp; Intelligence
            </h2>
          </div>
          <span
            className="text-xs uppercase px-2.5 py-1 rounded-md border font-sfmono font-semibold border-emerald-700/80 bg-emerald-950/40 text-emerald-300 flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE AI: QWEN 2.5 ACTIVE ({llmConfig.model || "qwen-plus"})
          </span>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          Powered by <strong>Qwen 2.5</strong> (Alibaba Cloud), Astra gains open-ended conversational intelligence. With an active Qwen AI brain, Astra can <strong>fix code, debug errors, solve algorithms, answer complex questions, and reason freely</strong> in natural voice dialogue.
        </p>

        {/* Model Presets */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
            Select Qwen 2.5 Model:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                id: "qwen-plus",
                name: "Qwen Plus",
                desc: "Balanced flagship intelligence & voice speed",
                tag: "Recommended",
              },
              {
                id: "qwen-turbo",
                name: "Qwen Turbo",
                desc: "Ultra-low latency (~120ms) snappy speech",
                tag: "Fastest",
              },
              {
                id: "qwen2.5-72b-instruct",
                name: "Qwen 2.5 72B",
                desc: "Deep domain reasoning & complex math",
                tag: "72B Flagship",
              },
              {
                id: "qwen2.5-coder-32b",
                name: "Qwen Coder 32B",
                desc: "Specialized for coding & software debugging",
                tag: "Code AI",
              },
            ].map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedModel(mod.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedModel === mod.id
                    ? "border-[#00F0FF] bg-zinc-800 text-white shadow-sm"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-sfmono">{mod.name}</span>
                  <span
                    className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                      selectedModel === mod.id
                        ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {mod.tag}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-tight">{mod.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Free Qwen Key Helper */}
        <div className="p-3 rounded-md bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Need a Qwen / DashScope API key? Free tiers are available from Alibaba Cloud.
          </span>
          <a
            href="https://dashscope.console.aliyun.com"
            target="_blank"
            rel="noreferrer"
            className="text-[#00F0FF] hover:text-[#2CC3E9] font-semibold underline underline-offset-2 flex items-center gap-1 shrink-0"
          >
            Get Free Qwen Key (DashScope) ↗
          </a>
        </div>

        {/* Qwen Key Form - NEVER expose raw keys */}
        <form onSubmit={handleSaveLlmKey} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              Qwen API Key:
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="password"
                value={inputLlmKey}
                onChange={(e) => {
                  setInputLlmKey(e.target.value);
                  setLlmSaveMessage(null);
                }}
                placeholder={
                  llmConfig.configured
                    ? "•••••••••••••••• (Key active and securely protected)"
                    : "Paste your Qwen API key (DashScope)..."
                }
                className="flex-1 bg-zinc-950 border border-[#27272a] rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 font-sfmono focus:outline-none focus:border-[#00F0FF]"
              />
              <button
                type="submit"
                disabled={isSavingLlmKey || !inputLlmKey}
                className="px-5 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
              >
                <Key className={`w-4 h-4 ${isSavingLlmKey ? "animate-spin" : ""}`} />
                {isSavingLlmKey ? "Activating..." : "Activate Qwen Key"}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 font-sfmono">
              Keys are strictly isolated server-side and never exposed to the client or browser.
            </p>
          </div>

          {llmSaveMessage && (
            <div
              className={`p-3 rounded-md text-xs sm:text-sm font-medium flex items-center gap-2 ${
                llmSaveMessage.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                  : "bg-red-950/40 border border-red-800 text-red-300"
              }`}
            >
              {llmSaveMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{llmSaveMessage.text}</span>
            </div>
          )}
        </form>

        {/* Live Qwen AI Verification */}
        <div className="pt-4 border-t border-[#222227] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Live Qwen AI Verification</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Send a sample question to test whether Astra responds using Qwen 2.5 or local fallback
              </p>
            </div>
            <button
              onClick={handleTestLlm}
              disabled={isTestingLlm}
              className="px-4 py-2 rounded-md border border-[#27272a] bg-[#121214] text-zinc-200 hover:text-white text-xs sm:text-sm font-medium flex items-center gap-2 transition-all shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingLlm ? "animate-spin" : ""}`} />
              {isTestingLlm ? "Testing Qwen AI..." : "Test Qwen Reasoning"}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={llmTestPrompt}
              onChange={(e) => setLlmTestPrompt(e.target.value)}
              placeholder="Enter any test question or coding problem..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs sm:text-sm text-zinc-200 font-sfmono"
            />
          </div>

          {llmTestResult && (
            <div className="p-4 rounded-md border border-zinc-800 bg-zinc-950 text-xs sm:text-sm space-y-2 font-sfmono">
              <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/80 pb-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      llmTestResult.isLlmGenerated ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  ></span>
                  Mode: <strong className="text-white">{llmTestResult.isLlmGenerated ? `REAL GENERATIVE AI (${llmTestResult.provider?.toUpperCase()})` : "FALLBACK CONVERSATIONAL ENGINE"}</strong>
                </span>
                <span>Latency: <strong className="text-white">{llmTestResult.latencyMs}ms</strong></span>
              </div>
              <div className="text-zinc-200 leading-relaxed font-sans pt-1">
                &ldquo;{llmTestResult.responseText}&rdquo;
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. LiveKit Realtime Transport Card */}
      <div className="p-6 rounded-lg mono-card space-y-6 border border-zinc-800 bg-[#101012]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222227] pb-4">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold uppercase tracking-wider text-white">
              LiveKit Realtime Transport (WebRTC Stream)
            </h2>
          </div>
          <span
            className={`text-xs uppercase px-2.5 py-1 rounded-md border font-sfmono font-semibold ${
              livekitConfig.isConfigured
                ? "border-emerald-700/80 bg-emerald-950/40 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
            }`}
          >
            {livekitConfig.isConfigured ? "LIVEKIT CLOUD CONNECTED" : "WEBAUDIO BROWSER TRANSPORT"}
          </span>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          VoiceTrace integrates with <strong>LiveKit</strong> for broadcast-quality bidirectional WebRTC audio transport. Connect your LiveKit Cloud or self-hosted instance to enable seamless room-based streaming alongside HTML5 Web Audio.
        </p>

        {/* LiveKit Cloud Quick Link */}
        <div className="p-3 rounded-md bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Deploy low-latency voice infrastructure with free LiveKit Cloud.
          </span>
          <a
            href="https://cloud.livekit.io"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 flex items-center gap-1 shrink-0"
          >
            Get LiveKit Cloud Credentials ↗
          </a>
        </div>

        {/* LiveKit Form - NEVER expose raw keys */}
        <form onSubmit={handleSaveLiveKit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Server URL:
              </label>
              <input
                type="text"
                value={inputLivekitUrl}
                onChange={(e) => {
                  setInputLivekitUrl(e.target.value);
                  setLivekitSaveMessage(null);
                }}
                placeholder="wss://your-project.livekit.cloud"
                className="w-full bg-zinc-950 border border-[#27272a] rounded-md px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-sfmono focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                API Key:
              </label>
              <input
                type="password"
                value={inputLivekitKey}
                onChange={(e) => {
                  setInputLivekitKey(e.target.value);
                  setLivekitSaveMessage(null);
                }}
                placeholder={
                  livekitConfig.hasApiKey
                    ? "•••••••••••••••• (Protected)"
                    : "Enter LiveKit API Key..."
                }
                className="w-full bg-zinc-950 border border-[#27272a] rounded-md px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-sfmono focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                API Secret:
              </label>
              <input
                type="password"
                value={inputLivekitSecret}
                onChange={(e) => {
                  setInputLivekitSecret(e.target.value);
                  setLivekitSaveMessage(null);
                }}
                placeholder={
                  livekitConfig.hasApiSecret
                    ? "•••••••••••••••• (Protected)"
                    : "Enter LiveKit Secret..."
                }
                className="w-full bg-zinc-950 border border-[#27272a] rounded-md px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-sfmono focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingLivekit}
              className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingLivekit ? "animate-spin" : ""}`} />
              {isSavingLivekit ? "Saving..." : "Save LiveKit Configuration"}
            </button>
          </div>

          {livekitSaveMessage && (
            <div
              className={`p-3 rounded-md text-xs sm:text-sm font-medium flex items-center gap-2 ${
                livekitSaveMessage.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                  : "bg-red-950/40 border border-red-800 text-red-300"
              }`}
            >
              {livekitSaveMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{livekitSaveMessage.text}</span>
            </div>
          )}
        </form>
      </div>

      {/* 3. Rime TTS Vocal Cords Card */}
      <div className="p-6 rounded-lg mono-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222227] pb-4">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-zinc-300" />
            <h2 className="text-base font-bold uppercase tracking-wider text-white">
              Rime Speech Vocal Cords (TTS Engine)
            </h2>
          </div>
          <span
            className={`text-xs uppercase px-2.5 py-1 rounded-md border font-sfmono font-semibold ${
              isKeyActive
                ? "border-emerald-700/80 bg-emerald-950/40 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
            }`}
          >
            {isKeyActive ? "LIVE RIME API ACTIVE" : "LOCAL FIXTURE MODE"}
          </span>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          VoiceTrace uses Rime as its primary speech synthesis engine. You can paste your Rime API key below or set <code className="text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-xs">RIME_API_KEY</code> directly in <code className="text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-xs">.env</code>.
        </p>

        {/* Form to enter / update Rime key - NEVER expose raw keys */}
        <form onSubmit={handleSaveRimeKey} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              Rime API Key:
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setSaveMessage(null);
                }}
                placeholder={isKeyActive ? "•••••••••••••••• (Key configured & protected)" : "Enter Rime API key to activate..."}
                className="flex-1 bg-zinc-950 border border-[#27272a] rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 font-sfmono focus:outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                disabled={isSavingKey || !inputKey}
                className="px-5 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Key className={`w-4 h-4 ${isSavingKey ? "animate-spin" : ""}`} />
                {isSavingKey ? "Activating..." : "Activate Key"}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 font-sfmono">
              Keys are strictly isolated server-side and never exposed to the client or browser.
            </p>
          </div>

          {saveMessage && (
            <div
              className={`p-3 rounded-md text-xs sm:text-sm font-medium flex items-center gap-2 ${
                saveMessage.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                  : "bg-red-950/40 border border-red-800 text-red-300"
              }`}
            >
              {saveMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          )}
        </form>

        {/* Live Test Connection Action */}
        <div className="pt-3 border-t border-[#222227] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Live Voice Connection Verification</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Test Rime API latency, connectivity, and synthesize sample speech
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 rounded-md border border-[#27272a] bg-[#121214] text-zinc-200 hover:text-white text-xs sm:text-sm font-medium flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
            {isTesting ? "Testing Connection..." : "Test Rime Connection"}
          </button>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`p-4 rounded-md border text-sm space-y-3 ${
              testResult.success
                ? "bg-zinc-950 border-emerald-800/80 text-zinc-200"
                : "bg-zinc-950 border-red-800/80 text-zinc-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Rime Connection Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-300">Connection Failed</span>
                  </>
                )}
              </span>
              {testResult.success && (
                <span className="text-xs font-sfmono text-zinc-400 tabular">
                  Latency: <span className="text-white font-bold">{testResult.latencyMs}ms</span>
                </span>
              )}
            </div>

            {testResult.success ? (
              <div className="space-y-2 text-xs">
                <p className="text-zinc-400">
                  Successfully synthesized audio via model <span className="text-white font-semibold font-sfmono">{testResult.model}</span> (speaker: <span className="text-white font-semibold font-sfmono">{testResult.voice}</span>) in {testResult.latencyMs}ms ({testResult.audioBytes} bytes).
                </p>
                {testResult.audioDataUrl && (
                  <button
                    onClick={handleToggleTestAudio}
                    className="px-3.5 py-1.5 rounded bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all mt-1"
                  >
                    {isPlayingTestAudio ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause Sample Audio
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Play Sample Audio
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-red-400 font-sfmono">
                {testResult.error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. Telemetry & Security Boundary Specifications */}
      <div className="p-6 rounded-lg mono-card space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#222227] pb-4">
          <Shield className="w-5 h-5 text-zinc-300" />
          <h2 className="text-base font-bold uppercase tracking-wider text-white">
            Security &amp; Telemetry Specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-sfmono">
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">Voice TTS Engine</span>
            <span className="text-white font-medium text-sm">Rime Coda (Astra)</span>
          </div>
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">Realtime Transport</span>
            <span className="text-white font-medium text-sm">LiveKit / WebRTC</span>
          </div>
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">AI Reasoning Brain</span>
            <span className="text-white font-medium text-sm">Qwen 2.5 (Alibaba)</span>
          </div>
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">Audio Format</span>
            <span className="text-white font-medium text-sm">{rimeMeta?.audioFormat || "mp3"}</span>
          </div>
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">Transport</span>
            <span className="text-white font-medium text-sm">{rimeMeta?.transport || "http_streaming"}</span>
          </div>
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">API Endpoint</span>
            <span className="text-white font-medium text-xs truncate block">
              {rimeMeta?.endpoint || "https://users.rime.ai/v1/rime-tts"}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] text-xs text-zinc-400 flex items-center justify-between font-sfmono">
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Zero Key Exposure Policy:
          </span>
          <span className="text-zinc-200 font-medium">
            All API Keys (Rime, Qwen, LiveKit) isolated server-side • Never revealed in browser
          </span>
        </div>
      </div>

      {/* 5. Database Engine Card */}
      <div className="p-6 rounded-lg mono-card space-y-4">
        <div className="flex items-center justify-between border-b border-[#222227] pb-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-zinc-300" />
            <h2 className="text-base font-bold uppercase tracking-wider text-white">
              Relational Database Engine
            </h2>
          </div>
          <span className="text-xs uppercase px-2.5 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 font-sfmono font-semibold">
            {health?.services?.database?.status === "healthy" ? "CONNECTED" : "UNHEALTHY"}
          </span>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-zinc-300 font-sfmono">
          <div className="flex justify-between p-3 rounded-md bg-zinc-950 border border-[#222227]">
            <span className="text-zinc-400 uppercase text-xs">Engine Type</span>
            <span className="text-white font-medium">{health?.services?.database?.type || "embedded_pglite_wasm"}</span>
          </div>
          <div className="flex justify-between p-3 rounded-md bg-zinc-950 border border-[#222227]">
            <span className="text-zinc-400 uppercase text-xs">Schema Integrity</span>
            <span className="text-white font-medium">Strict Foreign Keys &amp; Cascades</span>
          </div>
          <div className="flex justify-between p-3 rounded-md bg-zinc-950 border border-[#222227]">
            <span className="text-zinc-400 uppercase text-xs">Data Directory</span>
            <span className="text-white font-medium">./data/pgdata &amp; ./data/audio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
