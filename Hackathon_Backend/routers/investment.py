"""
routers/investment.py - Portfolio & Investment Routes
"""

from fastapi import APIRouter, HTTPException
from models.schemas import AllocationRequest, PortfolioResponse
from engines.investment import generate_portfolio

router = APIRouter(prefix="/api/investment", tags=["Investment"])


@router.post("/portfolio/allocate", response_model=PortfolioResponse)
async def allocate_portfolio(req: AllocationRequest):
    """
    Generate asset allocation plan based on risk profile and investment amount.
    risk_profile: 'conservative' | 'moderate' | 'aggressive'
    """
    try:
        return generate_portfolio(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/allocation-templates", response_model=dict)
async def allocation_templates():
    """Return all pre-defined allocation templates by risk profile."""
    from engines.investment import ALLOCATION_TEMPLATES, RATIONALE_MAP
    return {
        profile: {
            "allocations": items,
            "rationale": RATIONALE_MAP.get(profile, ""),
        }
        for profile, items in ALLOCATION_TEMPLATES.items()
    }
