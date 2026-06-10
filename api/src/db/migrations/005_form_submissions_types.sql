ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT;

UPDATE form_submissions
SET form_type = 'contato',
    name = COALESCE(name, (payload_json::jsonb)->>'name'),
    email = COALESCE(email, (payload_json::jsonb)->>'email'),
    phone = COALESCE(phone, (payload_json::jsonb)->>'phone'),
    message = COALESCE(message, (payload_json::jsonb)->>'message')
WHERE form_type = 'contact';

UPDATE form_submissions
SET name = COALESCE(name, (payload_json::jsonb)->>'contactName', (payload_json::jsonb)->>'centralName'),
    email = COALESCE(email, (payload_json::jsonb)->>'email'),
    message = COALESCE(
      message,
      CONCAT((payload_json::jsonb)->>'centralName', ' — ', (payload_json::jsonb)->>'city', '/', (payload_json::jsonb)->>'state')
    )
WHERE form_type = 'central-registration' AND name IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'form_submissions_form_type_check'
  ) THEN
    ALTER TABLE form_submissions
      ADD CONSTRAINT form_submissions_form_type_check
      CHECK (form_type IN ('contato', 'financiador', 'central-registration'));
  END IF;
END $$;
