-- ============================================================================
-- 0009_close_internal_notes_leak.sql
-- Monjiz — SECURITY FIX: remove service_requests.internal_notes
--
-- THE PROBLEM
-- 0008 gave clients a select policy on service_requests so they can follow
-- their own requests. Row Level Security filters ROWS, not COLUMNS — so a
-- client reading their own row could also read internal_notes, the admin's
-- private notes. Our own API never returned that column, but a client could
-- query Supabase directly with the public anon key and their own session,
-- so the API not selecting it was not protection.
--
-- THE FIX
-- Drop the column. Private notes already live in request_notes (0007),
-- which is admin-only in every direction and has no client policy at all.
-- Any existing text is moved there first, so nothing is lost.
-- ============================================================================

-- 1. Preserve what is already written, as a normal note.
insert into request_notes (request_id, admin_id, body, created_at)
select r.id, null, r.internal_notes, coalesce(r.updated_at, now())
from service_requests r
where r.internal_notes is not null
  and length(trim(r.internal_notes)) > 0
  and not exists (
    select 1 from request_notes n
    where n.request_id = r.id and n.body = r.internal_notes
  );

-- 2. Remove the column so it cannot be read by anyone but the database owner.
alter table service_requests drop column if exists internal_notes;

-- 3. Re-assert the client's read policy with a comment recording the rule:
--    every column of this table is now either the client's own data or
--    operational data that is safe for them to see.
drop policy if exists "client_read_own_requests" on service_requests;
create policy "client_read_own_requests"
on service_requests for select to authenticated using (client_id = auth.uid());

comment on table service_requests is
  'Client requests. A client can read their OWN row, so never add an admin-private column here — put it in request_notes or another admin-only table.';
