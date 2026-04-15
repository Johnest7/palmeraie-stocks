"""
routes/superadmin.py
--------------------
Johnest7 Control Center — Super Admin only.
Accessible via /j7/* endpoints.
Only one account with role 'superadmin' can access these.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from database import get_db
from auth import get_current_user, get_password_hash, create_access_token, verify_password
from pydantic import BaseModel
from typing import Optional
import aiosqlite, json
from datetime import datetime

router = APIRouter(prefix="/j7", tags=["superadmin"])


# ─── SUPERADMIN AUTH CHECK ────────────────────────────────────────────────────

def require_superadmin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Accès refusé.")
    return current_user


# ─── MODELS ──────────────────────────────────────────────────────────────────

class SuperLoginRequest(BaseModel):
    username: str
    password: str
    secret_key: str  # Extra security layer

class PasswordResetRequest(BaseModel):
    user_id: int
    new_password: str

class UserStatusRequest(BaseModel):
    user_id: int
    active: bool

class MaintenanceModeRequest(BaseModel):
    enabled: bool
    message: Optional[str] = "L'application est en maintenance. Revenez bientôt."

class GlobalSettingRequest(BaseModel):
    key: str
    value: str


# ─── SUPER LOGIN ─────────────────────────────────────────────────────────────

SUPER_SECRET = "JOHNEST7-PALMERAIE-2026"  # Extra layer on top of password

@router.post("/login")
async def super_login(
    body: SuperLoginRequest,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Special login for Johnest7 — requires username, password AND secret key."""
    if body.secret_key != SUPER_SECRET:
        raise HTTPException(status_code=403, detail="Clé secrète incorrecte.")

    async with db.execute(
        "SELECT id, name, username, password_hash, role FROM users WHERE username = ? AND role = 'superadmin'",
        (body.username,)
    ) as cur:
        user = await cur.fetchone()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects.")

    # Log the login
    await _log_action(db, user["id"], "super_login", f"Connexion super-admin depuis le centre de contrôle")

    token = create_access_token(user["id"], "superadmin")
    return {"token": token, "name": user["name"], "role": "superadmin"}


# ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

@router.get("/dashboard")
async def super_dashboard(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_superadmin)
):
    """Complete system overview."""
    async with db.execute("SELECT COUNT(*) FROM users") as cur:
        total_users = (await cur.fetchone())[0]

    async with db.execute("SELECT COUNT(*) FROM products") as cur:
        total_products = (await cur.fetchone())[0]

    async with db.execute("SELECT COUNT(*) FROM shopping_sessions") as cur:
        total_sessions = (await cur.fetchone())[0]

    async with db.execute("SELECT COUNT(*) FROM stock_exits") as cur:
        total_exits = (await cur.fetchone())[0]

    async with db.execute("SELECT COUNT(*) FROM loss_logs") as cur:
        total_losses = (await cur.fetchone())[0]

    async with db.execute("SELECT COALESCE(SUM(total_cost), 0) FROM shopping_sessions") as cur:
        total_spent = (await cur.fetchone())[0]

    async with db.execute("""
        SELECT COALESCE(SUM(e.quantity * p.selling_price), 0)
        FROM stock_exits e JOIN products p ON p.id = e.product_id
    """) as cur:
        total_revenue = (await cur.fetchone())[0]

    # Recent activity logs
    async with db.execute("""
        SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20
    """) as cur:
        logs = [dict(r) for r in await cur.fetchall()]

    # Check maintenance mode
    async with db.execute(
        "SELECT value FROM global_settings WHERE key = 'maintenance_mode'"
    ) as cur:
        row = await cur.fetchone()
        maintenance = row["value"] if row else "false"

    return {
        "stats": {
            "total_users": total_users,
            "total_products": total_products,
            "total_sessions": total_sessions,
            "total_exits": total_exits,
            "total_losses": total_losses,
            "total_spent": round(total_spent),
            "total_revenue": round(total_revenue),
            "margin": round(total_revenue - total_spent),
        },
        "recent_logs": logs,
        "maintenance_mode": maintenance == "true"
    }


# ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

