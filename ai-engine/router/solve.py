import json
import logging
import shutil
import tempfile
import os
from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from typing import List
from service.gemini_service import panggil_gemini_multimodal, ResponseSolve
from template.prompt_solve import SYSTEM_PROMPT_SOLVE, buat_user_prompt_solve

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/solve")
async def solve_questions(
    raw_questions: str = Form(""),
    reference: str = Form(""),
    config: str = Form("{}"),
    raw_files: List[UploadFile] = File(default=[]),
    reference_files: List[UploadFile] = File(default=[])
):
    try:
        config_dict = json.loads(config)
        explanation_level = config_dict.get("explanationLevel", "singkat")
        strict_reference = config_dict.get("strictReference", "campuran")
        language_style = config_dict.get("languageStyle", "formal")

        sys_prompt = SYSTEM_PROMPT_SOLVE.format(
            explanation_level=explanation_level,
            strict_reference=strict_reference,
            language_style=language_style
        )
        
        user_prompt = buat_user_prompt_solve(raw_questions, reference)
        
        temp_dir = tempfile.mkdtemp()
        saved_file_paths = []
        
        try:
            for f in raw_files:
                if f.filename:
                    path = os.path.join(temp_dir, f"SOAL_{f.filename}")
                    with open(path, "wb") as buffer:
                        shutil.copyfileobj(f.file, buffer)
                    saved_file_paths.append(path)
                    
            for f in reference_files:
                if f.filename:
                    path = os.path.join(temp_dir, f"REFERENSI_{f.filename}")
                    with open(path, "wb") as buffer:
                        shutil.copyfileobj(f.file, buffer)
                    saved_file_paths.append(path)
                    
            response_text = panggil_gemini_multimodal(sys_prompt, user_prompt, saved_file_paths, model_name="gemini-3.5-flash", response_schema=ResponseSolve)
            
        finally:
            for p in saved_file_paths:
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except: pass
            if os.path.exists(temp_dir):
                try:
                    os.rmdir(temp_dir)
                except: pass
                
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        
        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            logger.warning(f"AI mengembalikan respons yang bukan JSON valid: {clean_text[:200]}")
            return {
                "soal": [],
                "warning": "AI tidak menemukan soal yang valid dalam input Anda. Pastikan input berisi pertanyaan atau soal yang jelas."
            }
        
        soal_list = data.get("soal", [])
        
        if not soal_list or len(soal_list) == 0:
            return {
                "soal": [],
                "warning": "AI tidak menemukan soal yang valid dalam input Anda. Coba masukkan teks yang berisi pertanyaan atau soal ujian."
            }
        
        return data
    except Exception as e:
        logger.error(f"Solve Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
