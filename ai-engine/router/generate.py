import json
import logging
import asyncio
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from service.ai_service import panggil_ai, generate_image
from template.prompt_generate import SYSTEM_PROMPT_GENERATE, buat_user_prompt

router = APIRouter()
logger = logging.getLogger(__name__)


class BlockSoal(BaseModel):
    tipe: str
    level: str
    count: int
    image_count: int = 0

class ConfigSoal(BaseModel):
    blocks: list[BlockSoal]
    level_bloom: str = Field(default="campuran")
    mata_pelajaran: str = Field(default="")
    jenjang: str = Field(default="")
    bahasa: str = Field(default="id")
    instruksi_khusus: str = Field(default="")


class RequestGenerate(BaseModel):
    konten_materi: str = Field(default="Materi Pembelajaran", min_length=1)
    config: ConfigSoal


class RequestRegenerate(BaseModel):
    soal_lama: str
    konten_materi: str
    config: ConfigSoal | None = None
    instruksi: str | None = None


async def eksekusi_ai_dengan_retry(user_prompt: str) -> list:
    maks_retry = 3
    for percobaan in range(maks_retry):
        try:
            hasil_mentah = await asyncio.to_thread(panggil_ai, SYSTEM_PROMPT_GENERATE, user_prompt)
            hasil = json.loads(hasil_mentah)
            if "soal" not in hasil:
                raise ValueError("Response tidak mengandung key 'soal'")
            return hasil["soal"]
        except json.JSONDecodeError:
            logger.warning(f"Percobaan {percobaan + 1}: JSON parsing gagal")
            if percobaan == maks_retry - 1:
                raise HTTPException(status_code=500, detail="AI gagal menghasilkan format JSON yang valid setelah 3 percobaan")
        except Exception as e:
            logger.error(f"Percobaan {percobaan + 1}: {str(e)}")
            if percobaan == maks_retry - 1:
                raise HTTPException(status_code=500, detail=str(e))
    return []

@router.post("/generate")
async def generate_soal(req: RequestGenerate):
    semua_soal = []

    # Generate per-blok mengikuti urutan input parameter.
    # Hasil dikelompokkan per tipe sesuai urutan blok (mis. Essay semua, lalu PG semua).
    for b in req.config.blocks:
        prompt = buat_user_prompt(
            konten_materi=req.konten_materi, blocks=[b],
            level_bloom=req.config.level_bloom, mata_pelajaran=req.config.mata_pelajaran,
            jenjang=req.config.jenjang, bahasa=req.config.bahasa,
            instruksi_khusus=req.config.instruksi_khusus,
            mode="gambar" if b.image_count > 0 else "reguler"
        )
        semua_soal.extend(await eksekusi_ai_dengan_retry(prompt))

    return {"soal": semua_soal}


@router.post("/regenerate")
async def regenerate_soal(req: RequestRegenerate):
    instruksi_txt = f"\nInstruksi khusus dari guru: {req.instruksi}\n" if req.instruksi else ""
    prompt_regenerate = f"""Soal lama yang perlu diganti:
---
{req.soal_lama}
---

Materi referensi:
---
{req.konten_materi[:4000]}
---
{instruksi_txt}
Buatkan 1 soal pengganti yang BERBEDA dari soal lama di atas, tapi tetap berdasarkan materi yang sama. Kembalikan dalam format JSON yang sama."""

    try:
        hasil_mentah = panggil_ai(SYSTEM_PROMPT_GENERATE, prompt_regenerate)
        return json.loads(hasil_mentah)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/generate_image")
async def generate_image_endpoint(prompt: str = Query(..., description="Prompt gambar bahasa Inggris")):
    try:
        image_bytes = generate_image(prompt)
        return Response(content=image_bytes, media_type="image/jpeg")
    except Exception as e:
        logger.error(f"Image Generate error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal generate gambar: {str(e)}")
