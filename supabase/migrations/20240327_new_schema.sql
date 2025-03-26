-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables
DROP TABLE IF EXISTS comedians;
DROP TABLE IF EXISTS audience;
DROP TABLE IF EXISTS sign_ups;
DROP TABLE IF EXISTS people;
DROP TABLE IF EXISTS open_mic_dates;

-- Create open_mic_dates table
CREATE TABLE open_mic_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
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

-- Create sign_ups table
CREATE TABLE sign_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id),
    open_mic_date_id UUID NOT NULL REFERENCES open_mic_dates(id),
    number_of_people INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(person_id, open_mic_date_id)
);

-- Create indexes for better query performance
CREATE INDEX open_mic_dates_active_idx ON open_mic_dates(is_active);
CREATE INDEX open_mic_dates_date_idx ON open_mic_dates(date);
CREATE INDEX people_email_idx ON people(email);
CREATE INDEX people_full_name_idx ON people(full_name);
CREATE INDEX sign_ups_person_id_idx ON sign_ups(person_id);
CREATE INDEX sign_ups_date_id_idx ON sign_ups(open_mic_date_id);

-- Set up Row Level Security (RLS)
ALTER TABLE open_mic_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE sign_ups ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
CREATE POLICY "Allow all operations on open_mic_dates" ON open_mic_dates
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on people" ON people
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on sign_ups" ON sign_ups
    FOR ALL USING (true);

-- Insert a sample date (you can modify this as needed)
INSERT INTO open_mic_dates (date, is_active) VALUES (CURRENT_DATE, true); 