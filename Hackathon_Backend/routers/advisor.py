"""
routers/advisor.py - AI Advisor Routes (Gemini 1.5 Flash)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.schemas import AdvisorRequest, AdvisorResponse
from services.advisor import get_advice
from core.config import settings
from datetime import datetime

router = APIRouter(prefix="/api/advisor", tags=["Advisor"])


class ChatRequest(BaseModel):
    message: str
    user_id: int = 0

class ChatResponse(BaseModel):
    reply: str


def _gemini_chat(prompt: str) -> str:
    """Call Gemini 2.5 Flash and return the generated text."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        result = model.generate_content(prompt)
        return result.text
    except Exception as e:
        # Fallback to pure REST API if the library fails or rate limits
        if "429" in str(e) or "Resource has been exhausted" in str(e) or "Quota" in str(e):
            import urllib.request, json
            
            # The user's provided API key has hit the "Too Many Requests" rate limit for the free tier.
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            if "key=" not in url or settings.GEMINI_API_KEY == "":
                return "[AI unavailable: API Key missing in environment]"
                
            headers = {'Content-Type': 'application/json'}
            data = {
                "contents": [{"parts":[{"text": prompt}]}]
            }
            try:
                req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
                with urllib.request.urlopen(req) as response:
                    res_data = json.loads(response.read().decode())
                    return res_data['candidates'][0]['content']['parts'][0]['text']
            except Exception as e2:
                return f"[AI fallback unavailable: {e2}]"
                
        return f"[AI unavailable: {e}]"


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


@router.post("/chat", response_model=ChatResponse)
async def chat_with_advisor(req: ChatRequest):
    """
    Simple AI chat endpoint for the frontend chatbot.
    Uses Gemini 1.5 Flash with a financial advisor system prompt.
    """
    system_prompt = (
        "You are MindVest, a professional AI financial advisor and stock market expert. "
        "You help users understand stocks, investments, portfolio management, and market trends. "
        "You provide clear, data-driven, personalized financial insights. "
        "Always remind users that market predictions carry risk and this is not certified financial advice.\n\n"
    )
    full_prompt = system_prompt + f"User: {req.message}\nMindVest:"
    
    reply = _gemini_chat(full_prompt)
    return ChatResponse(reply=reply)


@router.post("/predict-insight")
async def predict_insight(ticker: str, days: int = 7):
    """Get AI insight on a stock prediction."""
    prompt = (
        f"Provide a brief 3-sentence investment insight for {ticker} stock for the next {days} days. "
        "Include potential catalysts, risks, and a sentiment (Bullish/Bearish/Neutral). "
        "Be concise and data-driven."
    )
    reply = _gemini_chat(prompt)
    return {"ticker": ticker, "insight": reply, "generated_at": datetime.utcnow()}
