-- ============================================================================
-- 0003_storage_buckets.sql
-- Monjiz — Storage buckets
--
-- Two buckets, opposite visibility:
--   portfolio-public      → public=true,  admin-managed sample work images
--   request-attachments   → public=false, client-uploaded files, admin-only
--                            reads via short-lived signed URLs
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-public',
  'portfolio-public',
  true,
  10485760, -- 10MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-attachments',
  'request-attachments',
  false,
  10485760, -- 10MB, mirrors the app-layer and request_attachments.size_bytes check
  array[
    'image/jpeg','image/png','image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- portfolio-public — anyone can view, only admins can manage the files.
-- ----------------------------------------------------------------------------
create policy "public_read_portfolio_images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'portfolio-public');

create policy "admin_write_portfolio_images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio-public' and is_admin());

create policy "admin_update_portfolio_images"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio-public' and is_admin());

create policy "admin_delete_portfolio_images"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio-public' and is_admin());

-- ----------------------------------------------------------------------------
-- request-attachments — fully private. No anon policy of any kind.
-- Uploads happen via the Nuxt server route using the service_role key
-- (bypasses storage RLS the same way it bypasses table RLS). Admins can
-- read (to generate a signed URL) and delete (retention / client deletion
-- requests); nobody can update a file in place — delete and re-upload.
-- ----------------------------------------------------------------------------
create policy "admin_read_request_attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'request-attachments' and is_admin());

create policy "admin_delete_request_attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'request-attachments' and is_admin());
