-- Run manually against Vercel Postgres (POSTGRES_URL in .env.local).
CREATE TABLE IF NOT EXISTS investigation_submissions (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  email TEXT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'form',
  search_query TEXT NULL
);

CREATE INDEX IF NOT EXISTS investigation_submissions_created_at_idx
  ON investigation_submissions (created_at DESC);
