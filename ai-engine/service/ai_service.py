import os
import logging
from pydantic import BaseModel, Field

from service.openai_service import (
    panggil_openai,
    panggil_openai_multimodal,
    baca_gambar_openai,
    DEFAULT_MODEL as DEFAULT_OPENAI_MODEL,
)

logger = logging.getLogger(__name__)

# --- Pydantic Schema Definitions ---

class OpsiPG(BaseModel):
    label: str = Field(description="A, B, C, D")
    teks: str = Field(description="Teks pilihan ganda")
    benar: bool = Field(description="True jika ini jawaban benar")

class RubrikEssay(BaseModel):
    kriteria: str
    skor_maks: int
    deskripsi: str

class SoalItem(BaseModel):
    tipe: str = Field(description="'pg', 'isian', atau 'essay'")
    teks: str = Field(description="Teks pertanyaan")
    kesulitan: str = Field(description="'mudah', 'sedang', atau 'sulit'")
    level_bloom: str = Field(description="Level Bloom (C1-C6)")
    opsi: list[OpsiPG] | None = Field(default=None, description="Hanya untuk soal PG")
    kunci_jawaban: str = Field(description="Label jawaban benar (untuk PG) atau teks singkat (untuk isian)")
    pembahasan: str = Field(description="Penjelasan detail")
    rubrik: list[RubrikEssay] | None = Field(default=None, description="Hanya untuk soal essay")
    image_prompt: str = Field(description="Prompt gambar fotorealistik bahasa Inggris. Kosongkan (\"\") jika soal tidak memerlukan gambar.")

class ResponseSoal(BaseModel):
    soal: list[SoalItem] = Field(description="Daftar soal yang dihasilkan")

class SolveOpsi(BaseModel):
    label: str = Field(description="A, B, C, D")
    teks: str = Field(description="Teks pilihan ganda")
    benar: bool = Field(description="True jika ini jawaban benar")

class SolveItem(BaseModel):
    tipe: str = Field(description="'pg', 'isian', atau 'essay'")
    teks: str = Field(description="Teks pertanyaan yang sudah dirapikan")
    opsi: list[SolveOpsi] | None = Field(default=None, description="Hanya untuk soal PG")
    kunci_jawaban: str = Field(description="Label jawaban benar (PG) atau teks jawaban (isian/essay)")
    pembahasan: str = Field(default="", description="Penjelasan jawaban")

class ResponseSolve(BaseModel):
    soal: list[SolveItem] = Field(description="Daftar soal yang sudah dijawab dan dirapikan")

class KoreksiItem(BaseModel):
    nomor: int = Field(description="Nomor soal")
    pertanyaan: str = Field(description="Teks pertanyaan (jika ada, atau kosong jika tidak diketahui)")
    jawaban_siswa: str = Field(description="Jawaban yang diberikan oleh siswa")
    kunci_jawaban: str = Field(description="Jawaban yang benar menurut kunci")
    status: str = Field(description="'benar' jika tepat, 'salah' jika tidak tepat, atau 'setengah' jika mendapat nilai sebagian (misal untuk essay)")
    nilai: float = Field(description="Nilai yang diperoleh siswa untuk soal ini (misal 0.0 sampai 1.0, atau sesuai bobot)")
    catatan: str = Field(description="Penjelasan singkat kenapa jawaban ini dinilai benar/salah/setengah")

class HasilSiswa(BaseModel):
    nama_siswa: str = Field(description="Nama siswa")
    nilai_akhir: str = Field(description="Nilai akhir siswa (angka dalam bentuk string untuk skala 10/100, atau huruf mutu A/B/C/D/E untuk skala huruf)")
    status_kelulusan: str = Field(description="'tuntas' atau 'belum_tuntas' berdasarkan KKM")
    detail_koreksi: list[KoreksiItem] = Field(description="Rincian hasil koreksi per nomor soal")
    rekomendasi: str = Field(description="Rekomendasi tindak lanjut pribadi (misal: perlu remedial, topik yang perlu diperkuat)")

class ResponseKoreksi(BaseModel):
    hasil: list[HasilSiswa] = Field(description="Daftar hasil koreksi untuk masing-masing siswa")
    analitik_kelas: str = Field(description="Analisis analitik kelas secara keseluruhan (materi terlemah, rata-rata kelas, tingkat kelulusan, saran pembelajaran berikutnya)")

class ResponseKoreksiSatu(BaseModel):
    """Schema koreksi untuk 1 siswa (dipakai pada pemrosesan paralel)."""
    hasil: HasilSiswa = Field(description="Hasil koreksi untuk satu siswa")

class AnggotaKelompok(BaseModel):
    nama: str = Field(description="Nama lengkap siswa")
    nomor_absen: str = Field(default="", description="Nomor absen siswa jika tersedia, string kosong jika tidak")
    nilai: str = Field(default="", description="Nilai siswa jika tersedia (dalam bentuk string), string kosong jika tidak")
    catatan: str = Field(default="", description="Catatan singkat opsional tentang peran/karakter siswa dalam kelompok")

class Kelompok(BaseModel):
    nama_kelompok: str = Field(description="Nama kreatif untuk kelompok ini (misal 'Kelompok Elang')")
    anggota: list[AnggotaKelompok] = Field(description="Daftar anggota dalam kelompok")
    rata_rata_nilai: str = Field(default="", description="Rata-rata nilai kelompok jika data nilai tersedia, string kosong jika tidak")
    alasan_komposisi: str = Field(description="Penjelasan singkat mengapa anggota ini dikelompokkan bersama sesuai strategi")

