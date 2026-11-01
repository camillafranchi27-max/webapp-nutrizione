-- ASTARTE v1.3.0 - nuove diete versionate + upload PDF privato

alter table public.plan_versions
  add column if not exists status text not null default 'active',
  add column if not exists source_document_path text,
  add column if not exists source_document_name text;

alter table public.plan_versions
  drop constraint if exists plan_versions_status_check;

alter table public.plan_versions
  add constraint plan_versions_status_check
  check (status in ('draft','active','scheduled','archived'));

update public.plan_versions
set status='active'
where status is null;

insert into storage.buckets (id, name, public)
values ('nutrition-documents','nutrition-documents',false)
on conflict (id) do update set public=false;

drop policy if exists "nutrition_docs_select_own" on storage.objects;
drop policy if exists "nutrition_docs_insert_own" on storage.objects;
drop policy if exists "nutrition_docs_delete_own" on storage.objects;

create policy "nutrition_docs_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id='nutrition-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

create policy "nutrition_docs_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id='nutrition-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

create policy "nutrition_docs_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id='nutrition-documents'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
