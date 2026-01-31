-- ============================================================================
-- Cleanup Demo Users
--
-- Removes all demo users and their associated data
-- Run this in Supabase SQL Editor to reset the demo data
-- ============================================================================

-- Step 1: Get demo user IDs
CREATE TEMP TABLE demo_user_ids AS
SELECT id as user_id
FROM auth.users
WHERE email LIKE '%@paceful.test';

-- Step 2: Delete mood entries
DELETE FROM mood_entries
WHERE user_id IN (SELECT user_id FROM demo_user_ids);

-- Step 3: Delete ERS scores
DELETE FROM ers_scores
WHERE user_id IN (SELECT user_id FROM demo_user_ids);

-- Step 4: Delete user consents
DELETE FROM user_consents
WHERE user_id IN (SELECT user_id FROM demo_user_ids);

-- Step 5: Delete profiles
DELETE FROM profiles
WHERE user_id IN (SELECT user_id FROM demo_user_ids);

-- Step 6: Delete auth users
DELETE FROM auth.users
WHERE email LIKE '%@paceful.test';

-- Step 7: Show cleanup summary
SELECT
    'Cleanup Complete' as status,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@paceful.test') as remaining_demo_users,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM mood_entries) as total_mood_entries,
    (SELECT COUNT(*) FROM ers_scores) as total_ers_scores;

-- Cleanup temp table
DROP TABLE IF EXISTS demo_user_ids;
