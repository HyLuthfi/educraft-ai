# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-14

Initial production release of **EduCraft AI** — a full-stack, enterprise-grade AI EdTech platform designed for Indonesian teachers and curriculum developers, featuring hybrid microservice architecture, multi-format multimodal ingestion, and Bloom's Taxonomy HOTS question generation.

### Added

- **Multi-Platform Client Architecture**:
  - Next.js 14 App Router web client with React Server Components, TypeScript, and Tailwind CSS.
  - Progressive Web App (PWA) offline-ready capabilities and Capacitor Android native shell configuration (`com.educraft.ai`).
  - Tactile typography and animations powered by Framer Motion, Lenis smooth scrolling, Lucide icons, and KaTeX mathematical notation rendering.
- **FastAPI AI Microservice Engine (`ai-engine/`)**:
  - Python 3.11 asynchronous backend microservice listening on internal port `:8002`.
  - Secure internal handshake via `X-API-Key` middleware validation (`AI_ENGINE_API_KEY`).
  - Modular routers for file parsing, AI question generation, Word/PDF export, answer correction, and live quiz arena.
- **Multimodal Document Processing Pipeline**:
  - High-precision document parser supporting PDF (PyMuPDF), Word (`python-docx`), PowerPoint (`python-pptx`), and OCR image extraction (Tesseract).
  - Pedagogical logic engine implementing Bloom's Taxonomy (C1 Remembering to C6 Creating) and Higher-Order Thinking Skills (HOTS) framing aligned with Indonesia's *Kurikulum Merdeka*.
  - Multi-tier LLM integration with Google Gemini 1.5 Flash and Gemini 1.5 Pro via structured prompt synthesis.
- **Omni-Channel Export & Classroom Suite**:
  - Ready-to-print Microsoft Word `.docx` generator using XML template injection (`docxtpl` and `template_ujian.docx`).
  - Automated PDF assessment paper generator with clean typographical layout (`fpdf2`).
  - Live Quiz Arena (`/play`) supporting real-time student participation, PIN-based access, and instant grading.
  - Student attendance tracking, automated essay correction, and classroom progress report generation.
- **Persistence & Cloud Data Layer**:
  - Supabase PostgreSQL 15 schema featuring strict Row Level Security (RLS) policies across `profiles`, `bank_materi`, and `set_soal` tables.
  - Isolated cloud asset storage for school branding and exam paper headers.
- **Showcase DX & Visual Documentation**:
  - D2 vector architecture diagram (`assets/architecture.svg`) rendered in Terminal Dark palette with ELK layout engine.
  - Portfolio-grade 9-element `README.md` with dynamic typing header, verified API specifications, and zero AI buzzwords.

### Changed

- **Domain Routing Migration**: Configured official production domain routing to `educraft.saitech.co.id` under the SAI Tech ecosystem.
- **Edge Security Hardening**: Consolidated Next.js edge middleware (`middleware.ts`) and Supabase JWT session guard for authenticated educator routes.

### Security

- **[P0] SPDX MIT License**: Added official `LICENSE` file under MIT License with legal copyright attributed to `Luthfi Muthathohirin`.
- **[P0] Zero Leak Certification**: Passed comprehensive 117-commit repository history scan with Gitleaks v8.30.1 (**0 leaks detected**, Health Score 98/100).
- **[P1] Credential & Mobile Keystore Protection**: Hardened `.gitignore` to strictly exclude `.venv/`, mobile signing keys (`*.key`, `*.keystore`, `*.jks`, `*.p12`, `*.pfx`, `*.pem`), and database cache artifacts (`*.sqlite3`, `*.dump`, `*.db`).
