"""
routers/news.py - News Sentiment Routes
"""

from fastapi import APIRouter, HTTPException, Query
from models.schemas import NewsRequest, NewsResponse
from engines.news import get_news_with_sentiment

router = APIRouter(prefix="/api/news", tags=["News"])


@router.get("/", response_model=NewsResponse)
async def get_news(
    query: str = Query(default="Indian stock market", description="Search query"),
    limit: int = Query(default=10, ge=1, le=50),
):
    """
    Fetch financial news articles and AI-powered sentiment analysis.
    """
    try:
        req = NewsRequest(query=query, limit=limit)
        return await get_news_with_sentiment(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=NewsResponse)
async def get_news_post(req: NewsRequest):
    """POST variant — fetch news for a given query with sentiment analysis."""
    try:
        return await get_news_with_sentiment(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
