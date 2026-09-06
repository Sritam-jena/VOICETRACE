import { describe, it, expect } from "vitest";
import { RimeTTSProvider } from "../../lib/providers/rime";
import { MockRimeTTSProvider } from "../../lib/providers/mock-tts";

describe("Rime TTS Provider & Offline Fixtures", () => {
  it("exposes documented Rime model and voice configuration", () => {
    const rime = new RimeTTSProvider();
    const meta = rime.getConfigMetadata();

    expect(meta.provider).toBe("Rime");
    expect(meta.model).toBe("coda");
    expect(meta.voice).toBe(process.env.RIME_VOICE || "astra");
    expect(meta.language).toBe("en");
    expect(meta.endpoint).toBe("https://users.rime.ai/v1/rime-tts");
    expect(meta.audioFormat).toBe("mp3");
    expect(meta.transport).toBe("http_streaming");
  });

  it("produces valid playable synthetic audio in offline mock fixture", async () => {
    const mock = new MockRimeTTSProvider();
    const result = await mock.synthesize({
      text: "Hello, this is a deterministic test artifact.",
      sessionId: "ses_test",
      stateVersion: 1,
    });

    expect(result.provider).toBe("MOCK_SYNTHETIC");
    expect(result.isSynthetic).toBe(true);
    expect(result.audioBuffer.length).toBeGreaterThan(100);
    // Verify RIFF WAV header
    expect(result.audioBuffer.toString("ascii", 0, 4)).toBe("RIFF");
    expect(result.audioBuffer.toString("ascii", 8, 12)).toBe("WAVE");
    expect(result.durationMs).toBeGreaterThan(1000);
  });
});
