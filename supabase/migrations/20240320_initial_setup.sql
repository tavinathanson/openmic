-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create comedians table
CREATE TABLE comedians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audience table
CREATE TABLE audience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    number_of_people INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX comedians_email_idx ON comedians(email);
CREATE INDEX comedians_full_name_idx ON comedians(full_name);
CREATE INDEX audience_email_idx ON audience(email);

-- Set up Row Level Security (RLS)
ALTER TABLE comedians ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can restrict these based on your needs)
CREATE POLICY "Allow all operations on comedians" ON comedians
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on audience" ON audience
    FOR ALL USING (true); 