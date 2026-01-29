import type { SupabaseClient } from '@supabase/supabase-js';

// Signup window opens this many days before the event (for comedians only)
export const COMEDIAN_SIGNUP_WINDOW_DAYS = 14;

/**
 * Check if the comedian signup window is open for a given event date.
 * Returns true if we're within COMEDIAN_SIGNUP_WINDOW_DAYS of the event.
 */
export function isComedianSignupWindowOpen(eventDateStr: string): boolean {
  const eventDate = new Date(eventDateStr + 'T00:00:00Z');
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= COMEDIAN_SIGNUP_WINDOW_DAYS;
}

/**
 * Get the date when comedian signups open for a given event date.
 */
export function getComedianSignupOpenDate(eventDateStr: string): Date {
  const eventDate = new Date(eventDateStr + 'T00:00:00Z');
  return new Date(eventDate.getTime() - COMEDIAN_SIGNUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);
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