-- Create sesi_koreksi table (saved auto-correction sessions)
CREATE TABLE IF NOT EXISTS public.sesi_koreksi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    -- Ringkasan denormalisasi untuk listing cepat tanpa parse JSONB
    jumlah_siswa INTEGER NOT NULL DEFAULT 0,
    rata_rata NUMERIC,
    tingkat_ketuntasan NUMERIC,
    skala TEXT NOT NULL DEFAULT '100',
    kkm INTEGER NOT NULL DEFAULT 75,
    -- Payload lengkap: { hasil: HasilSiswa[], analitik_kelas: string }
    hasil JSONB NOT NULL,
    -- Konfigurasi penilaian saat sesi dibuat
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index untuk listing sesi milik user, terbaru dulu
CREATE INDEX IF NOT EXISTS idx_sesi_koreksi_user_created
    ON public.sesi_koreksi (user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sesi_koreksi ENABLE ROW LEVEL SECURITY;

-- Policies (per-user isolation)
CREATE POLICY "Users can view their own sesi_koreksi"
    ON public.sesi_koreksi FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sesi_koreksi"
    ON public.sesi_koreksi FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sesi_koreksi"
    ON public.sesi_koreksi FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sesi_koreksi"
    ON public.sesi_koreksi FOR DELETE
    USING (auth.uid() = user_id);
