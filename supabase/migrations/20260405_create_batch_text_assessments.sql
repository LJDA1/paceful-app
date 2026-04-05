-- Table for storing batch text-based ERS assessments
-- Stores composite results from analyzing multiple text entries

CREATE TABLE IF NOT EXISTS batch_text_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  entry_count INTEGER NOT NULL CHECK (entry_count > 0 AND entry_count <= 20),

  -- Composite scores
  composite_ers_score INTEGER NOT NULL CHECK (composite_ers_score >= 0 AND composite_ers_score <= 100),
  readiness_label TEXT NOT NULL,
  composite_confidence TEXT NOT NULL CHECK (composite_confidence IN ('low', 'medium', 'high')),

  -- Overall trend
  trend_direction TEXT NOT NULL CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  trend_delta NUMERIC(5,2),

  -- Dimension scores (latest/weighted)
  dim_emotional_stability INTEGER CHECK (dim_emotional_stability >= 0 AND dim_emotional_stability <= 100),
  dim_self_reflection INTEGER CHECK (dim_self_reflection >= 0 AND dim_self_reflection <= 100),
  dim_coping_capacity INTEGER CHECK (dim_coping_capacity >= 0 AND dim_coping_capacity <= 100),
  dim_behavioral_engagement INTEGER CHECK (dim_behavioral_engagement >= 0 AND dim_behavioral_engagement <= 100),
  dim_social_readiness INTEGER CHECK (dim_social_readiness >= 0 AND dim_social_readiness <= 100),

  -- Dimension trends
  dim_es_trend TEXT CHECK (dim_es_trend IN ('improving', 'stable', 'declining')),
  dim_sr_trend TEXT CHECK (dim_sr_trend IN ('improving', 'stable', 'declining')),
  dim_cc_trend TEXT CHECK (dim_cc_trend IN ('improving', 'stable', 'declining')),
  dim_be_trend TEXT CHECK (dim_be_trend IN ('improving', 'stable', 'declining')),
  dim_srd_trend TEXT CHECK (dim_srd_trend IN ('improving', 'stable', 'declining')),

  -- Time range of entries
  earliest_entry TIMESTAMPTZ NOT NULL,
  latest_entry TIMESTAMPTZ NOT NULL,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_batch_text_assessments_partner_id ON batch_text_assessments(partner_id);
CREATE INDEX IF NOT EXISTS idx_batch_text_assessments_external_user_id ON batch_text_assessments(external_user_id);
CREATE INDEX IF NOT EXISTS idx_batch_text_assessments_created_at ON batch_text_assessments(created_at DESC);

-- Enable RLS
ALTER TABLE batch_text_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Partners can view own batch assessments"
  ON batch_text_assessments FOR SELECT
  USING (partner_id = auth.uid()::uuid);

CREATE POLICY "Partners can insert own batch assessments"
  ON batch_text_assessments FOR INSERT
  WITH CHECK (partner_id = auth.uid()::uuid);

-- Comment
COMMENT ON TABLE batch_text_assessments IS 'Batch text-based ERS assessments storing composite results from multiple entries.';
