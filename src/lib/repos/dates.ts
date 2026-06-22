import { db } from '../db';
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
