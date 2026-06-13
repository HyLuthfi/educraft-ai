import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io

router = APIRouter()
logger = logging.getLogger(__name__)


class HeaderPdf(BaseModel):
    nama_sekolah: str = Field(default="")
    mata_pelajaran: str = Field(default="")
    kelas: str = Field(default="")
    tanggal: str = Field(default="")
    durasi: str = Field(default="")


class RequestExportPdf(BaseModel):
    soal: list = Field(min_length=1)
    header: HeaderPdf
    sertakan_jawaban: bool = Field(default=False)
    sertakan_pembahasan: bool = Field(default=False)


@router.post("/export/pdf")
async def export_pdf(req: RequestExportPdf):
    try:
        html = bangun_html_pdf(req.soal, req.header, req.sertakan_jawaban, req.sertakan_pembahasan)

        from weasyprint import HTML

        pdf_bytes = HTML(string=html).write_pdf()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=soal-educraft.pdf"},
        )
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="WeasyPrint belum ter-install. Jalankan: pip install weasyprint",
        )
    except Exception as e:
        logger.error(f"Export PDF gagal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def bangun_html_pdf(soal: list, header: HeaderPdf, sertakan_jawaban: bool, sertakan_pembahasan: bool) -> str:
    baris_soal = []
    nomor = 1

    for s in soal:
        tipe = s.get("tipe", s.get("type", "pg"))
        teks = s.get("teks", s.get("teks_soal", s.get("text", "")))

        baris_soal.append(f'<div class="soal"><p><strong>{nomor}.</strong> {teks}</p>')

        if tipe == "pg":
            opsi_list = s.get("opsi", s.get("options", []))
            for opsi in opsi_list:
                label = opsi.get("label", opsi.get("label_opsi", ""))
                teks_opsi = opsi.get("teks", opsi.get("teks_opsi", opsi.get("text", "")))
                baris_soal.append(f"<p class='opsi'>{label}. {teks_opsi}</p>")

        if tipe == "essay":
            baris_soal.append("<div class='area-jawab'></div>")

        if tipe == "isian":
            baris_soal.append("<p class='garis-jawab'>Jawaban: _______________</p>")

        baris_soal.append("</div>")
        nomor += 1

    bagian_jawaban = ""
    if sertakan_jawaban:
        jawaban_items = []
        for i, s in enumerate(soal, 1):
            kunci = s.get("kunci_jawaban", s.get("answer_key", "-"))
            jawaban_items.append(f"<p>{i}. {kunci}</p>")
        bagian_jawaban = f"""
        <div class="page-break"></div>
        <h2>Kunci Jawaban</h2>
        {"".join(jawaban_items)}
        """

    bagian_pembahasan = ""
    if sertakan_pembahasan:
        pembahasan_items = []
        for i, s in enumerate(soal, 1):
            penjelasan = s.get("pembahasan", s.get("explanation", "-"))
            pembahasan_items.append(f"<div class='pembahasan'><p><strong>{i}.</strong> {penjelasan}</p></div>")
        bagian_pembahasan = f"""
        <div class="page-break"></div>
        <h2>Pembahasan</h2>
        {"".join(pembahasan_items)}
        """

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
    @page {{ size: A4; margin: 2cm; }}
    body {{ font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; }}
    .header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }}
    .header h1 {{ font-size: 16pt; margin: 0 0 4px 0; }}
    .header p {{ font-size: 10pt; margin: 2px 0; color: #555; }}
    .soal {{ margin-bottom: 20px; }}
    .opsi {{ margin: 4px 0 4px 24px; }}
    .area-jawab {{ border: 1px dashed #ccc; height: 80px; margin: 8px 0; }}
    .garis-jawab {{ margin: 8px 0 8px 24px; }}
    .pembahasan {{ margin-bottom: 16px; padding: 8px; background: #f9f9f9; border-left: 3px solid #6366f1; }}
    .page-break {{ page-break-before: always; }}
    h2 {{ font-size: 14pt; margin: 24px 0 16px 0; border-bottom: 1px solid #ddd; padding-bottom: 8px; }}
</style>
</head>
<body>
    <div class="header">
        <h1>{header.nama_sekolah or "Soal Ujian"}</h1>
        <p>{header.mata_pelajaran} | Kelas {header.kelas}</p>
        <p>Tanggal: {header.tanggal} | Waktu: {header.durasi}</p>
    </div>
    {"".join(baris_soal)}
    {bagian_jawaban}
    {bagian_pembahasan}
</body>
</html>"""
