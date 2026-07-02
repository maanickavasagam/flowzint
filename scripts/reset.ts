/**
 * Wipe and re-seed the database from scratch.
 * Usage: npm run db:reset
 */
import { seedDatabase } from "../src/lib/seed";

seedDatabase(true);
console.log("♻️  FlowZint database reset and re-seeded.");
process.exit(0);
