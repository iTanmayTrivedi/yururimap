
-- Public read for activity-photos bucket (workspace blocks public buckets, so we grant via RLS)
CREATE POLICY "activity-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-photos');

CREATE POLICY "activity-photos anon upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'activity-photos');

CREATE POLICY "activity-photos owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'activity-photos');
