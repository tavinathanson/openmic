-- Add custom_order field to sign_ups table
ALTER TABLE sign_ups ADD COLUMN custom_order INTEGER NULL;
ALTER TABLE sign_ups ADD COLUMN random_seed FLOAT NULL;
ALTER TABLE sign_ups ADD COLUMN arrival_category TEXT NULL;
CREATE INDEX sign_ups_custom_order_idx ON sign_ups(custom_order);

-- Add custom_order field to walk_ins table  
ALTER TABLE walk_ins ADD COLUMN custom_order INTEGER NULL;
ALTER TABLE walk_ins ADD COLUMN random_seed FLOAT NULL;
ALTER TABLE walk_ins ADD COLUMN arrival_category TEXT NULL;
CREATE INDEX walk_ins_custom_order_idx ON walk_ins(custom_order);

-- Add comment describing the arrival category options
COMMENT ON COLUMN sign_ups.arrival_category IS 'Can be "early" (by 7:15), "ontime" (by 7:30), or "late"';
COMMENT ON COLUMN walk_ins.arrival_category IS 'Can be "early" (by 7:15), "ontime" (by 7:30), or "late"'; 