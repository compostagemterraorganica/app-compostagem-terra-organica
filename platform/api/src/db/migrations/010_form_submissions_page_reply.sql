ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS page_slug TEXT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_subject TEXT,
  ADD COLUMN IF NOT EXISTS reply_body TEXT;

UPDATE form_submissions
SET page_slug = 'contato'
WHERE form_type = 'contato' AND page_slug IS NULL;

UPDATE form_submissions
SET page_slug = 'financiadores'
WHERE form_type = 'financiador' AND page_slug IS NULL;

UPDATE form_submissions
SET page_slug = 'cadastro-de-centrais'
WHERE form_type = 'central-registration' AND page_slug IS NULL;
