-- Migration: 002_migrations_table
-- Lightweight migration tracking — run BEFORE applying any numbered migration.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Record that 001 has been applied (assumes 001 was run first)
INSERT INTO schema_migrations (version)
VALUES ('001_initial_schema')
ON CONFLICT DO NOTHING;

COMMIT;
