export type EventSource =
  | "CLIENT"
  | "SERVER"
  | "STT"
  | "AGENT"
  | "TOOL"
  | "TTS"
  | "PLAYBACK"
  | "CHAOS";

export type EventStatus =
  | "SUCCESS"
  | "PENDING"
  | "FAILED"
  | "CANCELLED"
  | "STALE";

export interface VoiceEventBase<TType extends string = string, TPayload = Record<string, any>> {
  id: string;
  sessionId: string;
  turnId?: string;
  sequence: number;
  timestamp: string;
  type: TType;
  correlationId?: string;
  parentEventId?: string;
  stateVersion: number;
  source: EventSource;
  status: EventStatus;
  payload: TPayload;
}

// Concrete Event Payloads
export interface SessionStartedPayload {
  agentId: string;
  agentVersion: string;
  environment: string;
  isSynthetic: boolean;
  metadata?: Record<string, any>;
}

export interface SessionEndedPayload {
  durationMs: number;
  reason: "NORMAL" | "USER_DISCONNECT" | "ERROR" | "TIMEOUT";
  totalTurns: number;
}

export interface UserAudioStartedPayload {
  sampleRate?: number;
  channels?: number;
}

export interface UserAudioEndedPayload {
  durationMs: number;
}

export interface STTPartialPayload {
  transcript: string;
  isFinal: false;
  confidence?: number;
}

export interface STTFinalPayload {
  transcript: string;
  isFinal: true;
  confidence: number;
  audioDurationMs: number;
}

export interface AgentTurnStartedPayload {
  turnSequence: number;
  userInput: string;
}

export interface AgentStateChangedPayload {
  previousStateVersion: number;
  newStateVersion: number;
  reason: string;
  activeContext: Record<string, any>;
}

export interface AgentResponseStartedPayload {
  model: string;
  promptTokens?: number;
}

export interface AgentResponseCompletedPayload {
  fullText: string;
  totalTokens?: number;
  durationMs: number;
}

export interface ToolCallStartedPayload {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, any>;
  stateVersion: number;
}

export interface ToolCallCompletedPayload {
  toolCallId: string;
  toolName: string;
  result: Record<string, any>;
  durationMs: number;
  stateVersion: number;
}

export interface ToolResultStalePayload {
  toolCallId: string;
  toolName: string;
  toolStateVersion: number;
  activeStateVersion: number;
  discrepancyMs: number;
  reason: string;
}

export interface TTSStartedPayload {
  provider: "RIME" | "MOCK_SYNTHETIC";
  model: string;
  voice: string;
  endpoint: string;
  audioFormat: string;
  textLength: number;
  text: string;
  stateVersion: number;
}

export interface TTSAudioAvailablePayload {
  artifactId: string;
  durationMs: number;
  bytes: number;
  ttfaMs: number;
  stateVersion: number;
  provider: "RIME" | "MOCK_SYNTHETIC";
}

export interface TTSCompletedPayload {
  artifactId: string;
  durationMs: number;
  totalBytes: number;
  synthesisDurationMs: number;
}

export interface TTSFailedPayload {
  provider: string;
  error: string;
  statusCode?: number;
}

export interface AudioQueuedPayload {
  artifactId: string;
  queuePosition: number;
  stateVersion: number;
}

export interface PlaybackStartedPayload {
  artifactId: string;
  stateVersion: number;
  activeStateVersion: number;
  estimatedDurationMs: number;
}

export interface PlaybackProgressPayload {
  artifactId: string;
  currentMs: number;
  totalMs: number;
}

export interface PlaybackInterruptedPayload {
  artifactId: string;
  playedMs: number;
  totalMs: number;
  interruptionTimestamp: string;
}

export interface PlaybackCancelledPayload {
  artifactId: string;
  cancellationLatencyMs: number;
  playedMs: number;
  totalMs: number;
  reason: "USER_INTERRUPT" | "STALE_STATE" | "MANUAL_STOP";
}

export interface PlaybackCompletedPayload {
  artifactId: string;
  totalPlayedMs: number;
}

export interface InterruptionStartedPayload {
  reason: "USER_SPEECH_DETECTED" | "SIMULATED_BARGE_IN";
  activeAudioArtifactId?: string;
}

export interface InterruptionHandledPayload {
  cancelledArtifactIds: string[];
  cancellationLatencyMs: number;
  newStateVersion: number;
}

