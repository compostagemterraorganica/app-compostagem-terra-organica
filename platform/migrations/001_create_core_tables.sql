BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  password TEXT,
  avatar_url TEXT,
  description TEXT,
  registered_at TIMESTAMPTZ,
  roles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  capabilities_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS centrals (
  id BIGINT PRIMARY KEY,
  slug TEXT,
  name TEXT NOT NULL,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volume_verifications (
  id BIGINT PRIMARY KEY,
  title TEXT,
  published_at TIMESTAMPTZ,
  measurement_date DATE,
  central_id BIGINT NOT NULL REFERENCES centrals(id),
  volume_liters NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (volume_liters >= 0),
  video_link TEXT,
  post_link TEXT,
  status TEXT,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_central_relations (
  id BIGSERIAL PRIMARY KEY,
  relation_type TEXT NOT NULL DEFAULT 'jet-rel-13',
  central_id BIGINT NOT NULL REFERENCES centrals(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'jet-rel-13',
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (central_id, user_id, relation_type)
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT PRIMARY KEY,
  title TEXT,
  slug TEXT,
  link TEXT,
  author_login TEXT,
  status TEXT,
  published_at TIMESTAMPTZ,
  post_type TEXT NOT NULL,
  excerpt TEXT,
  content_html TEXT,
  categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
