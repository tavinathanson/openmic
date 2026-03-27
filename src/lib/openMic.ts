import type { SupabaseClient } from '@supabase/supabase-js';

// Signup window opens this many days before the event (for comedians only)
export const COMEDIAN_SIGNUP_WINDOW_DAYS = 14;

const EASTERN_TZ = 'America/New_York';

/** Get today's date in Eastern time as YYYY-MM-DD */
export function todayEastern(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: EASTERN_TZ });
}

/** Subtract calendar days from a YYYY-MM-DD string, returns YYYY-MM-DD */
function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Check if the comedian signup window is open for a given event date.
 * Compares calendar dates in Eastern time — flips at midnight ET.
 */
export function isComedianSignupWindowOpen(eventDateStr: string, now: Date = new Date()): boolean {
  const today = todayEastern(now);
  const opensOn = subtractDays(eventDateStr, COMEDIAN_SIGNUP_WINDOW_DAYS);
  return today >= opensOn;
}

/**
 * Get the date when comedian signups open for a given event date.
 */
export function getComedianSignupOpenDate(eventDateStr: string): Date {
  const opensOn = subtractDays(eventDateStr, COMEDIAN_SIGNUP_WINDOW_DAYS);
  const [y, m, d] = opensOn.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export async function getActiveOpenMicDate(supabase: SupabaseClient) {
  // Fetch the single active open mic date, throwing if none or a DB error occurs.
  const { data, error } = await supabase
    .from('open_mic_dates')
    .select('*')
    .eq('is_active', true)
    .order('date', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    throw error ?? new Error('No active open mic date found');
  }

  return data;
}

export async function getPersonByEmail(supabase: SupabaseClient, email: string) {
  // Attempt to fetch a person by email. Return null if not found.
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .ilike('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    // propagate real errors
    throw error;
  }

  return data ?? null;
} 