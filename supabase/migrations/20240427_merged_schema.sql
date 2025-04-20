-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing objects if re-running this script
DROP TABLE IF EXISTS sign_ups;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS open_mic_dates;

-- Create open_mic_dates table
CREATE TABLE open_mic_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TIME NOT NULL DEFAULT '19:30:00',
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create people table
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sign_ups table (merged additional columns from previous migrations)
CREATE TABLE sign_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id),
    open_mic_date_id UUID NOT NULL REFERENCES open_mic_dates(id),
    number_of_people INTEGER NOT NULL DEFAULT 1,
    signup_type TEXT NOT NULL DEFAULT 'audience' CHECK (signup_type IN ('comedian', 'audience')),
    first_mic_ever BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(person_id, open_mic_date_id)
);

-- Indexes
CREATE INDEX open_mic_dates_active_idx ON open_mic_dates(is_active);
CREATE INDEX open_mic_dates_date_idx ON open_mic_dates(date);

CREATE INDEX people_email_idx ON people(email);
CREATE INDEX people_full_name_idx ON people(full_name);

CREATE INDEX sign_ups_person_id_idx ON sign_ups(person_id);
CREATE INDEX sign_ups_date_id_idx ON sign_ups(open_mic_date_id);
CREATE INDEX sign_ups_type_idx ON sign_ups(signup_type);

-- Row Level Security (RLS)
ALTER TABLE open_mic_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE sign_ups ENABLE ROW LEVEL SECURITY;

-- open_mic_dates: allow public reads & inserts (adjust as needed)
CREATE POLICY open_mic_dates_select ON open_mic_dates
    FOR SELECT USING (true);
CREATE POLICY open_mic_dates_insert ON open_mic_dates
    FOR INSERT WITH CHECK (true);

-- people: allow INSERTS ONLY (no SELECT/UPDATE/DELETE)
CREATE POLICY people_insert ON people
    FOR INSERT WITH CHECK (true);

-- sign_ups: allow INSERTS ONLY (no SELECT/UPDATE/DELETE)
CREATE POLICY signups_insert ON sign_ups
    FOR INSERT WITH CHECK (true);

-- Insert a sample date (optional)
INSERT INTO open_mic_dates (date, time, timezone, is_active)
VALUES (CURRENT_DATE, '19:30:00', 'America/New_York', true); 