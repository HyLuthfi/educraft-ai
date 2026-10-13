# Contributing to EduCraft AI

Thank you for your interest in contributing to **EduCraft AI** — an enterprise-grade AI EdTech platform purpose-built for Indonesian educators and curriculum designers.

This project is maintained by **Luthfi Muthathohirin** under the [SAI Tech](https://saitech.co.id) ecosystem.

---

## 🛠️ Architecture & Development Environment

EduCraft AI is structured as a hybrid full-stack system consisting of a Next.js 14 frontend and a dedicated Python FastAPI microservice:

```text
educraft-ai/
├── app/                  # Next.js 14 App Router (Frontend & Edge API Routes)
├── ai-engine/            # FastAPI Microservice (AI Generation, OCR, Document Exporters)
├── lib/                  # Shared utilities, Supabase client, and data helpers
├── supabase/             # PostgreSQL database migrations & RLS policies
└── android/              # Capacitor Android Native Wrapper
```

### 1. Frontend Setup (Next.js 14)

```bash
# Clone the repository
git clone https://github.com/HyLuthfi/educraft-ai.git
cd educraft-ai

# Install Node dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Update NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and AI_ENGINE_API_KEY

# Start development server
npm run dev
# Accessible at http://localhost:3000
```

### 2. Backend Setup (FastAPI AI Engine)

```bash
# Navigate to backend directory
cd ai-engine

# Create and activate Python virtual environment
python -m venv .venv
source .venv/bin/activate       # Linux/macOS
.venv\Scripts\activate          # Windows

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI microservice
uvicorn main:app --host 127.0.0.1 --port 8002 --reload
# Health check available at http://127.0.0.1:8002/
```

---

## 🌿 Contribution Workflow

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally and configure remote remotes:
   ```bash
   git clone https://github.com/<your-username>/educraft-ai.git
   cd educraft-ai
   git remote add upstream https://github.com/HyLuthfi/educraft-ai.git
   ```
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. Make your modifications adhering to the conventions below.
5. Test both frontend rendering and backend API endpoints locally.
6. Commit your changes and open a **Pull Request** against `main`.

---

## 📐 Commit Convention

This repository strictly enforces [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

| Prefix | Scope / Usage |
|---|---|
| `feat(scope):` | New user feature, module, or export channel |
| `fix(scope):` | Bug fix in frontend UI, parsing engine, or API |
| `docs(scope):` | Documentation updates, architecture guides |
| `chore(scope):` | Tooling, dependencies, build configurations |
| `refactor(scope):` | Code refactoring without behavioral mutation |
| `test(scope):` | Adding unit tests, parser verification |
| `security(scope):` | Security hardening, RLS policy adjustments |

**Valid Examples:**
```text
feat(export): add Quizizz JSON export schema
fix(parser): resolve UTF-8 decoding issue in scanned Indonesian PDF
security(middleware): enforce rate limiting on guest quiz submission
docs(readme): update microservice port orchestration map
```

---

## 📋 Pull Request Requirements

- **One PR per feature/fix**: Do not combine unrelated UI modifications with backend changes.
- **No Hardcoded Credentials**: Never commit `.env*`, Supabase service role keys, Google Gemini API keys, or mobile `.keystore` files.
- **Pedagogical Alignment**: New prompt templates or question types must align with Bloom's Taxonomy (C1–C6) and Indonesian educational standards.
- **Clean Git History**: Rebase and squash extraneous commits before requesting review.

---

## 🇮🇩 Pedagogical Ethics & Educational Guidelines

When contributing features or prompts impacting Indonesian educational content:

1. **Inclusivity & Cultural Relevance**: Ensure prompt engineering respects regional Indonesian diversity, local culture, and age-appropriate vocabulary.
2. **Academic Rigor**: Questions generated under HOTS (Higher-Order Thinking Skills) must prioritize analysis, synthesis, and problem-solving over trivial recall.
3. **Mathematical Precision**: Use standard LaTeX syntax wrapped in KaTeX delimiters (`$...$` for inline, `$$...$$` for block equations).
4. **Data Privacy (No PII)**: Never use real student examination papers containing identifiable student names, NIK, or NISN in test fixtures.

---

## 🔒 Security Vulnerability Reporting

If you identify a security issue, vulnerability, or secret leakage, **please do not open a public GitHub issue**. Contact the maintainer directly via email: `luthfirg2502@gmail.com`.

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
