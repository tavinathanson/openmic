-- Migration: Enable realtime replication on supabase tables
-- This migration creates the 'supabase_realtime' publication and enables realtime for all tables

-- First, create the publication if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION "supabase_realtime";
  END IF;
END;
$$;

-- Then, enable realtime for all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER PUBLICATION "supabase_realtime" ADD TABLE %I.%I', 
                      table_record.schemaname, 
                      table_record.tablename);
    END LOOP;
END;
$$; 