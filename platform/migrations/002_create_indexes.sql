BEGIN;

CREATE INDEX IF NOT EXISTS idx_volume_verifications_central_measurement
  ON volume_verifications (central_id, measurement_date);

CREATE INDEX IF NOT EXISTS idx_user_central_relations_central_user
  ON user_central_relations (central_id, user_id);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

CREATE INDEX IF NOT EXISTS idx_centrals_slug
  ON centrals (slug);

CREATE INDEX IF NOT EXISTS idx_posts_published_at
  ON posts (published_at);

CREATE INDEX IF NOT EXISTS idx_posts_slug
  ON posts (slug);

CREATE INDEX IF NOT EXISTS idx_posts_status
  ON posts (status);

COMMIT;
