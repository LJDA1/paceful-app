-- Table for tracking per-partner, per-endpoint rate limits with windowed counting
-- More efficient than counting from api_usage_logs

CREATE TABLE IF NOT EXISTS partner_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  endpoint_category TEXT NOT NULL, -- 'assess_analyze', 'assess_snapshot', 'ers', 'analytics'

  -- Current window tracking
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for upsert
  UNIQUE(partner_id, endpoint_category, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_partner_rate_limits_lookup
  ON partner_rate_limits(partner_id, endpoint_category, window_start DESC);

-- Index for cleanup of old windows
CREATE INDEX IF NOT EXISTS idx_partner_rate_limits_window_start
  ON partner_rate_limits(window_start);

-- Function to clean up old rate limit windows (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_windows()
RETURNS void AS $$
BEGIN
  DELETE FROM partner_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE partner_rate_limits IS 'Tracks rate limit usage per partner per endpoint category with hourly windows.';
