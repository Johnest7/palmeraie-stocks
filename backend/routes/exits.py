"""
routes/exits.py — with selling_price_at_exit
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
    manager_id = int(current_user["sub"])

    async with db.execute(
        "INSERT INTO exit_sessions (manager_id) VALUES (?) RETURNING id",
        (manager_id,)
    ) as cur:
        exit_session_id = (await cur.fetchone())["id"]

    created_ids = []

    for item in body.items:
        async with db.execute(
            "SELECT current_stock, selling_price FROM products WHERE id = ?",
            (item.product_id,)
        ) as cur:
            product = await cur.fetchone()

        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {item.product_id} introuvable")

        # Save selling price AT THIS MOMENT
        selling_price_at_exit = product["selling_price"]

        async with db.execute(
            """INSERT INTO stock_exits
               (manager_id, product_id, quantity, notes, exit_session_id, selling_price_at_exit)
               VALUES (?, ?, ?, ?, ?, ?) RETURNING id""",
            (manager_id, item.product_id, item.quantity, item.notes,
             exit_session_id, selling_price_at_exit)
        ) as cur:
            row = await cur.fetchone()
            created_ids.append(row["id"])

        await db.execute(
            "UPDATE products SET current_stock = current_stock - ? WHERE id = ?",
            (item.quantity, item.product_id)
        )

    await db.commit()

    results = []
    for exit_id in created_ids:
        results.append(await _get_exit(db, exit_id))
    return results


@router.get("/sessions")
async def list_exit_sessions(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    async with db.execute(
        """SELECT es.id, es.date, u.name as manager_name
           FROM exit_sessions es
           JOIN users u ON u.id = es.manager_id
           ORDER BY es.date DESC"""
    ) as cur:
        sessions = [dict(r) for r in await cur.fetchall()]

    result = []
    for session in sessions:
        async with db.execute(
            """SELECT e.quantity, e.notes, p.name as product_name, p.unit,
                      e.selling_price_at_exit as selling_price,
                      (e.quantity * e.selling_price_at_exit) as subtotal
               FROM stock_exits e
               JOIN products p ON p.id = e.product_id
               WHERE e.exit_session_id = ?""",
            (session["id"],)
        ) as cur:
            items = [dict(r) for r in await cur.fetchall()]

        total_value = sum(i["subtotal"] for i in items)
        result.append({
            **session,
            "items": items,
            "total_value": round(total_value),
            "item_count": len(items)
        })

    return result


@router.get("", response_model=List[ExitOut])
async def list_exits(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
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