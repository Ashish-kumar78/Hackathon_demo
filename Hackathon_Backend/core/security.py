"""
core/security.py - JWT & Web3 Logic
"""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from web3 import Web3

from core.config import settings

import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# --- JWT ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# --- Web3 ---
def get_web3() -> Web3:
    """Returns a Web3 instance connected to the configured provider."""
    w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
    return w3


def verify_wallet_signature(message: str, signature: str, address: str) -> bool:
    """Verify that a signed message was signed by the given wallet address."""
    w3 = get_web3()
    try:
        recovered = w3.eth.account.recover_message(
            text=message, signature=signature
        )
        return recovered.lower() == address.lower()
    except Exception:
        return False
