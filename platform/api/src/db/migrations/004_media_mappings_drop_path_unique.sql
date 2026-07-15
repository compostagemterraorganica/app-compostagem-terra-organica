-- Um legacy_path pode ter varias legacy_url (WP + /uploads/)
DROP INDEX IF EXISTS media_url_mappings_legacy_path_unique_idx;
