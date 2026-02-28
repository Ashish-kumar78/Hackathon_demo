"""
engines/news.py - News Sentiment (NewsAPI + LLM)
"""

import httpx
from typing import List
from models.schemas import NewsRequest, NewsArticle, NewsResponse
from core.config import settings
from datetime import datetime, timezone


# ─── NewsAPI ──────────────────────────────────────────────────────────────────

async def fetch_news_articles(query: str, limit: int = 10) -> List[dict]:
    """Fetch real-time news articles from NewsData.io using the API key."""
    if settings.NEWS_API_KEY:
        # User provided API key starts with 'pub_', meaning it's NewsData.io, not NewsAPI.org
        url = "https://newsdata.io/api/1/news"
        params = {
            "apikey": settings.NEWS_API_KEY,
            "q": query,
            "language": "en",
            "size": limit,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                # Transform NewsData.io format back to the unified format
                results = data.get("results", [])
                articles = []
                for n in results:
                    articles.append({
                        "title": n.get("title", ""),
                        "description": n.get("description", ""),
                        "url": n.get("link", ""),
                        "publishedAt": n.get("pubDate", ""),
                        "source": {"name": n.get("source_id", "NewsData")}
                    })
                if articles:
                    return articles
            except Exception as e:
                print("NewsData API error:", e)
                pass

    # Fallback to free, real-time news articles from an open-source mirror using general categories
    url = "https://saurav.tech/NewsAPI/top-headlines/category/business/in.json"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            articles = data.get("articles", [])
            return articles[:limit]
        except Exception as e:
            print("Fallback error:", e)
            pass
            
    return []


# ─── Sentiment Analysis (LLM via Gemini / OpenAI) ────────────────────────────

async def analyse_sentiment(text: str) -> dict:
    """
    Use an LLM to analyse the sentiment of a news snippet.
    Returns {"sentiment": "positive|neutral|negative", "score": float, "summary": str}
    """
    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-flash-latest")

        prompt = (
            "Analyse the sentiment of the following financial news headline/snippet. "
            "Reply ONLY with a JSON object with keys: "
            '"sentiment" (positive/neutral/negative), '
            '"score" (float between -1 and 1), '
            '"summary" (one sentence summary).\n\n'
            f"Text: {text}"
        )
        result = model.generate_content(prompt)
        import json, re

        match = re.search(r"\{.*\}", result.text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass

    # Fallback: simple keyword-based heuristic
    lower = text.lower()
    if any(w in lower for w in ["surge", "gain", "profit", "bull", "rise", "growth"]):
        return {"sentiment": "positive", "score": 0.6, "summary": text[:120]}
    elif any(w in lower for w in ["crash", "loss", "bear", "drop", "fall", "risk"]):
        return {"sentiment": "negative", "score": -0.6, "summary": text[:120]}
    return {"sentiment": "neutral", "score": 0.0, "summary": text[:120]}


# ─── Main Entry ───────────────────────────────────────────────────────────────

async def get_news_with_sentiment(request: NewsRequest) -> NewsResponse:
    """Fetch news and enrich each article with LLM-generated sentiment."""
    raw_articles = await fetch_news_articles(request.query, request.limit)
    articles: List[NewsArticle] = []
    sentiment_scores: List[float] = []

    for raw in raw_articles:
        text = f"{raw.get('title', '')} {raw.get('description', '')}"
        sentiment_data = await analyse_sentiment(text.strip())

        articles.append(
            NewsArticle(
                title=raw.get("title", ""),
                source=raw.get("source", {}).get("name", "Unknown"),
                url=raw.get("url", ""),
                published_at=raw.get("publishedAt", ""),
                sentiment=sentiment_data.get("sentiment", "neutral"),
                sentiment_score=sentiment_data.get("score", 0.0),
                summary=sentiment_data.get("summary"),
            )
        )
        sentiment_scores.append(sentiment_data.get("score", 0.0))

    avg_score = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
    if avg_score > 0.1:
        overall = "positive"
    elif avg_score < -0.1:
        overall = "negative"
    else:
        overall = "neutral"

    return NewsResponse(query=request.query, articles=articles, overall_sentiment=overall)
