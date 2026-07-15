ALTER TABLE volume_verifications
  ADD COLUMN IF NOT EXISTS volume_kg NUMERIC(12,2) CHECK (volume_kg IS NULL OR volume_kg >= 0),
  ADD COLUMN IF NOT EXISTS waste_type TEXT NOT NULL DEFAULT 'alimentares'
    CHECK (waste_type IN ('alimentares', 'verdes'));

CREATE TABLE IF NOT EXISTS tags (
  id BIGSERIAL PRIMARY KEY,
  central_id BIGINT NOT NULL REFERENCES centrals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (central_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_central_id ON tags(central_id);

CREATE TABLE IF NOT EXISTS volume_verification_tags (
  volume_verification_id BIGINT NOT NULL REFERENCES volume_verifications(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (volume_verification_id, tag_id)
);
