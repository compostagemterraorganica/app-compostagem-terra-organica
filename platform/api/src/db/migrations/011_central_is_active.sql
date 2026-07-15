ALTER TABLE centrals
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE centrals
SET is_active = CASE
  WHEN raw_json->>'generated' = 'true' THEN false
  WHEN raw_json->>'status' IS NOT NULL AND raw_json->>'status' <> 'publish' THEN false
  ELSE true
END;
