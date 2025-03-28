-- Add time field to open_mic_dates table
ALTER TABLE open_mic_dates
ADD COLUMN time TIME NOT NULL DEFAULT '19:30:00';

-- Update existing rows to have the default time
UPDATE open_mic_dates
SET time = '19:30:00'
WHERE time IS NULL; 