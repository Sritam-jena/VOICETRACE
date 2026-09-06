# VoiceTrace: Realtime Voice Agent Observability & Regression Platform

> **VoiceTrace tells developers what happened inside a voice conversation, what the user actually heard, why a failure occurred, and whether a fix improved the system.**

VoiceTrace is a specialized developer observability and regression platform designed specifically for realtime, multi-turn voice agents. Built with **Next.js**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, and **Rime TTS**, VoiceTrace solves the voice-native **observed-output consistency** problem: *a voice agent may internally reach the correct state while the user hears obsolete, delayed, duplicated, interrupted, or otherwise incorrect audio.*

---

## 1. The Core Problem

In text chatbots, conversational turns are atomic: a user types, an LLM generates text, and the user reads it.

In **realtime conversational voice agents**, execution is concurrent and asynchronous:
1. The user speaks, triggering continuous speech recognition (STT).
2. The agent initiates background tool calls (e.g. database queries, booking APIs).
3. The speech synthesizer (Rime TTS) produces audio chunks in parallel.
4. The client browser buffers and plays the audio stream.
5. **The user interrupts** (barge-in) or changes their mind halfway through the turn.

Without strict observed-output consistency guards:
- An in-flight tool call for the *old* request finishes late and updates the agent's memory with obsolete data.
- The audio buffer continues speaking the obsolete requirement for 400–800ms before cancellation occurs.
- The user hears contradictory spoken words even though server logs show the agent "handled" the new state.

VoiceTrace makes this physical audio discrepancy observable, reproducible, and verifiable.

---

## 2. Why Voice Is Essential

VoiceTrace is not a generic text observability tool or superficial metrics dashboard. It exists to track voice-native primitives that do not exist in text systems:
- **Audio Playback Lifecycle**: Tracking when audio was generated, delivered, queued, started playing, cancelled, or completed.
- **Physical Cancellation Latency**: Measuring the exact millisecond interval between acoustic user speech detection and audio playback cancellation.
- **Audible Leakage ("What the User Heard")**: Visualizing whether the user heard zero audio, a partial snippet, or the complete obsolete sentence.
- **Race Condition Invalidation**: Monotonically advancing conversation state versions (`stateVersion`) so stale tool responses and obsolete audio streams are dropped before they reach the user's ears.

---

## 3. System Architecture

```
User Microphone
      ↓
LiveKit / Browser Audio Transport
      ↓
Speech Recognition (STT)
      ↓
Voice Execution Orchestrator  ←→  Monotonic State Version Guard (stateVersion)
      ↓                     ↘
Background Tools            Rime TTS Provider (coda / amber)
      ↓                     ↙
Physical Audio Artifact Store (MP3 / WAV)
      ↓
Browser Playback Lifecycle Scrubber (Generated → Queued → Started → Cancelled)
      ↓
Synchronized Voice Execution Timeline & Failure Detectors
      ↓
PostgreSQL Relational Persistence & Realtime SSE Stream
```

---

## 4. End-to-End Realtime Event Flow

VoiceTrace preserves strict causal ordering across every turn:

```text
00:00.000 USER_AUDIO_STARTED
00:01.180 STT_FINAL
00:01.230 AGENT_STATE_CHANGED       (state v1)
00:01.490 TOOL_CALL_STARTED         (state v1, delay 600ms)
00:02.000 TTS_STARTED               (Rime coda / amber)
00:02.180 TTS_AUDIO_AVAILABLE       (artifact art_abc123)
00:02.220 PLAYBACK_STARTED          (state v1)
00:02.520 INTERRUPTION_STARTED      (User barges in: "Change party to 2!")
00:02.548 PLAYBACK_CANCELLED        (28ms latency! <150ms acceptance threshold)
00:02.550 STATE_VERSION_CHANGED     (state v1 → v2)
00:02.690 TOOL_RESULT_STALE         (Old tool returned for v1 -> REJECTED)
00:02.720 AGENT_RESPONSE_STARTED    (New response for state v2)
00:02.815 TTS_AUDIO_AVAILABLE       (Rime artifact art_xyz789 for state v2)
00:02.850 PLAYBACK_STARTED          (New response played to user)
00:03.450 PLAYBACK_COMPLETED        (Task completed successfully)
```

---

## 5. Rime TTS Integration Details

Rime is the primary speech synthesis provider for VoiceTrace:

- **Model**: `coda` (flagship high-prosody conversational LLM voice model)
- **Voice / Speaker**: `amber` (natural, low-latency conversational speaker)
- **Language**: `en`
- **API Endpoint**: `https://users.rime.ai/v1/rime-tts`
- **Audio Format**: `mp3`
- **Transport**: `http_streaming`
- **Secret Isolation**: Server-side only via `process.env.RIME_API_KEY`. No credentials are ever passed to the client browser.

*Note on Offline Mode*: When running without a live `RIME_API_KEY`, VoiceTrace automatically utilizes its local deterministic audio generator producing valid WAV PCM buffers, explicitly labeling all records as `isSynthetic: true` and `provider: "MOCK_SYNTHETIC"` without fabricating live API performance.

---

## 6. Quick Start & Setup

