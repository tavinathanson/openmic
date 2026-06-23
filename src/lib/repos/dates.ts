import { sql } from 'kysely';
import { db } from '../db';
import { todayEastern } from '../openMic';
import type { OpenMicDate } from '../db-types';

/** Fetch the single active open mic date, throwing if none exists. */
export async function getActiveOpenMicDate(): Promise<OpenMicDate> {
  const row = await db
    .selectFrom('open_mic_dates')
    .selectAll()
    .where('is_active', '=', true)
    .orderBy('date', 'asc')
    .limit(1)
    .executeTakeFirst();

  if (!row) throw new Error('No active open mic date found');
  return row;
}

/** Add a number of calendar days to a YYYY-MM-DD string. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * Ensure there's an active open mic date today or in the future. If one already
 * exists, returns it untouched. Otherwise deactivates any stale past dates and
 * creates a fresh active one `daysOut` days from today (Eastern).
 */
export async function ensureUpcomingActiveDate(
  daysOut = 10
): Promise<{ created: boolean; date: OpenMicDate }> {
  const today = todayEastern();

  const existing = await db
    .selectFrom('open_mic_dates')
    .selectAll()
    .where('is_active', '=', true)
    .where(sql<boolean>`date >= ${today}::date`)
    .orderBy('date', 'asc')
    .limit(1)
    .executeTakeFirst();

  if (existing) return { created: false, date: existing };

  // Deactivate stale (past) active dates so the new one is THE active date.
  await db.updateTable('open_mic_dates').set({ is_active: false }).where('is_active', '=', true).execute();

  const date = await db
    .insertInto('open_mic_dates')
    .values({
      id: crypto.randomUUID(),
      date: addDays(today, daysOut),
      time: '19:30:00',
      timezone: 'America/New_York',
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { created: true, date };
}
