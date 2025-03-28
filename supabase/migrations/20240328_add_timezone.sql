-- Add timezone field to open_mic_dates table
ALTER TABLE open_mic_dates
ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- Update existing rows to have the default timezone
UPDATE open_mic_dates
SET timezone = 'America/New_York'
WHERE timezone IS NULL; 