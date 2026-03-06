-- AI File Assistant - Database Schema
-- Run this against your Neon Postgres database

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  s3_key TEXT NOT NULL UNIQUE,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

CREATE TABLE IF NOT EXISTS file_text_content (
  file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  extracted_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  pii_redacted BOOLEAN NOT NULL DEFAULT FALSE,
  s3_key_redacted TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
