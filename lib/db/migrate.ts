import fs from "fs";
import path from "path";
import { getDb, closeDb } from "./index";

export async function runMigrations(): Promise<void> {
  console.log("==> Running VoiceTrace Database Migrations...");
  const db = await getDb();

  const schemaPath = path.resolve(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  // Execute schema DDL
  await db.exec(schemaSql);

  // Ensure default project and agent seed records exist
  await db.exec(`
    INSERT INTO projects (id, name, created_at, updated_at) VALUES ('proj_demo', 'Voice AI Production', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;
    INSERT INTO agents (id, project_id, name, created_at) VALUES ('agent_concierge', 'proj_demo', 'Concierge Realtime Agent', NOW()) ON CONFLICT (id) DO NOTHING;
    INSERT INTO agent_versions (id, agent_id, version, prompt, configuration_json, created_at) VALUES ('v1-baseline', 'agent_concierge', '1.0.0', 'baseline', '{}', NOW()) ON CONFLICT (id) DO NOTHING;
    INSERT INTO agent_versions (id, agent_id, version, prompt, configuration_json, created_at) VALUES ('v2-guarded', 'agent_concierge', '2.0.0', 'guarded', '{}', NOW()) ON CONFLICT (id) DO NOTHING;
  `);

  console.log("==> Schema migration completed successfully.");
}

if (require.main === module || process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("db-migrate.ts")) {
  runMigrations()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Migration failed:", err);
      await closeDb();
      process.exit(1);
    });
}
