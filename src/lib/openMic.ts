import type { SupabaseClient } from '@supabase/supabase-js';

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
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    // propagate real errors
    throw error;
  }

  return data ?? null;
} 