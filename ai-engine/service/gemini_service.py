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
    image_prompt: str = Field(description="Prompt gambar fotorealistik bahasa Inggris. Kosongkan (\"\") jika soal tidak memerlukan gambar.")

class ResponseSoal(BaseModel):
    soal: list[SoalItem] = Field(description="Daftar soal yang dihasilkan")

class SolveOpsi(BaseModel):
    label: str = Field(description="A, B, C, D")
    teks: str = Field(description="Teks pilihan ganda")
    benar: bool = Field(description="True jika ini jawaban benar")

class SolveItem(BaseModel):
    tipe: str = Field(description="'pg', 'isian', atau 'essay'")
    teks: str = Field(description="Teks pertanyaan yang sudah dirapikan")
    opsi: list[SolveOpsi] | None = Field(default=None, description="Hanya untuk soal PG")
    kunci_jawaban: str = Field(description="Label jawaban benar (PG) atau teks jawaban (isian/essay)")
    pembahasan: str = Field(default="", description="Penjelasan jawaban")

class ResponseSolve(BaseModel):
    soal: list[SolveItem] = Field(description="Daftar soal yang sudah dijawab dan dirapikan")


def panggil_gemini(system_prompt: str, user_prompt: str, model_name: str = "gemini-3.5-flash", response_schema=None) -> str:
    """
    Memanggil Gemini API menggunakan sistem rotasi API Key (Round-Robin).
    Jika model utama gagal (misal 503/429), ia akan fallback ke model alternatif,
    lalu jika masih gagal, lompat ke API key berikutnya.
    """
    if not key_cycler or len(api_keys) == 0:
        raise RuntimeError("GEMINI_API_KEYS belum di-set di environment variables (.env)")

    if response_schema is None:
        response_schema = ResponseSoal

    models_to_try = [model_name, "gemini-3-flash-preview"]
    models_to_try = list(dict.fromkeys(models_to_try))
    
    max_key_attempts = len(api_keys)
    last_error = None

    for attempt in range(max_key_attempts):
        current_key = next(key_cycler)
        client = genai.Client(api_key=current_key)
        
        for current_model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=current_model,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=0.7,
                    )
                )
                return response.text
                
            except Exception as e:
                logger.warning(f"Key attempt {attempt+1}/{max_key_attempts}, Model {current_model} gagal: {str(e)}")
                last_error = e
                continue
            
    raise RuntimeError(f"Semua {max_key_attempts} API Key beserta Model Fallback telah dicoba dan gagal. Error terakhir: {str(last_error)}")

def panggil_gemini_multimodal(system_prompt: str, user_prompt: str, file_paths: list[str], model_name: str = "gemini-3.5-flash", response_schema=None) -> str:
    if not key_cycler or len(api_keys) == 0:
        raise RuntimeError("GEMINI_API_KEYS belum di-set di environment variables (.env)")

    if response_schema is None:
        response_schema = ResponseSoal

    models_to_try = [model_name, "gemini-3-flash-preview"]
    models_to_try = list(dict.fromkeys(models_to_try))
    
    max_key_attempts = len(api_keys)
    last_error = None

    for attempt in range(max_key_attempts):
        current_key = next(key_cycler)
        client = genai.Client(api_key=current_key)
        
        uploaded_files = []
        try:
            for path in file_paths:
                uploaded_file = client.files.upload(file=path)
                uploaded_files.append(uploaded_file)
            
            contents = uploaded_files + [user_prompt]
            
            for current_model in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=current_model,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            response_mime_type="application/json",
                            response_schema=response_schema,
                            temperature=0.7,
                        )
                    )
                    return response.text
                except Exception as e:
                    logger.warning(f"Key attempt {attempt+1}/{max_key_attempts}, Model {current_model} multimodal gagal: {str(e)}")
                    last_error = e
                    continue
            
        except Exception as e:
            logger.warning(f"Gagal memproses multimodal file ke Gemini API: {str(e)}")
            last_error = e
        finally:
            for uf in uploaded_files:
                try:
                    client.files.delete(name=uf.name)
                except:
                    pass

    raise RuntimeError(f"Semua API Key dan Model Fallback telah dicoba dan gagal untuk Multimodal. Error terakhir: {str(last_error)}")

def hitung_token(teks: str) -> int:
    return int(len(teks.split()) * 1.5)

def baca_gambar_gemini(image_bytes: bytes, mime_type: str) -> str:
    if not key_cycler or len(api_keys) == 0:
        raise RuntimeError("GEMINI_API_KEYS belum di-set di environment variables (.env)")

    models_to_try = ["gemini-3.5-flash", "gemini-3-flash-preview"]
    max_key_attempts = len(api_keys)
    last_error = None

    for attempt in range(max_key_attempts):
        current_key = next(key_cycler)
        client = genai.Client(api_key=current_key)
        
        for current_model in models_to_try:
            try:
                prompt = "Ekstrak seluruh teks yang ada di gambar ini secara presisi. Perbaiki typo ringan jika ada. Pertahankan format jika itu adalah rumus atau tabel. Jangan tambahkan komentar apa pun selain teks yang ada di gambar."
                response = client.models.generate_content(
                    model=current_model,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        prompt
                    ]
                )
                return response.text
                
            except Exception as e:
                logger.warning(f"Key attempt {attempt+1}/{max_key_attempts}, Model {current_model} OCR gagal: {str(e)}")
                last_error = e
                continue
            
    raise RuntimeError(f"Semua API Key dan Model Fallback telah dicoba dan gagal untuk OCR. Error terakhir: {str(last_error)}")

import urllib.request
import urllib.parse

def generate_image(prompt: str) -> bytes:
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=400&nologo=true&seed=42"
    
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            return res.read()
    except Exception as e:
        logger.error(f"Gagal memanggil Pollinations API: {e}")
        raise RuntimeError("Layanan pembuat gambar gratis sedang sibuk atau menolak koneksi. Coba lagi nanti.")
