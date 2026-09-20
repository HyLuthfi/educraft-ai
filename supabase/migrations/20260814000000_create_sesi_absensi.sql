-- Create sesi_absensi table (saved attendance sessions)
CREATE TABLE IF NOT EXISTS public.sesi_absensi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    judul TEXT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Ringkasan denormalisasi untuk listing/rekap cepat tanpa parse JSONB
    total_murid INTEGER NOT NULL DEFAULT 0,
    jumlah_hadir INTEGER NOT NULL DEFAULT 0,
    jumlah_izin INTEGER NOT NULL DEFAULT 0,
    jumlah_sakit INTEGER NOT NULL DEFAULT 0,
    jumlah_alpa INTEGER NOT NULL DEFAULT 0,
    jumlah_terlambat INTEGER NOT NULL DEFAULT 0,
    -- Payload lengkap: [{ nama, nomor_absen, status, keterangan }, ...]
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index untuk listing/rekap sesi milik user, terbaru dulu
CREATE INDEX IF NOT EXISTS idx_sesi_absensi_user_tanggal
    ON public.sesi_absensi (user_id, tanggal DESC);

-- Enable Row Level Security
ALTER TABLE public.sesi_absensi ENABLE ROW LEVEL SECURITY;

-- Policies (per-user isolation)
CREATE POLICY "Users can view their own sesi_absensi"
    ON public.sesi_absensi FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sesi_absensi"
    ON public.sesi_absensi FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sesi_absensi"
    ON public.sesi_absensi FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sesi_absensi"
    ON public.sesi_absensi FOR DELETE
    USING (auth.uid() = user_id);
