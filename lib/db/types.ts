export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: string;
  prompt: string;
  configuration_json: Record<string, any>;
  created_at: string;
}

export interface Session {
  id: string;
  project_id: string;
  agent_id: string;
  agent_version_id: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "INTERRUPTED";
  started_at: string;
  ended_at?: string | null;
  environment: string;
  is_synthetic: boolean;
  metadata_json: Record<string, any>;
}

export interface Turn {
  id: string;
  session_id: string;
  sequence: number;
  state_version: number;
  started_at: string;
  ended_at?: string | null;
  user_input?: string | null;
  assistant_output?: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "INTERRUPTED" | "CANCELLED";
}

export interface StoredEvent {
  id: string;
  session_id: string;
  turn_id?: string | null;
  sequence: number;
  timestamp: string;
  type: string;
  correlation_id?: string | null;
  parent_event_id?: string | null;
  state_version: number;
  source: string;
  status: string;
  payload_json: Record<string, any>;
  created_at: string;
}

export interface AudioArtifact {
  id: string;
  session_id: string;
  turn_id?: string | null;
  event_id?: string | null;
  provider: "RIME" | "MOCK_SYNTHETIC";
  model: string;
  voice: string;
  language: string;
  endpoint: string;
  audio_format: string;
  transport: string;
  storage_url: string;
  duration_ms: number;
  generated_at: string;
  available_at: string;
  playback_started_at?: string | null;
  playback_ended_at?: string | null;
  cancelled_at?: string | null;
  state_version: number;
  is_synthetic: boolean;
  metadata_json: Record<string, any>;
}

export interface ToolCall {
  id: string;
  session_id: string;
  turn_id?: string | null;
  tool_name: string;
  request_json: Record<string, any>;
  response_json: Record<string, any>;
  started_at: string;
  completed_at?: string | null;
  state_version: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "STALE";
  is_stale: boolean;
}

export interface Failure {
  id: string;
  session_id: string;
  turn_id?: string | null;
  category:
    | "STALE_TOOL_RESULT"
    | "STALE_OUTPUT_REJECTED"
    | "INTERRUPTION_PLAYBACK_FAILURE"
    | "STATE_DIVERGENCE"
    | "DUPLICATE_RESPONSE"
    | "INTERRUPTION_RECOVERY_FAILURE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  root_cause_json: Record<string, any>;
  expected_json: Record<string, any>;
  actual_json: Record<string, any>;
  detected_at: string;
  reproducible: boolean;
}

export interface Experiment {
  id: string;
  project_id: string;
  name: string;
  version_a_id: string;
  version_b_id: string;
  corpus_id: string;
  configuration_json: Record<string, any>;
  created_at: string;
}

export interface TestCase {
  id: string;
  project_id: string;
  name: string;
  description: string;
  input_sequence_json: any[];
  expected_outcome_json: Record<string, any>;
  fault_configuration_json: Record<string, any>;
  timeout_ms: number;
}

export interface TestRun {
  id: string;
  test_case_id: string;
  agent_version_id: string;
  experiment_id?: string | null;
  session_id?: string | null;
  status: "RUNNING" | "PASSED" | "FAILED" | "TIMEOUT";
  started_at: string;
  completed_at?: string | null;
  result_json: Record<string, any>;
}

export interface Metric {
  id: string;
  session_id?: string | null;
  test_run_id?: string | null;
  name: string;
  value: number;
  unit: string;
  calculation_version: string;
  source: string;
  is_synthetic: boolean;
  created_at: string;
}
