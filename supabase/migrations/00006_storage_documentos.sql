-- Create storage bucket for TFD documents (laudos, exames, documentos pessoais, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-tfd',
  'documentos-tfd',
  true,
  52428800, -- 50 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access on documentos-tfd"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'documentos-tfd');

-- Allow anon and authenticated users to upload
CREATE POLICY "Allow uploads to documentos-tfd"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'documentos-tfd');

-- Allow anon and authenticated users to delete their uploads
CREATE POLICY "Allow deletes on documentos-tfd"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'documentos-tfd');
