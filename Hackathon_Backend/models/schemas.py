"""
models/schemas.py - Pydantic Models for Request / Response
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class RegisterResponse(BaseModel):
    message: str = "Account created successfully! Please sign in."


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class WalletLogin(BaseModel):
    wallet_address: str
    signature: str
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: Optional[EmailStr]
    full_name: Optional[str]
    wallet_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Learning / Quiz ──────────────────────────────────────────────────────────

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    category: str  # e.g. "risk", "knowledge", "goals"


class QuizAnswer(BaseModel):
    question_id: int
    selected_option: int  # index of the chosen option


class QuizSubmission(BaseModel):
    user_id: int
    answers: List[QuizAnswer]


class RiskProfile(BaseModel):
    user_id: int
    score: float
    profile: str  # "conservative" | "moderate" | "aggressive"
    generated_at: datetime


# ─── Investment ───────────────────────────────────────────────────────────────

class AllocationRequest(BaseModel):
    user_id: int
    investment_amount: float
    risk_profile: str


class AssetAllocation(BaseModel):
    asset: str
    percentage: float
    amount: float


class PortfolioResponse(BaseModel):
    total_amount: float
    allocations: List[AssetAllocation]
    rationale: str


# ─── Prediction ───────────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    ticker: str
    days: int = Field(default=30, ge=1, le=365)


class PredictionPoint(BaseModel):
    date: str
    predicted_price: float
    lower_bound: Optional[float]
    upper_bound: Optional[float]


class PredictionResponse(BaseModel):
    ticker: str
    predictions: List[PredictionPoint]
    model_used: str  # "Prophet" | "LSTM"


# ─── News / Sentiment ─────────────────────────────────────────────────────────

class NewsRequest(BaseModel):
    query: str
    limit: int = Field(default=10, ge=1, le=50)


class NewsArticle(BaseModel):
    title: str
    source: str
    url: str
    published_at: str
    sentiment: str      # "positive" | "neutral" | "negative"
    sentiment_score: float
    summary: Optional[str]


class NewsResponse(BaseModel):
    query: str
    articles: List[NewsArticle]
    overall_sentiment: str


# ─── Advisor ─────────────────────────────────────────────────────────────────

class AdvisorRequest(BaseModel):
    user_id: int
    query: str


class AdvisorResponse(BaseModel):
    advice: str
    sources: Optional[List[str]] = []
    generated_at: datetime
