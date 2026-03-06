-- Partner Configs Table
-- Stores default configuration for each partner (verbosity, tone, score_format, etc.)

CREATE TABLE IF NOT EXISTS partner_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL UNIQUE,

  -- ERS Explainability Layer settings
  verbosity TEXT DEFAULT 'minimal' CHECK (verbosity IN ('minimal', 'standard', 'clinical')),
  tone TEXT DEFAULT 'clinical' CHECK (tone IN ('clinical', 'casual', 'motivational')),
  score_format TEXT DEFAULT 'numerical' CHECK (score_format IN ('numerical', 'percentage', 'tier_label', 'traffic_light')),

  -- Traffic light thresholds (only used when score_format = 'traffic_light')
  traffic_light_thresholds JSONB DEFAULT '{"red_max": 33, "yellow_max": 66}'::jsonb,

  -- Additional config options
  include_signals BOOLEAN DEFAULT true,
  include_trend BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by partner_id
CREATE INDEX IF NOT EXISTS idx_partner_configs_partner_id ON partner_configs(partner_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_partner_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_configs_updated_at
  BEFORE UPDATE ON partner_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_configs_updated_at();

-- RLS policies
ALTER TABLE partner_configs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON partner_configs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE partner_configs IS 'Stores default API response configuration for each partner';
COMMENT ON COLUMN partner_configs.verbosity IS 'Default response detail level: minimal, standard, clinical';
COMMENT ON COLUMN partner_configs.tone IS 'Language register for reasoning text: clinical, casual, motivational';
COMMENT ON COLUMN partner_configs.score_format IS 'How scores are formatted: numerical, percentage, tier_label, traffic_light';
COMMENT ON COLUMN partner_configs.traffic_light_thresholds IS 'Custom thresholds for traffic_light format: {red_max: 33, yellow_max: 66}';
