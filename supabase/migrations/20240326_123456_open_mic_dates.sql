-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create open_mic_dates table
CREATE TABLE open_mic_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add date_id to comedians table
ALTER TABLE comedians ADD COLUMN date_id UUID REFERENCES open_mic_dates(id);

-- Add date_id to audience table
ALTER TABLE audience ADD COLUMN date_id UUID REFERENCES open_mic_dates(id);

-- Drop existing unique constraints
ALTER TABLE comedians DROP CONSTRAINT IF EXISTS comedians_email_key;
ALTER TABLE audience DROP CONSTRAINT IF EXISTS audience_email_key;

-- Add composite unique constraints
ALTER TABLE comedians ADD CONSTRAINT comedians_email_date_unique UNIQUE (email, date_id);
ALTER TABLE audience ADD CONSTRAINT audience_email_date_unique UNIQUE (email, date_id);

-- Create indexes for better query performance
CREATE INDEX open_mic_dates_active_idx ON open_mic_dates(is_active);
CREATE INDEX open_mic_dates_date_idx ON open_mic_dates(date);
CREATE INDEX comedians_email_date_idx ON comedians(email, date_id);
CREATE INDEX audience_email_date_idx ON audience(email, date_id);

-- Enable RLS on open_mic_dates
ALTER TABLE open_mic_dates ENABLE ROW LEVEL SECURITY;

-- Create policy for open_mic_dates
CREATE POLICY "Allow all operations on open_mic_dates" ON open_mic_dates
    FOR ALL USING (true);

-- Insert a sample date (you can modify this as needed)
INSERT INTO open_mic_dates (date, is_active) VALUES (CURRENT_DATE, true); 