-- 0005: private bucket for user voice recordings (v1 audio, Sept 11 2026).
-- Files are keyed <auth.uid()>/<affirmation-id>.<ext> so the folder name IS the
-- owner, which is what the RLS policies below check.
--
-- VOICE POLICY: these are stored media only — played back to the user, never
-- analyzed, never feature-extracted, never sent to an AI vendor. No voiceprint
-- is derived (no cloning in v1), which is what keeps 2+ outside the BIPA
-- biometric regime by design rather than by consent management.

insert into storage.buckets (id, name, public)
values ('voice-recordings', 'voice-recordings', false)
on conflict (id) do nothing;

drop policy if exists "voice recordings: read own" on storage.objects;
drop policy if exists "voice recordings: insert own" on storage.objects;
drop policy if exists "voice recordings: update own" on storage.objects;
drop policy if exists "voice recordings: delete own" on storage.objects;

create policy "voice recordings: read own" on storage.objects for select to authenticated
  using (bucket_id = 'voice-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "voice recordings: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "voice recordings: update own" on storage.objects for update to authenticated
  using (bucket_id = 'voice-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "voice recordings: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'voice-recordings' and (storage.foldername(name))[1] = auth.uid()::text);
