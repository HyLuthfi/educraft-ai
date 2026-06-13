import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from service.groq_service import panggil_groq
from template.prompt_generate import SYSTEM_PROMPT_GENERATE, buat_user_prompt

router = APIRouter()
logger = logging.getLogger(__name__)


class ConfigSoal(BaseModel):
    jumlah_pg: int = Field(default=5, ge=0, le=50)
    jumlah_isian: int = Field(default=0, ge=0, le=20)
    jumlah_essay: int = Field(default=0, ge=0, le=10)
    tingkat_kesulitan: str = Field(default="campuran")
    level_bloom: str = Field(default="campuran")
    mata_pelajaran: str = Field(default="")
    jenjang: str = Field(default="")
    bahasa: str = Field(default="id")


class RequestGenerate(BaseModel):
    konten_materi: str = Field(min_length=50)
    config: ConfigSoal


class RequestRegenerate(BaseModel):
    soal_lama: str
    konten_materi: str
    config: ConfigSoal | None = None


@router.post("/generate")
async def generate_soal(req: RequestGenerate):
    user_prompt = buat_user_prompt(
        konten_materi=req.konten_materi,
        jumlah_pg=req.config.jumlah_pg,
        jumlah_isian=req.config.jumlah_isian,
        jumlah_essay=req.config.jumlah_essay,
        kesulitan=req.config.tingkat_kesulitan,
        level_bloom=req.config.level_bloom,
        mata_pelajaran=req.config.mata_pelajaran,
        jenjang=req.config.jenjang,
        bahasa=req.config.bahasa,
    )

    maks_retry = 3
    for percobaan in range(maks_retry):
        try:
            hasil_mentah = panggil_groq(SYSTEM_PROMPT_GENERATE, user_prompt)
            hasil = json.loads(hasil_mentah)

            if "soal" not in hasil:
                raise ValueError("Response tidak mengandung key 'soal'")

            return hasil

        except json.JSONDecodeError:
            logger.warning(f"Percobaan {percobaan + 1}: JSON parsing gagal")
            if percobaan == maks_retry - 1:
                raise HTTPException(
                    status_code=500,
                    detail="AI gagal menghasilkan format JSON yang valid setelah 3 percobaan",
                )
        except Exception as e:
            logger.error(f"Percobaan {percobaan + 1}: {str(e)}")
            if percobaan == maks_retry - 1:
                raise HTTPException(status_code=500, detail=str(e))


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
        hasil_mentah = panggil_groq(SYSTEM_PROMPT_GENERATE, prompt_regenerate)
        return json.loads(hasil_mentah)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
