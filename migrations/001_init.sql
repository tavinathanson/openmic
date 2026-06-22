-- Initial schema for OpenMic on plain Postgres (no Supabase RLS / RPC / triggers).
-- IDs and timestamps are supplied by the application, so columns have no DB defaults
-- beyond simple value defaults. Mirrors the final shape of the old supabase/migrations.

CREATE TABLE open_mic_dates (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    time TIME NOT NULL DEFAULT '19:30:00',
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE people (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sign_ups (
    id UUID PRIMARY KEY,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    open_mic_date_id UUID NOT NULL REFERENCES open_mic_dates(id) ON DELETE CASCADE,
    number_of_people INTEGER NOT NULL DEFAULT 1,
    signup_type TEXT NOT NULL DEFAULT 'audience' CHECK (signup_type IN ('comedian', 'audience')),
    first_mic_ever BOOLEAN NOT NULL DEFAULT false,
    will_support BOOLEAN NOT NULL DEFAULT false,
    plus_one BOOLEAN NOT NULL DEFAULT false,
    is_waitlist BOOLEAN NOT NULL DEFAULT false,
    check_in_status TEXT CHECK (check_in_status IN ('early', 'on_time', 'late', 'not_coming')),
    lottery_order INTEGER,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (person_id, open_mic_date_id)
);

-- History rows intentionally have no FKs so they survive signup/person deletes.
CREATE TABLE cancellation_history (
    id UUID PRIMARY KEY,
    signup_id UUID NOT NULL,
    person_id UUID NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    open_mic_date_id UUID NOT NULL,
    event_date DATE,
    signup_type TEXT NOT NULL,
    cancelled_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX open_mic_dates_active_idx ON open_mic_dates(is_active);
CREATE INDEX open_mic_dates_date_idx ON open_mic_dates(date);

CREATE INDEX people_email_idx ON people(email);
CREATE INDEX people_full_name_idx ON people(full_name);

CREATE INDEX sign_ups_person_id_idx ON sign_ups(person_id);
CREATE INDEX sign_ups_date_id_idx ON sign_ups(open_mic_date_id);
CREATE INDEX sign_ups_type_idx ON sign_ups(signup_type);
CREATE INDEX sign_ups_waitlist_idx ON sign_ups(is_waitlist);
CREATE INDEX sign_ups_check_in_status_idx ON sign_ups(check_in_status);
CREATE INDEX sign_ups_lottery_order_idx ON sign_ups(lottery_order);

CREATE INDEX cancellation_history_email_idx ON cancellation_history(email);
CREATE INDEX cancellation_history_person_id_idx ON cancellation_history(person_id);
CREATE INDEX cancellation_history_cancelled_at_idx ON cancellation_history(cancelled_at);
