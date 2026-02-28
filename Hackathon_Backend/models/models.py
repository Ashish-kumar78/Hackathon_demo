"""
models/models.py - SQLAlchemy Database Models
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from models.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    wallet_address = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Risk profile
    risk_score = Column(Float, nullable=True)
    risk_profile = Column(String(50), nullable=True)  # conservative, moderate, aggressive


class QuizResult(Base):
    __tablename__ = "quiz_results"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answers = Column(JSON, nullable=False)  # Store answers as JSON
    risk_score = Column(Float, nullable=False)
    risk_profile = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Portfolio(Base):
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    investment_amount = Column(Float, nullable=False)
    risk_profile = Column(String(50), nullable=False)
    allocations = Column(JSON, nullable=False)  # Store allocations as JSON
    rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False)
    days = Column(Integer, nullable=False)
    model_used = Column(String(50), nullable=False)
    predictions = Column(JSON, nullable=False)  # Store prediction data as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AdvisorQuery(Base):
    __tablename__ = "advisor_queries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=False)
    advice = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
