export type TipeSoal = "pg" | "isian" | "essay"
export type TingkatKesulitan = "mudah" | "sedang" | "sulit" | "campuran"
export type LevelBloom = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "campuran"
export type StatusMateri = "pending" | "diproses" | "siap" | "gagal"
export type StatusSoal = "draft" | "final" | "arsip"
export type TipeExport = "pdf" | "docx" | "google_form" | "quizizz" | "link"
export type StatusExport = "diproses" | "selesai" | "gagal"
export type JenisSumber = "teks" | "file" | "ai_search" | "ocr"
export type RoleUser = "guru" | "admin"

export interface Profil {
  id: string
  nama: string
  email: string
  nama_sekolah: string | null
  mata_pelajaran: string | null
  avatar_url: string | null
  role: RoleUser
  created_at: string
  updated_at: string
}

export interface BankMateri {
  id: string
  user_id: string
  judul: string
  jenis_sumber: JenisSumber
  konten_mentah: string | null
  konten_diproses: string | null
  file_url: string | null
  tipe_file: string | null
  ukuran_file_kb: number | null
  skor_ocr: number | null
  query_ai: string | null
  status: StatusMateri
  created_at: string
  updated_at: string
}

export interface SetSoal {
  id: string
  user_id: string
  bank_materi_id: string | null
  judul: string
  deskripsi: string | null
  mata_pelajaran: string | null
  jenjang: string | null
  kurikulum: string
  tingkat_kesulitan: TingkatKesulitan | null
  level_bloom: LevelBloom | null
  bahasa: string
  jumlah_soal: number
  status: StatusSoal
  created_at: string
  updated_at: string
}

export interface Soal {
  id: string
  set_soal_id: string
  nomor_urut: number
  tipe_soal: TipeSoal
  teks_soal: string
  gambar_soal: string | null
  tingkat_kesulitan: TingkatKesulitan | null
  level_bloom: string | null
  poin: number
  kunci_jawaban: string | null
  pembahasan: string | null
  sudah_diedit: boolean
  created_at: string
  updated_at: string
  opsi_pg?: OpsiPG[]
  rubrik_essay?: RubrikEssay[]
}

export interface OpsiPG {
  id: string
  soal_id: string
  label_opsi: string
  teks_opsi: string
  gambar_opsi: string | null
  adalah_benar: boolean
  nomor_urut: number
}

export interface RubrikEssay {
  id: string
  soal_id: string
  kriteria: string
  skor_maks: number
  deskripsi: string | null
  nomor_urut: number
}

export interface ConfigGenerate {
  jumlah_pg: number
  jumlah_essay: number
  jumlah_isian: number
  tingkat_kesulitan: TingkatKesulitan
  level_bloom: LevelBloom
  bahasa: string
  sertakan_pembahasan: boolean
  sertakan_kunci: boolean
}

export interface RiwayatExport {
  id: string
  set_soal_id: string
  user_id: string
  tipe_export: TipeExport
  sertakan_jawaban: boolean
  sertakan_pembahasan: boolean
  file_url: string | null
  url_eksternal: string | null
  token_share: string | null
  status: StatusExport
  pesan_error: string | null
  created_at: string
}

export interface HasilGenerateAI {
  soal: {
    type: TipeSoal
    text: string
    difficulty: "easy" | "medium" | "hard"
    bloom_level: string
    options?: {
      label: string
      text: string
      is_correct: boolean
    }[]
    answer_key?: string
    explanation?: string
    rubric?: {
      criteria: string
      max_score: number
      description: string
    }[]
  }[]
}
