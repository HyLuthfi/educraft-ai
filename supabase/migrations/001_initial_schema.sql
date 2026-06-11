CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    nama_sekolah VARCHAR(255),
    mata_pelajaran VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'guru' CHECK (role IN ('guru', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profil bisa dilihat pemilik" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Profil bisa diubah pemilik" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Profil bisa dibuat saat register" ON profiles FOR INSERT WITH CHECK (id = auth.uid());


CREATE TABLE bank_materi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    jenis_sumber VARCHAR(20) NOT NULL CHECK (jenis_sumber IN ('teks', 'file', 'ai_search', 'ocr')),
    konten_mentah TEXT,
    konten_diproses TEXT,
    file_url TEXT,
    tipe_file VARCHAR(20),
    ukuran_file_kb INTEGER,
    skor_ocr FLOAT,
    query_ai TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'diproses', 'siap', 'gagal')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_materi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materi hanya pemilik" ON bank_materi FOR ALL USING (user_id = auth.uid());


CREATE TABLE set_soal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bank_materi_id UUID REFERENCES bank_materi(id) ON DELETE SET NULL,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    mata_pelajaran VARCHAR(100),
    jenjang VARCHAR(50),
    kurikulum VARCHAR(50) DEFAULT 'merdeka',
    tingkat_kesulitan VARCHAR(20) CHECK (tingkat_kesulitan IN ('mudah', 'sedang', 'sulit', 'campuran')),
    level_bloom VARCHAR(20),
    bahasa VARCHAR(20) DEFAULT 'id',
    jumlah_soal INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'arsip')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE set_soal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Set soal hanya pemilik" ON set_soal FOR ALL USING (user_id = auth.uid());


CREATE TABLE soal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_soal_id UUID NOT NULL REFERENCES set_soal(id) ON DELETE CASCADE,
    nomor_urut INTEGER NOT NULL,
    tipe_soal VARCHAR(20) NOT NULL CHECK (tipe_soal IN ('pg', 'isian', 'essay')),
    teks_soal TEXT NOT NULL,
    gambar_soal TEXT,
    tingkat_kesulitan VARCHAR(20) CHECK (tingkat_kesulitan IN ('mudah', 'sedang', 'sulit')),
    level_bloom VARCHAR(5),
    poin INTEGER DEFAULT 10,
    kunci_jawaban TEXT,
    pembahasan TEXT,
    sudah_diedit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE soal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soal via set_soal pemilik" ON soal FOR ALL
    USING (EXISTS (SELECT 1 FROM set_soal WHERE set_soal.id = soal.set_soal_id AND set_soal.user_id = auth.uid()));


CREATE TABLE opsi_pg (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soal_id UUID NOT NULL REFERENCES soal(id) ON DELETE CASCADE,
    label_opsi CHAR(1) NOT NULL,
    teks_opsi TEXT NOT NULL,
    gambar_opsi TEXT,
    adalah_benar BOOLEAN DEFAULT FALSE,
    nomor_urut INTEGER NOT NULL,
    UNIQUE (soal_id, label_opsi)
);

ALTER TABLE opsi_pg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opsi via soal pemilik" ON opsi_pg FOR ALL
    USING (EXISTS (
        SELECT 1 FROM soal
        JOIN set_soal ON set_soal.id = soal.set_soal_id
        WHERE soal.id = opsi_pg.soal_id AND set_soal.user_id = auth.uid()
    ));


CREATE TABLE rubrik_essay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soal_id UUID NOT NULL REFERENCES soal(id) ON DELETE CASCADE,
    kriteria VARCHAR(255) NOT NULL,
    skor_maks INTEGER NOT NULL,
    deskripsi TEXT,
    nomor_urut INTEGER NOT NULL
);

ALTER TABLE rubrik_essay ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rubrik via soal pemilik" ON rubrik_essay FOR ALL
    USING (EXISTS (
        SELECT 1 FROM soal
        JOIN set_soal ON set_soal.id = soal.set_soal_id
        WHERE soal.id = rubrik_essay.soal_id AND set_soal.user_id = auth.uid()
    ));


CREATE TABLE config_generate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_soal_id UUID NOT NULL REFERENCES set_soal(id) ON DELETE CASCADE,
    jumlah_pg INTEGER DEFAULT 0,
    jumlah_essay INTEGER DEFAULT 0,
    jumlah_isian INTEGER DEFAULT 0,
    model_ai VARCHAR(100),
    prompt_dipakai TEXT,
    token_dipakai INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE config_generate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config via set_soal pemilik" ON config_generate FOR ALL
    USING (EXISTS (SELECT 1 FROM set_soal WHERE set_soal.id = config_generate.set_soal_id AND set_soal.user_id = auth.uid()));


CREATE TABLE riwayat_export (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_soal_id UUID NOT NULL REFERENCES set_soal(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    tipe_export VARCHAR(30) NOT NULL CHECK (tipe_export IN ('pdf', 'docx', 'google_form', 'quizizz', 'link')),
    sertakan_jawaban BOOLEAN DEFAULT FALSE,
    sertakan_pembahasan BOOLEAN DEFAULT FALSE,
    file_url TEXT,
    url_eksternal TEXT,
    token_share VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'diproses' CHECK (status IN ('diproses', 'selesai', 'gagal')),
    pesan_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE riwayat_export ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Export hanya pemilik" ON riwayat_export FOR ALL USING (user_id = auth.uid());


CREATE TABLE tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    nama VARCHAR(100) NOT NULL,
    warna VARCHAR(7)
);

ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tag hanya pemilik" ON tag FOR ALL USING (user_id = auth.uid());


CREATE TABLE soal_tag (
    soal_id UUID REFERENCES soal(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (soal_id, tag_id)
);

ALTER TABLE soal_tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Soal_tag via tag pemilik" ON soal_tag FOR ALL
    USING (EXISTS (SELECT 1 FROM tag WHERE tag.id = soal_tag.tag_id AND tag.user_id = auth.uid()));


CREATE TABLE log_pemakaian_ai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    jenis_aksi VARCHAR(20) CHECK (jenis_aksi IN ('generate', 'search', 'ocr')),
    model_dipakai VARCHAR(100),
    token_input INTEGER,
    token_output INTEGER,
    estimasi_biaya DECIMAL(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE log_pemakaian_ai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Log hanya pemilik" ON log_pemakaian_ai FOR ALL USING (user_id = auth.uid());


CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, nama, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama', NEW.raw_user_meta_data->>'full_name', 'Guru'), NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
