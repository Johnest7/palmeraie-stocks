"""
routes/losses.py
----------------
Loss log — broken, spoiled, or missing items.
Each loss requires a reason, which is important for accountability.
"""

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth import get_current_user
from models import LossCreate, LossOut
from typing import List
import aiosqlite

router = APIRouter(prefix="/losses", tags=["losses"])


@router.post("", response_model=LossOut)
async def record_loss(
    body: LossCreate,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Record a loss (broken, spoiled, missing item)."""
    manager_id = int(current_user["sub"])

    async with db.execute(
        "SELECT id FROM products WHERE id = ?", (body.product_id,)
    ) as cur:
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Produit introuvable")

    async with db.execute(
        """INSERT INTO loss_logs (manager_id, product_id, quantity, reason)
           VALUES (?, ?, ?, ?) RETURNING id""",
        (manager_id, body.product_id, body.quantity, body.reason)
    ) as cur:
        row = await cur.fetchone()
        loss_id = row["id"]

    # Decrease stock
    await db.execute(
        "UPDATE products SET current_stock = current_stock - ? WHERE id = ?",
        (body.quantity, body.product_id)
    )
    await db.commit()

    return await _get_loss(db, loss_id)


@router.get("", response_model=List[LossOut])
async def list_losses(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """List all loss records, most recent first."""
    async with db.execute(
        "SELECT id FROM loss_logs ORDER BY date DESC LIMIT 100"
    ) as cur:
        rows = await cur.fetchall()
    return [await _get_loss(db, r["id"]) for r in rows]


async def _get_loss(db, loss_id: int) -> dict:
    async with db.execute(
        """SELECT l.*, u.name as manager_name, p.name as product_name, p.unit
           FROM loss_logs l
           JOIN users u ON u.id = l.manager_id
           JOIN products p ON p.id = l.product_id
           WHERE l.id = ?""",
        (loss_id,)
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Perte introuvable")
    return dict(row)
