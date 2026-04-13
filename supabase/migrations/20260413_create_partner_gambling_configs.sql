-- Partner gambling configuration table
-- Partners can customize dimension weights, threshold values, and alert preferences

CREATE TABLE IF NOT EXISTS partner_gambling_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL UNIQUE,

  -- Dimension weights for RGS composite score (must sum to 1.0)
  dimension_weights JSONB NOT NULL DEFAULT '{
    "emotional_stability": 0.25,
    "self_reflection": 0.15,
    "coping_capacity": 0.20,
    "behavioral_engagement": 0.15,
    "social_readiness": 0.25
  }'::jsonb,

  -- Threshold values for breach detection
  rgs_minimum NUMERIC NOT NULL DEFAULT 40 CHECK (rgs_minimum >= 0 AND rgs_minimum <= 100),
  dimension_minimum NUMERIC NOT NULL DEFAULT 25 CHECK (dimension_minimum >= 0 AND dimension_minimum <= 100),
  deposit_velocity_threshold NUMERIC NOT NULL DEFAULT 200 CHECK (deposit_velocity_threshold > 0),
  loss_chase_threshold NUMERIC NOT NULL DEFAULT 80 CHECK (loss_chase_threshold >= 0 AND loss_chase_threshold <= 100),

  -- Alert enable/disable per threshold type
  alert_on_rgs_breach BOOLEAN NOT NULL DEFAULT true,
  alert_on_dimension_breach BOOLEAN NOT NULL DEFAULT true,
  alert_on_velocity_breach BOOLEAN NOT NULL DEFAULT true,
  alert_on_loss_chase_breach BOOLEAN NOT NULL DEFAULT true,

  -- Explainability settings (same layer as base ERS config)
  verbosity TEXT NOT NULL DEFAULT 'minimal' CHECK (verbosity IN ('minimal', 'standard', 'clinical')),
  tone TEXT NOT NULL DEFAULT 'clinical' CHECK (tone IN ('clinical', 'casual', 'motivational')),
  score_format TEXT NOT NULL DEFAULT 'numerical' CHECK (score_format IN ('numerical', 'percentage', 'tier_label', 'traffic_light')),
  traffic_light_thresholds JSONB NOT NULL DEFAULT '{"red_max": 33, "yellow_max": 66}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE partner_gambling_configs IS 'Per-partner configuration for gambling signal scoring: dimension weights, thresholds, and alert preferences.';
