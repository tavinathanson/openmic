-- Test script for cancellation_history trigger
-- Run this against a test database to verify the trigger works correctly
-- Usage: psql -d your_test_db -f test_cancellation_history.sql

BEGIN;

-- Setup: Create test data
INSERT INTO open_mic_dates (id, date, time, timezone, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', '2025-12-25', '19:30:00', 'America/New_York', true);

INSERT INTO people (id, email, full_name)
VALUES ('22222222-2222-2222-2222-222222222222', 'test-comic@example.com', 'Test Comic');

INSERT INTO sign_ups (id, person_id, open_mic_date_id, signup_type)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'comedian');

-- Verify signup exists
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM sign_ups WHERE id = '33333333-3333-3333-3333-333333333333') = 1,
        'Setup failed: signup should exist';
    ASSERT (SELECT COUNT(*) FROM cancellation_history WHERE signup_id = '33333333-3333-3333-3333-333333333333') = 0,
        'Setup failed: cancellation_history should be empty';
END $$;

-- Test 1: Delete signup and verify history is created
DELETE FROM sign_ups WHERE id = '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
    history_count INT;
    history_record RECORD;
BEGIN
    SELECT COUNT(*) INTO history_count FROM cancellation_history WHERE signup_id = '33333333-3333-3333-3333-333333333333';
    ASSERT history_count = 1, 'Test 1 failed: cancellation_history should have 1 record, got ' || history_count;

    SELECT * INTO history_record FROM cancellation_history WHERE signup_id = '33333333-3333-3333-3333-333333333333';
    ASSERT history_record.email = 'test-comic@example.com', 'Test 1 failed: email mismatch';
    ASSERT history_record.full_name = 'Test Comic', 'Test 1 failed: full_name mismatch';
    ASSERT history_record.signup_type = 'comedian', 'Test 1 failed: signup_type mismatch';
    ASSERT history_record.event_date = '2025-12-25', 'Test 1 failed: event_date mismatch';
    ASSERT history_record.cancelled_at IS NOT NULL, 'Test 1 failed: cancelled_at should not be null';

    RAISE NOTICE 'Test 1 PASSED: Cancellation history record created correctly';
END $$;

-- Test 2: Multiple cancellations for same person
INSERT INTO sign_ups (id, person_id, open_mic_date_id, signup_type)
VALUES ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'comedian');

DELETE FROM sign_ups WHERE id = '44444444-4444-4444-4444-444444444444';

DO $$
DECLARE
    history_count INT;
BEGIN
    SELECT COUNT(*) INTO history_count FROM cancellation_history WHERE email = 'test-comic@example.com';
    ASSERT history_count = 2, 'Test 2 failed: should have 2 cancellation records, got ' || history_count;

    RAISE NOTICE 'Test 2 PASSED: Multiple cancellations tracked correctly';
END $$;

-- Test 3: Query cancellation count by email (the main use case)
DO $$
DECLARE
    cancel_count INT;
BEGIN
    SELECT COUNT(*) INTO cancel_count FROM cancellation_history WHERE email = 'test-comic@example.com';
    ASSERT cancel_count = 2, 'Test 3 failed: cancellation count query should return 2, got ' || cancel_count;

    RAISE NOTICE 'Test 3 PASSED: Cancellation count query works';
END $$;

-- Test 4: Cascade delete (when person is deleted, sign_ups are deleted via CASCADE)
INSERT INTO sign_ups (id, person_id, open_mic_date_id, signup_type)
VALUES ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'comedian');

-- Delete the person (should cascade delete the signup and trigger history)
DELETE FROM people WHERE id = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
    history_count INT;
    history_record RECORD;
BEGIN
    SELECT COUNT(*) INTO history_count FROM cancellation_history WHERE signup_id = '55555555-5555-5555-5555-555555555555';
    ASSERT history_count = 1, 'Test 4 failed: cascade delete should create history record, got ' || history_count;

    -- The email should be captured (BEFORE DELETE trigger runs before person is deleted)
    SELECT * INTO history_record FROM cancellation_history WHERE signup_id = '55555555-5555-5555-5555-555555555555';
    ASSERT history_record.email IS NOT NULL, 'Test 4 failed: email should be captured during cascade delete';

    RAISE NOTICE 'Test 4 PASSED: Cascade delete tracked correctly';
END $$;

-- Cleanup (rollback all test data)
ROLLBACK;

-- If we get here without errors, all tests passed
DO $$ BEGIN RAISE NOTICE 'All cancellation_history tests PASSED'; END $$;
