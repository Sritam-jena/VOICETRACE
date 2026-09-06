import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import fs from "fs";
import path from "path";
import os from "os";

export interface DbQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

// Next.js hot-reload safe global singleton pattern
const globalForDb = globalThis as unknown as {
  voicetraceDbClient?: DbClient | null;
  voicetraceDbPromise?: Promise<DbClient> | null;
};

class PgPoolClient implements DbClient {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PGliteClient implements DbClient {
  private pglite: PGlite;

  constructor(pglite: PGlite) {
    this.pglite = pglite;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>> {
    const res = await this.pglite.query<T>(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rows.length,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }
}

export async function getDb(): Promise<DbClient> {
  if (globalForDb.voicetraceDbClient) {
    return globalForDb.voicetraceDbClient;
  }

  if (globalForDb.voicetraceDbPromise) {
    return globalForDb.voicetraceDbPromise;
  }

  globalForDb.voicetraceDbPromise = (async () => {
    const dbUrl = process.env.DATABASE_URL?.trim();

    if (dbUrl) {
      const client = new PgPoolClient(dbUrl);
      globalForDb.voicetraceDbClient = client;
      return client;
    }

    // Default to embedded WASM PostgreSQL via PGlite
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY
    );
    const dataDir = isServerless
      ? path.join(os.tmpdir(), "voicetrace_data")
      : (process.env.DATA_DIR || path.resolve(process.cwd(), "data"));
    const subDir = process.env.NODE_ENV === "test" ? "pgdata_test" : "pgdata";
    const pgDataDir = path.resolve(dataDir, subDir);

    let pgliteInstance: PGlite;

    try {
      if (!fs.existsSync(pgDataDir)) {
        fs.mkdirSync(pgDataDir, { recursive: true });
      }
      pgliteInstance = new PGlite(pgDataDir);
      await pgliteInstance.waitReady;
    } catch (diskErr) {
      console.warn("PGlite disk initialization lock encountered, falling back to robust in-process instance:", diskErr);
      pgliteInstance = new PGlite(); // In-memory fallback immune to directory locks
      await pgliteInstance.waitReady;
    }

    const client = new PGliteClient(pgliteInstance);

    // Ensure schema migrations & seed records are present
    try {
      const schemaPath = path.resolve(process.cwd(), "lib", "db", "schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        await client.exec(schemaSql);
      }
      await client.exec(`
        INSERT INTO projects (id, name, created_at, updated_at) VALUES ('proj_demo', 'Voice AI Production', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
        INSERT INTO agents (id, project_id, name, created_at) VALUES ('agent_concierge', 'proj_demo', 'Concierge Realtime Agent', NOW()) ON CONFLICT (id) DO NOTHING;
        INSERT INTO agent_versions (id, agent_id, version, prompt, configuration_json, created_at) VALUES ('v1-baseline', 'agent_concierge', '1.0.0', 'baseline', '{}', NOW()) ON CONFLICT (id) DO NOTHING;
        INSERT INTO agent_versions (id, agent_id, version, prompt, configuration_json, created_at) VALUES ('v2-guarded', 'agent_concierge', '2.0.0', 'guarded', '{}', NOW()) ON CONFLICT (id) DO NOTHING;
      `);
    } catch (migErr) {
      console.error("Auto-schema setup notice:", migErr);
    }

    globalForDb.voicetraceDbClient = client;
    return client;
  })();

  return globalForDb.voicetraceDbPromise;
}

export async function closeDb(): Promise<void> {
  if (globalForDb.voicetraceDbClient) {
    await globalForDb.voicetraceDbClient.close();
    globalForDb.voicetraceDbClient = null;
    globalForDb.voicetraceDbPromise = null;
  }
}

export async function query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>> {
  const db = await getDb();
  return db.query<T>(sql, params);
}
