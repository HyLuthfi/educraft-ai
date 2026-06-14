# EduCraft AI 🚀

EduCraft AI adalah generator soal cerdas bertenaga AI yang dirancang khusus untuk guru-guru di Indonesia. Platform ini memungkinkan pendidik untuk mengubah materi pelajaran apa pun menjadi soal berkualitas tinggi yang siap cetak dalam hitungan detik.

## 🌟 Fitur Utama
- **Ekstraksi Otomatis**: Mendukung input teks, PDF, DOCX, dan bahkan gambar (OCR).
- **Kustomisasi Soal**: Pilih tingkat kesulitan (HOTS/LOTS), jumlah soal, dan tipe soal (Pilihan Ganda, Isian, Essay).
- **Ekspor Dokumen**: Unduh hasil soal langsung dalam format PDF atau Microsoft Word (.docx) lengkap dengan Kunci Jawaban dan Pembahasan.
- **Standar Pendidikan**: Soal dirancang dengan mempertimbangkan Taksonomi Bloom.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python), Google Gemini AI Engine
- **Database**: Supabase (PostgreSQL)

## 🚀 Cara Menjalankan

### Frontend (Next.js)
```bash
npm install
npm run dev
```

### Backend (Python)
```bash
cd ai-engine
pip install -r requirements.txt
uvicorn main:app --reload
```