@router.get("/users")
async def get_all_users(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_superadmin)
):
    """Get ALL users including superadmin — with last login info."""
    async with db.execute("""
        SELECT u.id, u.name, u.username, u.role, u.created_at,
               u.active,
               (SELECT created_at FROM activity_logs
                WHERE user_id = u.id AND action = 'login'
                ORDER BY created_at DESC LIMIT 1) as last_login
        FROM users u
        ORDER BY u.role, u.name
    """) as cur:
        users = [dict(r) for r in await cur.fetchall()]
    return users


@router.post("/users/reset-password")
async def reset_password(
    body: PasswordResetRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(require_superadmin)
):
    """Reset any user's password."""
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 6 caractères.")

    hashed = get_password_hash(body.new_password)
    await db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (hashed, body.user_id)
    )
    await db.commit()

    await _log_action(db, int(current_user["sub"]), "password_reset", f"Mot de passe réinitialisé pour user_id={body.user_id}")
    return {"ok": True}


@router.post("/users/toggle-status")
async def toggle_user_status(
    body: UserStatusRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(require_superadmin)
):
    """Activate or deactivate a user account."""
    await db.execute(
        "UPDATE users SET active = ? WHERE id = ?",
        (1 if body.active else 0, body.user_id)
    )
    await db.commit()
    status = "activé" if body.active else "désactivé"
    await _log_action(db, int(current_user["sub"]), "user_status", f"Compte user_id={body.user_id} {status}")
    return {"ok": True}


# ─── MAINTENANCE MODE ─────────────────────────────────────────────────────────

@router.post("/maintenance")
async def set_maintenance_mode(
    body: MaintenanceModeRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(require_superadmin)
):
    """Enable or disable maintenance mode."""
    await db.execute("""
        INSERT OR REPLACE INTO global_settings (key, value)
        VALUES ('maintenance_mode', ?)
    """, ("true" if body.enabled else "false",))
    await db.execute("""
        INSERT OR REPLACE INTO global_settings (key, value)
        VALUES ('maintenance_message', ?)
    """, (body.message,))
    await db.commit()
    await _log_action(db, int(current_user["sub"]), "maintenance", f"Mode maintenance: {body.enabled}")
    return {"ok": True}


# ─── DATABASE OVERVIEW ───────────────────────────────────────────────────────

@router.get("/database")
async def get_database_overview(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_superadmin)
):
    """Full database overview — all tables and row counts."""
    tables = ["users", "products", "shopping_sessions", "shopping_items",
              "stock_exits", "loss_logs", "activity_logs", "global_settings"]

    result = {}
    for table in tables:
        try:
            async with db.execute(f"SELECT COUNT(*) FROM {table}") as cur:
                count = (await cur.fetchone())[0]
            async with db.execute(f"SELECT * FROM {table} ORDER BY rowid DESC LIMIT 5") as cur:
                rows = [dict(r) for r in await cur.fetchall()]
            result[table] = {"count": count, "recent": rows}
        except:
            result[table] = {"count": 0, "recent": []}

    return result


# ─── ACTIVITY LOGS ───────────────────────────────────────────────────────────

@router.get("/logs")
async def get_activity_logs(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_superadmin)
):
    """Full activity log."""
    async with db.execute("""
        SELECT l.*, u.name as user_name, u.username
        FROM activity_logs l
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.created_at DESC
        LIMIT 200
    """) as cur:
        logs = [dict(r) for r in await cur.fetchall()]
    return logs


# ─── GLOBAL SETTINGS ─────────────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_superadmin)
):
    async with db.execute("SELECT * FROM global_settings") as cur:
        rows = [dict(r) for r in await cur.fetchall()]
    return rows


@router.post("/settings")
async def update_setting(
    body: GlobalSettingRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(require_superadmin)
):
    await db.execute(
        "INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)",
        (body.key, body.value)
    )
    await db.commit()
    await _log_action(db, int(current_user["sub"]), "setting_update", f"{body.key} = {body.value}")
    return {"ok": True}


# ─── HELPER ──────────────────────────────────────────────────────────────────

async def _log_action(db, user_id: int, action: str, details: str = ""):
    """Log any superadmin action."""
    try:
        await db.execute(
            "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
            (user_id, action, details)
        )
        await db.commit()
    except:
        pass
