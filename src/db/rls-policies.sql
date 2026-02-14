-- ============================================================================
-- Paceful RLS Policies
-- Run this in Supabase SQL Editor AFTER verifying all app functionality works
-- API routes using supabase service role key bypass RLS automatically
-- Client-side queries using anon key are subject to these policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Add admin column to profiles
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set your admin users (update emails as needed)
UPDATE profiles SET is_admin = true WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('lewisjohnson004@gmail.com', 'lewisjo307@gmail.com')
);

-- ============================================================================
-- STEP 2: Enable RLS on all tables
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ers_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: User policies (users can only access their own data)
-- ============================================================================

-- profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (user_id = auth.uid());

-- mood_entries
CREATE POLICY "mood_select_own" ON mood_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "mood_insert_own" ON mood_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "mood_update_own" ON mood_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "mood_delete_own" ON mood_entries FOR DELETE USING (user_id = auth.uid());

-- journal_entries
CREATE POLICY "journal_select_own" ON journal_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "journal_insert_own" ON journal_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "journal_update_own" ON journal_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "journal_delete_own" ON journal_entries FOR DELETE USING (user_id = auth.uid());

-- ers_scores
CREATE POLICY "ers_select_own" ON ers_scores FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ers_insert_own" ON ers_scores FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ers_update_own" ON ers_scores FOR UPDATE USING (user_id = auth.uid());

-- consent_records
CREATE POLICY "consent_select_own" ON consent_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "consent_insert_own" ON consent_records FOR INSERT WITH CHECK (user_id = auth.uid());

-- activity_logs
CREATE POLICY "activity_select_own" ON activity_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "activity_insert_own" ON activity_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- ai_memory
DROP POLICY IF EXISTS "Users can manage their own memories" ON ai_memory;
CREATE POLICY "ai_memory_all_own" ON ai_memory FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- extracted_insights
CREATE POLICY "insights_select_own" ON extracted_insights FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "insights_insert_own" ON extracted_insights FOR INSERT WITH CHECK (user_id = auth.uid());

-- recovery_trajectories
CREATE POLICY "trajectory_select_own" ON recovery_trajectories FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "trajectory_insert_own" ON recovery_trajectories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "trajectory_update_own" ON recovery_trajectories FOR UPDATE USING (user_id = auth.uid());

-- discovered_patterns
CREATE POLICY "patterns_select_own" ON discovered_patterns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "patterns_insert_own" ON discovered_patterns FOR INSERT WITH CHECK (user_id = auth.uid());

-- chat_sessions
CREATE POLICY "chat_select_own" ON chat_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "chat_insert_own" ON chat_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_update_own" ON chat_sessions FOR UPDATE USING (user_id = auth.uid());

-- api_keys (service role only - no user policies)

-- ============================================================================
-- STEP 4: Admin policies (admins can read all data for analytics)
-- ============================================================================

CREATE POLICY "admin_select_profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_moods" ON mood_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_journals" ON journal_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_ers" ON ers_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_activity" ON activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_insights" ON extracted_insights FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_trajectories" ON recovery_trajectories FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_patterns" ON discovered_patterns FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "admin_select_chats" ON chat_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- ============================================================================
-- DONE
-- ============================================================================
-- After running this, test that:
-- 1. Regular users can only see their own data
-- 2. Admin users can see all data in admin pages
-- 3. API routes using service role key still work (they bypass RLS)
-- ============================================================================
