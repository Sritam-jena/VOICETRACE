"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  Radio,
  ArrowUpRight,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  AudioLines,
  Volume2,
  Shield,
  Zap,
} from "lucide-react";
import { CanonicalWalkthrough } from "@/components/CanonicalWalkthrough";
import { RimeWaveformVisualizer } from "@/components/RimeWaveformVisualizer";
import { RimeVoiceStudio } from "@/components/RimeVoiceStudio";
import { InteractiveLatencySimulator } from "@/components/InteractiveLatencySimulator";
import { InteractivePipelineMap } from "@/components/InteractivePipelineMap";

export default function CommandCenterPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, sRes, fRes] = await Promise.all([
        fetch("/api/metrics").then((r) => r.json()),
        fetch("/api/sessions?limit=6").then((r) => r.json()),
        fetch("/api/failures").then((r) => r.json()),
      ]);
      setMetrics(mRes);
      setSessions(Array.isArray(sRes) ? sRes : []);
      setFailures(Array.isArray(fRes) ? fRes : []);
    } catch (err) {
      console.error("Failed to load command center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runAcceptanceTest = async () => {
    setActionLoading(true);
    setLastActionMessage("Running canonical interruption-recovery acceptance test...");
    try {
      const res = await fetch("/api/test-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testCaseId: "interruption-recovery-demo",
          useGuards: true,
        }),
      }).then((r) => r.json());

      setLastActionMessage(
        res.status === "PASSED"
          ? `Acceptance Test Passed: Cancellation latency ${res.result?.cancellationLatencyMs}ms (<150ms target)`
          : `Acceptance Test: ${res.status}`
      );
      await fetchData();
    } catch (err: any) {
      setLastActionMessage(`Test execution failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const summary = metrics?.summary;

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12">
      {/* Platform Ambient Interactive Wave Background & Hero Section */}
      <div className="relative isolate">
        {/* Full-width interactive wave background running behind the hero card */}
        <div className="absolute -inset-x-4 sm:-inset-x-12 -top-8 -bottom-8 pointer-events-auto overflow-hidden -z-10 rounded-3xl">
          <RimeWaveformVisualizer
            isActive={true}
            intensity={0.8}
            colorScheme="cyan"
            isBackground={true}
          />
        </div>

        {/* Ultra-luxurious Frosted Glass Hero Card */}
        <div className="relative rounded-3xl p-7 sm:p-9 sm:py-11 rime-glass-hero shadow-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              {/* Live system pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-sfmono text-zinc-200 backdrop-blur-md shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
                <span>Rime Neural Voice Core • Sub-100ms TTFB</span>
                <span className="text-zinc-500">|</span>
                <span className="text-emerald-400 font-bold">Guarded Runtime</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Realtime Voice Agent <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] via-[#2CC3E9] to-[#8B5CF6] glow-text-cyan">
                  Observability &amp; Invariants
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-300/90 leading-relaxed max-w-xl">
                Deterministic testing, failure reproduction, and observed-output consistency monitoring for modern conversational voice agents.
              </p>
            </div>

            {/* Quick CTA Actions with Frosted Glass styling */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/live"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#2CC3E9] text-zinc-950 text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_25px_-2px_rgba(0,240,255,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_0_rgba(0,240,255,0.85)] hover:scale-[1.02]"
              >
                <AudioLines className="w-4 h-4" />
                Open Live Studio
              </Link>
              <button
                onClick={runAcceptanceTest}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold flex items-center gap-2 border border-white/20 backdrop-blur-xl transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] hover:scale-[1.02]"
              >
                <Play className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                Run Acceptance Test
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white backdrop-blur-xl transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                title="Refresh Telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {lastActionMessage && (
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-sm text-cyan-200 flex items-center justify-between shadow-[0_0_20px_-4px_rgba(44,195,233,0.2)]">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-[#2CC3E9] shrink-0" />
            <span className="font-medium">{lastActionMessage}</span>
          </div>
          <button
            onClick={() => setLastActionMessage(null)}
            className="text-cyan-400 hover:text-white font-mono text-base ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Rime Neural Voice Audition Studio */}
      <RimeVoiceStudio />

      {/* Interactive Latency & Race Simulator */}
      <InteractiveLatencySimulator />

      {/* Interactive Interruption & Race Condition Demonstration */}
      <CanonicalWalkthrough />

      {/* Interactive 6-Stage Pipeline Architecture */}
      <InteractivePipelineMap />

      {/* KPI Metrics Cards - Large & Tabular Numbers with Rime Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl rime-glass rime-glass-hover">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
            <span>P95 Time to First Audio</span>
            <Clock className="w-4 h-4 text-[#2CC3E9]" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tabular text-white tracking-tight">
            {summary?.p95Ttfa !== null && summary?.p95Ttfa !== undefined ? (
              `${summary.p95Ttfa}ms`
            ) : (
              <span className="text-sm font-normal text-zinc-500">Insufficient data</span>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-2 font-sfmono">
            RESPONSE_STARTED &rarr; AUDIO_READY
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl rime-glass rime-glass-hover">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
            <span>Interruption Recovery Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tabular text-white tracking-tight">
            {summary?.interruptionRecoveryRate !== null &&
            summary?.interruptionRecoveryRate !== undefined ? (
              `${(summary.interruptionRecoveryRate * 100).toFixed(1)}%`
            ) : (
              <span className="text-sm font-normal text-zinc-500">Insufficient data</span>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-2 font-sfmono">
            Target: &lt;150ms cancel + state v-sync
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl rime-glass rime-glass-hover">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
            <span>Stale Output Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tabular text-white tracking-tight">
            {summary?.staleOutputRate !== null && summary?.staleOutputRate !== undefined ? (
              `${(summary.staleOutputRate * 100).toFixed(1)}%`
            ) : (
              <span className="text-sm font-normal text-zinc-500">Insufficient data</span>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-2 font-sfmono">
            Turns with stale tool / audio race
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl rime-glass rime-glass-hover">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
            <span>Total Tracked Sessions</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tabular text-white tracking-tight">
            {summary?.totalObservations ?? 0}
          </div>
          <div className="text-xs text-zinc-400 mt-2 font-sfmono">
            Relational PostgreSQL events
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Active Sessions & Recent Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Sessions */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#2CC3E9]" />
              Recent Voice Sessions
            </h2>
            <Link
              href="/sessions"
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 rime-glass rounded-xl">
                No sessions found. Run acceptance test or launch a live session.
              </div>
            ) : (
              sessions.map((ses) => (
                <Link
                  key={ses.id}
                  href={`/sessions/${ses.id}`}
                  className="block p-4 rounded-xl rime-glass rime-glass-hover"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-white font-sfmono">
                        {ses.id}
                      </span>
                      {ses.is_synthetic && (
                        <span className="text-xs uppercase px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-sfmono">
                          synthetic
                        </span>
                      )}
                      <span
                        className={`text-xs uppercase px-2 py-0.5 rounded border font-sfmono ${
                          ses.status === "COMPLETED"
                            ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300 font-semibold"
                            : ses.status === "FAILED"
                            ? "border-red-500/30 bg-red-950/40 text-red-300 font-bold"
                            : "border-zinc-800 bg-zinc-950 text-zinc-400"
                        }`}
                      >
                        {ses.status}
                      </span>
                    </div>
                    <span className="text-xs tabular text-zinc-400 font-sfmono">
                      {new Date(ses.started_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 font-sfmono">
                      <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                      version: <span className="text-zinc-200 font-semibold">{ses.agent_version_id}</span>
                    </span>
                    <div className="flex items-center gap-3 tabular font-sfmono">
                      <span>{ses.event_count || 0} events</span>
                      <span>{ses.audio_count || 0} audio</span>
                      {parseInt(ses.failure_count || "0", 10) > 0 && (
                        <span className="text-red-400 font-bold underline decoration-red-500/50">
                          {ses.failure_count} failures
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Failures Feed */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Detected Failures
            </h2>
            <span className="text-xs tabular text-zinc-400 font-sfmono">
              {failures.length} recorded
            </span>
          </div>

          <div className="space-y-2.5">
            {failures.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 rime-glass rounded-xl">
                Zero detected failures. System operating within invariants.
              </div>
            ) : (
              failures.slice(0, 5).map((fail) => (
                <div
                  key={fail.id}
                  className="p-4 rounded-xl rime-glass border-l-2 border-l-amber-400 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-100">
                      {fail.category}
                    </span>
                    <span className="text-xs uppercase px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-200 font-sfmono">
                      {fail.severity}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2">
                    {fail.summary}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-sfmono">
                    <span className="text-zinc-500 tabular">
                      turn: {fail.turn_id?.slice(-6) || "n/a"}
                    </span>
                    <Link
                      href={`/sessions/${fail.session_id}`}
                      className="text-cyan-300 hover:text-white flex items-center gap-1 font-medium"
                    >
                      Inspect Replay <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
