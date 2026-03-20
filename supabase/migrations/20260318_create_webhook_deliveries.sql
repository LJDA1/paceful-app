-- Webhook Deliveries Table
-- Tracks all webhook delivery attempts with retry support

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  webhook_id uuid REFERENCES partner_webhooks(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  event_type varchar NOT NULL,
  payload jsonb NOT NULL,
  status varchar NOT NULL DEFAULT 'pending',
  http_status_code integer,
  response_body text,
  attempt_count integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  duration_ms integer
);

CREATE INDEX idx_webhook_deliveries_partner ON webhook_deliveries(partner_id);
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
