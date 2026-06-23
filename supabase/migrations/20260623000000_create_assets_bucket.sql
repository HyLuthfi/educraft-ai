-- Membuat Storage Bucket baru bernama "assets" yang berstatus PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Mengizinkan semua orang (publik) untuk membaca/mengakses file di bucket "assets"
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Mengizinkan user yang sudah login (authenticated) untuk mengunggah (upload) file ke bucket "assets"
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

-- Mengizinkan user untuk mengupdate atau menghapus file miliknya sendiri (opsional)
CREATE POLICY "Authenticated users can update own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid() = owner);

CREATE POLICY "Authenticated users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid() = owner);
