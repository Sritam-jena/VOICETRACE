import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { query } from "../db";
import { TTSResult } from "../providers/tts";
import { AudioArtifact } from "../db/types";

// In-memory global cache for serverless environments (Vercel, AWS Lambda) where disk is read-only
const globalAudioCache = new Map<string, Buffer>();

class AudioArtifactStore {
  private getStorageDir(): string {
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY
    );

    // On Vercel / Serverless, /var/task is strictly read-only. The only writable dir is os.tmpdir() (/tmp)
    const baseDir = isServerless
      ? path.join(os.tmpdir(), "voicetrace_data")
      : (process.env.DATA_DIR || path.resolve(process.cwd(), "data"));

    const audioDir = path.resolve(baseDir, "audio");

    try {
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      return audioDir;
    } catch {
      // Fallback directly to os.tmpdir()
      const fallbackDir = path.join(os.tmpdir(), "voicetrace_audio");
      try {
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
      } catch {}
      return fallbackDir;
    }
  }

  async saveArtifact(
    sessionId: string,
    ttsResult: TTSResult,
    options: {
      turnId?: string;
      eventId?: string;
      stateVersion: number;
    }
  ): Promise<AudioArtifact> {
    const artifactId = `art_${crypto.randomBytes(12).toString("hex")}`;
    const ext = ttsResult.audioFormat === "wav" ? "wav" : "mp3";
    const fileName = `${artifactId}.${ext}`;

    // Always cache in memory first for zero-latency serverless delivery
    if (ttsResult.audioBuffer) {
      globalAudioCache.set(artifactId, ttsResult.audioBuffer);
    }

    // Attempt to write to disk, but never crash the turn if filesystem is restricted
    try {
      const storageDir = this.getStorageDir();
      const filePath = path.resolve(storageDir, fileName);
      fs.writeFileSync(filePath, ttsResult.audioBuffer);
    } catch (fsErr) {
      console.warn("Audio disk write skipped in serverless environment (using in-memory cache):", fsErr);
    }

    const storageUrl = `/api/audio/${artifactId}`;
    const generatedAt = ttsResult.requestTimestamp;
    const availableAt = ttsResult.responseTimestamp;

    await query(
      `INSERT INTO audio_artifacts (
        id, session_id, turn_id, event_id, provider, model, voice,
        language, endpoint, audio_format, transport, storage_url,
        duration_ms, generated_at, available_at, state_version,
        is_synthetic, metadata_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        artifactId,
        sessionId,
        options.turnId || null,
        options.eventId || null,
        ttsResult.provider,
        ttsResult.model,
        ttsResult.voice,
        ttsResult.language,
        ttsResult.endpoint,
        ttsResult.audioFormat,
        ttsResult.transport,
        storageUrl,
        ttsResult.durationMs,
        generatedAt,
        availableAt,
        options.stateVersion,
        ttsResult.isSynthetic,
        JSON.stringify(ttsResult.metadata),
      ]
    );

    return {
      id: artifactId,
      session_id: sessionId,
      turn_id: options.turnId || null,
      event_id: options.eventId || null,
      provider: ttsResult.provider,
      model: ttsResult.model,
      voice: ttsResult.voice,
      language: ttsResult.language,
      endpoint: ttsResult.endpoint,
      audio_format: ttsResult.audioFormat,
      transport: ttsResult.transport,
      storage_url: storageUrl,
      duration_ms: ttsResult.durationMs,
      generated_at: generatedAt,
      available_at: availableAt,
      state_version: options.stateVersion,
      is_synthetic: ttsResult.isSynthetic,
      metadata_json: ttsResult.metadata,
    };
  }

  async getArtifact(id: string): Promise<{ artifact: AudioArtifact; buffer?: Buffer } | null> {
    const res = await query<AudioArtifact>(
      `SELECT * FROM audio_artifacts WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const artifact = res.rows[0];

    // Check in-memory cache first
    let buffer = globalAudioCache.get(id);

    // Fallback to disk if not in memory
    if (!buffer) {
      try {
        const ext = artifact.audio_format === "wav" ? "wav" : "mp3";
        const filePath = path.resolve(this.getStorageDir(), `${id}.${ext}`);
        if (fs.existsSync(filePath)) {
          buffer = fs.readFileSync(filePath);
          globalAudioCache.set(id, buffer);
        }
      } catch (e) {
        console.warn("Failed to read audio from disk:", e);
      }
    }

    return { artifact, buffer };
  }

  async updatePlaybackLifecycle(
    artifactId: string,
    updates: {
      playbackStartedAt?: string;
      playbackEndedAt?: string;
      cancelledAt?: string;
    }
  ): Promise<void> {
    const clauses: string[] = [];
    const params: any[] = [artifactId];

    if (updates.playbackStartedAt) {
      params.push(updates.playbackStartedAt);
      clauses.push(`playback_started_at = $${params.length}`);
    }
    if (updates.playbackEndedAt) {
      params.push(updates.playbackEndedAt);
      clauses.push(`playback_ended_at = $${params.length}`);
    }
    if (updates.cancelledAt) {
      params.push(updates.cancelledAt);
      clauses.push(`cancelled_at = $${params.length}`);
    }

    if (clauses.length > 0) {
      await query(
        `UPDATE audio_artifacts SET ${clauses.join(", ")} WHERE id = $1`,
        params
      );
    }
  }
}

export const audioStore = new AudioArtifactStore();
