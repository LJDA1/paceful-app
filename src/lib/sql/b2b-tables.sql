-- ============================================================================
-- B2B API Tables for Paceful
-- Run this in Supabase SQL Editor to set up the B2B infrastructure
-- ============================================================================

-- API Clients table (B2B partners)
CREATE TABLE IF NOT EXISTS api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'premium', 'enterprise')),
  rate_limit INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contact_email VARCHAR(255),
  company VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage Logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_api_usage_client_timestamp
ON api_usage_logs (client_id, timestamp DESC);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint
ON api_usage_logs (endpoint, timestamp DESC);

-- ============================================================================
-- Sample API Client (for testing)
-- ============================================================================

-- Insert a test client (optional - hardcoded keys work without this)
INSERT INTO api_clients (name, api_key, tier, rate_limit, contact_email, company)
VALUES
  ('Demo Partner', 'pk_test_paceful_b2b_2025_demo', 'basic', 100, 'demo@example.com', 'Demo Corp'),
  ('Research Partner', 'pk_test_research_partner_alpha', 'premium', 500, 'research@example.com', 'Research Institute'),
  ('Enterprise Client', 'pk_test_enterprise_corp', 'enterprise', 2000, 'enterprise@example.com', 'Enterprise Corp')
ON CONFLICT (api_key) DO NOTHING;

-- ============================================================================
-- Add research_consent column to profiles if not exists
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS research_consent BOOLEAN DEFAULT false;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on api_clients
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;

-- Only service role can access api_clients
CREATE POLICY "Service role only for api_clients"
ON api_clients
FOR ALL
USING (auth.role() = 'service_role');

-- Enable RLS on api_usage_logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert logs, authenticated users can't access
CREATE POLICY "Service role for api_usage_logs"
ON api_usage_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Allow insert from authenticated API requests (using anon key)
CREATE POLICY "Allow insert for api_usage_logs"
ON api_usage_logs
FOR INSERT
WITH CHECK (true);
