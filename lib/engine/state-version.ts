import { eventEmitter } from "../events/emitter";

export interface StateValidationResult {
  isValid: boolean;
  activeStateVersion: number;
  providedStateVersion: number;
  reason?: string;
}

export class StateVersionManager {
  private currentVersion: number;
  private sessionId: string;
  private stateContext: Record<string, any> = {};

  constructor(sessionId: string, initialVersion: number = 1) {
    this.sessionId = sessionId;
    this.currentVersion = initialVersion;
  }

  getVersion(): number {
    return this.currentVersion;
  }

  getContext(): Record<string, any> {
    return { ...this.stateContext };
  }

  setContext(key: string, value: any): void {
    this.stateContext[key] = value;
  }

  /**
   * Monotonically advance state version with recorded causal event
   */
  async incrementVersion(
    trigger: "USER_INTERRUPT" | "NEW_TURN" | "SYSTEM_RESET",
    reason: string,
    turnId?: string,
    correlationId?: string
  ): Promise<number> {
    const fromVersion = this.currentVersion;
    this.currentVersion += 1;
    const toVersion = this.currentVersion;

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "STATE_VERSION_CHANGED",
      stateVersion: toVersion,
      source: "AGENT",
      status: "SUCCESS",
      correlationId,
      payload: {
        fromVersion,
        toVersion,
        trigger,
      },
    });

    await eventEmitter.emit({
      sessionId: this.sessionId,
      turnId,
      type: "AGENT_STATE_CHANGED",
      stateVersion: toVersion,
      source: "AGENT",
      status: "SUCCESS",
      correlationId,
      payload: {
        previousStateVersion: fromVersion,
        newStateVersion: toVersion,
        reason,
        activeContext: { ...this.stateContext },
      },
    });

    return toVersion;
  }

  /**
   * Validates if an operation or artifact matches the active state version
   */
  validateStateVersion(providedVersion: number): StateValidationResult {
    if (providedVersion === this.currentVersion) {
      return {
        isValid: true,
        activeStateVersion: this.currentVersion,
        providedStateVersion: providedVersion,
      };
    }

    return {
      isValid: false,
      activeStateVersion: this.currentVersion,
      providedStateVersion: providedVersion,
      reason:
        providedVersion < this.currentVersion
          ? `Operation is stale: expected state v${this.currentVersion}, received v${providedVersion}`
          : `Operation references future state: active is v${this.currentVersion}, received v${providedVersion}`,
    };
  }
}
