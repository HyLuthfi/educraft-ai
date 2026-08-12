# Activity Log

Single shared, append-only, chronological log of finished work across
**all** agents. Newest entries go at the bottom, in the order work
actually completed — never grouped or sectioned by agent. See
`AGENTS.md` §4 for the entry format and rules.

Do not edit or reorder past entries. Do not delete this file.

---

## [2026-08-12T05:51:26+07:00] Frontend & Backend Engineer Agent
**Task:** Implementasi Awal Fitur Auto-Koreksi Soal & Perbaikan Unit Test Backend
**Did:** Membuat UI Auto-Koreksi 1 halaman, mendaftarkan route API Next.js proxy, mengimplementasikan schema ResponseKoreksi, dan router FastAPI koreksi.py. Memperbaiki bug autentikasi X-API-Key pada pytest fixture dan mock groq di test_ai_search.py.
**Files touched:** `app/(dashboard)/koreksi/page.tsx`, `app/api/koreksi/route.ts`, `ai-engine/main.py`, `ai-engine/service/gemini_service.py`, `ai-engine/router/koreksi.py`, `ai-engine/template/prompt_koreksi.py`, `ai-engine/tests/test_koreksi.py`, `ai-engine/tests/conftest.py`, `ai-engine/tests/test_ai_search.py`
**Result:** Fitur Auto-Koreksi berhasil terintegrasi, seluruh 9 unit test di backend sukses (passed).

## [2026-08-12T14:22:00+07:00] Project Orchestrator & QA Engineer Agent
**Task:** Audit Fitur Auto-Koreksi, Perbaikan Tipe Nilai, dan Resolusi Error TS Compiler
**Did:** Mengubah tipe `nilai_akhir` Pydantic dari float ke string agar toleran terhadap skala huruf (A-E). Memperbaiki kalkulasi statistik kelas di UI agar aman terhadap tipe string/non-numerik. Memperbaiki error kompilasi TS di `create/page.tsx` terkait properti `imageCount` dan `.soal`. Menginisialisasi project-context, conventions, dan architecture di `.agents/knowledge/`.
**Files touched:** `ai-engine/service/gemini_service.py`, `ai-engine/tests/test_koreksi.py`, `app/(dashboard)/koreksi/page.tsx`, `app/(dashboard)/create/page.tsx`, `.agents/knowledge/project-context.md`, `.agents/knowledge/conventions.md`, `.agents/knowledge/architecture.md`, `.agents/knowledge/decisions.md`
**Result:** Lulus seluruh unit test backend (9/9 passed) dan kompilasi TypeScript bersih tanpa error.
