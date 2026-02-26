"""
engines/prediction.py - ML Price Prediction (yfinance + Prophet / LSTM)
"""

import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from typing import List

from models.schemas import PredictionRequest, PredictionPoint, PredictionResponse


# ─── Data Fetching ────────────────────────────────────────────────────────────

def fetch_historical_data(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Download historical OHLCV data from Yahoo Finance."""
    df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
    df = df[["Close"]].reset_index()
    df.columns = ["ds", "y"]  # Prophet-compatible column names
    df["ds"] = pd.to_datetime(df["ds"])
    return df


# ─── Prophet Model ────────────────────────────────────────────────────────────

def predict_with_prophet(ticker: str, days: int) -> PredictionResponse:
    """Use Facebook Prophet to forecast future prices."""
    try:
        from prophet import Prophet  # type: ignore
    except ImportError:
        raise ImportError("prophet is not installed. Run: pip install prophet")

    df = fetch_historical_data(ticker)
    model = Prophet(daily_seasonality=True, yearly_seasonality=True)
    model.fit(df)

    future = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)

    future_forecast = forecast.tail(days)
    predictions: List[PredictionPoint] = [
        PredictionPoint(
            date=str(row["ds"].date()),
            predicted_price=round(float(row["yhat"]), 2),
            lower_bound=round(float(row["yhat_lower"]), 2),
            upper_bound=round(float(row["yhat_upper"]), 2),
        )
        for _, row in future_forecast.iterrows()
    ]

    return PredictionResponse(ticker=ticker, predictions=predictions, model_used="Prophet")


# ─── LSTM Model (Placeholder) ────────────────────────────────────────────────

def predict_with_lstm(ticker: str, days: int) -> PredictionResponse:
    """
    LSTM-based prediction placeholder.
    Replace this stub with your trained Keras/PyTorch model.
    """
    df = fetch_historical_data(ticker, period="1y")
    last_price = float(df["y"].iloc[-1])

    # Naive stub: return last price ± small noise for demonstration
    import random
    predictions: List[PredictionPoint] = []
    current_price = last_price
    base_date = datetime.utcnow().date()

    for i in range(1, days + 1):
        change = current_price * random.uniform(-0.01, 0.015)
        current_price = round(current_price + change, 2)
        predictions.append(
            PredictionPoint(
                date=str(base_date + timedelta(days=i)),
                predicted_price=current_price,
                lower_bound=round(current_price * 0.97, 2),
                upper_bound=round(current_price * 1.03, 2),
            )
        )

    return PredictionResponse(ticker=ticker, predictions=predictions, model_used="LSTM")


# ─── Main Entry ───────────────────────────────────────────────────────────────

def run_prediction(request: PredictionRequest, model: str = "prophet") -> PredictionResponse:
    """Route prediction request to the appropriate model."""
    if model.lower() == "lstm":
        return predict_with_lstm(request.ticker, request.days)
    return predict_with_prophet(request.ticker, request.days)
