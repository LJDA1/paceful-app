-- Add email tracking columns to sandbox_leads table
-- Tracks when drip emails were sent

ALTER TABLE sandbox_leads
  ADD COLUMN IF NOT EXISTS email_1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_2_sent_at TIMESTAMPTZ;

-- Index for finding leads that need emails
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_email_drip
  ON sandbox_leads(assessments_run, email_1_sent_at, email_2_sent_at);

-- Comments
COMMENT ON COLUMN sandbox_leads.email_1_sent_at IS 'Timestamp when first drip email was sent (after 3+ assessments)';
COMMENT ON COLUMN sandbox_leads.email_2_sent_at IS 'Timestamp when second drip email was sent (after 5 assessments / limit reached)';
