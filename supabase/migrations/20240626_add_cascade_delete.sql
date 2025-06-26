-- Add CASCADE DELETE to sign_ups foreign key constraint
-- This allows deleting people to automatically delete their associated sign_ups

-- Drop the existing foreign key constraint
ALTER TABLE sign_ups DROP CONSTRAINT sign_ups_person_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE sign_ups ADD CONSTRAINT sign_ups_person_id_fkey 
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;