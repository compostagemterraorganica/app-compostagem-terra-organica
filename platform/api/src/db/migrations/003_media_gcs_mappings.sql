-- Fase 1: GCS + mapeamento de URLs legadas

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT,
  ADD COLUMN IF NOT EXISTS sha256 TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS original_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_sha256_unique_idx
  ON media_assets (sha256)
  WHERE sha256 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_storage_key_unique_idx
  ON media_assets (storage_key)
  WHERE storage_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS media_url_mappings (
  id BIGSERIAL PRIMARY KEY,
  media_asset_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  legacy_url TEXT NOT NULL UNIQUE,
  legacy_path TEXT,
  variant_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_url_mappings_asset_idx
  ON media_url_mappings (media_asset_id);

CREATE INDEX IF NOT EXISTS media_url_mappings_path_idx
  ON media_url_mappings (legacy_path);
