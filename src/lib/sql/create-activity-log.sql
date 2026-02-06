-- ============================================================================
-- Activity Log Table
--
-- Stores user events for analytics and milestone tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_event ON activity_log(user_id, event_type);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own events
CREATE POLICY "Users can view own events"
  ON activity_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert own events"
  ON activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do anything
CREATE POLICY "Service role full access"
  ON activity_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Useful views for analytics
CREATE OR REPLACE VIEW event_summary AS
SELECT
  event_type,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_occurrence
FROM activity_log
GROUP BY event_type
ORDER BY total_count DESC;

-- Daily active users view
CREATE OR REPLACE VIEW daily_active_users AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM activity_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
