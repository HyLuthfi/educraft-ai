# Decisions

A record of **why** things were decided the way they were — not just
what the current state is (that's `architecture.md`/`conventions.md`)
but the reasoning, alternatives considered, and trade-offs accepted.
This exists so that six months from now, no agent (or human) has to
guess "why is this built this way?" or accidentally undoes a decision
that was actually deliberate.

**This file is append-only.** Never edit or delete a past entry, even
if it turns out to be wrong. If a decision is reversed or replaced,
add a **new** entry that explicitly supersedes the old one — the old
entry stays, marked `Superseded by #<new-id>`. The history of changing
your mind is itself useful information.

**Who writes an entry:** whichever agent actually made the call —
most often Software/Database/API/Integration Architect (§2), but any
agent that makes a non-obvious decision worth remembering should add
one. Not every choice needs an entry — only ones a future agent could
plausibly reverse by accident, or that took real deliberation.

**Entry format:**

```
## #<sequential-id> — <short title>
**Date:** <date>
**Status:** Accepted | Superseded by #<id>
**Made by:** <agent>
**Context:** <what problem/question prompted this decision>
**Decision:** <what was actually decided, stated plainly>
**Alternatives considered:** <what else was on the table, and why not>
**Consequences:** <what this makes easier, harder, or forecloses>
```

---

## #1 — Implementasi Dark Mode menggunakan next-themes & Tailwind CSS v4
**Date:** 2026-08-06
**Status:** Accepted
**Made by:** Frontend Engineer (4.13)
**Context:** Guru membutuhkan kenyamanan visual saat bekerja di malam hari, sehingga mode gelap dibutuhkan. Namun, Tailwind v4 secara default mengabaikan class `.dark` dari `next-themes` karena mode bawaannya menggunakan `prefers-color-scheme`.
**Decision:** Mengintegrasikan `next-themes` untuk transisi tema yang mulus, dan mendeklarasikan `@custom-variant dark (&:where(.dark, .dark *));` di `globals.css` agar compiler Tailwind v4 memetakan class `.dark` sebagai penanda variasi gelap.
**Alternatives considered:** Menggunakan state tema React secara manual, namun rentan terjadi flickering (FOUC) saat memuat halaman server-side.
**Consequences:** Mempermudah penulisan class bergaya gelap menggunakan modifier bawaan `dark:bg-...` di seluruh komponen Next.js.

## #2 — Skema Output Validasi Pydantic Terstruktur untuk Auto-Koreksi Soal
**Date:** 2026-08-11
**Status:** Accepted
**Made by:** API Architect (2.5) & Backend Engineer (4.14)
**Context:** Hasil koreksi ujian harus dikembalikan secara terstruktur (skor, status benar/salah, ulasan) untuk seluruh siswa sekaligus agar mengurangi jumlah HTTP round-trip dan efisien secara token.
**Decision:** Mendefinisikan model `ResponseKoreksi` berisi list data `HasilSiswa` dan detail koreksi per nomor soal menggunakan validasi Pydantic, lalu melewatkannya langsung ke parameter `response_schema` pada Gemini API.
**Alternatives considered:** Mengambil output teks bebas lalu di-parse manual menggunakan regex/json.loads di Python. Ini rentan menghasilkan JSON error jika format berubah secara acak.
**Consequences:** Menjamin output Gemini 100% selalu dalam bentuk JSON terstruktur yang valid dan siap dikonsumsi langsung oleh client.