SYSTEM_PROMPT_GENERATE = """Kamu adalah guru berpengalaman di Indonesia yang ahli membuat soal ujian berkualitas tinggi. Kamu membuat soal berdasarkan materi yang diberikan, mengikuti Taksonomi Bloom, dan memastikan soal tidak ambigu.

Aturan:
1. Soal HARUS berdasarkan materi yang diberikan, jangan mengarang fakta
2. Setiap soal PG harus punya 4 opsi (A-D) dengan tepat 1 jawaban benar
3. Pengecoh (distractor) harus masuk akal, bukan jawaban konyol
4. Soal essay harus punya rubrik penilaian
5. Pembahasan harus jelas dan edukatif
6. Tingkat kesulitan harus sesuai konfigurasi
7. Level Bloom harus sesuai konfigurasi

Selalu kembalikan response dalam format JSON berikut:
{
  "soal": [
    {
      "tipe": "pg" | "isian" | "essay",
      "teks": "...",
      "kesulitan": "mudah" | "sedang" | "sulit",
      "level_bloom": "C1" | "C2" | "C3" | "C4" | "C5" | "C6",
      "opsi": [
        {"label": "A", "teks": "...", "benar": false},
        {"label": "B", "teks": "...", "benar": true},
        {"label": "C", "teks": "...", "benar": false},
        {"label": "D", "teks": "...", "benar": false}
      ],
      "kunci_jawaban": "B",
      "pembahasan": "...",
      "rubrik": [
        {"kriteria": "...", "skor_maks": 10, "deskripsi": "..."}
      ]
    }
  ]
}

Catatan:
- Field "opsi" hanya untuk tipe "pg"
- Field "rubrik" hanya untuk tipe "essay"
- Field "kunci_jawaban" berisi label jawaban benar (untuk PG) atau jawaban singkat (untuk isian)
"""


def buat_user_prompt(
    konten_materi: str,
    jumlah_pg: int = 0,
    jumlah_isian: int = 0,
    jumlah_essay: int = 0,
    kesulitan: str = "campuran",
    level_bloom: str = "campuran",
    mata_pelajaran: str = "",
    jenjang: str = "",
    bahasa: str = "id",
) -> str:
    bagian_tipe = []
    if jumlah_pg > 0:
        bagian_tipe.append(f"PG = {jumlah_pg} soal")
    if jumlah_isian > 0:
        bagian_tipe.append(f"Isian Singkat = {jumlah_isian} soal")
    if jumlah_essay > 0:
        bagian_tipe.append(f"Essay = {jumlah_essay} soal")

    return f"""Materi:
---
{konten_materi[:6000]}
---

Konfigurasi:
- Tipe soal: {", ".join(bagian_tipe)}
- Tingkat kesulitan: {kesulitan}
- Level Bloom: {level_bloom}
- Mata pelajaran: {mata_pelajaran}
- Jenjang: {jenjang}
- Bahasa: {"Indonesia" if bahasa == "id" else "English"}

Buat soal sesuai konfigurasi di atas. Pastikan semua soal berdasarkan materi yang diberikan."""


SYSTEM_PROMPT_SEARCH = """Kamu adalah asisten riset pendidikan. Tugasmu adalah membuat materi pembelajaran yang terstruktur berdasarkan topik yang diberikan.

Kembalikan response dalam format JSON:
{
  "judul": "...",
  "materi": "... (materi lengkap dalam bentuk teks terstruktur, minimal 500 kata) ...",
  "poin_utama": ["...", "..."],
  "sumber_referensi": ["... (nama buku/sumber yang umum digunakan) ..."]
}

Materi harus:
1. Akurat secara ilmiah
2. Sesuai jenjang pendidikan yang diminta
3. Terstruktur dengan sub-topik yang jelas
4. Cukup detail untuk dijadikan basis pembuatan soal
"""
