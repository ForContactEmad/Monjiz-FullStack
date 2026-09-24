-- ============================================================================
-- 0007_request_notes_and_cdn_images.sql
-- Monjiz — notes written on a request, and portfolio images from a CDN link
-- ============================================================================

-- ----------------------------------------------------------------------------
-- request_notes
-- A dated trail of notes the admin writes while handling a request, instead
-- of one overwritten text box: what was agreed, what the client asked for,
-- what is still pending. Never shown to the client.
--
-- Kept separate from service_requests.internal_notes (which stays as the
-- short "summary" field) so history is preserved: editing or deleting one
-- note never rewrites the others.
-- ----------------------------------------------------------------------------
create table if not exists request_notes (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  admin_id   uuid references admin_profiles(id),
  body       text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_request_notes_request on request_notes (request_id, created_at desc);

alter table request_notes enable row level security;

-- Admin-only, in every direction: notes are internal by definition.
drop policy if exists "admin_manage_request_notes" on request_notes;
create policy "admin_manage_request_notes"
on request_notes for all to authenticated using (is_admin()) with check (is_admin());

drop trigger if exists trg_request_notes_updated_at on request_notes;
create trigger trg_request_notes_updated_at
before update on request_notes
for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- portfolio_items.image_url
-- An image can now come from either source:
--   • image_path — uploaded through the dashboard, stored in our bucket
--   • image_url  — an external https link (a CDN, or an image hosted
--                  elsewhere), stored as text and used as-is
-- If both are set, the uploaded file wins (it is the one we control).
--
-- https is required: an http link would be blocked as mixed content on a
-- secure site, and would leak the visitor's request over plain text.
-- ----------------------------------------------------------------------------
alter table portfolio_items
  add column if not exists image_url text
  check (image_url is null or (image_url ~ '^https://' and length(image_url) <= 500));

comment on column portfolio_items.image_url is
  'External https image link (CDN). Uploaded image_path takes precedence when both are present.';
