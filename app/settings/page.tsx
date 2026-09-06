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

  // LLM Brain State
  const [llmConfig, setLlmConfig] = useState<{
    configured: boolean;
    provider: "groq" | "gemini" | "openai" | "ollama" | null;
    maskedKey: string;
  }>({ configured: false, provider: null, maskedKey: "" });
  const [selectedProvider, setSelectedProvider] = useState<"groq" | "gemini" | "openai" | "ollama">("groq");
  const [inputLlmKey, setInputLlmKey] = useState("");
  const [isSavingLlmKey, setIsSavingLlmKey] = useState(false);
  const [llmSaveMessage, setLlmSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // LLM Test State
  const [llmTestPrompt, setLlmTestPrompt] = useState("Can you fix code and explain how you work?");
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<any>(null);

  const fetchHealthAndKeys = async () => {
    try {
      setLoading(true);
      const [hRes, kRes, llmRes] = await Promise.all([
        fetch("/api/health").then((r) => r.json()),
        fetch("/api/settings/rime-key").then((r) => r.json()),
        fetch("/api/settings/llm-key").then((r) => r.json()),
      ]);
      setHealth(hRes);
      if (llmRes) {
        setLlmConfig(llmRes);
        if (llmRes.provider) setSelectedProvider(llmRes.provider);
      }
      setInputKey("");
      setInputLlmKey("");
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
      setSaveMessage({ type: "error", text: "Please enter a valid, unmasked API key to update." });
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
    if (selectedProvider !== "ollama" && (!inputLlmKey || inputLlmKey.includes("••••"))) {
      setLlmSaveMessage({ type: "error", text: "Please enter an unmasked API key." });
      return;
    }

    setIsSavingLlmKey(true);
    setLlmSaveMessage(null);
    try {
      const res = await fetch("/api/settings/llm-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: inputLlmKey.trim(),
        }),
      }).then((r) => r.json());

      if (res.success) {
        setLlmSaveMessage({
          type: "success",
          text: `${selectedProvider.toUpperCase()} AI Brain activated! Astra can now answer any question and fix code freely.`,
        });
        setInputLlmKey("");
        await fetchHealthAndKeys();
      } else {
        setLlmSaveMessage({ type: "error", text: res.error || "Failed to activate LLM" });
      }
    } catch (err: any) {
      setLlmSaveMessage({ type: "error", text: err.message });
    } finally {
      setIsSavingLlmKey(false);
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
          Configure Astra&apos;s speech vocal cords (Rime TTS) and generative AI brain (Groq, Gemini, OpenAI, or Ollama)
        </p>
      </div>

      {/* 1. AI Brain & Generative Intelligence (LLM) Card */}
      <div className="p-6 rounded-lg mono-card space-y-6 border border-zinc-800 bg-[#101012]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222227] pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold uppercase tracking-wider text-white">
              AI Brain &amp; Intelligence (LLM Engine)
            </h2>
          </div>
          <span
            className={`text-xs uppercase px-2.5 py-1 rounded-md border font-sfmono font-semibold ${
              llmConfig.configured
                ? "border-emerald-700/80 bg-emerald-950/40 text-emerald-300"
                : "border-amber-700/80 bg-amber-950/30 text-amber-300"
            }`}
          >
            {llmConfig.configured
              ? `LIVE AI: ${llmConfig.provider?.toUpperCase()} ACTIVE`
              : "SCRIPT FALLBACK (ADD FREE KEY)"}
          </span>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">
          While Rime provides Astra&apos;s voice vocal cords, the <strong>LLM Brain</strong> gives Astra open-ended general intelligence. With an active AI brain, Astra can <strong>fix code, debug errors, solve algorithms, answer any question, and reason freely</strong> instead of using scripted canned responses.
        </p>

        {/* Provider Selector Tabs */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
            Select AI Brain Provider:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: "groq",
                name: "Groq LPU",
                desc: "Fastest voice (~150ms), 100% Free",
                tag: "Recommended",
              },
              {
                id: "gemini",
                name: "Google Gemini",
                desc: "Gemini 2.0/1.5 Flash, 100% Free",
                tag: "Free Tier",
              },
              {
                id: "openai",
                name: "OpenAI",
                desc: "GPT-4o mini, High accuracy",
                tag: "Standard",
              },
              {
                id: "ollama",
                name: "Local Ollama",
                desc: "100% Local & private, No keys",
                tag: "Local",
              },
            ].map((prov) => (
              <button
                key={prov.id}
                type="button"
                onClick={() => setSelectedProvider(prov.id as any)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedProvider === prov.id
                    ? "border-white bg-zinc-800 text-white shadow-sm"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-sfmono">{prov.name}</span>
                  <span
                    className={`text-[10px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                      selectedProvider === prov.id
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {prov.tag}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-tight">{prov.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Free Key Quick Links */}
        <div className="p-3 rounded-md bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Need a 100% free key with no credit card required?
          </span>
          <div className="flex items-center gap-3">
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 flex items-center gap-1"
            >
              Get Free Groq Key ↗
            </a>
            <span className="text-zinc-600">•</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 flex items-center gap-1"
            >
              Get Free Gemini Key ↗
            </a>
          </div>
        </div>

        {/* LLM Key Form */}
        <form onSubmit={handleSaveLlmKey} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              {selectedProvider === "ollama" ? "Ollama Host URL:" : `${selectedProvider.toUpperCase()} API Key:`}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type={selectedProvider === "ollama" ? "text" : "password"}
                value={inputLlmKey}
                onChange={(e) => {
                  setInputLlmKey(e.target.value);
                  setLlmSaveMessage(null);
                }}
                placeholder={
                  selectedProvider === "ollama"
                    ? "http://127.0.0.1:11434"
                    : llmConfig.configured && llmConfig.provider === selectedProvider
                    ? "•••••••••••••••• (Key active and protected)"
                    : `Paste your ${selectedProvider.toUpperCase()} API key...`
                }
                className="flex-1 bg-zinc-950 border border-[#27272a] rounded-md px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 font-sfmono focus:outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                disabled={isSavingLlmKey || (selectedProvider !== "ollama" && !inputLlmKey)}
                className="px-5 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
              >
                <Key className={`w-4 h-4 ${isSavingLlmKey ? "animate-spin" : ""}`} />
                {isSavingLlmKey ? "Activating..." : "Activate Key"}
              </button>
            </div>
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

        {/* Live AI Reasoning Verification */}
        <div className="pt-4 border-t border-[#222227] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Live AI Reasoning Verification</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Send a sample question to test whether Astra responds using a real LLM or local fallback
              </p>
            </div>
            <button
              onClick={handleTestLlm}
              disabled={isTestingLlm}
              className="px-4 py-2 rounded-md border border-[#27272a] bg-[#121214] text-zinc-200 hover:text-white text-xs sm:text-sm font-medium flex items-center gap-2 transition-all shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingLlm ? "animate-spin" : ""}`} />
              {isTestingLlm ? "Testing AI Brain..." : "Test AI Reasoning"}
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
                  Mode: <strong className="text-white">{llmTestResult.isLlmGenerated ? `REAL GENERATIVE AI (${llmTestResult.provider})` : "FALLBACK CONVERSATIONAL ENGINE"}</strong>
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

      {/* 2. Rime TTS Vocal Cords Card */}
      <div className="p-6 rounded-lg mono-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222227] pb-4">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-zinc-300" />
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
          VoiceTrace uses Rime as its primary speech synthesis engine. You can paste your Rime API key below or set <code className="text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-xs">RIME_API_KEY</code> directly in <code className="text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-xs">.env</code> or <code className="text-zinc-200 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-xs">tests/key.env</code>.
        </p>

        {/* Form to enter / update Rime key */}
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

      {/* 3. Rime Engine Metadata */}
      <div className="p-6 rounded-lg mono-card space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#222227] pb-4">
          <Volume2 className="w-5 h-5 text-zinc-300" />
          <h2 className="text-base font-bold uppercase tracking-wider text-white">
            Rime Telemetry Specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-sfmono">
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">Model ID</span>
            <span className="text-white font-medium text-sm">{rimeMeta?.model || "coda"}</span>
          </div>
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">Voice / Speaker</span>
            <span className="text-white font-medium text-sm">{rimeMeta?.voice || "amber"}</span>
          </div>
          <div className="p-3.5 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
            <span className="text-zinc-400 block text-xs font-semibold uppercase">Language</span>
            <span className="text-white font-medium text-sm">{rimeMeta?.language || "en"}</span>
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
            <Lock className="w-4 h-4 text-zinc-400" />
            Server Security Boundary:
          </span>
          <span className="text-zinc-200 font-medium">
            {isKeyActive ? "Server-Side Isolated (Client Protected)" : "No Live Key Configured"}
          </span>
        </div>
      </div>

      {/* 4. Database Engine Card */}
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
