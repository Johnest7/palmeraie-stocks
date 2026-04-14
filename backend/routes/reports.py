"""
routes/reports.py
-----------------
Two main endpoints:
1. /reports/dashboard — stats for the dashboard (stock counts, alerts)
2. /reports/history   — full audit log of all movements (admin only)
3. /reports/users     — user management (admin only)
"""

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth import get_current_user, require_admin, get_password_hash
from models import DashboardStats, StockAlert, UserCreate, UserOut
from typing import List
import aiosqlite

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Returns all data needed for the dashboard:
    - Total product count
    - Low stock and out-of-stock counts
    - Shopping sessions this month
    - List of alerts (products at or below threshold)
    """
    # Total products
    async with db.execute("SELECT COUNT(*) FROM products") as cur:
        total_products = (await cur.fetchone())[0]

    # Out of stock (current_stock <= 0)
    async with db.execute(
        "SELECT COUNT(*) FROM products WHERE current_stock <= 0"
    ) as cur:
        out_of_stock = (await cur.fetchone())[0]

    # Low stock (current_stock > 0 AND current_stock <= alert_threshold)
    async with db.execute(
        "SELECT COUNT(*) FROM products WHERE current_stock > 0 AND current_stock <= alert_threshold"
    ) as cur:
        low_stock = (await cur.fetchone())[0]

    # Shopping sessions this month
    async with db.execute(
        """SELECT COUNT(*) FROM shopping_sessions
           WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')"""
    ) as cur:
        sessions_this_month = (await cur.fetchone())[0]

    # All alerts (out of stock + low stock)
    async with db.execute(
        """SELECT id, name, current_stock, alert_threshold, unit
           FROM products
           WHERE current_stock <= alert_threshold
           ORDER BY current_stock ASC"""
    ) as cur:
        alert_rows = await cur.fetchall()

    alerts = [
        StockAlert(
            product_id=r["id"],
            product_name=r["name"],
            current_stock=r["current_stock"],
            alert_threshold=r["alert_threshold"],
            unit=r["unit"],
            status="out" if r["current_stock"] <= 0 else "low"
        )
        for r in alert_rows
    ]

    return DashboardStats(
        total_products=total_products,
        low_stock_count=low_stock,
        out_of_stock_count=out_of_stock,
        shopping_sessions_this_month=sessions_this_month,
        alerts=alerts
    )


@router.get("/history")
async def get_full_history(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)  # admin only
):
    """
    Full audit log — every stock movement from all sources,
    sorted by date descending. Used on the Historique page.
    """
    # Shopping entries
    async with db.execute(
        """SELECT 'entry' as type, si.id, s.date, u.name as manager,
                  p.name as product, si.quantity, p.unit, NULL as reason
           FROM shopping_items si
           JOIN shopping_sessions s ON s.id = si.session_id
           JOIN users u ON u.id = s.manager_id
           JOIN products p ON p.id = si.product_id"""
    ) as cur:
        entries = [dict(r) for r in await cur.fetchall()]

    # Stock exits
    async with db.execute(
        """SELECT 'exit' as type, e.id, e.date, u.name as manager,
                  p.name as product, e.quantity, p.unit, e.notes as reason
           FROM stock_exits e
           JOIN users u ON u.id = e.manager_id
           JOIN products p ON p.id = e.product_id"""
    ) as cur:
        exits = [dict(r) for r in await cur.fetchall()]

    # Losses
    async with db.execute(
        """SELECT 'loss' as type, l.id, l.date, u.name as manager,
                  p.name as product, l.quantity, p.unit, l.reason
           FROM loss_logs l
           JOIN users u ON u.id = l.manager_id
           JOIN products p ON p.id = l.product_id"""
    ) as cur:
        losses = [dict(r) for r in await cur.fetchall()]

    # Merge and sort by date
    all_movements = entries + exits + losses
    all_movements.sort(key=lambda x: x["date"], reverse=True)

    return all_movements


@router.get("/users", response_model=List[UserOut])
async def list_users(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """List all users (admin only)."""
    async with db.execute("SELECT id, name, username, role, created_at FROM users") as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/users", response_model=UserOut)
async def create_user(
    body: UserCreate,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """Create a new user (admin only)."""
    async with db.execute("SELECT id FROM users WHERE username = ?", (body.username,)) as cur:
        if await cur.fetchone():
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur existe déjà")

    hashed = get_password_hash(body.password)
    async with db.execute(
        """INSERT INTO users (name, username, password_hash, role)
           VALUES (?, ?, ?, ?) RETURNING id, name, username, role, created_at""",
        (body.name, body.username, hashed, body.role)
    ) as cur:
        row = await cur.fetchone()
    await db.commit()
    return dict(row)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete a user account. Cannot delete your own account."""
    if int(current_user["sub"]) == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte.")

    async with db.execute("SELECT id, role FROM users WHERE id = ?", (user_id,)) as cur:
        target = await cur.fetchone()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    await db.commit()
    return {"ok": True}
