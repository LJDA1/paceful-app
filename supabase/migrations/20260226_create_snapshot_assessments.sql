-- Snapshot assessments table for storing B2B partner assessment results
CREATE TABLE IF NOT EXISTS snapshot_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  external_id TEXT, -- Optional external user ID from partner

  -- Overall results
  ers_snapshot INTEGER NOT NULL CHECK (ers_snapshot >= 0 AND ers_snapshot <= 100),
  readiness_label TEXT NOT NULL CHECK (readiness_label IN ('Not Ready', 'Healing', 'Rebuilding', 'Ready')),
  confidence TEXT NOT NULL DEFAULT 'estimated',

  -- Dimension scores (0-100)
  dim_emotional_stability INTEGER NOT NULL CHECK (dim_emotional_stability >= 0 AND dim_emotional_stability <= 100),
  dim_self_reflection INTEGER NOT NULL CHECK (dim_self_reflection >= 0 AND dim_self_reflection <= 100),
  dim_coping_capacity INTEGER NOT NULL CHECK (dim_coping_capacity >= 0 AND dim_coping_capacity <= 100),
  dim_behavioral_engagement INTEGER NOT NULL CHECK (dim_behavioral_engagement >= 0 AND dim_behavioral_engagement <= 100),
  dim_social_readiness INTEGER NOT NULL CHECK (dim_social_readiness >= 0 AND dim_social_readiness <= 100),

  -- Raw responses stored as JSONB for audit/analysis
  responses JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Index for partner lookups
CREATE INDEX idx_snapshot_assessments_partner_id ON snapshot_assessments(partner_id);
CREATE INDEX idx_snapshot_assessments_external_id ON snapshot_assessments(partner_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_snapshot_assessments_created_at ON snapshot_assessments(created_at DESC);
