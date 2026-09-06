import { query } from "../db";
import { VoiceEvent, EventSource, EventStatus } from "./types";
import crypto from "crypto";

export type EventSubscriber = (event: VoiceEvent) => void;

class EventEmitterManager {
  private subscribers: Map<string, Set<EventSubscriber>> = new Map();
  private sessionSequences: Map<string, number> = new Map();

  subscribe(sessionId: string, callback: EventSubscriber): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    const set = this.subscribers.get(sessionId)!;
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.subscribers.delete(sessionId);
      }
    };
  }

  getNextSequence(sessionId: string): number {
    const current = this.sessionSequences.get(sessionId) ?? 0;
    const next = current + 1;
    this.sessionSequences.set(sessionId, next);
    return next;
  }

  setSequence(sessionId: string, seq: number): void {
    this.sessionSequences.set(sessionId, seq);
  }

  async emit<T extends VoiceEvent>(
    eventData: Omit<T, "id" | "sequence" | "timestamp"> & {
      id?: string;
      sequence?: number;
      timestamp?: string;
    }
  ): Promise<T> {
    const id = eventData.id || `evt_${crypto.randomBytes(12).toString("hex")}`;
    const sequence =
      eventData.sequence ?? this.getNextSequence(eventData.sessionId);
    const timestamp = eventData.timestamp || new Date().toISOString();

    const event = {
      ...eventData,
      id,
      sequence,
      timestamp,
    } as unknown as T;

    // Persist to PostgreSQL
    try {
      await query(
        `INSERT INTO events (
          id, session_id, turn_id, sequence, timestamp, type,
          correlation_id, parent_event_id, state_version, source,
          status, payload_json, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          event.id,
          event.sessionId,
          event.turnId || null,
          event.sequence,
          event.timestamp,
          event.type,
          event.correlationId || null,
          event.parentEventId || null,
          event.stateVersion,
          event.source,
          event.status,
          JSON.stringify(event.payload),
        ]
      );
    } catch (err) {
      console.error(`Failed to persist event ${event.id}:`, err);
    }

    // Broadcast to memory subscribers (WebSockets / SSE)
    const set = this.subscribers.get(event.sessionId);
    if (set) {
      for (const sub of set) {
        try {
          sub(event);
        } catch (subErr) {
          console.error("Subscriber callback failed:", subErr);
        }
      }
    }

    return event;
  }
}

export const eventEmitter = new EventEmitterManager();
