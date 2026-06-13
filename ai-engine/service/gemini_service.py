import os
import itertools
import logging
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

API_KEYS_STR = os.getenv("GEMINI_API_KEYS", "")
if not API_KEYS_STR:
    API_KEYS_STR = os.getenv("GEMINI_API_KEY", "")

if not API_KEYS_STR:
    api_keys = []
else:
    api_keys = [k.strip() for k in API_KEYS_STR.split(",") if k.strip()]

key_cycler = itertools.cycle(api_keys) if api_keys else None

class OpsiPG(BaseModel):
    label: str = Field(description="A, B, C, D")
    teks: str = Field(description="Teks pilihan ganda")
    benar: bool = Field(description="True jika ini jawaban benar")

class RubrikEssay(BaseModel):
    kriteria: str
    skor_maks: int
    deskripsi: str

class SoalItem(BaseModel):
    tipe: str = Field(description="'pg', 'isian', atau 'essay'")
    teks: str = Field(description="Teks pertanyaan")
    kesulitan: str = Field(description="'mudah', 'sedang', atau 'sulit'")
    level_bloom: str = Field(description="Level Bloom (C1-C6)")
    opsi: list[OpsiPG] | None = Field(default=None, description="Hanya untuk soal PG")
    kunci_jawaban: str = Field(description="Label jawaban benar (untuk PG) atau teks singkat (untuk isian)")
    pembahasan: str = Field(description="Penjelasan detail")
    rubrik: list[RubrikEssay] | None = Field(default=None, description="Hanya untuk soal essay")

class ResponseSoal(BaseModel):
    soal: list[SoalItem] = Field(description="Daftar soal yang dihasilkan")


def panggil_gemini(system_prompt: str, user_prompt: str, model_name: str = "gemini-3.5-flash") -> str:
    """
    Memanggil Gemini API menggunakan sistem rotasi API Key (Round-Robin).
    Jika key pertama terkena Limit (429), ia otomatis lompat ke key kedua.
    """
    if not key_cycler or len(api_keys) == 0:
        raise RuntimeError("GEMINI_API_KEYS belum di-set di environment variables (.env)")

    max_retries = len(api_keys)
    last_error = None

    for attempt in range(max_retries):
        current_key = next(key_cycler)
        client = genai.Client(api_key=current_key)
        
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=ResponseSoal,
                    temperature=0.7,
                )
            )
            return response.text
            
        except Exception as e:
            logger.warning(f"API Key gagal (percobaan {attempt+1}/{max_retries}): {str(e)}")
            last_error = e
            continue
            
    raise RuntimeError(f"Semua {max_retries} API Key telah dicoba dan gagal. Error terakhir: {str(last_error)}")

def hitung_token(teks: str) -> int:
    return int(len(teks.split()) * 1.5)
