-- Benchmark System Tables
-- Stores aggregated benchmark data by vertical for comparison

-- ============================================================================
-- Add vertical to api_keys for benchmark filtering
-- ============================================================================

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS vertical TEXT;

-- Sync vertical from partner_applications to api_keys
UPDATE api_keys ak
SET vertical = pa.vertical
FROM partner_applications pa
WHERE ak.api_key = pa.sandbox_api_key
  AND ak.vertical IS NULL
  AND pa.vertical IS NOT NULL;

-- ============================================================================
-- Benchmark Snapshots Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS benchmark_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'emotional_stability',
    'self_reflection',
    'coping_capacity',
    'behavioral_engagement',
    'social_readiness',
    'overall_ers'
  )),
  avg_score DECIMAL(5,2) NOT NULL,
  median_score DECIMAL(5,2) NOT NULL,
  p25 DECIMAL(5,2) NOT NULL,
  p75 DECIMAL(5,2) NOT NULL,
  min_score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  std_dev DECIMAL(5,2),
  sample_size INTEGER NOT NULL CHECK (sample_size >= 50),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_benchmark_snapshots_vertical
  ON benchmark_snapshots(vertical);
CREATE INDEX IF NOT EXISTS idx_benchmark_snapshots_dimension
  ON benchmark_snapshots(dimension);
CREATE INDEX IF NOT EXISTS idx_benchmark_snapshots_period_start
  ON benchmark_snapshots(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_snapshots_lookup
  ON benchmark_snapshots(vertical, dimension, period_start DESC);

-- Enable RLS
ALTER TABLE benchmark_snapshots ENABLE ROW LEVEL SECURITY;

-- Partners can only read benchmarks (not modify)
CREATE POLICY "Partners can read benchmarks"
  ON benchmark_snapshots FOR SELECT
  USING (true);

-- ============================================================================
-- Partner Benchmark Stats Table (cached per-partner stats)
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_benchmark_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  vertical TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'emotional_stability',
    'self_reflection',
    'coping_capacity',
    'behavioral_engagement',
    'social_readiness',
    'overall_ers'
  )),
  partner_avg_score DECIMAL(5,2) NOT NULL,
  partner_sample_size INTEGER NOT NULL,
  vertical_percentile INTEGER CHECK (vertical_percentile >= 0 AND vertical_percentile <= 100),
  previous_avg_score DECIMAL(5,2),
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'declining', 'stable')),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_benchmark_stats_partner
  ON partner_benchmark_stats(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_benchmark_stats_lookup
  ON partner_benchmark_stats(partner_id, vertical, dimension, period_start DESC);

-- Enable RLS
ALTER TABLE partner_benchmark_stats ENABLE ROW LEVEL SECURITY;

-- Partners can only see their own stats
CREATE POLICY "Partners can read own benchmark stats"
  ON partner_benchmark_stats FOR SELECT
  USING (partner_id = current_setting('app.current_partner_id', true));

-- Comments
COMMENT ON TABLE benchmark_snapshots IS 'Aggregated benchmark data by vertical. Only generated when sample_size >= 50 for privacy.';
COMMENT ON TABLE partner_benchmark_stats IS 'Per-partner benchmark statistics for comparison against vertical averages.';
COMMENT ON COLUMN benchmark_snapshots.p25 IS '25th percentile score';
COMMENT ON COLUMN benchmark_snapshots.p75 IS '75th percentile score';
COMMENT ON COLUMN partner_benchmark_stats.vertical_percentile IS 'Where this partner ranks vs others in their vertical (higher = better)';
