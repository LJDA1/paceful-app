-- Enhance webhook_deliveries table
-- Add payload_hash and last_attempt_at columns

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS payload_hash varchar(64),
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- Index for faster lookups by payload hash (deduplication)
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_payload_hash
  ON webhook_deliveries(webhook_id, payload_hash);

-- Index for finding deliveries due for retry
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON webhook_deliveries(status, next_retry_at)
  WHERE status = 'retrying';

-- Update function to set last_attempt_at on status changes
COMMENT ON COLUMN webhook_deliveries.payload_hash IS 'SHA256 hash of payload for deduplication';
COMMENT ON COLUMN webhook_deliveries.last_attempt_at IS 'Timestamp of most recent delivery attempt';
