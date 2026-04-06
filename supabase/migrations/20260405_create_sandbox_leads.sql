-- Table for tracking sandbox leads for sales pipeline
-- Captures prospect info from the sandbox demo page

CREATE TABLE IF NOT EXISTS sandbox_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  email TEXT NOT NULL UNIQUE,
  company_name TEXT,

  -- Industry vertical
  vertical TEXT CHECK (vertical IN (
    'dating',
    'mental_health',
    'workplace',
    'gambling',
    'insurance',
    'coaching',
    'education',
    NULL
  )),

  -- Usage metrics (aggregated from sandbox_usage)
  assessments_run INTEGER NOT NULL DEFAULT 0,
  avg_ers_score NUMERIC(5,2),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional: link to sandbox_usage records
  -- We'll use email to join, not a direct FK

  -- Additional fields for sales tracking
  notes TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  source TEXT DEFAULT 'sandbox' -- Where the lead came from
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_email ON sandbox_leads(email);
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_created_at ON sandbox_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_last_active ON sandbox_leads(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_vertical ON sandbox_leads(vertical) WHERE vertical IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_status ON sandbox_leads(status);

-- No RLS - admin access only via service role key

-- Comment
COMMENT ON TABLE sandbox_leads IS 'Sales leads captured from sandbox demo page usage.';
