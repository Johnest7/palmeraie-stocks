"""
auth.py
-------
Handles:
- Password hashing (bcrypt) — never store plain passwords
- JWT token creation and verification
- A FastAPI dependency to get the current logged-in user from a request

HOW JWT WORKS (simple explanation):
When a user logs in, the server creates a signed token containing
their user ID and role. The frontend stores this token and sends it
with every request. The server verifies the signature to trust it —
no database lookup needed on every request.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

# Secret key used to sign tokens — in production, use a long random string
# stored in an environment variable, never hardcoded.
SECRET_KEY = os.environ.get("SECRET_KEY", "palmeraie-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12  # Token valid for 12 hours

# bcrypt context for hashing passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token scheme for FastAPI
bearer_scheme = HTTPBearer()


def get_password_hash(password: str) -> str:
    """Hash a plain password. Used when creating users."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Check if a plain password matches the stored hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, role: str) -> str:
    """
    Create a JWT token containing user_id and role.
    It expires after ACCESS_TOKEN_EXPIRE_HOURS.
    """
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    Raises HTTPException if invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré"
        )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """
    FastAPI dependency — extracts the current user from the Authorization header.
    Use it in any route that requires login: current_user = Depends(get_current_user)
    """
    return decode_token(credentials.credentials)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency — same as get_current_user but also checks for admin role.
    Use in admin-only routes.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé à l'administrateur"
        )
    return current_user
