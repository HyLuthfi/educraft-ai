# Conventions

This file records the conventions **actually established for this
specific project** — not generic best practices (those live in
`.agents/skills/`). Every agent reads this before writing any code, and
matches what's here instead of picking its own style.

**How this file gets filled in:** it starts empty. The *first* agent to
make a naming/style/structure decision in an area not yet covered here
adds an entry, in the format below, instead of silently deciding for
itself and moving on. Later agents follow what's recorded — they don't
re-decide the same question a different way. If an entry seems wrong or
outdated, don't just override it silently: raise it with the Project
Orchestrator (1.2) and update the entry with a note on why it changed.

**Entry format:**
```
### <Topic>
**Convention:** <the actual rule, stated concretely>
**Example:** <a real example from this codebase, if one exists yet>
**Set by:** <agent> — <date> — <one-line reason, if not obvious>
```

Keep entries concrete and specific to *this* project — "use camelCase
for JS variables, snake_case for Python" is useful; "write clean code"
is not (that belongs in the `code-quality` skill, not here).

---

## Naming

### Frontend (TS/TSX)
**Convention:** Menggunakan PascalCase untuk penulisan komponen React, dan camelCase untuk variabel, properti, state, dan fungsi. File komponen menggunakan ekstensi `.tsx`. Label, placeholder, deskripsi, dan teks yang tampil di layar menggunakan Bahasa Indonesia.
**Example:** `AutoKoreksiPage` (komponen), `koreksiResult` (state), `handleKoreksi` (handler).
**Set by:** Frontend Engineer — 2026-08-06 — Konsistensi UI Next.js.

### Backend (Python)
**Convention:** Menggunakan snake_case untuk nama variabel, nama fungsi, file, dan folder. Menggunakan Bahasa Indonesia yang baku dan deskriptif untuk nama variabel/fungsi (kecuali istilah teknis yang umum).
**Example:** `panggil_gemini` (fungsi), `koreksi_jawaban` (fungsi), `koreksi.py` (file router).
**Set by:** Backend Engineer — 2026-08-06 — Standar PEP-8.

## Code style & formatting

### Frontend
**Convention:** Penulisan React Hooks harus teratur, memisahkan state lokal, state global (Zustand), reference (`useRef`), dan efek samping (`useEffect`). Selalu definisikan tipe/interface TypeScript secara eksplisit daripada menggunakan `any`.
**Set by:** Frontend Engineer — 2026-08-06

### Backend
**Convention:** Menggunakan FastAPI Pydantic Models (`BaseModel`) untuk memetakan request body dan response body. Hindari penggunaan tipe data dictionary mentah (`dict`) untuk respons API guna menjamin validasi skema.
**Set by:** API Architect — 2026-08-06

## File & folder structure

**Convention:** Struktur direktori menggunakan konvensi Next.js App Router dan modular FastAPI backend:
- `app/(dashboard)/`: Halaman dashboard terlindungi auth (layout persisten sidebar).
- `app/api/`: Endpoint proxy Next.js untuk meneruskan request ke AI Engine.
- `ai-engine/router/`: Pemisahan berkas router FastAPI per modul fitur.
- `ai-engine/service/`: Fungsi pembantu pihak ketiga (misal: Gemini).
**Set by:** Software Architect — 2026-08-06

## Git conventions

**Convention:** Commit message menggunakan standard Conventional Commits: `feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`. Deskripsi ditulis dalam Bahasa Inggris secara singkat dan jelas.
**Example:** `feat: add Auto-Koreksi Soal feature with 3-step wizard`
**Set by:** Project Orchestrator — 2026-08-06

## API conventions

**Convention:** Endpoint FastAPI mengembalikan JSON terstruktur dengan skema Pydantic. Middleware global di `main.py` memvalidasi API Key melalui header `X-API-Key`.
**Set by:** API Architect — 2026-08-06

## UI / component conventions

**Convention:** UI bergaya Neo-Brutalism menggunakan solid border `border-2 border-black` (dan `dark:border-white/20` untuk mode gelap), efek bayangan keras `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` (dan `dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]`). Aksen visual menggunakan warna-warna primer terang seperti kuning, biru, ungu, dan pink.
**Set by:** UI Designer — 2026-08-06

## Testing conventions

**Convention:** Semua unit test diletakkan di `ai-engine/tests/` menggunakan runner `pytest`. Nama berkas pengujian diawali dengan `test_`. Semua panggilan API eksternal (seperti Gemini) harus di-mock menggunakan `unittest.mock.patch`.
**Example:** `tests/test_koreksi.py`
**Set by:** QA Engineer — 2026-08-06