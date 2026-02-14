-- ============================================================================
-- Synthetic Data & Matching Readiness Migration
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add is_synthetic flags to all tables
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE ers_scores ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE extracted_insights ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE recovery_trajectories ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;
ALTER TABLE discovered_patterns ADD COLUMN IF NOT EXISTS is_synthetic boolean DEFAULT false;

-- ============================================================================
-- PART 2: Add breakup/relationship fields (for synthetic data)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS breakup_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship_duration integer;

-- ============================================================================
-- PART 3: Add matching readiness fields
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seeking_match boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS match_preferences jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_context varchar DEFAULT 'breakup';

-- Add index for matching queries
CREATE INDEX IF NOT EXISTS idx_profiles_seeking_match ON profiles(seeking_match) WHERE seeking_match = true;
CREATE INDEX IF NOT EXISTS idx_profiles_recovery_context ON profiles(recovery_context);

-- ============================================================================
-- PART 3: Add email reminder columns (if not already added)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_reminders_daily boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_reminders_weekly boolean DEFAULT true;

-- ============================================================================
-- PART 4: Add chat_sessions table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  message_count integer DEFAULT 0,
  summary text,
  key_topics text[],
  is_synthetic boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started ON chat_sessions(started_at DESC);

-- ============================================================================
-- DONE
-- ============================================================================
-- After running this:
-- 1. Test that all columns exist
-- 2. Run the synthetic data generator via /admin/synthetic
-- 3. Verify dashboard matching teaser appears for users with ERS >= 40
-- ============================================================================
