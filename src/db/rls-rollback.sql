-- ============================================================================
-- Paceful RLS Rollback
-- Run this if the app breaks after enabling RLS
-- ============================================================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE ers_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory DISABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_trajectories DISABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
