-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing objects if re-running this script
DROP VIEW IF EXISTS comedian_signup_count;
DROP VIEW IF EXISTS comedian_signups;
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

-- people: allow inserts; selects and deletes are protected by RLS
CREATE POLICY people_insert ON people FOR INSERT WITH CHECK (true);
CREATE POLICY people_select ON people
  FOR SELECT USING (email = auth.jwt() ->> 'email');
CREATE POLICY people_delete ON people
  FOR DELETE USING (email = auth.jwt() ->> 'email');

-- sign_ups: allow inserts; selects and deletes are protected by RLS
CREATE POLICY signups_insert ON sign_ups FOR INSERT WITH CHECK (true);
CREATE POLICY signups_select ON public.sign_ups
  FOR SELECT
  USING (
    person_id = (auth.jwt() ->> 'person_id')::uuid
    AND open_mic_date_id = (auth.jwt() ->> 'open_mic_date_id')::uuid
  ); 
CREATE POLICY signups_delete ON sign_ups
  FOR DELETE USING (
    id = (auth.jwt() ->> 'id')::uuid
  );
CREATE POLICY signups_select_by_id ON sign_ups
  FOR SELECT USING (id = (auth.jwt() ->> 'id')::uuid);

-- Create function to get count safely, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_comedian_signup_count(p_date_id UUID)
  RETURNS BIGINT
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COUNT(*)::bigint
      FROM public.sign_ups
     WHERE signup_type       = 'comedian'
       AND open_mic_date_id  = p_date_id;
$$;

-- Grant execute so anonymous users can call this RPC
GRANT EXECUTE ON FUNCTION public.get_comedian_signup_count(UUID) TO anon;

-- Insert a sample date (optional)
INSERT INTO open_mic_dates (date, time, timezone, is_active)
VALUES (CURRENT_DATE, '19:30:00', 'America/New_York', true); 