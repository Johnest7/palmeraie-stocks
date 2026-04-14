"""
routes/auth.py
--------------
Login endpoint. The frontend calls this with username + password,
and gets back a JWT token to use for all future requests.
"""

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth import verify_password, create_access_token
from models import LoginRequest, LoginResponse
import aiosqlite

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    """
    Login with username + password.
    Returns a JWT token if credentials are valid.
    """
    # Look up the user by username
    async with db.execute(
        "SELECT id, name, username, password_hash, role FROM users WHERE username = ?",
        (body.username,)
    ) as cur:
        user = await cur.fetchone()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_access_token(user["id"], user["role"])

    return LoginResponse(
        token=token,
        user_id=user["id"],
        name=user["name"],
        role=user["role"]
    )
