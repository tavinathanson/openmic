// Runs once when a server instance starts. In development only, make sure there's
// always an upcoming open mic date so the app has something to show. Guarded so it
// never touches a production database or runs on the edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV === 'production') return;
  if (!process.env.DATABASE_URL) return;

  try {
    const { ensureUpcomingActiveDate } = await import('@/lib/repos/dates');
    const { created, date } = await ensureUpcomingActiveDate(10);
    if (created) {
      console.log(`[instrumentation] Created upcoming open mic date: ${date.date}`);
    }
  } catch (err) {
    console.error('[instrumentation] Failed to ensure upcoming date:', err);
  }
}
