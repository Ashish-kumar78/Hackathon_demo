from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
from typing import List

router = APIRouter(prefix="/api/market", tags=["Market"])

class ChartDataResponse(BaseModel):
    labels: List[str]
    prices: List[float]
    opens: List[float]
    highs: List[float]
    lows: List[float]
    closes: List[float]

@router.get("/chart", response_model=ChartDataResponse)
async def get_market_chart(symbol: str, timeframe: str):
    yf_symbol = symbol.upper()
    if "." not in yf_symbol:
        # Default to National Stock Exchange for Indian symbols
        yf_symbol = f"{yf_symbol}.NS"
    
    period = "1mo"
    interval = "1d"
    
    if timeframe == "1D":
        period = "5d"
        interval = "5m"
    elif timeframe == "1W":
        period = "1mo"
        interval = "1d"
    elif timeframe == "1M":
        period = "3mo"
        interval = "1d"
    elif timeframe == "3M":
        period = "1y"
        interval = "1wk"
    elif timeframe == "1Y":
        period = "2y"
        interval = "1wk"

    try:
        ticker = yf.Ticker(yf_symbol)
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            raise HTTPException(status_code=404, detail="No data found for this symbol.")
            
        if timeframe == "1D":
            df = df.tail(75)
        else:
            limit_map = {"1W": 7, "1M": 30, "3M": 13, "1Y": 52}
            limit = limit_map.get(timeframe, 30)
            df = df.tail(limit)

        labels = []
        opens = []
        highs = []
        lows = []
        closes = []
        prices = []
        
        for idx, row in df.iterrows():
            if interval == "5m":
                labels.append(idx.strftime("%H:%M"))
            else:
                labels.append(idx.strftime("%Y-%m-%d"))
            opens.append(round(row["Open"], 2))
            highs.append(round(row["High"], 2))
            lows.append(round(row["Low"], 2))
            closes.append(round(row["Close"], 2))
            prices.append(round(row["Close"], 2))
            
        return ChartDataResponse(
            labels=labels,
            prices=prices,
            opens=opens,
            highs=highs,
            lows=lows,
            closes=closes
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

import urllib.request
import json
import asyncio

@router.get("/quotes")
async def get_live_quotes(symbols: str = "RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS,TATAMOTORS.NS"):
    result = {}
    syms_list = symbols.split(',')
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    # Helper function to fetch single symbol
    def fetch_yahoo(sym):
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1m&range=1d"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                
                if not data.get('chart', {}).get('result'):
                    return None
                    
                meta = data['chart']['result'][0]['meta']
                close = meta.get('regularMarketPrice')
                prev_close = meta.get('chartPreviousClose')
                
                if close is None:
                    return None
                    
                change = close - prev_close
                pct = (change / prev_close) * 100 if prev_close else 0
                display_sym = sym.split('.')[0]
                
                return display_sym, {
                    "price": round(float(close), 2),
                    "change": round(float(change), 2),
                    "pct": round(float(pct), 2),
                    "dir": "positive" if change >= 0 else "negative"
                }
        except Exception as e:
            return None

    # Fetch them sequentially or we can use ThreadPoolExecutor
    # Since it's a small list, linear is fine for the hackathon
    for sym in syms_list:
        sym = sym.upper()
        if "." not in sym and sym not in ["BTC-USD", "ETH-USD"]:
            sym = f"{sym}.NS"
            
        res = fetch_yahoo(sym)
        if res:
            display_sym, info = res
            result[display_sym] = info
            
    return result
