-- Add needs_recalculation field to sign_ups table
ALTER TABLE sign_ups ADD COLUMN needs_recalculation BOOLEAN DEFAULT false;

-- Add needs_recalculation field to walk_ins table
ALTER TABLE walk_ins ADD COLUMN needs_recalculation BOOLEAN DEFAULT false; 