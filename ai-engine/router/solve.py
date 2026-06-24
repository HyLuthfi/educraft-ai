import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from service.gemini_service import panggil_gemini
from template.prompt_solve import SYSTEM_PROMPT_SOLVE, buat_user_prompt_solve

logger = logging.getLogger(__name__)

router = APIRouter()

class SolveConfig(BaseModel):
    explanationLevel: str = "singkat"
    strictReference: str = "campuran"
    languageStyle: str = "formal"

class SolveRequest(BaseModel):
    raw_questions: str
    reference: str = ""
    config: SolveConfig

@router.post("/solve")
async def solve_questions(req: SolveRequest):
    try:
        sys_prompt = SYSTEM_PROMPT_SOLVE.format(
            explanation_level=req.config.explanationLevel,
            strict_reference=req.config.strictReference,
            language_style=req.config.languageStyle
        )
        
        user_prompt = buat_user_prompt_solve(req.raw_questions, req.reference)
        
        response_text = panggil_gemini(sys_prompt, user_prompt, model_name="gemini-3.5-flash")
        
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        return data
    except Exception as e:
        logger.error(f"Solve Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
