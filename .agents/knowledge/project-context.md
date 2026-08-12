# Project Context

This is the **first file any agent reads**, before touching code — it's
the fastest way to get oriented without re-reading the whole repository.
Keep it short and current; it's a snapshot, not an archive (history and
reasoning belong in `decisions.md`).

**Who updates this:** Product Manager (1.1) owns the Overview/Goals/
Users sections. Software Architect (2.3) owns Stack. Project
Orchestrator (1.2) owns Current Status. Knowledge Manager (11.37)
reconciles if entries drift or conflict — it doesn't invent content
itself. Whoever changes something here should also add an entry to
the activity log (`AGENTS.md` §4).

---

## Overview

EduCraft AI adalah platform asisten digital berbasis kecerdasan buatan (AI) yang dirancang khusus untuk membantu guru-guru di Indonesia. Platform ini memungkinkan guru untuk menyusun lembar soal ujian berkualitas tinggi secara otomatis, menjawab/merapikan draf soal, serta mengoreksi lembar jawaban siswa secara cerdas (auto-koreksi) beserta analisis hasil belajar kelas.

## Goals / success criteria

- **Akurasi Koreksi Tinggi**: AI mampu mencocokkan jawaban siswa secara tepat (fuzzy matching untuk isian singkat, pencocokan eksak untuk pilihan ganda, dan evaluasi berbasis rubrik/skor parsial untuk soal esai).
- **Efisiensi Guru**: Memangkas waktu guru dalam memeriksa jawaban siswa secara massal dan menyusun laporan nilai.
- **Analitik yang Actionable**: Menyediakan metrik kelas (rata-rata, KKM, tuntas/remedial) dan saran remedial/pengayaan yang konkret.
- **Desain Adaptif**: UI berkonsep Neo-Brutalism yang ramah guru, responsif, dan mendukung penuh mode gelap (dark mode).

## Target users

Guru-guru sekolah (SD, SMP, SMA/SMK) di Indonesia dengan tingkat kemahiran teknologi yang bervariasi. Aplikasi menggunakan bahasa pengantar Bahasa Indonesia secara penuh dan ramah pencetakan kertas (print-friendly) untuk laporan fisik.

## Current stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, React 19, `next-themes`, Lucide Icons, Supabase SSR client.
- **Backend (AI Engine)**: FastAPI (Python 3.12), Google Gemini API (via SDK `google-genai`), PyMuPDF (untuk ekstraksi berkas PDF), python-docx (untuk ekstraksi dan ekspor Word).
- **Database / Auth**: Supabase (PostgreSQL), Supabase Auth dengan Google OAuth.

## Key constraints

- Kecepatan respons AI: Pengerjaan batch koreksi siswa dibatasi hingga maksimal 20 siswa per request untuk mencegah limitasi output token Gemini.
- Desain antarmuka: Gaya Neo-Brutalism yang menggunakan garis tepi hitam tebal dan bayangan solid harus tetap terbaca dengan kontras yang baik di mode gelap.

## Current status

Mengimplementasikan fitur Auto-Koreksi Soal. Awalnya UI dan backend parser serta endpoint koreksi sudah terpasang. Langkah saat ini adalah melakukan **Audit Menyeluruh**, mencari bug, mengoptimalkan query, memperbaiki UI/UX, dan memastikan kesiapan production.

---

## See also

- `conventions.md` — established naming/style/structure rules
- `architecture.md` — system structure and module boundaries
- `decisions.md` — why things were decided the way they were
- `known-issues.md` — open problems and accepted limitations
- `activity-log.md` — chronological record of finished work