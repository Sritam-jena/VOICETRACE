import { eventEmitter } from "../events/emitter";

export interface ChaosConfig {
  enabled: boolean;
  toolDelayMs?: number;
  ttsDelayMs?: number;
  interruptionAtMs?: number;
  injectStaleToolResponse?: boolean;
  injectDuplicateResponse?: boolean;
  playbackDelayMs?: number;
  targetTurn?: number;
}

export class ChaosEngine {
  private config: ChaosConfig = { enabled: false };

  configure(config: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ChaosConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return Boolean(this.config.enabled);
  }

  async applyToolDelay(sessionId: string, stateVersion: number, turnId?: string): Promise<number> {
    if (!this.config.enabled || !this.config.toolDelayMs) {
      return 0;
    }

    const delayMs = this.config.toolDelayMs;
    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "FAULT_INJECTED",
      stateVersion,
      source: "CHAOS",
      status: "SUCCESS",
      payload: {
        faultType: "TOOL_DELAY",
        delayMs,
        deterministic: true,
        metadata: {
          description: `Chaos injected ${delayMs}ms tool delay to induce race condition with user speech.`,
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return delayMs;
  }

  async applyTtsDelay(sessionId: string, stateVersion: number, turnId?: string): Promise<number> {
    if (!this.config.enabled || !this.config.ttsDelayMs) {
      return 0;
    }

    const delayMs = this.config.ttsDelayMs;
    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "FAULT_INJECTED",
      stateVersion,
      source: "CHAOS",
      status: "SUCCESS",
      payload: {
        faultType: "TTS_DELAY",
        delayMs,
        deterministic: true,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return delayMs;
  }

  async recordInterruptionFault(
    sessionId: string,
    stateVersion: number,
    turnId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "FAULT_INJECTED",
      stateVersion,
      source: "CHAOS",
      status: "SUCCESS",
      payload: {
        faultType: "INTERRUPTION",
        deterministic: true,
        metadata,
      },
    });
  }

  async recordStaleToolResponseFault(
    sessionId: string,
    staleStateVersion: number,
    activeStateVersion: number,
    turnId?: string
  ): Promise<void> {
    await eventEmitter.emit({
      sessionId,
      turnId,
      type: "FAULT_INJECTED",
      stateVersion: activeStateVersion,
      source: "CHAOS",
      status: "SUCCESS",
      payload: {
        faultType: "STALE_TOOL_RESPONSE",
        deterministic: true,
        metadata: {
          simulatedOldStateVersion: staleStateVersion,
          activeStateVersion,
        },
      },
    });
  }
}

export const chaosEngine = new ChaosEngine();
