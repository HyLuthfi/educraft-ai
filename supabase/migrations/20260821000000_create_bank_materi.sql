-- Create bank_materi table (riwayat materi input untuk Buat Soal)
-- Kolom mengikuti pemakaian di app/api/generate/route.ts dan app/(dashboard)/create/page.tsx
CREATE TABLE IF NOT EXISTS public.bank_materi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    judul TEXT NOT NULL,
    jenis_sumber TEXT DEFAULT 'teks',
    konten_mentah TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.bank_materi ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bank_materi"
    ON public.bank_materi FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank_materi"
    ON public.bank_materi FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank_materi"
    ON public.bank_materi FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank_materi"
    ON public.bank_materi FOR DELETE
    USING (auth.uid() = user_id);
