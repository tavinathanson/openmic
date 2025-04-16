-- Add first_mic_ever field to sign_ups table
ALTER TABLE sign_ups
ADD COLUMN first_mic_ever BOOLEAN DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN sign_ups.first_mic_ever IS 'Indicates if this is the comedian''s first open mic ever (qualifies for free cookie)'; 