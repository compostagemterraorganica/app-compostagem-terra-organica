ALTER TABLE centrals
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_centrals_image_url
  ON centrals (image_url)
  WHERE image_url IS NOT NULL;
