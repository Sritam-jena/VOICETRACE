import fs from "fs";
import path from "path";
import crypto from "crypto";
import { query } from "../db";
import { TTSResult } from "../providers/tts";
import { AudioArtifact } from "../db/types";

class AudioArtifactStore {
  private getStorageDir(): string {
    const baseDir = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
    const audioDir = path.resolve(baseDir, "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    return audioDir;
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
    const filePath = path.resolve(this.getStorageDir(), fileName);

    // Write binary audio file to disk
    fs.writeFileSync(filePath, ttsResult.audioBuffer);

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
    const ext = artifact.audio_format === "wav" ? "wav" : "mp3";
    const filePath = path.resolve(this.getStorageDir(), `${id}.${ext}`);

    let buffer: Buffer | undefined;
    if (fs.existsSync(filePath)) {
      buffer = fs.readFileSync(filePath);
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
