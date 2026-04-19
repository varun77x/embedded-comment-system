-- Migration: 001_initial_schema
-- Run with: psql $DATABASE_URL -f migrations/001_initial_schema.sql

BEGIN;

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT,                         -- NULL for OAuth-only accounts
  google_id     TEXT        UNIQUE,
  display_name  TEXT        NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;

-- ── Sites ─────────────────────────────────────────────────────────────────────
-- A "site" is a registered host website that embeds the widget.
CREATE TABLE IF NOT EXISTS sites (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  allowed_origin TEXT        NOT NULL,
  api_key        TEXT        NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_owner   ON sites (owner_id);
CREATE INDEX IF NOT EXISTS idx_sites_api_key ON sites (api_key);

-- ── Threads ───────────────────────────────────────────────────────────────────
-- One thread per unique (site, page URL) pair.
CREATE TABLE IF NOT EXISTS threads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID        NOT NULL REFERENCES sites (id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, url)
);

CREATE INDEX IF NOT EXISTS idx_threads_site ON threads (site_id);

-- ── Comments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  UUID        NOT NULL REFERENCES threads  (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
  parent_id  UUID                 REFERENCES comments (id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  upvotes    INTEGER     NOT NULL DEFAULT 0 CHECK (upvotes   >= 0),
  downvotes  INTEGER     NOT NULL DEFAULT 0 CHECK (downvotes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ          -- soft delete; NULL = visible
);

CREATE INDEX IF NOT EXISTS idx_comments_thread    ON comments (thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent    ON comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user      ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_thread_created
  ON comments (thread_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- ── Votes ─────────────────────────────────────────────────────────────────────
-- One row per (comment, user) pair — prevents duplicate votes at the DB level.
CREATE TABLE IF NOT EXISTS votes (
  comment_id UUID        NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
  vote_type  TEXT        NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

COMMIT;
