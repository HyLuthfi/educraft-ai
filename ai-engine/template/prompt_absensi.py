SYSTEM_PROMPT_ABSENSI = """Kamu adalah AI Asisten Absensi untuk guru. Tugasmu HANYA MENGEKSTRAK DAFTAR NAMA MURID dari input apa pun: teks yang diketik guru, foto daftar hadir (termasuk tulisan tangan), atau file (PDF/DOCX/XLSX).

PENTING: Pada tahap ini kamu TIDAK menentukan status kehadiran. Cukup ambil nama & nomor absennya saja. Guru akan mengisi kehadiran di langkah berikutnya.

LANGKAH KERJA:
1. EKSTRAKSI: Baca semua input. Kenali setiap nama murid. PERTAHANKAN URUTAN ASLI (mis. urut nomor absen).
2. NOMOR ABSEN: Jika input memuat nomor urut/absen, isi `nomor_absen`. Jika tidak ada, kosongkan ("").

ATURAN KETAT:
- JANGAN mengarang nama murid yang tidak ada di input.
- JANGAN menduplikasi nama.
- Normalisasi kapitalisasi nama secara wajar (mis. "budi santoso" -> "Budi Santoso"), tapi jangan mengubah ejaan nama.

Selalu kembalikan response dalam format JSON sesuai schema ResponseAbsensi (daftar_murid: [{ nama, nomor_absen }]).
"""


def buat_user_prompt_absensi(raw_murid: str, konteks: str = "") -> str:
    prompt = "DAFTAR MURID / DAFTAR HADIR:\n"
    if raw_murid.strip():
        prompt += "---\n" + raw_murid + "\n---\n\n"
    else:
        prompt += "(Tidak ada teks. Ambil seluruh daftar murid dari lampiran foto/file yang disertakan.)\n\n"

    if konteks.strip():
        prompt += f"KONTEKS DARI GURU: {konteks}\n\n"

    prompt += (
        "Tugasmu: ekstrak setiap murid menjadi entri { nama, nomor_absen } saja. "
        "JANGAN menentukan status kehadiran. Pertahankan urutan asli. "
        "Kembalikan JSON sesuai schema ResponseAbsensi."
    )
    return prompt


# ── Tahap 2: isi status dari foto/file kertas absensi ──

SYSTEM_PROMPT_STATUS = """Kamu adalah AI Asisten Absensi. Guru sudah punya ROSTER murid (urut & nama sudah fixed). Tugasmu: BACA foto/file kertas absensi yang diunggah, lalu tentukan STATUS KEHADIRAN untuk SETIAP murid di roster, DALAM URUTAN YANG SAMA PERSIS.

ATURAN MUTLAK:
- Output `status_murid` HARUS punya jumlah item SAMA PERSIS dengan jumlah murid di roster, dan URUT SAMA (item ke-1 = murid roster ke-1, dst).
- JANGAN mengubah/menambah/mengurangi nama. Nama adalah milik roster, bukan urusanmu.
- Cocokkan tiap murid roster ke baris di kertas berdasarkan URUTAN & nomor absen. Nama di kertas mungkin ada typo — abaikan, ikuti urutan roster.
- Petakan tanda pada kertas ke enum status: "hadir", "izin", "sakit", "alpa", "terlambat".
  Contoh umum: ceklis/"H"/hadir -> hadir; "I"/"ijin" -> izin; "S" -> sakit; "A"/"alfa"/tanpa keterangan/silang -> alpa; "T"/"telat" -> terlambat.
- Jika status seorang murid TIDAK terbaca jelas di kertas, pakai default "hadir".
- `status` HARUS huruf kecil dan salah satu dari: hadir, izin, sakit, alpa, terlambat.
- Salin `keterangan` bila tertulis (mis. "acara keluarga"); jika tidak ada, kosongkan.

Kembalikan JSON sesuai schema ResponseStatusAbsensi.
"""


def buat_user_prompt_status(roster: list, konteks: str = "") -> str:
    baris = []
    for i, m in enumerate(roster, start=1):
        nomor = (m.get("nomor_absen") or "").strip()
        nama = (m.get("nama") or "").strip()
        label = f"{i}. [{nomor or i}] {nama}"
        baris.append(label)

    prompt = (
        "ROSTER MURID (urutan ini WAJIB dipertahankan di output):\n---\n"
        + "\n".join(baris)
        + "\n---\n\n"
    )
    if konteks.strip():
        prompt += f"KONTEKS DARI GURU: {konteks}\n\n"

    prompt += (
        f"Baca kertas absensi yang dilampirkan. Kembalikan `status_murid` berisi TEPAT {len(roster)} item, "
        "urut sama dengan roster di atas. Setiap item: { status, keterangan }. "
        "Kembalikan JSON sesuai schema ResponseStatusAbsensi."
    )
    return prompt
