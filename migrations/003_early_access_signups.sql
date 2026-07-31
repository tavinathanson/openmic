-- Lets organizers send a pre-open comedian signup link (/now) that reserves a
-- spot without counting toward the publicly displayed slot total until the
-- general comedian signup window actually opens for that date.
ALTER TABLE sign_ups ADD COLUMN is_early_access BOOLEAN NOT NULL DEFAULT false;
