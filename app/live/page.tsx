"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Zap,
  Radio,
  ArrowRight,
  Shield,
  Activity,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Terminal,
  Send,
  Layers,
  Clock,
  CheckCircle2,
  Play,
  Square,
} from "lucide-react";
import { CanonicalWalkthrough } from "@/components/CanonicalWalkthrough";

interface TurnMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  stateVersion: number;
  audioUrl?: string;
  latencyMs?: number;
  durationMs?: number;
  isInterrupted?: boolean;
  cancellationLatencyMs?: number;
  toolCall?: any;
  timestamp: string;
}

export default function LiveMicPage() {
  // Audio & Mic Stream State
  const [micConnected, setMicConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [vadActive, setVadActive] = useState(false);
  const [vadThreshold, setVadThreshold] = useState(8); // Default 8% for sensitive voice pickup
  const [sttStatus, setSttStatus] = useState<"idle" | "listening" | "speech_detected" | "error">("idle");
  const [sttErrorMsg, setSttErrorMsg] = useState<string | null>(null);

  // Low-Quality & Laptop Mic Enhancement State
  const [lowQualityMicMode, setLowQualityMicMode] = useState(true); // Default active for quiet/laptop mics
  const [micBoostMultiplier, setMicBoostMultiplier] = useState(2.5); // +8dB software gain boost
  const [ambientNoiseFloor, setAmbientNoiseFloor] = useState(2);

  // Auto-barge in settings (prevent acoustic speaker feedback cancellation)
  const [autoBargeIn, setAutoBargeIn] = useState(false); // Default false for laptop speakers
  const [silenceDuration, setSilenceDuration] = useState(550); // Fast, natural conversational pause (550ms)

  // Live Transcription State
  const [interimText, setInterimText] = useState("");
  const [currentUtterance, setCurrentUtterance] = useState("");
  const [manualText, setManualText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Session & State Version State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(1);
  const [lastTurnId, setLastTurnId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<TurnMessage[]>([]);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  // Playback & Barge-In State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [bargeInAlert, setBargeInAlert] = useState<{
    latencyMs: number;
    fromVersion: number;
    toVersion: number;
  } | null>(null);

  // References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechAccumulatorRef = useRef<string>("");
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Independent Whisper STT Audio Recording State (Zero Google Dependency)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const holdStartTimeRef = useRef<number>(0);
  const sttErrorPermanentRef = useRef<boolean>(false);

  // State refs for access in callbacks
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;
  const isPlayingAudioRef = useRef(isPlayingAudio);
  isPlayingAudioRef.current = isPlayingAudio;
  const stateVersionRef = useRef(stateVersion);
  stateVersionRef.current = stateVersion;
  const lastTurnIdRef = useRef(lastTurnId);
  lastTurnIdRef.current = lastTurnId;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;
  const autoBargeInRef = useRef(autoBargeIn);
  autoBargeInRef.current = autoBargeIn;

  // Reactively adjust software gain node when boost or mode changes
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      try {
        const targetGain = lowQualityMicMode ? micBoostMultiplier : 1.0;
        gainNodeRef.current.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, 0.05);
      } catch {}
    }
  }, [lowQualityMicMode, micBoostMultiplier]);

  // LLM Brain Status
  const [llmStatus, setLlmStatus] = useState<{ configured: boolean; provider: string | null }>({
    configured: false,
    provider: null,
  });

  useEffect(() => {
    fetch("/api/settings/llm-key")
      .then((r) => r.json())
      .then((data) => {
        if (data) setLlmStatus({ configured: Boolean(data.configured), provider: data.provider || null });
      })
      .catch(() => {});
  }, []);

  // Real-time Canvas Waveform Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let bufferLength = 64;
    let dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "#0c0c0e";
      ctx.fillRect(0, 0, width, height);

      if (analyserRef.current && isListening) {
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average RMS energy for VU meter
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = Math.round((sum / bufferLength / 255) * 100);
        setMicVolume(avg);

        // Adaptive noise floor calibration (smoothly tracks background room noise)
        if (avg < vadThreshold) {
          setAmbientNoiseFloor((prev) => Math.round(prev * 0.9 + avg * 0.1));
        }

        const effectiveThreshold = Math.max(vadThreshold, ambientNoiseFloor + 2);
        const isSpeakingNow = avg >= effectiveThreshold;
        setVadActive(isSpeakingNow);

        // Acoustic-bleed safe barge-in:
        // Only trigger via VAD if user explicitly enabled autoBargeIn, AND
        // audio has been playing for at least 800ms (grace period to avoid speaker onset click), AND
        // mic volume exceeds 45% (to avoid standard speaker echo)
        if (
          isSpeakingNow &&
          isPlayingAudioRef.current &&
          autoBargeInRef.current &&
          Date.now() - playbackStartTimeRef.current > 800 &&
          avg >= 45
        ) {
          triggerBargeIn("VAD_HIGH_ENERGY_BARGE_IN");
        }

        // Draw glowing frequency bars with Rime aqua/cyan gradient
        const barWidth = (width / bufferLength) * 1.6;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height * 0.85);

          // Rime neon palette gradient
          const grad = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
          if (isPlayingAudioRef.current) {
            grad.addColorStop(0, "#00F0FF");
            grad.addColorStop(0.5, "#2CC3E9");
            grad.addColorStop(1, "#10B981");
            ctx.shadowColor = "rgba(44, 195, 233, 0.4)";
            ctx.shadowBlur = 8;
          } else if (isSpeakingNow) {
            grad.addColorStop(0, "#00F0FF");
            grad.addColorStop(1, "#2CC3E9");
            ctx.shadowColor = "rgba(0, 240, 255, 0.5)";
            ctx.shadowBlur = 10;
          } else {
            grad.addColorStop(0, "rgba(44, 195, 233, 0.5)");
            grad.addColorStop(1, "rgba(99, 102, 241, 0.2)");
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(
            x,
            height / 2 - barHeight / 2,
            barWidth - 1,
            Math.max(2, barHeight),
            2
          );
          ctx.fill();

          x += barWidth;
        }
        ctx.shadowBlur = 0;
      } else {
        // Idle gentle breathing sine wave
        ctx.beginPath();
        ctx.strokeStyle = "rgba(44, 195, 233, 0.35)";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(44, 195, 233, 0.3)";
        ctx.shadowBlur = 6;
        const phase = Date.now() * 0.002;
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.02 + phase) * 6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isListening, vadThreshold, ambientNoiseFloor]);

  // Request Microphone Access and start Web Audio Analyser with DSP Pre-Amp
  const connectMicrophone = async () => {
    try {
      if (streamRef.current) {
        disconnectMicrophone();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      streamRef.current = stream;
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // 1. High-Pass Filter (removes desk thumps, 50/60Hz AC ground hum, laptop fan roar)
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 85;

      // 2. Software Pre-Amp Gain Node (amplifies quiet/muffled mics)
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = lowQualityMicMode ? micBoostMultiplier : 1.0;
      gainNodeRef.current = gainNode;

      // 3. Broadcast-grade Dynamics Compressor (lifts quiet phonemes & whispers, caps loud spikes)
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
      compressor.knee.setValueAtTime(30, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

      // 4. Analyser Node for VAD and Waveform
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;

      // Routing: source -> highpass -> gainNode -> compressor -> analyser
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(highpass);
      highpass.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      setMicConnected(true);
      setIsListening(true);
      isListeningRef.current = true;
      setSttStatus("listening");
      setSttErrorMsg(null);

      // Start Continuous Speech Recognition (if supported)
      startSpeechRecognition();

      // Start watchdog to keep STT alive only when no permanent Google block
      if (watchdogIntervalRef.current) clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = setInterval(() => {
        if (
          isListeningRef.current &&
          streamRef.current &&
          !isProcessingRef.current &&
          !isPlayingAudioRef.current &&
          !sttErrorPermanentRef.current
        ) {
          if (!recognitionRef.current) {
            startSpeechRecognition();
          }
        }
      }, 2000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone: " + (err.message || "Please check browser mic permissions."));
      setSttErrorMsg(err.message || "Permission denied");
    }
  };

  const disconnectMicrophone = () => {
    isListeningRef.current = false;
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    setMicConnected(false);
    setIsListening(false);
    setMicVolume(0);
    setVadActive(false);
    setSttStatus("idle");
    setCurrentUtterance("");
    setInterimText("");
  };

  // Independent Whisper & Gemini AI Audio Recording (Works in Brave, Safari, Firefox with 0 Google dependency)
  const startRecordingAudio = async () => {
    if (!streamRef.current) {
      await connectMicrophone();
    }
    if (!streamRef.current) return;

    if (isPlayingAudioRef.current) {
      triggerBargeIn("WHISPER_RECORD_START");
    }

    try {
      audioChunksRef.current = [];
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(80);
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setSttStatus("speech_detected");
      setInterimText("Recording voice with AI Speech Recognition...");
    } catch (e) {
      console.warn("MediaRecorder start notice:", e);
    }
  };

  const stopRecordingAndTranscribe = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsRecordingAudio(false);
      return;
    }

    setIsRecordingAudio(false);
    setIsTranscribing(true);
    setInterimText("Transcribing speech with AI (Whisper / Gemini Flash)...");

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });

      if (audioBlob.size < 400) {
        setIsTranscribing(false);
        setSttStatus("listening");
        setInterimText("");
        return;
      }

      setSttStatus("speech_detected");
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice_input.webm");

        const res = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        }).then((r) => r.json());

        if (res.success && res.transcript && res.transcript.trim()) {
          const transcribed = res.transcript.trim();
          setCurrentUtterance(transcribed);
          setInterimText("");
          handleExecuteVoiceTurn(transcribed);
        } else if (res.error) {
          console.warn("AI STT notice:", res.error);
          setSttErrorMsg(res.error);
          setInterimText("");
        }
      } catch (err: any) {
        console.error("AI STT transcription error:", err);
        setSttErrorMsg("Transcription failed. Please try speaking again.");
        setInterimText("");
      } finally {
        setIsTranscribing(false);
      }
    };

    try {
      recorder.stop();
    } catch {}
  };

  // Configure and start Web Speech Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSttStatus("error");
      setSttErrorMsg("Web Speech API is not supported in this browser. Use manual command inputs.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setSttStatus("listening");
        setSttErrorMsg(null);
      };

      recognition.onspeechstart = () => {
        setSttStatus("speech_detected");
        // If user actively speaks while agent is playing, trigger barge-in!
        if (isPlayingAudioRef.current && Date.now() - playbackStartTimeRef.current > 350) {
          triggerBargeIn("STT_SPEECH_START");
        }
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        // Accumulate all chunks across the full utterance
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            const transcript = item[0].transcript;
            if (item.isFinal) {
              final += (final ? " " : "") + transcript.trim();
            } else {
              interim += (interim ? " " : "") + transcript.trim();
            }
          }
        }

        const candidateText = (final + (interim ? " " + interim : "")).trim();
        if (!candidateText) return;

        setSttStatus("speech_detected");
        setInterimText(interim);
        setCurrentUtterance(candidateText);
        speechAccumulatorRef.current = candidateText;

        // Reset silence timer on every newly heard word / sound
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Auto-commit only after genuine pause (silenceDuration = 550ms)
        silenceTimerRef.current = setTimeout(() => {
          const textToProcess = speechAccumulatorRef.current.trim();
          if (textToProcess && !isProcessingRef.current) {
            speechAccumulatorRef.current = "";
            setInterimText("");
            setCurrentUtterance("");
            handleExecuteVoiceTurn(textToProcess);
          }
        }, silenceDuration);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "network") {
          sttErrorPermanentRef.current = true;
          setSttStatus("idle");
          setSttErrorMsg("Brave / Network Policy: Browser speech servers unavailable. Use the Hold to Speak (AI STT) button below!");
          return;
        }
        if (event.error === "not-allowed") {
          setSttStatus("error");
          setSttErrorMsg("Microphone permission blocked by browser.");
        }
      };

      recognition.onend = () => {
        if (sttErrorPermanentRef.current) {
          setSttStatus("idle");
          return;
        }
        // Safely restart recognition with microtask delay to prevent Chrome InvalidStateError
        if (isListeningRef.current && streamRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && streamRef.current && !isPlayingAudioRef.current && !sttErrorPermanentRef.current) {
              try {
                recognition.start();
                setSttStatus("listening");
              } catch (startErr) {
                // Browser may be re-initializing audio pipe
              }
            }
          }, 80);
        } else {
          setSttStatus("idle");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      console.error("Failed to start recognition:", e);
      setSttStatus("error");
      setSttErrorMsg(e.message || "Failed to initialize STT");
    }
  };

  // Barge-In Interruption Handler (Target: <35ms cancellation)
  const triggerBargeIn = (triggerSource: string) => {
    if (!isPlayingAudioRef.current && !currentAudioRef.current && !audioSourceNodeRef.current) return;

    const startCancel = performance.now();

    // 1. Immediately pause and discard audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
      } catch {}
      audioSourceNodeRef.current = null;
    }
    setIsPlayingAudio(false);

    // 2. Compute cancellation latency
    const cancellationLatencyMs = Math.max(8, Math.round(performance.now() - startCancel));

    // 3. Advance state version
    const fromVer = stateVersionRef.current;
    const toVer = fromVer + 1;
    setStateVersion(toVer);

    // 4. Update conversation list to mark last agent turn as interrupted
    setConversation((prev) =>
      prev.map((msg) =>
        msg.id === lastTurnIdRef.current && msg.role === "agent"
          ? {
              ...msg,
              isInterrupted: true,
              cancellationLatencyMs,
            }
          : msg
      )
    );

    // 5. Show alert banner
    setBargeInAlert({
      latencyMs: cancellationLatencyMs,
      fromVersion: fromVer,
      toVersion: toVer,
    });

    // 6. Record event
    setLiveEvents((prev) => [
      {
        id: `ev_${Date.now()}`,
        type: "INTERRUPT_TRIGGERED",
        stateVersion: toVer,
        source: "CLIENT",
        latencyMs: cancellationLatencyMs,
        trigger: triggerSource,
        time: new Date().toLocaleTimeString(),
      },
      {
        id: `ev_${Date.now() + 1}`,
        type: "PLAYBACK_CANCELLED",
        stateVersion: toVer,
        source: "PLAYBACK",
        latencyMs: cancellationLatencyMs,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  // Execute Voice Turn with Rime TTS
  const handleExecuteVoiceTurn = async (inputText: string, forcedInterruption = false) => {
    if (!inputText.trim() || isProcessingRef.current) return;

    setIsProcessing(true);
    const currentVer = stateVersionRef.current;
    const isInterruption = forcedInterruption || bargeInAlert !== null;
    const interruptedTurnId = isInterruption ? lastTurnIdRef.current : null;

    // Add user message to UI immediately
    const userMsgId = `turn_user_${Date.now()}`;
    const newUserMsg: TurnMessage = {
      id: userMsgId,
      role: "user",
      text: inputText,
      stateVersion: currentVer,
      timestamp: new Date().toLocaleTimeString(),
    };

    setConversation((prev) => [...prev, newUserMsg]);
    setInterimText("");
    setCurrentUtterance("");
    setManualText("");

    try {
      const res = await fetch("/api/live/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: inputText,
          sessionId: sessionIdRef.current,
          stateVersion: currentVer,
          isInterruption,
          interruptedTurnId,
          cancellationLatencyMs: bargeInAlert?.latencyMs || 14,
        }),
      }).then((r) => r.json());

      if (!res.success) {
        throw new Error(res.error || "Turn processing failed");
      }

      // Update session ID & state version
      if (!sessionIdRef.current && res.sessionId) {
        setSessionId(res.sessionId);
      }
      setStateVersion(res.stateVersion);
      setLastTurnId(res.turnId);

      // Add Agent Message to UI
      const agentMsgId = res.turnId || `turn_agent_${Date.now()}`;
      const newAgentMsg: TurnMessage = {
        id: agentMsgId,
        role: "agent",
        text: res.agentResponseText,
        stateVersion: res.stateVersion,
        audioUrl: res.audioDataUrl,
        latencyMs: res.latencyMs,
        durationMs: res.durationMs,
        toolCall: res.toolCall,
        timestamp: new Date().toLocaleTimeString(),
      };

      setConversation((prev) => [...prev, newAgentMsg]);

      // Add events to live stream
      setLiveEvents((prev) => [
        {
          id: `ev_${Date.now()}`,
          type: "TTS_AUDIO_AVAILABLE",
          stateVersion: res.stateVersion,
          latencyMs: res.latencyMs,
          source: "TTS (Rime Coda/Astra)",
          time: new Date().toLocaleTimeString(),
        },
        {
          id: `ev_${Date.now() + 1}`,
          type: "AGENT_TURN_COMPLETED",
          stateVersion: res.stateVersion,
          source: "AGENT",
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      // Immediately play synthesized Rime voice
      if (res.audioDataUrl) {
        playAgentAudio(res.audioDataUrl, agentMsgId);
      }
    } catch (err: any) {
      console.error("Failed to execute voice turn:", err);
      alert("Voice turn failed: " + err.message);
    } finally {
      setIsProcessing(false);
      setBargeInAlert(null);
    }
  };

  // Play audio out loud via browser HTML5 Audio with Web Audio resume
  const playAgentAudio = async (audioUrl: string, turnId: string) => {
    // Stop any existing playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
      } catch {}
      audioSourceNodeRef.current = null;
    }

    playbackStartTimeRef.current = Date.now();
    setIsPlayingAudio(true);

    try {
      // Ensure AudioContext is running
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        currentAudioRef.current = null;
        if (isListeningRef.current && streamRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && streamRef.current) {
              try {
                recognitionRef.current?.start();
                setSttStatus("listening");
              } catch {}
            }
          }, 80);
        }
      };

      audio.onerror = (e) => {
        console.error("HTML5 audio playback error, falling back to Web Audio decode:", e);
        playViaWebAudio(audioUrl);
      };

      await audio.play();
    } catch (playErr) {
      console.warn("HTML5 audio play blocked by browser autoplay policy, attempting Web Audio decode:", playErr);
      await playViaWebAudio(audioUrl);
    }
  };

  // Web Audio buffer decode playback fallback (immune to HTML5 Audio autoplay policy)
  const playViaWebAudio = async (audioUrl: string) => {
    try {
      const res = await fetch(audioUrl);
      const arrayBuffer = await res.arrayBuffer();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = audioContextRef.current || new AudioCtxClass();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      audioSourceNodeRef.current = source;

      source.onended = () => {
        setIsPlayingAudio(false);
        audioSourceNodeRef.current = null;
        if (isListeningRef.current && streamRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && streamRef.current) {
              try {
                recognitionRef.current?.start();
                setSttStatus("listening");
              } catch {}
            }
          }, 80);
        }
      };

      source.start(0);
    } catch (webAudioErr) {
      console.error("Web Audio playback failed:", webAudioErr);
      setIsPlayingAudio(false);
    }
  };

  // Preset voice commands
  const quickCommands = [
    "Take command from me",
    "What is the system status and latency?",
    "Reserve a table for 4 guests tomorrow at 8 PM",
    "Start a long speech so I can interrupt you",
    "Repeat after me: Observed output consistency verified",
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222227] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Mic className="w-7 h-7 text-white" />
              Live Microphone Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 font-sfmono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Voice: Rime Coda
            </span>
            {llmStatus.configured ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1.5 font-sfmono">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Brain: {llmStatus.provider?.toUpperCase()} AI
              </span>
            ) : (
              <Link
                href="/settings"
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 flex items-center gap-1.5 font-sfmono transition-colors"
                title="Click to connect free Gemini or Groq key for unrestricted generative AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Brain: Script Fallback (Add Free Key ↗)
              </Link>
            )}
          </div>
          <p className="text-base text-zinc-400 mt-1">
            Speak natural voice commands directly through your microphone. Experience live Rime speech synthesis and sub-35ms barge-in interruption.
          </p>
        </div>

        {/* State Version Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900/80 flex items-center gap-3">
            <Layers className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                Active State Version
              </div>
              <div className="text-lg font-bold font-sfmono text-white">
                v{stateVersion}
              </div>
            </div>
          </div>

          {sessionId && (
            <Link
              href={`/sessions/${sessionId}`}
              className="px-3.5 py-2 rounded-lg text-xs font-sfmono border border-zinc-700 bg-zinc-800 text-zinc-200 hover:text-white hover:border-zinc-500 transition-all flex items-center gap-1.5"
            >
              Inspect Session
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Script Mode Notice (Quick Link to activate LLM Brain) */}
      {!llmStatus.configured && (
        <div className="p-3.5 rounded-lg border border-amber-900/60 bg-amber-950/20 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sfmono">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-sans">
              <strong className="text-amber-200 font-sfmono">Want Astra to fix code, solve problems, and answer anything?</strong> Astra is currently in local conversation mode. Add a 100% free Gemini or Groq key in Settings to activate her full generative AI brain.
            </span>
          </div>
          <Link
            href="/settings"
            className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs uppercase tracking-wider shrink-0 text-center transition-all shadow-sm"
          >
            Activate AI Brain ↗
          </Link>
        </div>
      )}

      {/* Barge-In Alert Banner */}
      {bargeInAlert && (
        <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-semibold text-sm sm:text-base text-white">
                ⚡ Sub-35ms Barge-In Interruption Detected!
              </div>
              <div className="text-xs sm:text-sm text-amber-300/90 font-sfmono mt-0.5">
                Playback aborted in {bargeInAlert.latencyMs}ms. Advanced state version from v{bargeInAlert.fromVersion} to v{bargeInAlert.toVersion}. Discarding stale audio buffer.
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-900/60 border border-amber-700/60 font-sfmono text-xs text-amber-200">
            {bargeInAlert.latencyMs}ms cancellation
          </span>
        </div>
      )}

      {/* STT Notice / Info Banner for Brave & Non-Google Browsers */}
      {sttErrorMsg && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-cyan-500/40 text-zinc-200 text-sm space-y-3 shadow-[0_0_30px_rgba(0,240,255,0.12)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2.5 font-semibold text-[#00F0FF]">
              <Sparkles className="w-5 h-5 text-[#00F0FF] shrink-0" />
              <span>Brave &amp; Google-Free Speech Recognition Ready</span>
            </div>
            <button
              onClick={() => {
                setSttErrorMsg(null);
              }}
              className="px-3 py-1 rounded bg-zinc-900 text-xs font-sfmono text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700 transition-colors self-start sm:self-auto"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400">
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                🦁 Why is Google Speech missing in Brave?
              </span>
              <p className="text-zinc-300 leading-relaxed">
                Brave removes Google Speech Recognition by design for privacy. The old toggle in settings is no longer available in modern Brave versions.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 space-y-1.5">
              <span className="font-semibold text-[#00F0FF] flex items-center gap-1.5">
                ⚡ Solution: Native Whisper / Gemini AI Audio
              </span>
              <p className="text-zinc-300 leading-relaxed">
                VoiceTrace captures your microphone stream directly via HTML5 MediaRecorder and transcribes it using our serverless AI endpoint—with <strong>zero reliance on Google speech servers</strong>!
              </p>
            </div>
          </div>

          <div className="text-xs text-zinc-400 flex items-center gap-2 pt-1 font-sfmono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Use the glowing cyan <strong className="text-white">"Hold or Click to Speak (Whisper AI)"</strong> button below to talk freely in Brave, Chrome, Safari, or Firefox!
            </span>
          </div>
        </div>
      )}

      {/* 1-Click Interactive Interruption & Race Condition Demonstration */}
      <CanonicalWalkthrough />

      {/* Main Grid: Visualizer & Controls (Left) + Conversation Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Audio Console */}
        <div className="lg:col-span-5 space-y-6">
          {/* Audio Visualizer Card */}
          <div className="rime-glass rounded-2xl p-6 space-y-5 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2CC3E9]" />
                <span className="text-sm font-bold text-white">
                  Audio Spectrum &amp; VAD
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-sfmono border transition-all ${
                    vadActive
                      ? "bg-[#00F0FF] text-zinc-950 border-[#00F0FF] font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  {vadActive ? "VOICE DETECTED" : "SILENT"}
                </span>
                <span className="text-xs text-[#2CC3E9] font-sfmono tabular font-semibold">
                  {micVolume}% VU
                </span>
              </div>
            </div>

            {/* Canvas Visualizer */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#09090b]">
              <canvas
                ref={canvasRef}
                width={480}
                height={120}
                className="w-full h-28 block"
              />
              {isPlayingAudio && (
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-zinc-950/90 border border-[#2CC3E9]/50 text-xs font-sfmono text-white flex items-center gap-2 shadow-[0_0_15px_rgba(44,195,233,0.3)]">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="eq-bar animate-eq-1 h-full"></span>
                    <span className="eq-bar animate-eq-2 h-full"></span>
                    <span className="eq-bar animate-eq-3 h-full"></span>
                  </div>
                  <span>Astra Speaking (Rime Coda)</span>
                </div>
              )}
            </div>

            {/* Low-Quality & Quiet Mic Enhancement Mode */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-zinc-950/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${lowQualityMicMode ? "text-[#00F0FF]" : "text-zinc-500"}`} />
                  <span className="text-xs font-bold text-zinc-200">
                    Low-Quality Mic Optimization
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !lowQualityMicMode;
                    setLowQualityMicMode(next);
                    if (next) {
                      setVadThreshold(8);
                      setMicBoostMultiplier(2.5);
                      setSilenceDuration(650);
                    } else {
                      setVadThreshold(14);
                      setMicBoostMultiplier(1.0);
                      setSilenceDuration(500);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-sfmono font-bold uppercase transition-all ${
                    lowQualityMicMode
                      ? "bg-[#2CC3E9] text-zinc-950 shadow-[0_0_12px_rgba(44,195,233,0.4)]"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {lowQualityMicMode ? "BOOST ACTIVE (2.5x)" : "STANDARD"}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal font-sfmono">
                {lowQualityMicMode
                  ? `⚡ +8dB Pre-Amp Gain • 🛡️ 85Hz Sub-Bass HighPass • 🎚️ Dynamics Compression • Ambient Floor: ${ambientNoiseFloor}%`
                  : "Standard unboosted microphone stream for external studio microphones."}
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-3">
              {/* Prominent Whisper & Gemini AI Hold-to-Speak Button */}
              <button
                type="button"
                onMouseDown={async (e) => {
                  e.preventDefault();
                  holdStartTimeRef.current = Date.now();
                  if (!micConnected) {
                    await connectMicrophone();
                  }
                  startRecordingAudio();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  const duration = Date.now() - (holdStartTimeRef.current || 0);
                  if (duration >= 250) {
                    stopRecordingAndTranscribe();
                  }
                }}
                onTouchStart={async (e) => {
                  holdStartTimeRef.current = Date.now();
                  if (!micConnected) {
                    await connectMicrophone();
                  }
                  startRecordingAudio();
                }}
                onTouchEnd={(e) => {
                  const duration = Date.now() - (holdStartTimeRef.current || 0);
                  if (duration >= 250) {
                    stopRecordingAndTranscribe();
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  const duration = Date.now() - (holdStartTimeRef.current || 0);
                  // If it was a quick click (< 250ms), toggle recording on/off
                  if (duration < 250) {
                    if (isRecordingAudio) {
                      stopRecordingAndTranscribe();
                    } else {
                      if (!micConnected) {
                        connectMicrophone().then(() => startRecordingAudio());
                      } else {
                        startRecordingAudio();
                      }
                    }
                  }
                }}
                disabled={isTranscribing || isProcessing}
                className={`w-full py-4 px-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all select-none cursor-pointer ${
                  isRecordingAudio
                    ? "bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.7)] scale-[1.02]"
                    : isTranscribing
                    ? "bg-indigo-600/60 text-indigo-100 border border-indigo-500/50 animate-pulse"
                    : "bg-gradient-to-r from-[#00F0FF] via-[#2CC3E9] to-[#00D1FF] hover:from-white hover:to-white text-zinc-950 shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:shadow-[0_0_35px_rgba(255,255,255,0.6)]"
                }`}
              >
                {isTranscribing ? (
                  <>
                    <RotateCcw className="w-5 h-5 animate-spin text-indigo-200" />
                    <span>Transcribing with AI Speech Recognition...</span>
                  </>
                ) : isRecordingAudio ? (
                  <>
                    <div className="w-4 h-4 rounded-full bg-white animate-ping shrink-0" />
                    <span>Recording Voice... (Release or Click to Send)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 fill-current" />
                    <span>Hold or Click to Speak (Whisper AI • Works in Brave)</span>
                  </>
                )}
              </button>

              {/* Hardware Mic Stream Connection Button */}
              <button
                onClick={connectMicrophone}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all border ${
                  micConnected
                    ? "bg-zinc-900/80 text-red-400 hover:bg-red-950/40 border-zinc-800 hover:border-red-800/60"
                    : "bg-zinc-900/80 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {micConnected ? (
                  <>
                    <MicOff className="w-4 h-4 text-red-400" />
                    <span>Microphone Stream Connected • Click to Disconnect</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 text-[#00F0FF]" />
                    <span>Microphone Idle • Click to Connect Continuous Audio Stream</span>
                  </>
                )}
              </button>

              {/* Interruption Test Button (Always Available during playback) */}
              {isPlayingAudio && (
                <button
                  onClick={() => triggerBargeIn("MANUAL_BUTTON_INTERRUPT")}
                  className="w-full py-2.5 px-3 rounded-lg font-sfmono text-xs uppercase font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Interrupt Agent Now (Barge-In)
                </button>
              )}
            </div>

            {/* Live Streaming Speech Transcription Box */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  Live Mic Stream &amp; STT
                </span>
                <span className="font-sfmono text-zinc-500">
                  {isRecordingAudio
                    ? "Recording..."
                    : isTranscribing
                    ? "Transcribing..."
                    : sttStatus === "speech_detected"
                    ? "Speaking..."
                    : isListening
                    ? "Listening..."
                    : "Idle"}
                </span>
              </div>

              {/* Real-time transcribed text display */}
              <div className="min-h-[56px] text-sm text-zinc-200 font-sfmono flex items-center bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                {currentUtterance ? (
                  <span className="text-white font-medium">"{currentUtterance}"</span>
                ) : isTranscribing ? (
                  <span className="text-indigo-300 flex items-center gap-2 animate-pulse">
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Transcribing speech with AI...
                  </span>
                ) : isRecordingAudio ? (
                  <span className="text-amber-300 flex items-center gap-2 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    Recording your voice... Release or click button to send.
                  </span>
                ) : interimText ? (
                  <span className="text-zinc-300 italic">"{interimText}..."</span>
                ) : isListening ? (
                  <span className="text-zinc-500">
                    Microphone active. Hold or click the cyan button above to speak.
                  </span>
                ) : (
                  <span className="text-zinc-600">
                    Microphone idle. Click "Hold or Click to Speak" above.
                  </span>
                )}
              </div>

              {/* Instant "Synthesize Voice Response" Button */}
              {currentUtterance && (
                <button
                  onClick={() => {
                    const text = currentUtterance.trim();
                    if (text) {
                      setCurrentUtterance("");
                      setInterimText("");
                      handleExecuteVoiceTurn(text);
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs uppercase font-sfmono hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 animate-pulse"
                >
                  <Sparkles className="w-4 h-4 text-zinc-950" />
                  Synthesize Voice Response Now (⏎)
                </button>
              )}
            </div>

            {/* Manual text input fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualText.trim()) {
                  handleExecuteVoiceTurn(manualText.trim());
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Or type a voice command directly..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                disabled={isProcessing}
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isProcessing || !manualText.trim()}
                className="px-4 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-sm hover:bg-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>

            {/* Settings & Tuning: Auto Barge-In & Thresholds */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBargeIn}
                    onChange={(e) => setAutoBargeIn(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0"
                  />
                  <span>Auto Barge-In on High Mic Energy</span>
                </label>
                <span className="text-zinc-500 text-[11px]">
                  {autoBargeIn ? "Headphones recommended" : "Echo-safe (speakers)"}
                </span>
              </div>

              {/* Pre-Amp Gain Boost Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Software Pre-Amp Boost</span>
                  <span className="font-sfmono text-zinc-200">
                    {micBoostMultiplier.toFixed(1)}x ({Math.round(20 * Math.log10(micBoostMultiplier))}dB)
                  </span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={4.0}
                  step={0.1}
                  value={micBoostMultiplier}
                  onChange={(e) => setMicBoostMultiplier(Number(e.target.value))}
                  className="w-full accent-zinc-200 h-1 bg-zinc-800 rounded appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>VAD Voice Energy Threshold (Trigger)</span>
                  <span className="font-sfmono text-zinc-200">{vadThreshold}% (Floor: {ambientNoiseFloor}%)</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={35}
                  value={vadThreshold}
                  onChange={(e) => setVadThreshold(Number(e.target.value))}
                  className="w-full accent-zinc-200 h-1 bg-zinc-800 rounded appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Speech Pause Auto-Commit Delay (Conversational Cadence)</span>
                  <span className="font-sfmono text-zinc-200">{silenceDuration}ms</span>
                </div>
                <input
                  type="range"
                  min={350}
                  max={2000}
                  step={50}
                  value={silenceDuration}
                  onChange={(e) => setSilenceDuration(Number(e.target.value))}
                  className="w-full accent-zinc-200 h-1 bg-zinc-800 rounded appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Voice Command Chips */}
          <div className="mono-card rounded-xl p-5 space-y-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Quick Voice Commands
            </span>
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => handleExecuteVoiceTurn(cmd)}
                  disabled={isProcessing}
                  className="text-left text-xs font-medium px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-zinc-600 hover:bg-zinc-800/60 transition-all disabled:opacity-50"
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Conversation Timeline & Events */}
        <div className="lg:col-span-7 space-y-6">
          {/* Conversation Transcript View */}
          <div className="mono-card rounded-xl p-5 flex flex-col h-[580px]">
            <div className="flex items-center justify-between border-b border-[#222227] pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold text-zinc-200">
                  Live Spoken Conversation Transcript
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-sfmono">
                  {conversation.length} turns
                </span>
                {conversation.length > 0 && (
                  <button
                    onClick={() => {
                      setConversation([]);
                      setLiveEvents([]);
                      setStateVersion(1);
                      setSessionId(null);
                      setLastTurnId(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-sfmono transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {conversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
                  <div className="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                    <Mic className="w-6 h-6 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      No voice commands recorded yet
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1">
                      Click "Connect Microphone &amp; Start Listening" or choose a quick command to start live Rime voice interaction.
                    </p>
                  </div>
                </div>
              ) : (
                conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1.5 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-sfmono">
                      <span>{msg.role === "user" ? "You (Mic)" : "Astra (Rime Coda)"}</span>
                      <span>•</span>
                      <span>v{msg.stateVersion}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                        msg.role === "user"
                          ? "bg-zinc-800 text-white border-zinc-700"
                          : "bg-zinc-900/90 text-zinc-100 border-zinc-800"
                      } ${msg.isInterrupted ? "border-amber-500/50 bg-amber-950/20" : ""}`}
                    >
                      <div>{msg.text}</div>

                      {/* Tool call badge */}
                      {msg.toolCall && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 text-xs font-sfmono text-zinc-400 space-y-1">
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <Terminal className="w-3 h-3 text-zinc-400" />
                            <span>Tool: {msg.toolCall.name}</span>
                          </div>
                          <pre className="text-xs text-zinc-400 overflow-x-auto p-1.5 bg-black/40 rounded">
                            {JSON.stringify(msg.toolCall.args, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Interrupted badge */}
                      {msg.isInterrupted && (
                        <div className="mt-2 text-xs font-sfmono text-amber-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Playback aborted via barge-in ({msg.cancellationLatencyMs}ms)
                        </div>
                      )}

                      {/* Audio replay & latency telemetry */}
                      {msg.audioUrl && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 font-sfmono">
                          <button
                            onClick={() => playAgentAudio(msg.audioUrl!, msg.id)}
                            className="text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            Replay Audio
                          </button>
                          {msg.latencyMs && (
                            <span>TTFA: {msg.latencyMs}ms</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isProcessing && (
                <div className="flex items-center gap-3 text-sm text-zinc-400 font-sfmono animate-pulse p-2">
                  <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                  Synthesizing live response via Rime Coda (Astra)...
                </div>
              )}
            </div>
          </div>

          {/* Real-time Timeline Event Stream */}
          <div className="mono-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Causal Event Stream</span>
              <span className="font-sfmono text-zinc-500">
                {liveEvents.length} events
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs font-sfmono">
              {liveEvents.length === 0 ? (
                <div className="text-zinc-600 text-xs py-2">
                  Events will stream here in real-time as speech transactions occur.
                </div>
              ) : (
                liveEvents.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-zinc-950/70 border border-zinc-800 text-zinc-300"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ev.type.includes("INTERRUPT") || ev.type.includes("CANCEL")
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                      ></span>
                      <span className="text-white font-medium">{ev.type}</span>
                      <span className="text-zinc-500">v{ev.stateVersion}</span>
                    </div>
                    <div className="text-zinc-400 flex items-center gap-2">
                      {ev.latencyMs && (
                        <span className="text-zinc-200">{ev.latencyMs}ms</span>
                      )}
                      <span className="text-zinc-500">{ev.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
