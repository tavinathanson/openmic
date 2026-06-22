import type { Generated, Selectable } from 'kysely';

// Kysely table interfaces. Column types match migrations/001_init.sql.
// node-postgres returns booleans as booleans and (via the parsers configured in
// db.ts) date/timestamptz columns as strings, matching the old Supabase JSON shape.
// `Generated<T>` marks columns with a DB default so they're optional on insert.

export type SignupType = 'comedian' | 'audience';
export type CheckInStatus = 'early' | 'on_time' | 'late' | 'not_coming';

export interface PeopleTable {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface OpenMicDatesTable {
  id: string;
  date: string; // YYYY-MM-DD
  time: Generated<string>; // HH:MM:SS
  timezone: Generated<string>;
  is_active: Generated<boolean>;
  created_at: string;
}

export interface SignUpsTable {
  id: string;
  person_id: string;
  open_mic_date_id: string;
  number_of_people: Generated<number>;
  signup_type: Generated<SignupType>;
  first_mic_ever: Generated<boolean>;
  will_support: Generated<boolean>;
  plus_one: Generated<boolean>;
  is_waitlist: Generated<boolean>;
  check_in_status: Generated<CheckInStatus | null>;
  lottery_order: Generated<number | null>;
  checked_in_at: Generated<string | null>;
  created_at: string;
}

export interface CancellationHistoryTable {
  id: string;
  signup_id: string;
  person_id: string;
  email: string;
  full_name: string | null;
  open_mic_date_id: string;
  event_date: string | null;
  signup_type: string;
  cancelled_at: string;
}

export interface Database {
  people: PeopleTable;
  open_mic_dates: OpenMicDatesTable;
  sign_ups: SignUpsTable;
  cancellation_history: CancellationHistoryTable;
}

// Resolved row shapes (Generated<T> -> T) for use across the app.
export type Person = Selectable<PeopleTable>;
export type OpenMicDate = Selectable<OpenMicDatesTable>;
export type SignUp = Selectable<SignUpsTable>;
