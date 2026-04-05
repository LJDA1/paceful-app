-- Table for storing text-based ERS assessments
-- Note: raw text is NEVER stored - only a hash for deduplication

CREATE TABLE IF NOT EXISTS text_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('journal', 'session_notes', 'chat_transcript', 'free_text')),
  text_hash TEXT NOT NULL,
  text_length INTEGER NOT NULL,
  ers_score INTEGER NOT NULL CHECK (ers_score >= 0 AND ers_score <= 100),
  readiness_label TEXT NOT NULL,
  extraction_confidence TEXT NOT NULL CHECK (extraction_confidence IN ('low', 'medium', 'high')),

  -- Dimension scores (0-100)
  dim_emotional_stability INTEGER CHECK (dim_emotional_stability >= 0 AND dim_emotional_stability <= 100),
  dim_self_reflection INTEGER CHECK (dim_self_reflection >= 0 AND dim_self_reflection <= 100),
  dim_coping_capacity INTEGER CHECK (dim_coping_capacity >= 0 AND dim_coping_capacity <= 100),
  dim_behavioral_engagement INTEGER CHECK (dim_behavioral_engagement >= 0 AND dim_behavioral_engagement <= 100),
  dim_social_readiness INTEGER CHECK (dim_social_readiness >= 0 AND dim_social_readiness <= 100),

  -- Dimension confidence levels
  dim_es_confidence TEXT CHECK (dim_es_confidence IN ('low', 'medium', 'high')),
  dim_sr_confidence TEXT CHECK (dim_sr_confidence IN ('low', 'medium', 'high')),
  dim_cc_confidence TEXT CHECK (dim_cc_confidence IN ('low', 'medium', 'high')),
  dim_be_confidence TEXT CHECK (dim_be_confidence IN ('low', 'medium', 'high')),
  dim_srd_confidence TEXT CHECK (dim_srd_confidence IN ('low', 'medium', 'high')),

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_text_assessments_partner_id ON text_assessments(partner_id);
CREATE INDEX IF NOT EXISTS idx_text_assessments_external_user_id ON text_assessments(external_user_id);
CREATE INDEX IF NOT EXISTS idx_text_assessments_created_at ON text_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_text_assessments_text_hash ON text_assessments(text_hash);

-- Enable RLS
ALTER TABLE text_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policy: partners can only see their own assessments
CREATE POLICY "Partners can view own text assessments"
  ON text_assessments FOR SELECT
  USING (partner_id = auth.uid()::uuid);

CREATE POLICY "Partners can insert own text assessments"
  ON text_assessments FOR INSERT
  WITH CHECK (partner_id = auth.uid()::uuid);

-- Comment
COMMENT ON TABLE text_assessments IS 'Text-based ERS assessments from partner API. Raw text is never stored, only hashed for deduplication.';
