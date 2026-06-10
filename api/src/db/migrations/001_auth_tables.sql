BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_credentials'
  ) THEN
    EXECUTE $sql$
      UPDATE users u
      SET password = uc.password_hash,
          updated_at = NOW()
      FROM user_credentials uc
      WHERE u.id = uc.user_id
        AND (u.password IS NULL OR u.password = '')
    $sql$;
  END IF;
END $$;

DROP TABLE IF EXISTS user_credentials;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  csrf_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_hash
  ON user_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions(user_id);

COMMIT;
