-- Table for tracking sandbox demo usage for lead generation
-- Public sandbox page at /sandbox - no auth required

CREATE TABLE IF NOT EXISTS sandbox_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead info (optional)
  email TEXT,
  company TEXT,

  -- Tracking
  session_id TEXT NOT NULL, -- Browser session identifier
  ip_address TEXT,
  user_agent TEXT,

  -- Usage metrics
  assessment_count INTEGER NOT NULL DEFAULT 0,
  last_assessment_at TIMESTAMPTZ,

  -- Assessment types used
  used_text_analysis BOOLEAN DEFAULT FALSE,
  used_batch_analysis BOOLEAN DEFAULT FALSE,

  -- Conversion tracking
  clicked_get_api_key BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_sandbox_usage_session_id ON sandbox_usage(session_id);

-- Index for lead tracking (emails)
CREATE INDEX IF NOT EXISTS idx_sandbox_usage_email ON sandbox_usage(email) WHERE email IS NOT NULL;

-- Index for recent usage
CREATE INDEX IF NOT EXISTS idx_sandbox_usage_created_at ON sandbox_usage(created_at DESC);

-- IP-based rate limiting index
CREATE INDEX IF NOT EXISTS idx_sandbox_usage_ip_address ON sandbox_usage(ip_address);

-- No RLS needed - this is a public-facing table with controlled access via API

-- Comment
COMMENT ON TABLE sandbox_usage IS 'Tracks usage of the public sandbox demo page for lead generation and rate limiting.';


-- Table for storing individual sandbox assessments (for display purposes)
CREATE TABLE IF NOT EXISTS sandbox_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sandbox_usage_id UUID NOT NULL REFERENCES sandbox_usage(id) ON DELETE CASCADE,

  -- Assessment type
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('single', 'batch')),

  -- Results (stored for display, not PII)
  ers_score INTEGER NOT NULL CHECK (ers_score >= 0 AND ers_score <= 100),
  readiness_label TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),

  -- Dimension scores
  dim_emotional_stability INTEGER CHECK (dim_emotional_stability >= 0 AND dim_emotional_stability <= 100),
  dim_self_reflection INTEGER CHECK (dim_self_reflection >= 0 AND dim_self_reflection <= 100),
  dim_coping_capacity INTEGER CHECK (dim_coping_capacity >= 0 AND dim_coping_capacity <= 100),
  dim_behavioral_engagement INTEGER CHECK (dim_behavioral_engagement >= 0 AND dim_behavioral_engagement <= 100),
  dim_social_readiness INTEGER CHECK (dim_social_readiness >= 0 AND dim_social_readiness <= 100),

  -- Batch-specific fields
  entry_count INTEGER,
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for usage lookups
CREATE INDEX IF NOT EXISTS idx_sandbox_assessments_usage_id ON sandbox_assessments(sandbox_usage_id);

-- Comment
COMMENT ON TABLE sandbox_assessments IS 'Individual assessments from sandbox demo sessions.';
