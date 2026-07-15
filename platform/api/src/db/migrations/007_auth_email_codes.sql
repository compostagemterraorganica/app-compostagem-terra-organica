CREATE TABLE IF NOT EXISTS auth_email_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('setup', 'reset')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_email_codes_user_purpose
  ON auth_email_codes(user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_email_codes_created_at
  ON auth_email_codes(created_at);
