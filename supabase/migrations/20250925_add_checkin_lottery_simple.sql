-- Add check-in and lottery columns to sign_ups table
ALTER TABLE sign_ups ADD COLUMN IF NOT EXISTS check_in_status TEXT CHECK (check_in_status IN ('early', 'on_time', 'late', 'not_coming'));
ALTER TABLE sign_ups ADD COLUMN IF NOT EXISTS lottery_order INTEGER;
ALTER TABLE sign_ups ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS sign_ups_check_in_status_idx ON sign_ups(check_in_status);
CREATE INDEX IF NOT EXISTS sign_ups_lottery_order_idx ON sign_ups(lottery_order);