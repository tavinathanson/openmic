-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create shows table
CREATE TABLE shows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    venue_name TEXT,
    venue_address TEXT,
    price DECIMAL(10, 2) NOT NULL, -- e.g., 25.00
    total_tickets INTEGER NOT NULL,
    tickets_sold INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    stripe_price_id TEXT, -- To store Stripe Price ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID NOT NULL REFERENCES shows(id),
    person_id UUID NOT NULL REFERENCES people(id), -- Reusing existing people table
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE, -- From Stripe payment
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(show_id, person_id) -- A person can only have one set of tickets per show initially, can be relaxed if needed
);

-- Create payments table (to log Stripe transactions)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id), -- Can be null if it's a direct payment not tied to a ticket object initially
    stripe_charge_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL, -- e.g., 'succeeded', 'failed', 'pending'
    payment_method_details JSONB, -- Store details like card brand, last4
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX shows_date_idx ON shows(date);
CREATE INDEX shows_active_idx ON shows(is_active);
CREATE INDEX tickets_show_id_idx ON tickets(show_id);
CREATE INDEX tickets_person_id_idx ON tickets(person_id);
CREATE INDEX tickets_stripe_payment_intent_id_idx ON tickets(stripe_payment_intent_id);
CREATE INDEX payments_ticket_id_idx ON payments(ticket_id);
CREATE INDEX payments_stripe_charge_id_idx ON payments(stripe_charge_id);
CREATE INDEX payments_stripe_payment_intent_id_idx ON payments(stripe_payment_intent_id);

-- Row Level Security (RLS) - Basic policies, adjust as needed

-- Shows: public reads, admin writes (assuming an admin role or mechanism)
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY shows_select_policy ON shows FOR SELECT USING (true);
-- CREATE POLICY shows_admin_all_policy ON shows FOR ALL USING (auth.role() = 'service_role' OR is_admin_user_function()); -- Example admin policy

-- Tickets: users can see their own tickets, service role for backend ops
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_select_own_policy ON tickets FOR SELECT USING (person_id = (SELECT id FROM people WHERE email = auth.jwt() ->> 'email'));
-- CREATE POLICY tickets_service_role_policy ON tickets FOR ALL USING (auth.role() = 'service_role');

-- Payments: users can see their own payments (indirectly via tickets), service role for backend ops
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY payments_service_role_policy ON payments FOR ALL USING (auth.role() = 'service_role');
-- More granular policies might be needed for payments if users can directly access them.

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shows_timestamp
BEFORE UPDATE ON shows
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_tickets_timestamp
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); 