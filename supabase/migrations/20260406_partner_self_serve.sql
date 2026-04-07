-- Partner Self-Serve Signup: Add verification and magic link authentication
-- Extends partner_applications for email verification and magic link auth

-- Add new columns to partner_applications
ALTER TABLE partner_applications
  ADD COLUMN IF NOT EXISTS test_api_key TEXT,
  ADD COLUMN IF NOT EXISTS live_api_key TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS magic_link_token TEXT,
  ADD COLUMN IF NOT EXISTS magic_link_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_personal_email BOOLEAN DEFAULT FALSE;

-- Indexes for token lookups (partial indexes for efficiency)
CREATE INDEX IF NOT EXISTS idx_partner_verification_token
  ON partner_applications(verification_token)
  WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_magic_link_token
  ON partner_applications(magic_link_token)
  WHERE magic_link_token IS NOT NULL;

-- Index for email lookups (used for magic link login)
CREATE INDEX IF NOT EXISTS idx_partner_contact_email
  ON partner_applications(contact_email);

-- Comments
COMMENT ON COLUMN partner_applications.test_api_key IS 'Test API key (pk_test_*) that works immediately in sandbox mode';
COMMENT ON COLUMN partner_applications.live_api_key IS 'Live API key (pk_live_*) that requires email verification';
COMMENT ON COLUMN partner_applications.email_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN partner_applications.verification_token IS 'Token for email verification (24h validity)';
COMMENT ON COLUMN partner_applications.verification_expires_at IS 'Expiration time for verification token';
COMMENT ON COLUMN partner_applications.magic_link_token IS 'Token for magic link login (15min validity)';
COMMENT ON COLUMN partner_applications.magic_link_expires_at IS 'Expiration time for magic link token';
COMMENT ON COLUMN partner_applications.terms_accepted_at IS 'Timestamp when partner terms were accepted';
COMMENT ON COLUMN partner_applications.is_personal_email IS 'True if email is from personal domain (gmail, etc.)';
