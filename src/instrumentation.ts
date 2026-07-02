/**
 * Next.js instrumentation hook — runs once when the server boots.
 * We use it to auto-seed the database on first run so dashboards are never empty.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedIfEmpty } = await import("./lib/seed");
    seedIfEmpty();
  }
}
