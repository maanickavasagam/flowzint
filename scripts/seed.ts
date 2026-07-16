/**
 * Seed the SQLite database with realistic demo data.
 * Usage: npm run seed
 */
import { seedDatabase } from "../src/lib/seed";

const result = seedDatabase(true);
if (result.seeded) {
  console.log("✅ Foyer database seeded with demo contacts, leads, meetings, opportunities and analytics.");
} else {
  console.log("ℹ️  Database already seeded (nothing to do).");
}
process.exit(0);
