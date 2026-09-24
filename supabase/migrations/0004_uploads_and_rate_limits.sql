-- ============================================================================
-- 0004_uploads_and_rate_limits.sql
-- Monjiz — two-phase attachment upload + database-backed rate limiting
--
-- Safe to run whether or not 0001–0003 were already applied.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Two-phase uploads (see docs/SECURITY.md, "File upload hardening")
--
-- Vercel caps a function request body at 4.5 MB, so files cannot pass
-- through our server. Instead:
--   1. POST /api/service-requests saves the text fields, generates a
--      one-time finalize token, and hands the browser signed upload URLs
--      for paths under pending/<request_id>/.
--   2. The browser uploads straight to the private bucket.
--   3. POST /api/service-requests/<id>/finalize (token required) downloads
--      each pending object, verifies it by content, re-encodes images, and
--      moves it to <request_id>/<uuid>.<ext>.
--
-- upload_token_hash: SHA-256 of the finalize token. The raw token is only
--   ever held by the browser that created the request. Cleared on finalize,
--   so the token is single-use.
-- pending_uploads: what the browser declared it would upload. Cleared on
--   finalize. Rows left with pending_uploads set are abandoned uploads —
--   a cleanup job (later build step) removes them and their objects.
-- ----------------------------------------------------------------------------
alter table service_requests
  add column if not exists upload_token_hash text,
  add column if not exists pending_uploads jsonb;

-- ----------------------------------------------------------------------------
-- rate_limit_events
-- One row per public form action. Serverless instances don't share memory,
-- so an in-memory counter would reset on every cold start and be useless
-- on Vercel — the count has to live in the database.
--
-- ip_hash is SHA-256(RATE_LIMIT_SALT + ip). The raw IP is never stored,
-- and the salt lives only in a server environment variable.
-- ----------------------------------------------------------------------------
create table if not exists rate_limit_events (
  id         bigserial primary key,
  ip_hash    text not null,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_lookup
  on rate_limit_events (action, ip_hash, created_at desc);

-- RLS on with NO policies: only the service_role key (server routes) can
-- touch this table. Admins don't need it in the dashboard.
alter table rate_limit_events enable row level security;

comment on table rate_limit_events is
  'Short-lived rate-limit log. Rows older than 24h are deleted opportunistically by the server on each check; nothing here is needed long-term.';
