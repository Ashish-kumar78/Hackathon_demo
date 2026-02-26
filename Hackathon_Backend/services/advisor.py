"""
services/advisor.py - The "Brain" (Unified AI Advisory Layer)
"""

from datetime import datetime
from typing import Optional

from models.schemas import AdvisorRequest, AdvisorResponse, AllocationRequest
from engines.learning import calculate_risk_profile, QuizSubmission
from engines.investment import generate_portfolio
from engines.prediction import run_prediction, PredictionRequest
from engines.news import get_news_with_sentiment, NewsRequest
from core.config import settings


# ─── LLM Client (Gemini) ─────────────────────────────────────────────────────

def _get_llm_response(prompt: str) -> str:
    """Call Gemini Pro and return the generated text."""
    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-pro")
        result = model.generate_content(prompt)
        return result.text
    except Exception as e:
        return f"[LLM unavailable: {e}]"


# ─── Context Builder ──────────────────────────────────────────────────────────

async def _build_context(user_id: int, query: str) -> str:
    """
    Aggregate data from all engines to build rich context for the LLM prompt.
    In production, load actual user profile & portfolio from DB.
    """
    context_parts = [f"User query: {query}"]

    # --- News sentiment snippet ---
    try:
        news_resp = await get_news_with_sentiment(NewsRequest(query=query, limit=5))
        context_parts.append(
            f"Latest market sentiment on '{query}': {news_resp.overall_sentiment}. "
            f"Top headline: {news_resp.articles[0].title if news_resp.articles else 'N/A'}"
        )
    except Exception:
        pass

    return "\n".join(context_parts)


# ─── Main Advisor ─────────────────────────────────────────────────────────────

async def get_advice(request: AdvisorRequest) -> AdvisorResponse:
    """
    The unified AI layer:
    1. Builds context from all engines
    2. Sends an enriched prompt to the LLM
    3. Returns structured financial advice
    """
    context = await _build_context(request.user_id, request.query)

    system_prompt = (
        "You are MindVest, an expert AI financial advisor. "
        "Your advice is personalised, data-driven, and easy to understand. "
        "Always remind users that this is not certified financial advice.\n\n"
    )

    full_prompt = system_prompt + context + f"\n\nUser: {request.query}\nMindVest:"

    advice_text = _get_llm_response(full_prompt)

    return AdvisorResponse(
        advice=advice_text,
        sources=["NewsAPI", "Yahoo Finance", "Gemini AI"],
        generated_at=datetime.utcnow(),
    )
