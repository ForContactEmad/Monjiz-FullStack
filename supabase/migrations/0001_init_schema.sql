-- ============================================================================
-- 0001_init_schema.sql
-- Monjiz — core schema
-- Order: run after enabling the pgcrypto extension (gen_random_uuid) which is
-- enabled by default on all Supabase projects.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- service_categories
-- The 4 service categories + "other". Seeded at the end of this file.
-- ----------------------------------------------------------------------------
create table if not exists service_categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name_ar       text not null,
  name_en       text not null,
  description_ar text,
  description_en text,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

comment on table service_categories is
  'The service categories shown on the /services page. is_active=false hides a category without deleting its history.';

-- ----------------------------------------------------------------------------
-- service_requests
-- One row per "اطلب خدمتك" form submission.
-- ----------------------------------------------------------------------------
create table if not exists service_requests (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references service_categories(id),
  full_name       text not null,
  email           text not null,
  phone           text,              -- optional, nullable at the DB level (not just the UI)
  company_name    text,              -- optional
  details         text not null,
  status          text not null default 'new'
                  check (status in ('new','reviewing','quoted','in_progress','delivered','cancelled')),
  consent_privacy boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table service_requests is
  'Client requests submitted via /services. Never written to directly from the browser — only via the Nuxt server route using the service_role key. See docs/SECURITY.md.';
comment on column service_requests.consent_privacy is
  'Must be true before insert is accepted by the server route — explicit PDPL consent checkbox.';

create index if not exists idx_service_requests_status on service_requests(status);
create index if not exists idx_service_requests_created_at on service_requests(created_at desc);

-- ----------------------------------------------------------------------------
-- request_attachments
-- Files a client attaches to their request. Metadata only — the actual bytes
-- live in the private `request-attachments` storage bucket.
-- ----------------------------------------------------------------------------
create table if not exists request_attachments (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references service_requests(id) on delete cascade,
  storage_path      text not null,          -- path inside the private bucket, e.g. '<request_id>/<filename>'
  original_filename text not null,
  mime_type         text not null,
  size_bytes        bigint not null check (size_bytes > 0 and size_bytes <= 10485760), -- 10MB hard cap, mirrored at the app layer
  created_at        timestamptz not null default now()
);

comment on table request_attachments is
  'Max 3 rows per request_id, enforced at the app layer (server route), not the DB. Files never exposed by public URL — only short-lived signed URLs generated for an authenticated admin.';

create index if not exists idx_request_attachments_request_id on request_attachments(request_id);

-- ----------------------------------------------------------------------------
-- contact_messages
-- General inquiries from /contact (separate from service requests).
-- ----------------------------------------------------------------------------
create table if not exists contact_messages (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           text not null,
  message         text not null,
  status          text not null default 'new' check (status in ('new','read','replied')),
  consent_privacy boolean not null default false, -- kept consistent with service_requests; see docs/SECURITY.md
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- portfolio_items
-- Sample work shown on /portfolio. Images live in the public
-- `portfolio-public` bucket (image_path stores the object path).
-- ----------------------------------------------------------------------------
create table if not exists portfolio_items (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references service_categories(id),
  title_ar        text not null,
  title_en        text not null,
  description_ar  text,
  description_en  text,
  image_path      text,
  sort_order      int not null default 0,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- admin_profiles
-- One row per admin. id is a foreign key into Supabase's built-in auth.users
-- — we do not build a custom auth system (see docs/SECURITY.md, "why not a
-- custom users table").
-- ----------------------------------------------------------------------------
create table if not exists admin_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

comment on table admin_profiles is
  'Whoever has a row here can pass the is_admin() check used throughout RLS. Add rows manually in Supabase after the person signs up via Supabase Auth — there is no public self-signup flow for this table.';

-- ----------------------------------------------------------------------------
-- audit_log
-- Append-only record of admin actions on sensitive tables. Not a
-- comprehensive audit trail — a lightweight record for PDPL accountability
-- and dispute resolution, per docs/SECURITY.md.
-- ----------------------------------------------------------------------------
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references admin_profiles(id),
  action       text not null,       -- e.g. 'view_request', 'delete_request', 'export_attachment'
  target_table text not null,
  target_id    uuid,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on audit_log(created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at trigger for service_requests
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_requests_updated_at on service_requests;
create trigger trg_service_requests_updated_at
before update on service_requests
for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Seed: the 4 categories + "other"
-- ----------------------------------------------------------------------------
insert into service_categories (slug, name_ar, name_en, description_ar, description_en, sort_order)
values
  ('development', 'برمجة وتطوير', 'Programming & Development',
   'مواقع، تطبيقات، بوتات، أتمتة، سكربتات', 'Websites, apps, bots, automation, scripts', 1),
  ('design', 'تصميم جرافيك وUI/UX', 'Graphic & UI/UX Design',
   'شعارات، واجهات تطبيقات، بوسترات، سوشال ميديا', 'Logos, app interfaces, posters, social media', 2),
  ('marketing', 'تسويق رقمي ومحتوى', 'Digital Marketing & Content',
   'إعلانات ممولة، كتابة محتوى، إدارة سوشال ميديا', 'Paid ads, content writing, social media management', 3),
  ('office', 'خدمات أوفيس', 'Office Services',
   'إعداد تقارير، جداول إكسل، عروض بوربوينت، تنسيق مستندات', 'Reports, spreadsheets, presentations, document formatting', 4),
  ('other', 'أخرى', 'Other',
   'يحددها العميل بحقل التفاصيل', 'Specified by the client in the details field', 5)
on conflict (slug) do nothing;
