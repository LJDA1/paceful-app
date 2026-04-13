-- Gambling signal ingestion table
-- Stores structured behavioral signals (not text) from partner platforms for RGS scoring

CREATE TABLE IF NOT EXISTS gambling_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Raw signals (14 total from partner platform data)
  session_duration_minutes NUMERIC,
  session_frequency_daily NUMERIC,
  deposit_amount NUMERIC,
  deposit_velocity_change_pct NUMERIC,
  loss_chase_score NUMERIC CHECK (loss_chase_score >= 0 AND loss_chase_score <= 100),
  late_night_sessions_pct NUMERIC CHECK (late_night_sessions_pct >= 0 AND late_night_sessions_pct <= 100),
  deposit_limit_set BOOLEAN,
  deposit_limit_modified_down BOOLEAN,
  self_exclusion_history BOOLEAN,
  bet_type_risk_score NUMERIC CHECK (bet_type_risk_score >= 0 AND bet_type_risk_score <= 100),
  withdrawal_cancellation_count INTEGER DEFAULT 0 CHECK (withdrawal_cancellation_count >= 0),
  rg_tool_engagement_score NUMERIC CHECK (rg_tool_engagement_score >= 0 AND rg_tool_engagement_score <= 100),
  session_break_compliance_pct NUMERIC CHECK (session_break_compliance_pct >= 0 AND session_break_compliance_pct <= 100),
  promo_response_rate NUMERIC CHECK (promo_response_rate >= 0 AND promo_response_rate <= 1),

  -- Computed Responsible Gambling Score and dimension breakdown (0-100, higher = more responsible)
  rgs_score INTEGER NOT NULL CHECK (rgs_score >= 0 AND rgs_score <= 100),
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

  -- Explainability output
  rgs_label TEXT,
  overall_confidence TEXT CHECK (overall_confidence IN ('low', 'medium', 'high')),

  -- Threshold assessment at time of ingestion
  thresholds_breached JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_action TEXT CHECK (recommended_action IN ('monitor', 'intervene', 'restrict')),

  -- Snapshot of partner config weights used for this assessment (audit trail)
  config_snapshot JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for compliance report queries and threshold-check lookups
CREATE INDEX IF NOT EXISTS idx_gambling_signals_partner_user ON gambling_signals(partner_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gambling_signals_partner_created ON gambling_signals(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gambling_signals_user_created ON gambling_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gambling_signals_recommended_action ON gambling_signals(partner_id, recommended_action);

COMMENT ON TABLE gambling_signals IS 'Structured behavioral signal ingestion for Responsible Gambling Score (RGS) computation. No raw text stored.';
