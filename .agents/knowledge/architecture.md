# Architecture

The structural map of the system — how it's organized and why. Written
by the Architecture Team (§2 in `AGENTS.md`) and read by every engineer
before writing code, so implementation stays consistent with the
intended structure instead of drifting module by module.

This file describes **current, actual structure** — not a wishlist and
not a full history of how it evolved (the reasoning behind a structural
choice belongs in `decisions.md`; this file just states what's true
now, and gets updated when the architecture actually changes).

**Who updates this:** Software Architect (2.3) owns System Structure
and Module Boundaries. Database Architect (2.4) owns the Data Layer
summary. API Architect (2.5) owns the API Layer summary. Integration
Architect (2.6) owns External Integrations. Each updates their own
section directly rather than routing edits through someone else.

---

## System overview

Sistem ini berstruktur Monolitik Modular terpisah antara Frontend (Next.js 16) yang menyajikan antarmuka pengguna berbasis server-side rendering & client-side hydration, dan Backend AI Engine (FastAPI Python) yang mengkapsulasi seluruh operasi berat (pemanggilan Gemini LLM, pemrosesan dokumen PDF/Word/OCR, dan ekspor berkas dokumen).

## Module boundaries

- **UI / Frontend Layer (`app/` & `components/`)**: Hanya bertanggung jawab atas rendering antarmuka, pengelolaan state (Zustand/Next-Themes), dan interaksi API client. Lapisan ini tidak boleh memanggil database Supabase secara langsung untuk data sensitif di luar otentikasi bawaan Supabase Client.
- **API Proxy Layer (`app/api/`)**: Menjembatani frontend ke backend python secara aman guna menyembunyikan API key backend (`AI_ENGINE_API_KEY`) dari browser client.
- **AI Engine Backend (`ai-engine/`)**: Mengelola logika pemrosesan dokumen, pemanggilan Gemini API, dan kompilasi template ekspor. Seluruh input yang masuk divalidasi dengan Pydantic schemas.

## Folder structure

```
educraft-ai/
├── ai-engine/             ← Python Backend Service (FastAPI)
│   ├── router/            ← API Endpoints (generate, parse, solve, koreksi)
│   ├── service/           ← Logika Integrasi SDK Gemini
│   ├── template/          ← Berkas template dokumen ekspor (.docx)
│   └── tests/             ← Unit test suite (pytest)
├── app/                   ← Next.js 16 (App Router)
│   ├── (auth)/            ← Halaman login/register
│   ├── (dashboard)/       ← Halaman utama guru (buat-soal, library, koreksi, settings)
│   └── api/               ← Route handlers Next.js proxy
├── components/            ← Komponen React global/shared
├── lib/                   ← Konfigurasi & helper utilitas
└── supabase/              ← Migrasi SQL & berkas skema DB
```

## Data layer

Supabase PostgreSQL digunakan sebagai penyimpanan utama. Tabel utama meliputi:
- `profiles`: menyimpan metadata guru (nama, email, sisa kuota token, paket langganan).
- `bank_soal`: menyimpan daftar lembar soal yang berhasil dibuat guru dalam bentuk dokumen JSON terstruktur.
- `bank_materi`: menyimpan riwayat materi/bahan baku mentah yang diunggah oleh guru.

## API layer

- **Komunikasi Client-Server**: REST API berbasis JSON.
- **Next.js Proxy**: Memanggil backend via HTTP Client dengan menyertakan header `X-API-Key`.
- **FastAPI Endpoint**: Terdiri dari `/api/generate`, `/api/parse`, `/api/solve`, `/api/correct`, dan `/api/export/{pdf|docx}`.

## External integrations

- **Google Gemini API**: Melalui SDK `google-genai` dengan skema *Structured Output* (Pydantic) menggunakan model `gemini-3.5-flash` untuk menjamin konsistensi balasan JSON.
- **Supabase Auth**: Untuk otentikasi SSO via Google OAuth.
- **OCR & Document Extraction**: PDF (PyMuPDF), DOCX (python-docx), Image/OCR (Pillow/Gemini Vision).

---

## See also

- `project-context.md` — stack, goals, current status
- `decisions.md` — full reasoning behind architectural choices
- `conventions.md` — naming and style rules within this structure