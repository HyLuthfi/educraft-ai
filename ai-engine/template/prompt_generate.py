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
      ],
      "image_prompt": "..."
    }
  ]
}

Catatan:
- Field "opsi" hanya untuk tipe "pg"
- Field "rubrik" hanya untuk tipe "essay"
- Field "kunci_jawaban" berisi label jawaban benar (untuk PG) atau jawaban singkat (untuk isian)
- Field "image_prompt" HANYA diisi jika dikonfigurasi ada soal bergambar. Jika diisi, isinya HARUS deskripsi gambar yang fotorealistik dan sangat detail dalam BAHASA INGGRIS. GAMBAR INI BUKAN SEKADAR HIASAN! Gambar harus memuat objek/situasi yang menjadi inti pertanyaan (soal visual). Teks soal harus merujuk ke gambar.
"""


def buat_user_prompt(
    konten_materi: str,
    blocks: list,
    level_bloom: str = "campuran",
    mata_pelajaran: str = "",
    jenjang: str = "",
    bahasa: str = "id",
    instruksi_khusus: str = "",
    mode: str = "reguler",
) -> str:
    bagian_blok = []
    for i, b in enumerate(blocks):
        tipe = b.tipe
        level = b.level
        count = b.count
        
        instruksi_gambar = ""
        if mode == "gambar":
            instruksi_gambar = (
                " (SANGAT PENTING: SEMUA soal di blok ini WAJIB bergantung pada gambar. "
                "1. Isi 'image_prompt' dengan deskripsi visual detail (Bahasa Inggris) dari objek/kasus yang ditanyakan. "
                "2. Teks soal TIDAK BOLEH membocorkan jawaban/konteks utuh, HARUS merujuk pada gambar (contoh: 'Perhatikan gambar berikut. Tindakan pemuda pada gambar tersebut mengabaikan pilar...'). "
                "3. Siswa tidak akan bisa menjawab soal HANYA dari membaca teks; mereka WAJIB melihat gambar untuk menemukan clue-nya!)"
            )
        elif mode == "reguler":
            instruksi_gambar = " (PENTING: DILARANG KERAS menyertakan/mengisi field 'image_prompt', biarkan kosong)"
            
        blok_str = f"Blok {i+1}: Buat {count} soal dengan tipe {tipe}, Kesulitan: {level}.{instruksi_gambar}"
        bagian_blok.append(blok_str)
        
    konfig_blok_str = "\n".join([f"- {b}" for b in bagian_blok])

    prompt_teks = f"""Materi:
---
{konten_materi}
---

Konfigurasi Soal Berdasarkan Blok:
{konfig_blok_str}

Konfigurasi Umum:
- Level Bloom: {level_bloom}
- Mata pelajaran: {mata_pelajaran}
- Jenjang: {jenjang}
- Bahasa: {"Indonesia" if bahasa == "id" else "English"}
"""
    if instruksi_khusus:
        prompt_teks += f"- INSTRUKSI KHUSUS DARI GURU: {instruksi_khusus}\n"

    prompt_teks += "\nBuat soal persis sesuai dengan jumlah dan spesifikasi setiap Blok di atas. Pastikan semua soal berdasarkan materi yang diberikan."
    return prompt_teks


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
