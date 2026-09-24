-- ============================================================================
-- 0008_client_accounts.sql
-- Monjiz — client accounts, request ownership, and messaging inside a request
--
-- Two kinds of account now exist, and they must never be confused:
--   • ADMIN   — a row in admin_profiles, requires 2FA (is_admin(), aal2).
--   • CLIENT  — a row in client_profiles, password only, sees ONLY their own
--               requests and never anything internal.
-- A client account grants nothing in the dashboard: every admin policy goes
-- through is_admin(), which checks admin_profiles AND 2FA.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- client_profiles — the details a client fills once instead of on every form.
-- id points at Supabase Auth, exactly like admin_profiles.
-- ----------------------------------------------------------------------------
create table if not exists client_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null check (length(full_name) between 2 and 100),
  phone        text check (phone is null or length(phone) <= 20),
  company_name text check (company_name is null or length(company_name) <= 150),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table client_profiles enable row level security;

drop policy if exists "client_read_own_profile" on client_profiles;
create policy "client_read_own_profile"
on client_profiles for select to authenticated using (id = auth.uid());

drop policy if exists "client_update_own_profile" on client_profiles;
create policy "client_update_own_profile"
on client_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- The admin needs to see who a request belongs to.
drop policy if exists "admin_read_client_profiles" on client_profiles;
create policy "admin_read_client_profiles"
on client_profiles for select to authenticated using (is_admin());

drop trigger if exists trg_client_profiles_updated_at on client_profiles;
create trigger trg_client_profiles_updated_at
before update on client_profiles
for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- service_requests.client_id — who owns the request.
-- ON DELETE SET NULL: if a client deletes their account, the request record
-- stays with the admin (it may be paid work in progress), but stops being
-- linked to a person.
-- ----------------------------------------------------------------------------
alter table service_requests
  add column if not exists client_id uuid references auth.users(id) on delete set null;

create index if not exists idx_service_requests_client on service_requests (client_id, created_at desc);

-- A client may read their own requests — and only their own.
-- Note what they get: status, price, due date. They never get internal_notes
-- or request_notes, because no policy grants them access to those.
drop policy if exists "client_read_own_requests" on service_requests;
create policy "client_read_own_requests"
on service_requests for select to authenticated using (client_id = auth.uid());

-- Same for the files attached to their own request.
drop policy if exists "client_read_own_attachments" on request_attachments;
create policy "client_read_own_attachments"
on request_attachments for select to authenticated
using (exists (select 1 from service_requests r where r.id = request_id and r.client_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- request_messages — the conversation inside a request.
-- Distinct from request_notes: notes are private to the admin, messages are
-- shared with the client.
-- ----------------------------------------------------------------------------
create table if not exists request_messages (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references service_requests(id) on delete cascade,
  sender         text not null check (sender in ('client', 'admin')),
  author_id      uuid references auth.users(id) on delete set null,
  body           text not null check (length(body) between 1 and 5000),
  read_by_admin  boolean not null default false,
  read_by_client boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_request_messages_request on request_messages (request_id, created_at);

alter table request_messages enable row level security;

drop policy if exists "admin_manage_request_messages" on request_messages;
create policy "admin_manage_request_messages"
on request_messages for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "client_read_own_request_messages" on request_messages;
create policy "client_read_own_request_messages"
on request_messages for select to authenticated
using (exists (select 1 from service_requests r where r.id = request_id and r.client_id = auth.uid()));

-- A client may only write AS a client, only on their own request, and only
-- in their own name: the check covers all three at once.
drop policy if exists "client_write_own_request_messages" on request_messages;
create policy "client_write_own_request_messages"
on request_messages for insert to authenticated
with check (
  sender = 'client'
  and author_id = auth.uid()
  and exists (select 1 from service_requests r where r.id = request_id and r.client_id = auth.uid())
);
