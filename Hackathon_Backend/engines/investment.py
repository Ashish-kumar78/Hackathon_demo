"""
engines/investment.py - Diversification & Allocation Logic
"""

from typing import List
from models.schemas import AllocationRequest, AssetAllocation, PortfolioResponse

# ─── Allocation Templates ─────────────────────────────────────────────────────

ALLOCATION_TEMPLATES = {
    "conservative": [
        {"asset": "Government Bonds / FDs", "percentage": 50.0},
        {"asset": "Large-Cap Mutual Funds",  "percentage": 20.0},
        {"asset": "Gold / REITs",            "percentage": 15.0},
        {"asset": "Blue-Chip Stocks",        "percentage": 10.0},
        {"asset": "Cash / Liquid Funds",     "percentage": 5.0},
    ],
    "moderate": [
        {"asset": "Large-Cap Stocks",        "percentage": 30.0},
        {"asset": "Mid-Cap Mutual Funds",    "percentage": 25.0},
        {"asset": "Government Bonds",        "percentage": 20.0},
        {"asset": "Gold / Commodities",      "percentage": 15.0},
        {"asset": "Crypto (BTC/ETH)",        "percentage": 10.0},
    ],
    "aggressive": [
        {"asset": "Growth Stocks",           "percentage": 35.0},
        {"asset": "Small/Mid-Cap Funds",     "percentage": 25.0},
        {"asset": "Crypto (BTC/ETH/Alt)",    "percentage": 20.0},
        {"asset": "International ETFs",      "percentage": 10.0},
        {"asset": "Commodities & Gold",      "percentage": 10.0},
    ],
}

RATIONALE_MAP = {
    "conservative": (
        "Your conservative profile prioritises capital preservation. "
        "The portfolio is weighted heavily towards fixed-income instruments and gold "
        "to minimise volatility while generating steady returns."
    ),
    "moderate": (
        "Your moderate profile balances growth and stability. "
        "The mix of equities, bonds, and a small crypto allocation aims to "
        "outperform inflation while managing downside risk."
    ),
    "aggressive": (
        "Your aggressive profile targets maximum long-term growth. "
        "High allocation to growth equities and crypto reflects your higher "
        "risk tolerance and longer investment horizon."
    ),
}


def generate_portfolio(request: AllocationRequest) -> PortfolioResponse:
    """Generate asset allocation based on risk profile and investment amount."""
    profile = request.risk_profile.lower()
    template = ALLOCATION_TEMPLATES.get(profile, ALLOCATION_TEMPLATES["moderate"])

    allocations: List[AssetAllocation] = [
        AssetAllocation(
            asset=item["asset"],
            percentage=item["percentage"],
            amount=round(request.investment_amount * item["percentage"] / 100, 2),
        )
        for item in template
    ]

    return PortfolioResponse(
        total_amount=request.investment_amount,
        allocations=allocations,
        rationale=RATIONALE_MAP.get(profile, ""),
    )
