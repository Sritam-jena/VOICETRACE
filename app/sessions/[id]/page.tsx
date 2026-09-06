"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  Radio,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Search,
  Volume2,
  ArrowLeft,
  Shield,
} from "lucide-react";

export default function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sessionId = params.id;
  const [activeTab, setActiveTab] = useState<
    "timeline" | "audio" | "failures" | "metadata"
  >("timeline");

  const [session, setSession] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [audioArtifacts, setAudioArtifacts] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Timeline UI State
  const [searchFilter, setSearchFilter] = useState("");
  const [typeCategoryFilter, setTypeCategoryFilter] = useState("ALL");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  // Audio Playback State
  const [activePlayingAudioId, setActivePlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Replay Animation State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEventIndex, setReplayEventIndex] = useState<number>(-1);
  const replayTimerRef = useRef<any>(null);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const [sRes, eRes, aRes, fRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`).then((r) => r.json()),
        fetch(`/api/sessions/${sessionId}/events`).then((r) => r.json()),
        fetch(`/api/sessions/${sessionId}/audio`).then((r) => r.json()),
        fetch(`/api/sessions/${sessionId}/failures`).then((r) => r.json()),
      ]);

      setSession(sRes);
      setEvents(Array.isArray(eRes) ? eRes : []);
      setAudioArtifacts(Array.isArray(aRes) ? aRes : []);
      setFailures(Array.isArray(fRes) ? fRes : []);
    } catch (err) {
      console.error("Failed to load session details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();

    // Realtime SSE stream
    const sse = new EventSource(`/api/realtime?sessionId=${sessionId}`);
    sse.addEventListener("voice_event", (e) => {
      try {
        const newEvent = JSON.parse(e.data);
        setEvents((prev) => {
          if (prev.some((item) => item.id === newEvent.id)) return prev;
          return [...prev, newEvent].sort((a, b) => a.sequence - b.sequence);
        });

        if (newEvent.type === "FAILURE_DETECTED") {
          fetch(`/api/sessions/${sessionId}/failures`)
            .then((r) => r.json())
            .then((f) => setFailures(Array.isArray(f) ? f : []));
        }

        if (newEvent.type === "TTS_AUDIO_AVAILABLE") {
          fetch(`/api/sessions/${sessionId}/audio`)
            .then((r) => r.json())
            .then((a) => setAudioArtifacts(Array.isArray(a) ? a : []));
        }
      } catch (err) {
        console.error("SSE error:", err);
      }
    });

    return () => {
      sse.close();
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [sessionId]);

  const toggleEventExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Audio Playback Handler
  const handlePlayAudio = (artifact: any) => {
    if (activePlayingAudioId === artifact.id) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
          setActivePlayingAudioId(null);
        }
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(artifact.storage_url);
    audioRef.current = audio;
    setActivePlayingAudioId(artifact.id);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setActivePlayingAudioId(null);
      setAudioProgress(0);
    };

    audio.play().catch((err) => {
      console.warn("Audio playback interrupted:", err);
      setActivePlayingAudioId(null);
    });
  };

  // Replay Step Animation
  const startAnalysisReplay = () => {
    if (events.length === 0) return;
    setIsReplaying(true);
    setReplayEventIndex(0);
    setActiveTab("timeline");

    let curr = 0;
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);

    replayTimerRef.current = setInterval(() => {
      curr++;
      if (curr >= events.length) {
        clearInterval(replayTimerRef.current);
        setIsReplaying(false);
      } else {
        setReplayEventIndex(curr);
      }
    }, 400);
  };

  const firstTimestamp = events.length > 0 ? new Date(events[0].timestamp).getTime() : 0;
  const formatOffset = (timestamp: string) => {
    if (!firstTimestamp) return "00:00.000";
    const deltaMs = Math.max(0, new Date(timestamp).getTime() - firstTimestamp);
    const mins = Math.floor(deltaMs / 60000).toString().padStart(2, "0");
    const secs = Math.floor((deltaMs % 60000) / 1000).toString().padStart(2, "0");
    const ms = (deltaMs % 1000).toString().padStart(3, "0");
    return `${mins}:${secs}.${ms}`;
  };

  // Minimalist Monochromatic Event Badges
  const getEventBadgeClass = (type: string) => {
    if (type.includes("FAILURE") || type.includes("STALE")) {
      return "border-zinc-500 bg-zinc-800 text-white font-semibold underline decoration-zinc-500";
    }
    if (type.includes("INTERRUPT") || type.includes("CANCEL")) {
      return "border-zinc-600 bg-zinc-900 text-zinc-200 font-semibold";
    }
    if (type.includes("TTS") || type.includes("PLAYBACK")) {
      return "border-zinc-700 bg-zinc-900/90 text-zinc-300";
    }
    if (type.includes("STATE")) {
      return "border-zinc-700 bg-zinc-950 text-zinc-200";
    }
    return "border-zinc-800 bg-zinc-950 text-zinc-400";
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.type.toLowerCase().includes(searchFilter.toLowerCase()) ||
      JSON.stringify(e.payload_json || {}).toLowerCase().includes(searchFilter.toLowerCase());

    let matchesCategory = true;
    if (typeCategoryFilter === "SPEECH") {
      matchesCategory = e.type.includes("USER") || e.type.includes("STT");
    } else if (typeCategoryFilter === "TTS") {
      matchesCategory = e.type.includes("TTS");
    } else if (typeCategoryFilter === "PLAYBACK") {
      matchesCategory = e.type.includes("PLAYBACK");
    } else if (typeCategoryFilter === "TOOLS") {
      matchesCategory = e.type.includes("TOOL");
    } else if (typeCategoryFilter === "INTERRUPT") {
      matchesCategory = e.type.includes("INTERRUPT") || e.type.includes("CANCEL");
    } else if (typeCategoryFilter === "FAILURES") {
      matchesCategory = e.type.includes("FAILURE") || e.type.includes("STALE");
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222227] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
            <Link href="/sessions" className="hover:text-white flex items-center gap-1 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Sessions
            </Link>
            <span>/</span>
            <span className="text-zinc-200 font-sfmono font-semibold">{sessionId}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Session Replay &amp; Trace
            </h1>
            {session?.is_synthetic && (
              <span className="text-xs uppercase px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-sfmono">
                synthetic
              </span>
            )}
            <span
              className={`text-xs uppercase px-2 py-0.5 rounded border font-sfmono ${
                session?.status === "COMPLETED"
                  ? "border-zinc-700 bg-zinc-900 text-zinc-200"
                  : session?.status === "FAILED"
                  ? "border-zinc-600 bg-zinc-800 text-zinc-200 font-bold"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              {session?.status || "ACTIVE"}
            </span>
          </div>
        </div>

        <button
          onClick={startAnalysisReplay}
          disabled={isReplaying}
          className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          <Play className={`w-4 h-4 ${isReplaying ? "animate-spin" : ""}`} />
          {isReplaying ? "Replaying Trace..." : "Replay Trace"}
        </button>
      </div>

      {/* Telemetry Strip - Clean & Legible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg mono-card text-xs">
        <div className="space-y-1">
          <span className="text-zinc-400 block text-xs font-semibold uppercase tracking-wider">Speech Engine</span>
          <span className="text-white font-medium text-sm flex items-center gap-1.5 font-sfmono">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            Rime (coda / amber)
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-zinc-400 block text-xs font-semibold uppercase tracking-wider">Agent Version</span>
          <span className="text-white font-medium text-sm font-sfmono">{session?.agent_version_id || "v2-guarded"}</span>
        </div>
        <div className="space-y-1">
          <span className="text-zinc-400 block text-xs font-semibold uppercase tracking-wider">Audio Artifacts</span>
          <span className="text-white font-medium text-sm font-sfmono tabular">{audioArtifacts.length} generated</span>
        </div>
        <div className="space-y-1">
          <span className="text-zinc-400 block text-xs font-semibold uppercase tracking-wider">Detected Failures</span>
          <span className={`text-sm font-bold font-sfmono tabular ${failures.length > 0 ? "text-white underline decoration-zinc-400" : "text-zinc-300"}`}>
            {failures.length} recorded
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#222227] text-sm font-medium overflow-x-auto">
        {[
          { id: "timeline", label: "Timeline", count: events.length },
          { id: "audio", label: "What User Heard", count: audioArtifacts.length },
          { id: "failures", label: "Failure Inspector", count: failures.length },
          { id: "metadata", label: "Raw Metadata" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-zinc-200 text-white font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-xs tabular px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-sfmono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: SYNCHRONIZED TIMELINE */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search event type or payload..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-[#27272a] rounded-md pl-9 pr-3 py-2 text-xs sm:text-sm text-zinc-200 font-sfmono focus:outline-none focus:border-zinc-400"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-950 border border-[#27272a] p-1 rounded-md text-xs font-medium overflow-x-auto">
              {[
                { id: "ALL", label: "All" },
                { id: "SPEECH", label: "Speech" },
                { id: "TTS", label: "TTS" },
                { id: "PLAYBACK", label: "Playback" },
                { id: "TOOLS", label: "Tools" },
                { id: "INTERRUPT", label: "Interrupt" },
                { id: "FAILURES", label: "Failures" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTypeCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded text-xs font-sfmono whitespace-nowrap ${
                    typeCategoryFilter === cat.id
                      ? "bg-zinc-800 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Event List */}
          <div className="space-y-2 relative border-l border-[#222227] ml-4 pl-4">
            {filteredEvents.map((evt, idx) => {
              const isExpanded = expandedEvents[evt.id];
              const isCursorActive = isReplaying && replayEventIndex === idx;

              return (
                <div
                  key={evt.id}
                  className={`rounded-md mono-card transition-all ${
                    isCursorActive
                      ? "border-zinc-300 bg-zinc-900 shadow-md"
                      : "mono-card-hover"
                  }`}
                >
                  <div
                    onClick={() => toggleEventExpand(evt.id)}
                    className="p-3 flex items-center justify-between cursor-pointer select-none text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-zinc-400 hover:text-white">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Monospace Millisecond Timestamp */}
                      <span className="tabular text-zinc-300 w-24 shrink-0 text-xs font-sfmono font-semibold">
                        {formatOffset(evt.timestamp)}
                      </span>

                      {/* Event Type Badge */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md border font-sfmono font-semibold ${getEventBadgeClass(
                          evt.type
                        )}`}
                      >
                        {evt.type}
                      </span>

                      {/* State Version Badge */}
                      <span className="text-xs tabular px-2 py-0.5 rounded border border-zinc-700 bg-zinc-950 text-zinc-200 font-sfmono">
                        v{evt.state_version}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-400 tabular font-sfmono">
                      <span>#{evt.sequence}</span>
                      <span className="uppercase text-xs text-zinc-500 font-semibold">{evt.source}</span>
                    </div>
                  </div>

                  {/* Expanded Payload Envelope */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#222227] space-y-3 text-xs sm:text-sm">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-300 bg-zinc-950 p-3 rounded-md border border-[#222227] font-sfmono">
                        <div>
                          <span className="text-zinc-500 block uppercase text-xs">EVENT ID</span>
                          <span className="text-zinc-200 font-medium">{evt.id}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase text-xs">TIMESTAMP</span>
                          <span className="text-zinc-200 tabular">{evt.timestamp}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase text-xs">STATE VERSION</span>
                          <span className="text-white font-bold tabular">v{evt.state_version}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase text-xs">STATUS</span>
                          <span className="text-zinc-200 font-medium">{evt.status}</span>
                        </div>
                      </div>

                      <pre className="p-3 rounded-md bg-zinc-950 border border-[#222227] text-xs text-zinc-200 font-sfmono overflow-x-auto">
                        {JSON.stringify(evt.payload_json, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: WHAT THE USER ACTUALLY HEARD */}
      {activeTab === "audio" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg mono-card text-sm space-y-1">
            <h3 className="font-bold text-white flex items-center gap-2 text-base">
              <Volume2 className="w-4 h-4 text-zinc-300" />
              Observed Audio Playback Lifecycle
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Correlating speech synthesis generation, delivery, queuing, and cancellation intervals.
            </p>
          </div>

          <div className="space-y-3">
            {audioArtifacts.map((art) => {
              const isPlaying = activePlayingAudioId === art.id;
              const wasCancelled = Boolean(art.cancelled_at);

              return (
                <div key={art.id} className="p-5 rounded-lg mono-card space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-white font-sfmono">{art.id}</span>
                      <span className="text-xs tabular px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-200 font-sfmono">
                        state v{art.state_version}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border border-zinc-700 bg-zinc-950 text-zinc-300 font-sfmono">
                        {art.provider}: {art.model} ({art.voice})
                      </span>
                      {wasCancelled && (
                        <span className="text-xs uppercase px-2 py-0.5 rounded border border-zinc-600 bg-zinc-800 text-zinc-100 font-sfmono font-bold">
                          Partially Heard / Cancelled
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handlePlayAudio(art)}
                      className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Play Audio
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lifecycle Flow */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs tabular font-sfmono">
                    <div className="p-3 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">1. Generated</span>
                      <span className="text-zinc-200 font-medium">{new Date(art.generated_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="p-3 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">2. Available</span>
                      <span className="text-zinc-200 font-medium">{new Date(art.available_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="p-3 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">3. Playback Start</span>
                      <span className="text-zinc-200 font-medium">
                        {art.playback_started_at
                          ? new Date(art.playback_started_at).toLocaleTimeString()
                          : "Queued"}
                      </span>
                    </div>
                    <div className="p-3 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">4. Outcome</span>
                      <span className={`font-bold ${wasCancelled ? "text-white" : "text-zinc-300"}`}>
                        {wasCancelled ? "Cancelled (<35ms)" : "Completed"}
                      </span>
                    </div>
                    <div className="p-3 rounded-md bg-zinc-950 border border-[#222227] space-y-1">
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">5. Duration</span>
                      <span className="text-zinc-200 font-medium">{art.duration_ms}ms</span>
                    </div>
                  </div>

                  {/* Scrubber */}
                  {isPlaying && (
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full bg-zinc-800 h-1.5 rounded overflow-hidden">
                        <div
                          className="bg-zinc-200 h-full transition-all duration-100"
                          style={{ width: `${audioProgress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400 tabular font-sfmono">
                        <span>Audio Stream</span>
                        <span>{Math.round(audioProgress)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FAILURE INSPECTOR */}
      {activeTab === "failures" && (
        <div className="space-y-4">
          {failures.length === 0 ? (
            <div className="p-10 text-center mono-card rounded-lg space-y-2">
              <CheckCircle2 className="w-8 h-8 text-zinc-300 mx-auto" />
              <h3 className="text-base font-bold text-white">No Failures Detected</h3>
              <p className="text-sm text-zinc-400">
                All voice events adhered to observed-output consistency invariants.
              </p>
            </div>
          ) : (
            failures.map((fail) => (
              <div key={fail.id} className="p-5 rounded-lg mono-card border-l-2 border-l-zinc-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-white">{fail.category}</span>
                      <span className="text-xs uppercase px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-200 font-sfmono font-semibold">
                        {fail.severity}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{fail.summary}</p>
                  </div>

                  <span className="text-xs text-zinc-400 tabular font-sfmono">
                    {new Date(fail.detected_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="p-4 rounded-md bg-zinc-950 border border-[#222227] space-y-1.5">
                  <span className="text-xs text-zinc-400 uppercase block font-semibold">Root Cause Chain</span>
                  <pre className="text-xs text-zinc-300 font-sfmono overflow-x-auto">
                    {JSON.stringify(fail.root_cause_json, null, 2)}
                  </pre>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm tabular font-sfmono">
                    <thead>
                      <tr className="border-b border-[#222227] text-zinc-400 text-xs uppercase font-semibold">
                        <th className="py-2 px-3">Dimension</th>
                        <th className="py-2 px-3 text-zinc-300">Expected Invariant</th>
                        <th className="py-2 px-3 text-white">Actual Observed Behavior</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222227]">
                      <tr>
                        <td className="py-2 px-3 text-zinc-400">State / Action</td>
                        <td className="py-2 px-3 text-zinc-300">{JSON.stringify(fail.expected_json)}</td>
                        <td className="py-2 px-3 text-white font-semibold">{JSON.stringify(fail.actual_json)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: METADATA */}
      {activeTab === "metadata" && (
        <div className="p-5 rounded-lg mono-card text-xs sm:text-sm">
          <pre className="p-4 rounded-md bg-zinc-950 border border-[#222227] text-zinc-200 font-sfmono overflow-x-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
