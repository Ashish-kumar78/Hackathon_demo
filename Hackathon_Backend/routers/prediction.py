"""
routers/prediction.py - AI/ML Stock Prediction Routes
"""

from fastapi import APIRouter, HTTPException, Query
from models.schemas import PredictionRequest, PredictionResponse
from engines.prediction import run_prediction

router = APIRouter(prefix="/api/predict", tags=["Prediction"])


@router.post("/", response_model=PredictionResponse)
async def predict(req: PredictionRequest, model: str = Query(default="lstm", enum=["prophet", "lstm"])):
    """
    Predict future stock prices using AI (Prophet or LSTM).
    - ticker: Stock symbol e.g. 'RELIANCE.NS', 'TCS.NS'
    - days: Number of days to predict (1–365)
    - model: 'prophet' or 'lstm'
    """
    try:
        return run_prediction(req, model=model)
    except ImportError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickers", response_model=list)
async def list_tickers():
    """Return supported stock tickers and their Yahoo Finance symbols."""
    return [
        {"symbol": "RELIANCE",   "yf_ticker": "RELIANCE.NS", "name": "Reliance Industries"},
        {"symbol": "TCS",        "yf_ticker": "TCS.NS",       "name": "Tata Consultancy"},
        {"symbol": "INFY",       "yf_ticker": "INFY.NS",      "name": "Infosys"},
        {"symbol": "HDFC",       "yf_ticker": "HDFCBANK.NS",  "name": "HDFC Bank"},
        {"symbol": "WIPRO",      "yf_ticker": "WIPRO.NS",     "name": "Wipro"},
        {"symbol": "TATAMOTORS", "yf_ticker": "TATAMOTORS.NS","name": "Tata Motors"},
    ]
