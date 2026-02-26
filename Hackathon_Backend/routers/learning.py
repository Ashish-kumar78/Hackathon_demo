"""
routers/learning.py - Learning Module Routes (Quiz + Risk Profiling)
"""

from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import QuizSubmission, RiskProfile
from engines.learning import get_all_questions, calculate_risk_profile

router = APIRouter(prefix="/api/learning", tags=["Learning"])


@router.get("/quiz/questions", response_model=List[dict])
async def quiz_questions():
    """Return all quiz questions (without weights/answers)."""
    return get_all_questions()


@router.post("/quiz/submit", response_model=RiskProfile)
async def submit_quiz(submission: QuizSubmission):
    """
    Submit quiz answers, calculate and return the user's risk profile.
    """
    try:
        return calculate_risk_profile(submission)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/topics", response_model=List[dict])
async def list_topics():
    """Return learning topics catalogue."""
    return [
        {"id": "basics",      "title": "Stock Market Basics",     "icon": "📈", "xp": 50,  "status": "available"},
        {"id": "fundamental", "title": "Fundamental Analysis",     "icon": "🔍", "xp": 75,  "status": "available"},
        {"id": "technical",   "title": "Technical Analysis",       "icon": "📊", "xp": 100, "status": "available"},
        {"id": "risk",        "title": "Risk Management",          "icon": "⚠️", "xp": 75,  "status": "available"},
        {"id": "options",     "title": "Options & Derivatives",    "icon": "🎯", "xp": 150, "status": "locked"},
        {"id": "crypto",      "title": "Crypto & Web3",            "icon": "₿",  "xp": 200, "status": "locked"},
    ]
