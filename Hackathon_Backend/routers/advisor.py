"""
routers/advisor.py - AI Advisor Routes
"""

from fastapi import APIRouter, HTTPException
from models.schemas import AdvisorRequest, AdvisorResponse
from services.advisor import get_advice

router = APIRouter(prefix="/api/advisor", tags=["Advisor"])


@router.post("/ask", response_model=AdvisorResponse)
async def ask_advisor(req: AdvisorRequest):
    """
    Ask the AI financial advisor a question.
    Combines news sentiment + portfolio context → enriched LLM response.
    """
    try:
        return await get_advice(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
