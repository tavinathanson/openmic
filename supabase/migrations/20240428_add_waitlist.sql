-- Add is_waitlist column to sign_ups table
ALTER TABLE sign_ups
ADD COLUMN is_waitlist BOOLEAN DEFAULT false;

-- Add index for faster waitlist queries
CREATE INDEX sign_ups_waitlist_idx ON sign_ups(is_waitlist);

-- Update existing rows to have is_waitlist = false
UPDATE sign_ups SET is_waitlist = false WHERE is_waitlist IS NULL; 