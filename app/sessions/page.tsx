"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Plus,
  Search,
  Cpu,
  Clock,
  ArrowRight,
  Shield,
} from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showNewModal, setShowNewModal] = useState(false);

  // New Voice Turn Form State
  const [userInput, setUserInput] = useState("Check table availability for 4 guests on Friday at 8 PM.");
  const [agentResponse, setAgentResponse] = useState(
    "Checking availability for 4 guests on Friday at 8 PM. One moment please..."
  );
  const [enableTool, setEnableTool] = useState(true);
  const [toolDelayMs, setToolDelayMs] = useState(600);
  const [enableInterrupt, setEnableInterrupt] = useState(true);
  const [interruptAfterMs, setInterruptAfterMs] = useState(300);
  const [newRequirement, setNewRequirement] = useState("Wait, change that to 2 guests instead!");
  const [newAgentResponse, setNewAgentResponse] = useState(
    "Understood, switching party to 2 guests. Reservation confirmed for 2 at Bella Italia on Friday at 8 PM."
  );
  const [useGuards, setUseGuards] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions?limit=100").then((r) => r.json());
      setSessions(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        userInput,
        agentResponseText: agentResponse,
        useGuards,
        agentVersionId: useGuards ? "v2-guarded" : "v1-baseline",
      };

      if (enableTool) {
        payload.toolCall = {
          name: "check_restaurant_availability",
          args: { guests: 4, date: "Friday", time: "20:00" },
          simulatedResult: { available: true, tableId: "T-44" },
          delayMs: toolDelayMs,
        };
      }

      if (enableInterrupt) {
        payload.simulateInterruption = {
          interruptAfterMs,
          newUserRequirement: newRequirement,
          newAgentResponseText: newAgentResponse,
        };
      }

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res.sessionId) {
        window.location.href = `/sessions/${res.sessionId}`;
      }
    } catch (err: any) {
      alert("Failed to start session: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.agent_version_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222227] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Voice Sessions
            </h1>
            <span className="text-xs px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 tabular font-sfmono">
              {sessions.length} recorded
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Synchronized execution traces, audio playback artifacts, and failure inspections
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Launch New Turn
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by session ID or version..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-[#27272a] rounded-md pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 font-sfmono focus:outline-none focus:border-zinc-400"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-950 border border-[#27272a] p-1 rounded-md text-xs font-medium">
          {["ALL", "ACTIVE", "COMPLETED", "FAILED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded text-xs font-sfmono ${
                statusFilter === status
                  ? "bg-zinc-800 text-white font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-10 text-center text-sm text-zinc-500 mono-card rounded-md">
            Loading voice sessions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500 mono-card rounded-md">
            No voice sessions matched search criteria.
          </div>
        ) : (
          filtered.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="block p-4 rounded-md mono-card mono-card-hover"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-white font-sfmono">
                      {s.id}
                    </span>
                    {s.is_synthetic && (
                      <span className="text-xs uppercase px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-sfmono">
                        synthetic
                      </span>
                    )}
                    <span
                      className={`text-xs uppercase px-2 py-0.5 rounded border font-sfmono ${
                        s.status === "COMPLETED"
                          ? "border-zinc-700 bg-zinc-900 text-zinc-200"
                          : s.status === "FAILED"
                          ? "border-zinc-600 bg-zinc-800 text-zinc-200 font-bold"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 font-sfmono">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                      {s.agent_version_id}
                    </span>
                    <span className="flex items-center gap-1.5 tabular">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {new Date(s.started_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-zinc-300 tabular font-sfmono">
                  <div className="text-right">
                    <div className="text-white font-bold">{s.event_count || 0}</div>
                    <div className="text-xs text-zinc-500 uppercase">events</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">{s.audio_count || 0}</div>
                    <div className="text-xs text-zinc-500 uppercase">audio</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-bold ${
                        parseInt(s.failure_count || "0", 10) > 0
                          ? "text-white underline decoration-zinc-400"
                          : "text-zinc-300"
                      }`}
                    >
                      {s.failure_count || 0}
                    </div>
                    <div className="text-xs text-zinc-500 uppercase">failures</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Minimalist New Turn Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f0f12] border border-[#27272a] rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222227] pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Launch Interactive Voice Turn
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Execute turn with Rime TTS, background tools, and optional barge-in
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-mono"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  User Input (STT Transcript):
                </label>
                <input
                  type="text"
                  required
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-[#27272a] rounded-md p-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Agent Response (Rime TTS):
                </label>
                <textarea
                  rows={2}
                  required
                  value={agentResponse}
                  onChange={(e) => setAgentResponse(e.target.value)}
                  className="w-full bg-zinc-950 border border-[#27272a] rounded-md p-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                />
              </div>

              {/* Tool Execution */}
              <div className="p-4 rounded-md border border-[#222227] bg-zinc-950/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200 font-semibold text-sm">Asynchronous Tool Call</span>
                  <input
                    type="checkbox"
                    checked={enableTool}
                    onChange={(e) => setEnableTool(e.target.checked)}
                    className="w-4 h-4 accent-zinc-200"
                  />
                </div>
                {enableTool && (
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-sfmono">
                    <span className="tabular">Delay: {toolDelayMs}ms</span>
                    <input
                      type="range"
                      min={100}
                      max={2000}
                      step={100}
                      value={toolDelayMs}
                      onChange={(e) => setToolDelayMs(Number(e.target.value))}
                      className="w-36 accent-zinc-200"
                    />
                  </div>
                )}
              </div>

              {/* Interruption */}
              <div className="p-4 rounded-md border border-[#222227] bg-zinc-950/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200 font-semibold text-sm">Simulate Interruption (Barge-In)</span>
                  <input
                    type="checkbox"
                    checked={enableInterrupt}
                    onChange={(e) => setEnableInterrupt(e.target.checked)}
                    className="w-4 h-4 accent-zinc-200"
                  />
                </div>
                {enableInterrupt && (
                  <div className="space-y-2.5 pt-2 border-t border-[#222227]">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-sfmono">
                      <span className="tabular">Interrupt After: {interruptAfterMs}ms</span>
                      <input
                        type="range"
                        min={100}
                        max={1000}
                        step={50}
                        value={interruptAfterMs}
                        onChange={(e) => setInterruptAfterMs(Number(e.target.value))}
                        className="w-36 accent-zinc-200"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Updated requirement text"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      className="w-full bg-zinc-950 border border-[#27272a] rounded-md p-2.5 text-zinc-200 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="New agent response"
                      value={newAgentResponse}
                      onChange={(e) => setNewAgentResponse(e.target.value)}
                      className="w-full bg-zinc-950 border border-[#27272a] rounded-md p-2.5 text-zinc-200 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Guard Settings */}
              <div className="p-4 rounded-md border border-[#222227] bg-zinc-950/80 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-100 text-sm block">State Version Guard</span>
                  <span className="text-xs text-zinc-400">
                    {useGuards ? "Guarded (v2): drops stale tools & cancels audio in <35ms" : "Unguarded (v1): stale tool & audio leakage"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={useGuards}
                  onChange={(e) => setUseGuards(e.target.checked)}
                  className="w-4 h-4 accent-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222227]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-md border border-[#27272a] text-zinc-300 hover:text-white text-xs sm:text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold transition-all shadow-sm"
                >
                  {isSubmitting ? "Starting..." : "Start & Trace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
