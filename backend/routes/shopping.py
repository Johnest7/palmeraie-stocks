"""
routes/shopping.py
------------------
Shopping session endpoints.
When the manager records a shopping trip:
1. A session row is created (with total cost, optional photo, notes)
2. Each item bought is saved in shopping_items
3. Each product's current_stock is increased
All 3 happen in one transaction — if any step fails, nothing is saved.
"""

import os, shutil, uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from database import get_db
from auth import get_current_user
from models import ShoppingSessionOut, ShoppingItemOut
from typing import List, Optional
import aiosqlite, json

router = APIRouter(prefix="/shopping", tags=["shopping"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=ShoppingSessionOut)
async def create_shopping_session(
    items: str = Form(...),          # JSON string of items list
    total_cost: float = Form(...),
    notes: Optional[str] = Form(None),
    receipt_photo: Optional[UploadFile] = File(None),
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Record a shopping session.
    Items come as a JSON string in a form field (because we also accept a file upload).
    """
    # Parse items JSON
    try:
        items_data = json.loads(items)
    except Exception:
        raise HTTPException(status_code=400, detail="Format des articles invalide")

    # Save receipt photo if provided
    photo_filename = None
    if receipt_photo and receipt_photo.filename:
        ext = os.path.splitext(receipt_photo.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(status_code=400, detail="Format photo non supporté")
        photo_filename = f"{uuid.uuid4()}{ext}"
        with open(os.path.join(UPLOAD_DIR, photo_filename), "wb") as f:
            shutil.copyfileobj(receipt_photo.file, f)

    manager_id = int(current_user["sub"])

    # Everything in one transaction
    async with db.execute(
        """INSERT INTO shopping_sessions (manager_id, total_cost, receipt_photo, notes)
           VALUES (?, ?, ?, ?) RETURNING id, date""",
        (manager_id, total_cost, photo_filename, notes)
    ) as cur:
        session_row = await cur.fetchone()

    session_id = session_row["id"]
    session_date = session_row["date"]

    # Insert each item and update stock
    for item in items_data:
        product_id = item["product_id"]
        quantity = float(item["quantity"])
        unit_price = float(item.get("unit_price", 0))

        # Verify product exists
        async with db.execute("SELECT id FROM products WHERE id = ?", (product_id,)) as cur:
            if not await cur.fetchone():
                await db.rollback()
                raise HTTPException(status_code=404, detail=f"Produit {product_id} introuvable")

        await db.execute(
            "INSERT INTO shopping_items (session_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
            (session_id, product_id, quantity, unit_price)
        )
        # Increase stock
        await db.execute(
            "UPDATE products SET current_stock = current_stock + ? WHERE id = ?",
            (quantity, product_id)
        )

    await db.commit()

    # Return the full session with items
    return await _get_session(db, session_id)


@router.get("", response_model=List[ShoppingSessionOut])
async def list_sessions(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """List all shopping sessions, most recent first."""
    async with db.execute(
        "SELECT id FROM shopping_sessions ORDER BY date DESC"
    ) as cur:
        rows = await cur.fetchall()

    return [await _get_session(db, r["id"]) for r in rows]


@router.get("/{session_id}", response_model=ShoppingSessionOut)
async def get_session(
    session_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    return await _get_session(db, session_id)


async def _get_session(db, session_id: int) -> dict:
    """Helper to fetch a full session with manager name and items."""
    async with db.execute(
        """SELECT s.*, u.name as manager_name
           FROM shopping_sessions s
           JOIN users u ON u.id = s.manager_id
           WHERE s.id = ?""",
        (session_id,)
    ) as cur:
        session = await cur.fetchone()

    if not session:
        raise HTTPException(status_code=404, detail="Session introuvable")

    async with db.execute(
        """SELECT si.*, p.name as product_name, p.unit
           FROM shopping_items si
           JOIN products p ON p.id = si.product_id
           WHERE si.session_id = ?""",
        (session_id,)
    ) as cur:
        items = await cur.fetchall()

    return {
        **dict(session),
        "items": [dict(i) for i in items]
    }
