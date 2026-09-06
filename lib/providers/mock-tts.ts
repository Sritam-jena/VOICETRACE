import { TTSInput, TTSProvider, TTSResult } from "./tts";

/**
 * Creates a valid PCM 16-bit Mono WAV buffer with a gentle audible tone
 * for deterministic playback and testing.
 */
function createWavBuffer(durationMs: number, frequency: number = 440): Buffer {
  const sampleRate = 16000;
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  const dataByteLength = numSamples * 2; // 16-bit = 2 bytes per sample
  const buffer = Buffer.alloc(44 + dataByteLength);

  // RIFF identifier
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write("WAVE", 8);

  // 'fmt ' chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // subchunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // 'data' chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataByteLength, 40);

  // Generate sine wave samples with envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Fade in/out envelope
    const envelope = Math.sin((Math.PI * i) / numSamples);
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.4 * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

export class MockRimeTTSProvider implements TTSProvider {
  readonly name = "MOCK_SYNTHETIC" as const;

  isConfigured(): boolean {
    return true;
  }

  async synthesize(input: TTSInput): Promise<TTSResult> {
    const requestTimestamp = new Date().toISOString();
    const startTime = Date.now();

    // Deterministic duration based on text length: ~300ms per word, min 1000ms
    const words = input.text.trim().split(/\s+/).length;
    const durationMs = Math.max(1200, Math.round(words * 320));

    // Generate valid WAV audio buffer
    const audioBuffer = createWavBuffer(durationMs, 523.25); // C5 tone
    const latencyMs = 85; // Simulated low latency

    const responseTimestamp = new Date(startTime + latencyMs).toISOString();

    return {
      provider: "MOCK_SYNTHETIC",
      model: input.modelId || "synthetic-mock-v1",
      voice: input.speaker || "synthetic-voice",
      language: "en",
      endpoint: "local://synthetic-fixture",
      audioFormat: "wav",
      transport: "local_memory",
      audioBuffer,
      durationMs,
      requestTimestamp,
      responseTimestamp,
      latencyMs,
      correlationId: input.correlationId,
      isSynthetic: true,
      metadata: {
        bytes: audioBuffer.length,
        syntheticReason: "Offline testing fixture / Mock Provider",
      },
    };
  }
}
