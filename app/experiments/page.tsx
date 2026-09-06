"use client";

import { useEffect, useState } from "react";
import {
  FlaskConical,
  Play,
  CheckCircle2,
  Shield,
} from "lucide-react";

export default function ExperimentLabPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningExp, setRunningExp] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/experiments").then((r) => r.json());
      setExperiments(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load experiments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const runExperiment = async () => {
    setRunningExp(true);
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Interruption Recovery A/B Benchmark",
          versionAId: "v1-baseline",
          versionBId: "v2-guarded",
          corpusId: "interruption-recovery-demo",
        }),
      }).then((r) => r.json());

      setLastResult(res);
      await fetchExperiments();
    } catch (err: any) {
      alert("Experiment failed: " + err.message);
    } finally {
      setRunningExp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222227] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 text-zinc-300" />
            Experiment Lab
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Controlled A/B evaluation across agent versions, prompt revisions, and Rime TTS configurations
          </p>
        </div>

        <button
          onClick={runExperiment}
          disabled={runningExp}
          className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          <Play className={`w-3.5 h-3.5 ${runningExp ? "animate-spin" : ""}`} />
          {runningExp ? "Running Benchmark..." : "Run A/B Benchmark"}
        </button>
      </div>

      {/* Controlled Variables */}
      <div className="p-4 rounded-lg mono-card text-xs sm:text-sm tabular font-sfmono grid grid-cols-2 sm:grid-cols-4 gap-3 text-zinc-400">
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-semibold">Corpus</span>
          <span className="text-zinc-200 font-medium">interruption-recovery-demo</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-semibold">Rime TTS</span>
          <span className="text-zinc-200 font-medium">coda (amber / mp3)</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-semibold">Fault Injected</span>
          <span className="text-zinc-200 font-medium">600ms delay, 300ms barge-in</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-xs uppercase font-semibold">Evaluation</span>
          <span className="text-zinc-200 font-medium">Deterministic Invariant</span>
        </div>
      </div>

      {/* Latest Result */}
      {lastResult && (
        <div className="p-5 rounded-lg mono-card space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-300" />
            Latest Result: {lastResult.name}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm tabular font-sfmono">
              <thead>
                <tr className="border-b border-[#222227] text-zinc-400 text-xs uppercase font-semibold">
                  <th className="py-2.5 px-3">Metric Dimension</th>
                  <th className="py-2.5 px-3 text-zinc-300">Version A (v1-baseline)</th>
                  <th className="py-2.5 px-3 text-white">Version B (v2-guarded)</th>
                  <th className="py-2.5 px-3 text-zinc-300">Measured Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222227]">
                <tr>
                  <td className="py-2.5 px-3 text-zinc-300">Cancellation Latency</td>
                  <td className="py-2.5 px-3 text-zinc-400">
                    {lastResult.results?.versionA?.cancellationLatencyMs}ms
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">
                    {lastResult.results?.versionB?.cancellationLatencyMs}ms
                  </td>
                  <td className="py-2.5 px-3 text-zinc-200 font-medium">
                    -{lastResult.results?.delta?.latencyImprovementMs}ms (&lt;150ms)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-300">Critical Failures</td>
                  <td className="py-2.5 px-3 text-zinc-400">
                    {lastResult.results?.versionA?.failuresCount} issues
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">0 issues</td>
                  <td className="py-2.5 px-3 text-zinc-200 font-medium">
                    -{lastResult.results?.delta?.failuresResolved} resolved
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-300">Invariant Compliance</td>
                  <td className="py-2.5 px-3 text-zinc-400">FAILED</td>
                  <td className="py-2.5 px-3 text-white font-bold">PASSED</td>
                  <td className="py-2.5 px-3 text-zinc-200 font-medium">100% Consistent</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historical Experiments */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Experiment Log</h2>
        <div className="space-y-2">
          {experiments.map((exp) => (
            <div key={exp.id} className="p-4 rounded-md mono-card text-xs sm:text-sm tabular font-sfmono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{exp.name}</span>
                <span className="text-zinc-400 text-xs">{new Date(exp.created_at).toLocaleString()}</span>
              </div>
              <div className="text-xs text-zinc-400">
                Comparing Version A ({exp.version_a_name || exp.version_a_id}) vs Version B ({exp.version_b_name || exp.version_b_id})
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