class ResponseKelompok(BaseModel):
    daftar_kelompok: list[Kelompok] = Field(description="Daftar seluruh kelompok yang terbentuk")
    ringkasan_strategi: str = Field(description="Ringkasan bagaimana strategi diterapkan dalam pembagian ini")
    catatan_ai: str = Field(default="", description="Catatan/peringatan dari AI, misal jika data nilai tidak lengkap atau ada fallback ke strategi acak")

class MuridAbsensi(BaseModel):
    nama: str = Field(description="Nama lengkap murid")
    nomor_absen: str = Field(default="", description="Nomor urut/absen jika ada, string kosong jika tidak")

class ResponseAbsensi(BaseModel):
    daftar_murid: list[MuridAbsensi] = Field(description="Daftar murid hasil ekstraksi nama (urut sesuai input)")
    catatan_ai: str = Field(default="", description="Catatan/peringatan dari AI, misal jika daftar tidak terbaca jelas")

class StatusMurid(BaseModel):
    status: str = Field(default="hadir", description="Salah satu dari: 'hadir', 'izin', 'sakit', 'alpa', 'terlambat'")
    keterangan: str = Field(default="", description="Keterangan/alasan bila tertulis, string kosong jika tidak ada")

class ResponseStatusAbsensi(BaseModel):
    status_murid: list[StatusMurid] = Field(description="Status kehadiran per murid, URUT PERSIS sama dengan urutan roster yang diberikan")
    catatan_ai: str = Field(default="", description="Catatan/peringatan dari AI, misal jika ada murid yang statusnya tidak terbaca")

class AktivitasPertemuan(BaseModel):
    judul: str = Field(description="Judul singkat aktivitas (misal 'Diskusi Kelompok', 'Kuis Cepat')")
    tipe: str = Field(description="Salah satu dari: 'materi', 'diskusi', 'kuis', 'game', 'praktikum', 'review', 'proyek'")
    deskripsi: str = Field(description="Penjelasan detail apa yang dilakukan guru & siswa dalam aktivitas ini")
    durasi_menit: int = Field(description="Alokasi waktu aktivitas ini dalam menit")

class Pertemuan(BaseModel):
    pertemuan_ke: int = Field(description="Nomor urut pertemuan, mulai dari 1")
    judul_pertemuan: str = Field(description="Judul menarik untuk pertemuan ini")
    topik: str = Field(description="Topik/bahasan utama pertemuan")
    tujuan_pembelajaran: list[str] = Field(description="2-4 tujuan pembelajaran yang spesifik & terukur")
    materi_pokok: list[str] = Field(description="Poin-poin materi inti yang dibahas")
    aktivitas: list[AktivitasPertemuan] = Field(description="Rangkaian aktivitas pembelajaran beserta durasinya")
    metode: str = Field(description="Metode/pendekatan mengajar yang digunakan (misal 'Discovery Learning', 'PjBL')")
    penilaian: str = Field(default="", description="Bentuk penilaian/asesmen pada pertemuan ini (kosongkan jika tidak ada)")
    catatan_guru: str = Field(default="", description="Tips praktis penyampaian untuk guru (opsional)")

class ResponseRencana(BaseModel):
    judul_rencana: str = Field(description="Judul keseluruhan rencana pembelajaran")
    ringkasan: str = Field(description="Ringkasan singkat cakupan & alur rencana pembelajaran")
    total_pertemuan: int = Field(description="Jumlah total pertemuan dalam rencana")
    daftar_pertemuan: list[Pertemuan] = Field(description="Daftar seluruh pertemuan secara berurutan")
    saran_asesmen: str = Field(default="", description="Saran asesmen/evaluasi akhir untuk keseluruhan rangkaian")
    catatan_ai: str = Field(default="", description="Catatan/peringatan dari AI, misal jika materi kurang untuk jumlah pertemuan yang diminta")

# --- Service Wrappers ---

DEFAULT_MODEL = DEFAULT_OPENAI_MODEL

def panggil_ai(system_prompt: str, user_prompt: str, model_name: str = DEFAULT_MODEL, response_schema=None) -> str:
    """Memanggil AI untuk panggilan teks via OpenAI-compatible service."""
    return panggil_openai(system_prompt, user_prompt, model_name=model_name, response_schema=response_schema)

def panggil_ai_multimodal(system_prompt: str, user_prompt: str, file_paths: list[str], model_name: str = DEFAULT_MODEL, response_schema=None) -> str:
    """Memanggil AI untuk panggilan multimodal via OpenAI-compatible service."""
    return panggil_openai_multimodal(system_prompt, user_prompt, file_paths, model_name=model_name, response_schema=response_schema)

def baca_gambar_ai(image_bytes: bytes, mime_type: str) -> str:
    """OCR gambar via vision endpoint OpenAI-compatible service."""
    return baca_gambar_openai(image_bytes, mime_type)

def hitung_token(teks: str) -> int:
    return int(len(teks.split()) * 1.5)

import urllib.request
import urllib.parse

def generate_image(prompt: str) -> bytes:
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=400&nologo=true&seed=42"
    
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return res.read()
    except Exception as e:
        logger.error(f"Gagal memanggil Pollinations API: {e}")
        raise RuntimeError("Layanan pembuat gambar gratis sedang sibuk atau menolak koneksi. Coba lagi nanti.")

