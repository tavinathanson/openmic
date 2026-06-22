// Kysely table interfaces. Column types match migrations/001_init.sql.
// node-postgres returns booleans as booleans and (via the parsers configured in
// db.ts) date/timestamptz columns as strings, matching the old Supabase JSON shape.

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
  time: string; // HH:MM:SS
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface SignUpsTable {
  id: string;
  person_id: string;
  open_mic_date_id: string;
  number_of_people: number;
  signup_type: SignupType;
  first_mic_ever: boolean;
  will_support: boolean;
  plus_one: boolean;
  is_waitlist: boolean;
  check_in_status: CheckInStatus | null;
  lottery_order: number | null;
  checked_in_at: string | null;
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

// Convenience row types (Selectable shape) for use across the app.
export type Person = PeopleTable;
export type OpenMicDate = OpenMicDatesTable;
export type SignUp = SignUpsTable;
