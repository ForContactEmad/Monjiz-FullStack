-- ============================================================================
-- 0002_rls_policies.sql
-- Monjiz — Row Level Security
--
-- Design principle (see docs/SECURITY.md for the full rationale):
-- The browser NEVER talks to Supabase directly. All writes from the public
-- site (new requests, new attachments, new contact messages) go through
-- Nuxt server routes using the service_role key, which bypasses RLS by
-- design. Because of that, these policies intentionally do NOT include an
-- "anon insert" policy for service_requests / request_attachments /
-- contact_messages — there is no legitimate path for the anon key to write
-- to these tables, so none is opened.
--
-- Default posture: every table starts fully locked. A policy only ever
-- widens access for a specific role and a specific operation — never assume
-- access, always grant it explicitly.
-- ============================================================================

alter table service_categories   enable row level security;
alter table service_requests     enable row level security;
alter table request_attachments  enable row level security;
alter table contact_messages     enable row level security;
alter table portfolio_items      enable row level security;
alter table admin_profiles       enable row level security;
alter table audit_log            enable row level security;

-- ----------------------------------------------------------------------------
-- Helper: is the currently authenticated user an admin?
-- security definer so it can read admin_profiles even from within a policy
-- on another table (a normal SQL function would be blocked by RLS on
-- admin_profiles itself, causing infinite recursion).
-- ----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles where id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- service_categories — public can read active categories (needed to render
-- /services for anonymous visitors); only admins can manage them.
-- ----------------------------------------------------------------------------
create policy "public_read_active_categories"
on service_categories for select
to anon, authenticated
using (is_active = true);

create policy "admin_manage_categories"
on service_categories for all
to authenticated
using (is_admin())
with check (is_admin());

-- ----------------------------------------------------------------------------
-- service_requests — no anon access at all. Admins can read/update/delete.
-- Inserts happen exclusively via the server route (service_role bypasses
-- RLS, so no insert policy is needed or wanted here).
-- ----------------------------------------------------------------------------
create policy "admin_read_requests"
on service_requests for select
to authenticated
using (is_admin());

create policy "admin_update_requests"
on service_requests for update
to authenticated
using (is_admin())
with check (is_admin());

create policy "admin_delete_requests"
on service_requests for delete
to authenticated
using (is_admin());

-- ----------------------------------------------------------------------------
-- request_attachments — same posture as service_requests: admin-only reads,
-- server-only (service_role) inserts.
-- ----------------------------------------------------------------------------
create policy "admin_read_attachments"
on request_attachments for select
to authenticated
using (is_admin());

create policy "admin_delete_attachments"
on request_attachments for delete
to authenticated
using (is_admin());

-- ----------------------------------------------------------------------------
-- contact_messages — same posture again.
-- ----------------------------------------------------------------------------
create policy "admin_read_messages"
on contact_messages for select
to authenticated
using (is_admin());

create policy "admin_update_messages"
on contact_messages for update
to authenticated
using (is_admin())
with check (is_admin());

-- ----------------------------------------------------------------------------
-- portfolio_items — public can read published items; only admins manage.
-- ----------------------------------------------------------------------------
create policy "public_read_published_portfolio"
on portfolio_items for select
to anon, authenticated
using (is_published = true);

create policy "admin_manage_portfolio"
on portfolio_items for all
to authenticated
using (is_admin())
with check (is_admin());

-- ----------------------------------------------------------------------------
-- admin_profiles — an admin may read their own row only (not the whole
-- table — keeps one admin from harvesting another admin's info if this
-- project ever grows past a single admin).
-- ----------------------------------------------------------------------------
create policy "admin_read_own_profile"
on admin_profiles for select
to authenticated
using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- audit_log — admins can read; there is no update/delete policy for anyone,
-- which makes the log effectively append-only from the API surface (rows
-- can still be removed with the service_role key directly in the SQL
-- editor, which is the intended "break glass" path, not a client-facing one).
-- ----------------------------------------------------------------------------
create policy "admin_read_audit_log"
on audit_log for select
to authenticated
using (is_admin());
