-- VoiceTrace Relational Schema for PostgreSQL
-- Supports strong relational integrity, cascade deletes, and ordered query indexing.

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_versions (
    id VARCHAR(64) PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version VARCHAR(64) NOT NULL,
    prompt TEXT NOT NULL,
    configuration_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    agent_version_id VARCHAR(64) NOT NULL REFERENCES agent_versions(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, FAILED, INTERRUPTED
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    environment VARCHAR(64) NOT NULL DEFAULT 'development',
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS turns (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    state_version INT NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    user_input TEXT,
    assistant_output TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS' -- IN_PROGRESS, COMPLETED, INTERRUPTED, CANCELLED
);

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_id VARCHAR(64) REFERENCES turns(id) ON DELETE SET NULL,
    sequence INT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    type VARCHAR(64) NOT NULL,
    correlation_id VARCHAR(64),
    parent_event_id VARCHAR(64),
    state_version INT NOT NULL DEFAULT 1,
    source VARCHAR(64) NOT NULL, -- CLIENT, SERVER, STT, AGENT, TOOL, TTS, PLAYBACK, CHAOS
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, PENDING, FAILED, CANCELLED, STALE
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audio_artifacts (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_id VARCHAR(64) REFERENCES turns(id) ON DELETE SET NULL,
    event_id VARCHAR(64) REFERENCES events(id) ON DELETE SET NULL,
    provider VARCHAR(64) NOT NULL, -- RIME, MOCK_SYNTHETIC
    model VARCHAR(64) NOT NULL,
    voice VARCHAR(64) NOT NULL,
    language VARCHAR(32) NOT NULL DEFAULT 'en',
    endpoint VARCHAR(255) NOT NULL,
    audio_format VARCHAR(32) NOT NULL DEFAULT 'mp3',
    transport VARCHAR(64) NOT NULL DEFAULT 'http_streaming',
    storage_url VARCHAR(512) NOT NULL,
    duration_ms INT NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL,
    available_at TIMESTAMPTZ NOT NULL,
    playback_started_at TIMESTAMPTZ,
    playback_ended_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    state_version INT NOT NULL DEFAULT 1,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_id VARCHAR(64) REFERENCES turns(id) ON DELETE SET NULL,
    tool_name VARCHAR(128) NOT NULL,
    request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    state_version INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, STALE
    is_stale BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS failures (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_id VARCHAR(64) REFERENCES turns(id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL, -- STALE_TOOL_RESULT, STALE_OUTPUT_REJECTED, INTERRUPTION_PLAYBACK_FAILURE, STATE_DIVERGENCE, DUPLICATE_RESPONSE, INTERRUPTION_RECOVERY_FAILURE
    severity VARCHAR(32) NOT NULL DEFAULT 'HIGH', -- CRITICAL, HIGH, MEDIUM, LOW
    summary TEXT NOT NULL,
    root_cause_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    actual_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reproducible BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS experiments (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version_a_id VARCHAR(64) NOT NULL REFERENCES agent_versions(id) ON DELETE CASCADE,
    version_b_id VARCHAR(64) NOT NULL REFERENCES agent_versions(id) ON DELETE CASCADE,
    corpus_id VARCHAR(64) NOT NULL,
    configuration_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_cases (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    input_sequence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_outcome_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    fault_configuration_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    timeout_ms INT NOT NULL DEFAULT 10000
);

CREATE TABLE IF NOT EXISTS test_runs (
    id VARCHAR(64) PRIMARY KEY,
    test_case_id VARCHAR(64) NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    agent_version_id VARCHAR(64) NOT NULL REFERENCES agent_versions(id) ON DELETE CASCADE,
    experiment_id VARCHAR(64) REFERENCES experiments(id) ON DELETE SET NULL,
    session_id VARCHAR(64) REFERENCES sessions(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING', -- RUNNING, PASSED, FAILED, TIMEOUT
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    result_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS metrics (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) REFERENCES sessions(id) ON DELETE CASCADE,
    test_run_id VARCHAR(64) REFERENCES test_runs(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(32) NOT NULL, -- ms, percentage, count, ratio
    calculation_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    source VARCHAR(64) NOT NULL,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session_sequence ON events(session_id, sequence ASC);
CREATE INDEX IF NOT EXISTS idx_events_session_timestamp ON events(session_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_audio_session ON audio_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_failures_session ON failures(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_case ON test_runs(test_case_id);
