import { seedDatabase } from "../lib/db/seed";
import { closeDb } from "../lib/db";

async function main() {
  try {
    await seedDatabase();
    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    await closeDb();
    process.exit(1);
  }
}

main();
