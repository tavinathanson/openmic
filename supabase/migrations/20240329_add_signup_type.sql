-- Add signup_type field to sign_ups table
ALTER TABLE sign_ups
ADD COLUMN signup_type TEXT NOT NULL DEFAULT 'audience' CHECK (signup_type IN ('comedian', 'audience'));

-- Add comment to explain the field
COMMENT ON COLUMN sign_ups.signup_type IS 'Indicates whether the signup is for a comedian or audience member';

-- Create an index for better query performance
CREATE INDEX sign_ups_type_idx ON sign_ups(signup_type); 