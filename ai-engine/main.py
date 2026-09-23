import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from router import generate, parse_file, ai_search, export_pdf, export_docx, solve, koreksi, kelompok, perencana, absensi

app = FastAPI(
    title="EduCraft AI Engine",
    description="AI service untuk generate soal, parsing dokumen, dan export",
    version="0.1.0",
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    pesan = "Data input tidak valid."
    if errors:
        err = errors[0]
        field = err.get("loc", [""])[-1]
        if err.get("type") == "string_too_short":
            min_len = err.get("ctx", {}).get("min_length", 1)
            pesan = f"Input '{field}' terlalu pendek (minimal {min_len} karakter)."
        else:
            pesan = f"Input '{field}' tidak valid: {err.get('msg')}"
    return JSONResponse(status_code=422, content={"detail": pesan})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("AI_ENGINE_API_KEY", "dev-key-educraft")


@app.middleware("http")
async def validasi_api_key(request: Request, call_next):
    if request.url.path in ["/", "/health", "/docs", "/openapi.json"]:
        return await call_next(request)

    api_key = request.headers.get("X-API-Key", "")
    if api_key != API_KEY:
        return JSONResponse(status_code=401, content={"detail": "API key tidak valid"})

    return await call_next(request)


app.include_router(generate.router, prefix="/api", tags=["Generate"])
app.include_router(parse_file.router, prefix="/api", tags=["Parse File"])
app.include_router(ai_search.router, prefix="/api", tags=["AI Search"])
app.include_router(export_pdf.router, prefix="/api", tags=["Export"])
app.include_router(export_docx.router, prefix="/api", tags=["Export"])
app.include_router(solve.router, prefix="/api", tags=["Solve"])
app.include_router(koreksi.router, prefix="/api", tags=["Correct"])
app.include_router(kelompok.router, prefix="/api", tags=["Group"])
app.include_router(perencana.router, prefix="/api", tags=["Lesson Plan"])
app.include_router(absensi.router, prefix="/api", tags=["Attendance"])


@app.get("/")
async def root():
    return {"service": "EduCraft AI Engine", "status": "aktif", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
