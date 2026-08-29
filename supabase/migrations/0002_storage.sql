-- Lean & Mean — private storage bucket for food photos (spec §19).
-- Bucket is private; objects are only accessible to their owner.

insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false)
on conflict (id) do nothing;

-- Owner-only policies on storage.objects, scoped to the food-photos bucket.
-- `owner` is set to auth.uid() automatically on upload.

create policy "food-photos: owner can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'food-photos' and owner = auth.uid());

create policy "food-photos: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'food-photos' and owner = auth.uid());

create policy "food-photos: owner can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'food-photos' and owner = auth.uid())
  with check (bucket_id = 'food-photos' and owner = auth.uid());

create policy "food-photos: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'food-photos' and owner = auth.uid());
