import { runMigrations } from "../lib/db/migrate";
import { closeDb } from "../lib/db";

async function main() {
  try {
    await runMigrations();
    await closeDb();
    console.log("Migration finished.");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    await closeDb();
    process.exit(1);
  }
}

main();
