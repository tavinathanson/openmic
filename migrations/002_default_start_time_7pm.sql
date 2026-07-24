-- Change the default open mic start time from 7:30pm to 7:00pm.
-- 001_init.sql is already applied on existing databases, so alter the column
-- default here and pull forward any upcoming dates still on the old default.
ALTER TABLE open_mic_dates ALTER COLUMN time SET DEFAULT '19:00:00';

UPDATE open_mic_dates
SET time = '19:00:00'
WHERE time = '19:30:00'
  AND date >= CURRENT_DATE;
