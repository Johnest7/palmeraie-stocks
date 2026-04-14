"""
routes/exits.py
---------------
End-of-day stock exit recording.
The manager logs what was consumed during the day — per item.
Each exit decreases the product's current_stock.
"""

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth import get_current_user
from models import EndOfDayCreate, ExitOut
from typing import List
import aiosqlite

router = APIRouter(prefix="/exits", tags=["exits"])


@router.post("", response_model=List[ExitOut])
async def record_end_of_day(
    body: EndOfDayCreate,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Record end-of-day consumption for multiple products at once.
    Decreases each product's stock and returns all created exit records.
    """
    manager_id = int(current_user["sub"])
    created_ids = []

    for item in body.items:
        # Check product exists and has enough stock
        async with db.execute(
            "SELECT current_stock FROM products WHERE id = ?", (item.product_id,)
        ) as cur:
            product = await cur.fetchone()

        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {item.product_id} introuvable")

        # We allow going below 0 (manager logs what was used even if stock
        # wasn't updated correctly) — it will show as a discrepancy
        async with db.execute(
            """INSERT INTO stock_exits (manager_id, product_id, quantity, notes)
               VALUES (?, ?, ?, ?) RETURNING id""",
            (manager_id, item.product_id, item.quantity, item.notes)
        ) as cur:
            row = await cur.fetchone()
            created_ids.append(row["id"])

        # Decrease stock
        await db.execute(
            "UPDATE products SET current_stock = current_stock - ? WHERE id = ?",
            (item.quantity, item.product_id)
        )

    await db.commit()

    # Return all created exit records
    results = []
    for exit_id in created_ids:
        results.append(await _get_exit(db, exit_id))
    return results


@router.get("", response_model=List[ExitOut])
async def list_exits(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """List all exit records, most recent first."""
    async with db.execute(
        "SELECT id FROM stock_exits ORDER BY date DESC LIMIT 100"
    ) as cur:
        rows = await cur.fetchall()
    return [await _get_exit(db, r["id"]) for r in rows]


async def _get_exit(db, exit_id: int) -> dict:
    async with db.execute(
        """SELECT e.*, u.name as manager_name, p.name as product_name, p.unit
           FROM stock_exits e
           JOIN users u ON u.id = e.manager_id
           JOIN products p ON p.id = e.product_id
           WHERE e.id = ?""",
        (exit_id,)
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Sortie introuvable")
    return dict(row)
