-- ============================================================================
-- Demo Users Seed Script for Paceful
--
-- Creates 50 test users with profiles for demo/investor presentations
-- Run this in Supabase SQL Editor with service role permissions
--
-- Distribution:
--   - 20 users in "Healing" stage (recent breakups, volatile moods)
--   - 20 users in "Rebuilding" stage (stabilizing moods)
--   - 10 users in "Ready" stage (stable, positive moods)
-- ============================================================================

-- First, let's create a function to generate UUIDs if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 1: Create Auth Users (50 demo users)
-- ============================================================================

-- Note: In Supabase, auth.users has specific required fields
-- We'll insert minimal records that satisfy the schema

DO $$
DECLARE
    user_id UUID;
    user_email TEXT;
    i INTEGER;
    stage TEXT;
    first_names TEXT[] := ARRAY[
        'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
        'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
        'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael',
        'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'Jackson', 'Avery',
        'Sebastian', 'Ella', 'David', 'Scarlett', 'Joseph', 'Grace', 'Samuel',
        'Chloe', 'Owen', 'Victoria', 'Ryan', 'Riley', 'Jack', 'Aria', 'Luke',
        'Lily', 'Gabriel', 'Aurora', 'Anthony', 'Zoey', 'Dylan'
    ];
    genders TEXT[] := ARRAY['male', 'female', 'non-binary', 'prefer_not_to_say'];
    countries TEXT[] := ARRAY['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'NL', 'SE'];
    initiators TEXT[] := ARRAY['me', 'them', 'mutual'];
BEGIN
    FOR i IN 1..50 LOOP
        -- Generate unique user ID
        user_id := gen_random_uuid();

        -- Determine stage based on user number
        IF i <= 20 THEN
            stage := 'healing';
        ELSIF i <= 40 THEN
            stage := 'rebuilding';
        ELSE
            stage := 'ready';
        END IF;

        user_email := 'demo_' || stage || '_' || i || '@paceful.test';

        -- Insert into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud
        ) VALUES (
            user_id,
            '00000000-0000-0000-0000-000000000000',
            user_email,
            crypt('DemoPass123!', gen_salt('bf')),
            NOW(),
            NOW() - (random() * interval '180 days'),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{}'::jsonb,
            FALSE,
            'authenticated',
            'authenticated'
        )
        ON CONFLICT (id) DO NOTHING;

        -- Insert into profiles
        INSERT INTO profiles (
            user_id,
            first_name,
            display_name,
            date_of_birth,
            gender,
            country,
            relationship_ended_at,
            relationship_duration_months,
            breakup_initiated_by,
            profile_visibility,
            show_ers_score,
            onboarding_completed,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            first_names[((i - 1) % 50) + 1],
            first_names[((i - 1) % 50) + 1],
            (DATE '1980-01-01' + (random() * (DATE '2002-12-31' - DATE '1980-01-01')))::DATE,
            genders[1 + floor(random() * 4)::int],
            countries[1 + floor(random() * 8)::int],
            CASE
                WHEN stage = 'healing' THEN CURRENT_DATE - (15 + floor(random() * 45))::int
                WHEN stage = 'rebuilding' THEN CURRENT_DATE - (45 + floor(random() * 75))::int
                ELSE CURRENT_DATE - (90 + floor(random() * 90))::int
            END,
            6 + floor(random() * 54)::int,
            initiators[1 + floor(random() * 3)::int],
            'community',
            TRUE,
            TRUE,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;

        -- Store user_id and stage for mood generation
        -- We'll use a temp table
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Create temp table to track demo users and their stages
-- ============================================================================

DROP TABLE IF EXISTS temp_demo_users;
CREATE TEMP TABLE temp_demo_users AS
SELECT
    p.user_id,
    p.first_name,
    CASE
        WHEN u.email LIKE '%healing%' THEN 'healing'
        WHEN u.email LIKE '%rebuilding%' THEN 'rebuilding'
        ELSE 'ready'
    END as stage
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email LIKE '%@paceful.test';

-- ============================================================================
-- STEP 3: Generate Mood Entries (3-5 per day for 2-4 weeks)
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    day_offset INTEGER;
    entry_num INTEGER;
    total_days INTEGER;
    entries_per_day INTEGER;
    mood_val INTEGER;
    mood_lbl TEXT;
    base_mood NUMERIC;
    variance NUMERIC;
    trend NUMERIC;
    log_time TIMESTAMP;
    emotions_arr TEXT[];
    low_emotions TEXT[] := ARRAY['sad', 'anxious', 'lonely', 'frustrated', 'angry'];
    mid_emotions TEXT[] := ARRAY['anxious', 'hopeful', 'calm', 'grateful', 'peaceful'];
    high_emotions TEXT[] := ARRAY['happy', 'hopeful', 'grateful', 'peaceful', 'excited'];
    times_of_day TEXT[] := ARRAY['morning', 'afternoon', 'evening'];
BEGIN
    FOR rec IN SELECT * FROM temp_demo_users LOOP
        -- Set mood pattern based on stage
        IF rec.stage = 'healing' THEN
            base_mood := 4;
            variance := 2.5;
            trend := 0.02;
        ELSIF rec.stage = 'rebuilding' THEN
            base_mood := 6;
            variance := 1.5;
            trend := 0.05;
        ELSE
            base_mood := 7.5;
            variance := 0.8;
            trend := 0.02;
        END IF;

        -- Random 2-4 weeks of data
        total_days := 14 + floor(random() * 14)::int;

        FOR day_offset IN 0..(total_days - 1) LOOP
            -- 3-5 entries per day
            entries_per_day := 3 + floor(random() * 3)::int;

            FOR entry_num IN 1..entries_per_day LOOP
                -- Calculate mood value with trend and variance
                mood_val := LEAST(10, GREATEST(1,
                    round(base_mood + (day_offset * trend) + ((random() - 0.5) * variance * 2))::int
                ));

                -- Set mood label
                IF mood_val <= 3 THEN
                    mood_lbl := 'low';
                    emotions_arr := ARRAY[
                        low_emotions[1 + floor(random() * 5)::int],
                        low_emotions[1 + floor(random() * 5)::int]
                    ];
                ELSIF mood_val <= 6 THEN
                    mood_lbl := 'moderate';
                    emotions_arr := ARRAY[
                        mid_emotions[1 + floor(random() * 5)::int],
                        mid_emotions[1 + floor(random() * 5)::int]
                    ];
                ELSE
                    mood_lbl := 'high';
                    emotions_arr := ARRAY[
                        high_emotions[1 + floor(random() * 5)::int],
                        high_emotions[1 + floor(random() * 5)::int]
                    ];
                END IF;

                -- Calculate timestamp (spread throughout day)
                log_time := (CURRENT_DATE - (total_days - day_offset))
                    + ((7 + (entry_num - 1) * 4) || ' hours')::interval
                    + (floor(random() * 60) || ' minutes')::interval;

                -- Insert mood entry
                INSERT INTO mood_entries (
                    user_id,
                    mood_value,
                    mood_label,
                    emotions,
                    time_of_day,
                    logged_at,
                    created_at
                ) VALUES (
                    rec.user_id,
                    mood_val,
                    mood_lbl,
                    emotions_arr,
                    times_of_day[1 + floor((entry_num - 1) * 3.0 / entries_per_day)::int],
                    log_time,
                    log_time
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Calculate ERS Scores for all demo users
-- ============================================================================

-- We'll create ERS scores based on the mood data patterns
DO $$
DECLARE
    rec RECORD;
    mood_avg NUMERIC;
    mood_stddev NUMERIC;
    mood_count INTEGER;
    days_logged INTEGER;
    stability_score NUMERIC;
    engagement_score NUMERIC;
    ers_score NUMERIC;
    ers_stage TEXT;
    ers_confidence NUMERIC;
BEGIN
    FOR rec IN SELECT * FROM temp_demo_users LOOP
        -- Calculate mood statistics for last 14 days
        SELECT
            AVG(mood_value),
            COALESCE(STDDEV(mood_value), 0),
            COUNT(*),
            COUNT(DISTINCT DATE(logged_at))
        INTO mood_avg, mood_stddev, mood_count, days_logged
        FROM mood_entries
        WHERE user_id = rec.user_id
        AND logged_at >= CURRENT_DATE - INTERVAL '14 days';

        -- Skip if no data
        IF mood_count < 3 THEN
            CONTINUE;
        END IF;

        -- Calculate stability score (lower variance = higher stability)
        -- Max stddev for 1-10 scale is ~4
        stability_score := GREATEST(0, 1 - (mood_stddev / 4));

        -- Add trend bonus for improving moods
        IF rec.stage IN ('rebuilding', 'ready') THEN
            stability_score := LEAST(1, stability_score + 0.1);
        END IF;

        -- Calculate engagement score (days logged / 14)
        engagement_score := LEAST(1, days_logged::numeric / 14);

        -- Streak bonus
        IF days_logged >= 7 THEN
            engagement_score := LEAST(1, engagement_score + 0.1);
        END IF;

        -- Calculate weighted ERS (60% stability, 40% engagement)
        ers_score := (stability_score * 0.6 + engagement_score * 0.4) * 100;

        -- Determine stage
        IF ers_score >= 75 THEN
            ers_stage := 'ready';
        ELSIF ers_score >= 50 THEN
            ers_stage := 'rebuilding';
        ELSE
            ers_stage := 'healing';
        END IF;

        -- Calculate confidence
        ers_confidence := LEAST(1, mood_count::numeric / 20) * 0.6 + 0.4;

        -- Insert or update ERS score
        INSERT INTO ers_scores (
            user_id,
            ers_score,
            ers_stage,
            ers_confidence,
            emotional_stability_score,
            engagement_consistency_score,
            data_points_used,
            calculation_method,
            week_of,
            calculated_at
        ) VALUES (
            rec.user_id,
            ROUND(ers_score::numeric, 2),
            ers_stage,
            ROUND(ers_confidence::numeric, 2),
            ROUND(stability_score::numeric, 3),
            ROUND(engagement_score::numeric, 3),
            mood_count,
            'v2_mood_focused',
            DATE_TRUNC('week', CURRENT_DATE)::date,
            NOW()
        )
        ON CONFLICT (user_id, week_of)
        DO UPDATE SET
            ers_score = EXCLUDED.ers_score,
            ers_stage = EXCLUDED.ers_stage,
            ers_confidence = EXCLUDED.ers_confidence,
            emotional_stability_score = EXCLUDED.emotional_stability_score,
            engagement_consistency_score = EXCLUDED.engagement_consistency_score,
            data_points_used = EXCLUDED.data_points_used,
            calculated_at = EXCLUDED.calculated_at;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Add user consents
-- ============================================================================

INSERT INTO user_consents (user_id, consent_type, consent_given, given_at)
SELECT
    user_id,
    'ers_tracking',
    TRUE,
    NOW()
FROM temp_demo_users
ON CONFLICT DO NOTHING;

INSERT INTO user_consents (user_id, consent_type, consent_given, given_at)
SELECT
    user_id,
    'research',
    random() > 0.3,  -- 70% consent to research
    NOW()
FROM temp_demo_users
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 6: Verify Results
-- ============================================================================

-- Show summary
SELECT
    'Demo Data Summary' as report,
    (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@paceful.test') as total_demo_users,
    (SELECT COUNT(*) FROM profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email LIKE '%@paceful.test') as profiles_created,
    (SELECT COUNT(*) FROM mood_entries WHERE user_id IN (SELECT user_id FROM temp_demo_users)) as mood_entries_created,
    (SELECT COUNT(*) FROM ers_scores WHERE user_id IN (SELECT user_id FROM temp_demo_users)) as ers_scores_calculated;

-- Show stage distribution
SELECT
    ers_stage,
    COUNT(*) as user_count,
    ROUND(AVG(ers_score), 1) as avg_score,
    ROUND(AVG(ers_confidence), 2) as avg_confidence
FROM ers_scores
WHERE user_id IN (SELECT user_id FROM temp_demo_users)
GROUP BY ers_stage
ORDER BY
    CASE ers_stage
        WHEN 'healing' THEN 1
        WHEN 'rebuilding' THEN 2
        WHEN 'ready' THEN 3
    END;

-- Cleanup temp table
DROP TABLE IF EXISTS temp_demo_users;

-- ============================================================================
-- SUCCESS! Your demo data has been created.
--
-- Test with:
--   - B2B API: curl -H "X-API-Key: pk_test_enterprise_corp" http://localhost:3000/api/b2b/aggregate
--   - Admin: http://localhost:3000/admin/analytics (password: paceful_admin_2025)
-- ============================================================================
