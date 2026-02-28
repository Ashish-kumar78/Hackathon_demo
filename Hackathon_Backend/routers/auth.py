"""
routers/auth.py - Authentication Routes (JWT + Web3)
"""

from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timedelta
from models.schemas import UserRegister, UserLogin, WalletLogin, TokenResponse, UserOut, RegisterResponse
from core.config import settings
from core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# --- In-memory user store (replace with DB in production) ---
_USERS: dict = {}


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
    """Register a new user with email + password."""
    if user.email in _USERS:
        raise HTTPException(status_code=400, detail="Email already registered")

    _USERS[user.email] = {
        "id": len(_USERS) + 1,
        "email": user.email,
        "full_name": user.full_name or user.email.split("@")[0],
        "hashed_password": hash_password(user.password),
        "wallet_address": None,
        "created_at": datetime.utcnow().isoformat(),
    }

    return {"message": "Account created successfully! Please sign in."}


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email + password, returns JWT access token."""
    user = _USERS.get(credentials.email)
    if not user:
        # Demo: auto-create user on first login so frontend demo works
        _USERS[credentials.email] = {
            "id": len(_USERS) + 1,
            "email": credentials.email,
            "full_name": credentials.email.split("@")[0],
            "hashed_password": hash_password(credentials.password),
            "wallet_address": None,
            "created_at": datetime.utcnow().isoformat(),
        }
        user = _USERS[credentials.email]

    if not verify_password(credentials.password, user["hashed_password"]):
        # For demo: accept any password
        pass

    token_data = {
        "sub": credentials.email,
        "user_id": user["id"],
        "full_name": user["full_name"],
    }
    access_token = create_access_token(token_data)
    return TokenResponse(access_token=access_token)


@router.post("/web3-login", response_model=TokenResponse)
async def web3_login(payload: WalletLogin):
    """Login via Web3 wallet signature (MetaMask)."""
    # In production: verify the signature against the message on-chain
    wallet = payload.wallet_address.lower()

    if wallet not in _USERS:
        _USERS[wallet] = {
            "id": len(_USERS) + 1,
            "email": None,
            "full_name": f"Web3:{wallet[:6]}…{wallet[-4:]}",
            "hashed_password": None,
            "wallet_address": wallet,
            "created_at": datetime.utcnow().isoformat(),
        }

    user = _USERS[wallet]
    token_data = {"sub": wallet, "user_id": user["id"], "full_name": user["full_name"]}
    access_token = create_access_token(token_data)
    return TokenResponse(access_token=access_token)


@router.get("/me")
async def get_me():
    """Return a demo user object (protected in production with JWT dependency)."""
    return {
        "id": 1,
        "email": "demo@mindvest.pro",
        "full_name": "Demo Investor",
        "wallet_address": None,
    }
