-- ============================================================================
-- 0005_admin_requires_2fa.sql
-- Monjiz — enforce two-factor authentication inside the database
--
-- The server already refuses admin requests without 2FA (server/utils/auth.ts).
-- This makes the database enforce it too: is_admin() — used by every admin
-- RLS policy on tables and storage — is now true only when the caller's
-- session has Authenticator Assurance Level 2 (password + TOTP code).
-- A stolen password alone yields an aal1 session and sees nothing.
-- ============================================================================

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (select 1 from admin_profiles where id = auth.uid());
$$;

comment on function is_admin() is
  'True only for a user listed in admin_profiles whose session passed 2FA (aal2). Used by all admin RLS policies.';

-- ----------------------------------------------------------------------------
-- Gap fix: 0002 gave admins read/update on contact_messages but no delete,
-- so the dashboard's "delete message" (PDPL erasure) would have been
-- silently refused by RLS.
-- ----------------------------------------------------------------------------
drop policy if exists "admin_delete_messages" on contact_messages;
create policy "admin_delete_messages"
on contact_messages for delete
to authenticated
using (is_admin());