### Prerequisites
- Node.js v18+ (tested on Node.js v24)
- npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key environment variables:
```env
# Optional: External PostgreSQL URL. If left empty, VoiceTrace automatically
# uses in-process WASM PostgreSQL (@electric-sql/pglite) with zero external setup.
DATABASE_URL=

# Rime TTS API Key (Server-Side Only)
RIME_API_KEY=
RIME_MODEL=coda
RIME_VOICE=amber
RIME_ENDPOINT=https://users.rime.ai/v1/rime-tts
RIME_AUDIO_FORMAT=mp3
```

### 3. Run Migrations & Seed Data
```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 7. Commands Reference

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server at `http://localhost:3000` |
| `npm run build` | Compiles production Next.js application |
| `npm run typecheck` | Validates full TypeScript codebase (`tsc --noEmit`) |
| `npm test` | Runs the full Vitest suite (all 15 unit, integration, and voice tests) |
| `npm run test:unit` | Runs event ordering, state versioning, detectors, and metrics unit tests |
| `npm run test:integration` | Runs PostgreSQL persistence and Rime provider integration tests |
| `npm run test:voice` | Runs the acceptance test suite |
| `npm run test:interruption` | Executes canonical acceptance test and prints comparison table |
| `npm run replay -- --test interruption-recovery-demo` | Executes deterministic functional replay of the acceptance test |
| `npm run replay -- --session <SESSION_ID>` | Replays a stored trace in analysis mode |
| `npm run demo:voice` | Runs the automated 4–5 minute live demo sequence |
| `npm run evaluate` | Runs cross-version regression evaluation across all test cases |
| `npm run db:migrate` | Applies PostgreSQL DDL schema migrations |
| `npm run db:seed` | Seeds database with baseline failure, post-fix recovery, and acceptance tests |

---

## 8. Deterministic Acceptance Test

The canonical acceptance test is defined in `tests/voice/acceptance.test.ts` and `scripts/test-interruption.ts`.

Run it directly from the terminal:
```bash
npm run test:interruption
```

### Measured Real Results:
```text
Metric                         | Baseline (v1) | Fixed (v2)    | Target / Delta
--------------------------------------------------------------------------------
Cancellation Latency           | 517ms         | 37ms          | -480ms (<150ms)
Critical Failures              | 3             | 0             | -3 (Zero failures)
Stale Output Prevented         | NO            | YES           | 100% Consistent
Deterministic Test Status      | FAILED        | PASSED        | ACCEPTANCE MET
```

---

## 9. 4–5 Minute Demo Script

### 0:00–0:35 — The Problem
1. Open the VoiceTrace Command Center at `http://localhost:3000`.
2. Say: *"Traditional loggers tell you what an agent decided; they don't tell you what the user actually heard. In realtime voice, a user can interrupt, causing obsolete background tools and pending audio to collide."*

### 0:35–1:15 — Normal Interaction
1. Click **Sessions** &rarr; inspect normal conversational turn.
2. Highlight Rime TTS configuration: `Speech Provider: Rime (coda/amber)`.

### 1:15–2:10 — Inducing the Hard Voice Failure
1. Navigate to **Chaos Voice** (`/chaos`).
2. Show injected faults: `600ms Tool Delay` + `300ms User Barge-in`.
3. Click **Inject Faults & Run Chaos Session** with guards disabled (`v1-baseline`).
4. Observe the failure occur.

### 2:10–2:50 — Inspect the Failure
1. Open the Session Replay timeline (`/sessions/[id]`).
2. Show the synchronized timeline:
   - Tool started at `v1`.
   - User interrupted.
   - Cancellation took `480ms` (exceeding `150ms` threshold).
   - Old tool returned for `v1` and was accepted.
3. Switch to **What User Actually Heard** tab: Play the audio snippet and observe that the user heard the obsolete requirement.
4. Switch to **Failure Inspector** tab: Show the Root Cause Chain and Expected vs Actual comparison.

### 2:50–3:30 — Reproduce with Replay
1. Click **Replay Timeline** in the UI or execute:
   ```bash
   npm run replay -- --test interruption-recovery-demo
   ```
2. Confirm the exact same failure reproduces deterministically.

### 3:30–4:15 — Apply Fix & Prove Improvement
1. Open **Regression Lab** (`/regression`).
2. Show the side-by-side run comparison:
   - **Baseline (v1)**: 517ms cancellation, 3 critical failures, FAILED.
   - **Guarded (v2)**: 37ms cancellation, 0 failures, PASSED.
3. Run the test suite to prove the fix.

### 4:15–5:00 — Conclusion & Verification
1. Inspect `RIME_EVIDENCE.md` and Settings panel showing active Rime model telemetry.
2. Finish: *"VoiceTrace closes the loop from bad voice interaction to root cause, reproduction, fix, and measurable proof."*

---

## 10. Security & Secret Handling

- **Server-Side Key Isolation**: `RIME_API_KEY` and all external credentials reside strictly in server environment variables.
- **Client Security**: No credentials or private keys are bundled into client-facing bundles or rendered in DOM attributes.
- **Sanitization**: All user-provided inputs and transcripts are parameterized in PostgreSQL SQL queries.
- **Zero Accidental Commits**: `.gitignore` comprehensively excludes `.env`, `node_modules`, `data/`, and database binaries.
