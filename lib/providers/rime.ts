import { TTSInput, TTSProvider, TTSResult } from "./tts";
import { getRimeApiKey } from "@/lib/config/env";

export class RimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RimeConfigurationError";
  }
}

export class RimeTTSProvider implements TTSProvider {
  readonly name = "RIME" as const;

  private endpoint: string;
  private defaultModel: string;
  private defaultVoice: string;
  private defaultLanguage: string;
  private defaultFormat: string;
  private transport: string;

  constructor() {
    this.endpoint =
      process.env.RIME_ENDPOINT?.trim() || "https://users.rime.ai/v1/rime-tts";
    this.defaultModel = process.env.RIME_MODEL?.trim() || "coda";
    this.defaultVoice = process.env.RIME_VOICE?.trim() || "astra";
    this.defaultLanguage = process.env.RIME_LANGUAGE?.trim() || "en";
    this.defaultFormat = process.env.RIME_AUDIO_FORMAT?.trim() || "mp3";
    this.transport = process.env.RIME_TRANSPORT?.trim() || "http_streaming";
  }

  getEffectiveApiKey(): string {
    return getRimeApiKey();
  }

  isConfigured(): boolean {
    return this.getEffectiveApiKey().length > 0;
  }

  getConfigMetadata() {
    return {
      provider: "Rime",
      model: this.defaultModel,
      voice: this.defaultVoice,
      language: this.defaultLanguage,
      endpoint: this.endpoint,
      audioFormat: this.defaultFormat,
      transport: this.transport,
      isConfigured: this.isConfigured(),
    };
  }

  async synthesize(input: TTSInput): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new RimeConfigurationError(
        "Rime TTS unavailable: RIME_API_KEY is not configured in server environment."
      );
    }

    const model = input.modelId || this.defaultModel;
    const voice = input.speaker || this.defaultVoice;
    const language = this.defaultLanguage;
    const audioFormat = input.audioFormat || this.defaultFormat;
    const requestTimestamp = new Date().toISOString();
    const startTime = Date.now();

    const requestBody = {
      text: input.text,
      speaker: voice,
      modelId: model,
      audioFormat: audioFormat,
      speedAlpha: input.speedAlpha ?? 1.0,
    };

    const acceptHeader =
      audioFormat === "wav"
        ? "audio/wav"
        : audioFormat === "pcm"
        ? "audio/pcm"
        : "audio/mpeg";

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getEffectiveApiKey()}`,
        "Content-Type": "application/json",
        Accept: acceptHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const responseTimestamp = new Date().toISOString();
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Rime API synthesis failed [${response.status}]: ${errorText || response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Approximate audio duration: for mp3 ~128kbps = 16KB/sec; or ~150-180 words per min
    // 1 word ~= 300ms speech. If buffer length is available, estimate duration:
    const words = input.text.trim().split(/\s+/).length;
    const estimatedDurationMs = Math.max(
      800,
      Math.round(words * 280)
    );

    return {
      provider: "RIME",
      model,
      voice,
      language,
      endpoint: this.endpoint,
      audioFormat,
      transport: this.transport,
      audioBuffer,
      durationMs: estimatedDurationMs,
      requestTimestamp,
      responseTimestamp,
      latencyMs,
      correlationId: input.correlationId,
      isSynthetic: false,
      metadata: {
        bytes: audioBuffer.length,
        status: response.status,
        headers: {
          contentType: response.headers.get("content-type"),
          rimeRequestId: response.headers.get("x-request-id"),
        },
      },
    };
  }
}
