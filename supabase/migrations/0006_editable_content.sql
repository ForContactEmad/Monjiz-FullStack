-- ============================================================================
-- 0006_editable_content.sql
-- Monjiz — content the admin edits from the dashboard
--
-- Moves what used to be hard-coded (app/config/site.ts, locale files) into
-- the database so dashboard edits appear on the site immediately:
--   • site_settings     — stats, contact details, license number
--   • testimonials      — client reviews
--   • service_requests  — price quote, due date, internal notes
--   • portfolio_items   — seeded with the illustrative samples
-- ============================================================================

-- ----------------------------------------------------------------------------
-- site_settings — exactly one row (id = 1).
-- Every field here is PUBLIC information shown on the site, so anyone may
-- read it. Only an admin (with 2FA) may change it.
-- A NULL value hides the related section on the site: never store a
-- placeholder or an invented figure.
-- ----------------------------------------------------------------------------
create table if not exists site_settings (
  id                       smallint primary key default 1 check (id = 1),
  orders_completed         int check (orders_completed is null or orders_completed >= 0),
  years_experience         int check (years_experience is null or years_experience between 0 and 80),
  freelance_license_number text check (freelance_license_number is null or length(freelance_license_number) <= 50),
  contact_email            text check (contact_email is null or length(contact_email) <= 254),
  whatsapp                 text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'),
  updated_at               timestamptz not null default now()
);

insert into site_settings (id) values (1) on conflict (id) do nothing;

alter table site_settings enable row level security;

drop policy if exists "public_read_settings" on site_settings;
create policy "public_read_settings"
on site_settings for select to anon, authenticated using (true);

drop policy if exists "admin_update_settings" on site_settings;
create policy "admin_update_settings"
on site_settings for update to authenticated using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- testimonials — real client reviews only, published with the client's
-- agreement. Unpublished rows are invisible to the public.
-- ----------------------------------------------------------------------------
create table if not exists testimonials (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(name) between 1 and 100),
  text         text not null check (length(text) between 1 and 1000),
  sort_order   int not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table testimonials enable row level security;

drop policy if exists "public_read_published_testimonials" on testimonials;
create policy "public_read_published_testimonials"
on testimonials for select to anon, authenticated using (is_published = true);

drop policy if exists "admin_manage_testimonials" on testimonials;
create policy "admin_manage_testimonials"
on testimonials for all to authenticated using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- service_requests — fields the admin fills in while handling a request.
-- Never exposed publicly (the table has no public read policy).
-- ----------------------------------------------------------------------------
alter table service_requests
  add column if not exists quoted_price   numeric(12, 2) check (quoted_price is null or quoted_price >= 0),
  add column if not exists due_date       date,
  add column if not exists internal_notes text check (internal_notes is null or length(internal_notes) <= 5000);

comment on column service_requests.quoted_price is 'Quote in SAR, set by the admin.';
comment on column service_requests.internal_notes is 'Admin-only notes; never shown to the client.';

-- ----------------------------------------------------------------------------
-- portfolio_items — seed the four illustrative samples that used to live in
-- the locale files, so the page looks the same after this migration. The
-- admin replaces or deletes them from the dashboard.
-- ----------------------------------------------------------------------------
insert into portfolio_items (category_id, title_ar, title_en, description_ar, description_en, sort_order)
select c.id, v.title_ar, v.title_en, v.description_ar, v.description_en, v.sort_order
from (values
  ('development', 'موقع تعريفي لمتجر إلكتروني', 'E-commerce landing page',
   'تصميم وبرمجة موقع تعريفي متجاوب بواجهة عربية/إنجليزية', 'Design and development of a responsive bilingual landing page', 1),
  ('design', 'هوية بصرية لمشروع ناشئ', 'Brand identity for a startup',
   'شعار، ألوان، وقوالب سوشال ميديا متكاملة', 'Logo, color system, and a full social media template set', 2),
  ('marketing', 'حملة إعلانية لإطلاق منتج', 'Product launch ad campaign',
   'استراتيجية محتوى وإعلانات ممولة عبر منصتين', 'Content strategy and paid ads across two platforms', 3),
  ('office', 'تقرير أداء ربع سنوي', 'Quarterly performance report',
   'تنسيق وتصميم تقرير عرض تقديمي لشركة صغيرة', 'Formatting and design of a presentation report for a small business', 4)
) as v(slug, title_ar, title_en, description_ar, description_en, sort_order)
join service_categories c on c.slug = v.slug
where not exists (select 1 from portfolio_items);
