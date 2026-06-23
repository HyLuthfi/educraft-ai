import json
import logging
import asyncio
import random
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from service.gemini_service import panggil_gemini, generate_image
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
    konten_materi: str = Field(min_length=5)
    config: ConfigSoal


class RequestRegenerate(BaseModel):
    soal_lama: str
    konten_materi: str
    config: ConfigSoal | None = None


async def eksekusi_gemini_dengan_retry(user_prompt: str) -> list:
    maks_retry = 3
    for percobaan in range(maks_retry):
        try:
            hasil_mentah = await asyncio.to_thread(panggil_gemini, SYSTEM_PROMPT_GENERATE, user_prompt)
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
    blocks_reguler = []
    blocks_gambar = []
    
    for b in req.config.blocks:
        count_reguler = b.count - b.image_count
        count_gambar = b.image_count
        
        if count_reguler > 0:
            blocks_reguler.append(BlockSoal(tipe=b.tipe, level=b.level, count=count_reguler, image_count=0))
            
        if count_gambar > 0:
            blocks_gambar.append(BlockSoal(tipe=b.tipe, level=b.level, count=count_gambar, image_count=count_gambar))

    semua_soal = []
    
    if blocks_reguler:
        prompt_reg = buat_user_prompt(
            konten_materi=req.konten_materi, blocks=blocks_reguler,
            level_bloom=req.config.level_bloom, mata_pelajaran=req.config.mata_pelajaran,
            jenjang=req.config.jenjang, bahasa=req.config.bahasa,
            instruksi_khusus=req.config.instruksi_khusus, mode="reguler"
        )
        semua_soal.extend(await eksekusi_gemini_dengan_retry(prompt_reg))

    if blocks_gambar:
        prompt_gam = buat_user_prompt(
            konten_materi=req.konten_materi, blocks=blocks_gambar,
            level_bloom=req.config.level_bloom, mata_pelajaran=req.config.mata_pelajaran,
            jenjang=req.config.jenjang, bahasa=req.config.bahasa,
            instruksi_khusus=req.config.instruksi_khusus, mode="gambar"
        )
        semua_soal.extend(await eksekusi_gemini_dengan_retry(prompt_gam))

    random.shuffle(semua_soal)
    return {"soal": semua_soal}


@router.post("/regenerate")
async def regenerate_soal(req: RequestRegenerate):
    prompt_regenerate = f"""Soal lama yang perlu diganti:
---
{req.soal_lama}
---

Materi referensi:
---
{req.konten_materi[:4000]}
---

Buatkan 1 soal pengganti yang BERBEDA dari soal lama di atas, tapi tetap berdasarkan materi yang sama. Kembalikan dalam format JSON yang sama."""

    try:
        hasil_mentah = panggil_gemini(SYSTEM_PROMPT_GENERATE, prompt_regenerate)
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
