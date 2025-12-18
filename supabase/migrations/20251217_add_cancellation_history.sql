-- Track cancellations automatically via trigger (no app code changes needed)

CREATE TABLE cancellation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signup_id UUID NOT NULL,
    person_id UUID NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    open_mic_date_id UUID NOT NULL,
    event_date DATE,
    signup_type TEXT NOT NULL,
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cancellation_history_email_idx ON cancellation_history(email);
CREATE INDEX cancellation_history_person_id_idx ON cancellation_history(person_id);
CREATE INDEX cancellation_history_cancelled_at_idx ON cancellation_history(cancelled_at);

-- Trigger function: copy sign_up to history before delete
-- Uses LEFT JOINs to handle edge cases (e.g., cascade deletes)
CREATE OR REPLACE FUNCTION log_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    v_email TEXT;
    v_full_name TEXT;
    v_event_date DATE;
BEGIN
    -- Get person data (may be null during cascade delete)
    SELECT email, full_name INTO v_email, v_full_name
    FROM people WHERE id = OLD.person_id;

    -- Get event date
    SELECT date INTO v_event_date
    FROM open_mic_dates WHERE id = OLD.open_mic_date_id;

    -- Always log the cancellation, even with partial data
    INSERT INTO cancellation_history (
        signup_id, person_id, email, full_name,
        open_mic_date_id, event_date, signup_type
    ) VALUES (
        OLD.id,
        OLD.person_id,
        COALESCE(v_email, 'unknown'),
        v_full_name,
        OLD.open_mic_date_id,
        v_event_date,
        OLD.signup_type
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to sign_ups table
CREATE TRIGGER on_signup_delete
    BEFORE DELETE ON sign_ups
    FOR EACH ROW EXECUTE FUNCTION log_cancellation();

-- Allow service role full access (for admin queries)
ALTER TABLE cancellation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY cancellation_history_service ON cancellation_history
    FOR ALL USING (true) WITH CHECK (true);