export interface StateVersionChangedPayload {
  fromVersion: number;
  toVersion: number;
  trigger: "USER_INTERRUPT" | "NEW_TURN" | "SYSTEM_RESET";
}

export interface FaultInjectedPayload {
  faultType:
    | "TOOL_DELAY"
    | "TTS_DELAY"
    | "INTERRUPTION"
    | "STALE_TOOL_RESPONSE"
    | "DUPLICATE_RESPONSE"
    | "PLAYBACK_DELAY";
  delayMs?: number;
  targetEvent?: string;
  deterministic: boolean;
  metadata?: Record<string, any>;
}

export interface FailureDetectedPayload {
  failureId: string;
  category:
    | "STALE_TOOL_RESULT"
    | "STALE_OUTPUT_REJECTED"
    | "INTERRUPTION_PLAYBACK_FAILURE"
    | "STATE_DIVERGENCE"
    | "DUPLICATE_RESPONSE"
    | "INTERRUPTION_RECOVERY_FAILURE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  rootCause: Record<string, any>;
  expected: Record<string, any>;
  actual: Record<string, any>;
}

export interface ReplayStartedPayload {
  originalSessionId: string;
  replayMode: "ANALYSIS" | "DETERMINISTIC_FUNCTIONAL";
  testCaseId?: string;
}

export interface ReplayCompletedPayload {
  originalSessionId: string;
  matchedEventCount: number;
  divergenceCount: number;
  isReproduced: boolean;
}

// Union of all Voice Events
export type VoiceEvent =
  | VoiceEventBase<"SESSION_STARTED", SessionStartedPayload>
  | VoiceEventBase<"SESSION_ENDED", SessionEndedPayload>
  | VoiceEventBase<"USER_AUDIO_STARTED", UserAudioStartedPayload>
  | VoiceEventBase<"USER_AUDIO_ENDED", UserAudioEndedPayload>
  | VoiceEventBase<"STT_PARTIAL", STTPartialPayload>
  | VoiceEventBase<"STT_FINAL", STTFinalPayload>
  | VoiceEventBase<"AGENT_TURN_STARTED", AgentTurnStartedPayload>
  | VoiceEventBase<"AGENT_STATE_CHANGED", AgentStateChangedPayload>
  | VoiceEventBase<"AGENT_RESPONSE_STARTED", AgentResponseStartedPayload>
  | VoiceEventBase<"AGENT_RESPONSE_COMPLETED", AgentResponseCompletedPayload>
  | VoiceEventBase<"TOOL_CALL_STARTED", ToolCallStartedPayload>
  | VoiceEventBase<"TOOL_CALL_COMPLETED", ToolCallCompletedPayload>
  | VoiceEventBase<"TOOL_RESULT_STALE", ToolResultStalePayload>
  | VoiceEventBase<"TTS_STARTED", TTSStartedPayload>
  | VoiceEventBase<"TTS_AUDIO_AVAILABLE", TTSAudioAvailablePayload>
  | VoiceEventBase<"TTS_COMPLETED", TTSCompletedPayload>
  | VoiceEventBase<"TTS_FAILED", TTSFailedPayload>
  | VoiceEventBase<"AUDIO_QUEUED", AudioQueuedPayload>
  | VoiceEventBase<"PLAYBACK_STARTED", PlaybackStartedPayload>
  | VoiceEventBase<"PLAYBACK_PROGRESS", PlaybackProgressPayload>
  | VoiceEventBase<"PLAYBACK_INTERRUPTED", PlaybackInterruptedPayload>
  | VoiceEventBase<"PLAYBACK_CANCELLED", PlaybackCancelledPayload>
  | VoiceEventBase<"PLAYBACK_COMPLETED", PlaybackCompletedPayload>
  | VoiceEventBase<"INTERRUPTION_STARTED", InterruptionStartedPayload>
  | VoiceEventBase<"INTERRUPTION_HANDLED", InterruptionHandledPayload>
  | VoiceEventBase<"STATE_VERSION_CHANGED", StateVersionChangedPayload>
  | VoiceEventBase<"FAULT_INJECTED", FaultInjectedPayload>
  | VoiceEventBase<"FAILURE_DETECTED", FailureDetectedPayload>
  | VoiceEventBase<"REPLAY_STARTED", ReplayStartedPayload>
  | VoiceEventBase<"REPLAY_COMPLETED", ReplayCompletedPayload>;
