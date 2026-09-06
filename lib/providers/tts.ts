export interface TTSInput {
  text: string;
  speaker?: string; // voice
  modelId?: string;
  audioFormat?: "mp3" | "pcm" | "wav";
  speedAlpha?: number;
  correlationId?: string;
  sessionId: string;
  turnId?: string;
  stateVersion: number;
}

export interface TTSResult {
  provider: "RIME" | "MOCK_SYNTHETIC";
  model: string;
  voice: string;
  language: string;
  endpoint: string;
  audioFormat: string;
  transport: string;
  audioBuffer: Buffer;
  durationMs: number;
  requestTimestamp: string;
  responseTimestamp: string;
  latencyMs: number;
  correlationId?: string;
  isSynthetic: boolean;
  metadata: Record<string, any>;
}

export interface TTSProvider {
  name: "RIME" | "MOCK_SYNTHETIC";
  synthesize(input: TTSInput): Promise<TTSResult>;
  isConfigured(): boolean;
}
