BEGIN;

UPDATE users
SET roles_json = '["administrator"]'::jsonb,
    updated_at = NOW()
WHERE lower(email) = lower('admin@admin.com');

COMMIT;
