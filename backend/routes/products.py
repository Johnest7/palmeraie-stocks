"""
routes/products.py
------------------
CRUD for the product catalog.
- GET /products       → list all products
- POST /products      → create a product (admin only)
- PUT /products/{id}  → update a product (admin only)
- DELETE /products/{id} → delete (admin only)
"""

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth import get_current_user, require_admin
from models import ProductCreate, ProductUpdate, ProductOut
from typing import List
import aiosqlite

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductOut])
async def list_products(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """List all products ordered by category then name."""
    async with db.execute(
        "SELECT * FROM products ORDER BY category, name"
    ) as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("", response_model=ProductOut)
async def create_product(
    body: ProductCreate,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)  # only admin can add products
):
    """Create a new product in the catalog."""
    async with db.execute(
        """INSERT INTO products (name, category, unit, alert_threshold, current_stock)
           VALUES (?, ?, ?, ?, ?) RETURNING *""",
        (body.name, body.category, body.unit, body.alert_threshold, body.current_stock)
    ) as cur:
        row = await cur.fetchone()
    await db.commit()
    return dict(row)


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    body: ProductUpdate,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """Update product name, category, unit or alert threshold."""
    # Build dynamic SET clause — only update provided fields
    fields = {k: v for k, v in body.dict().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [product_id]

    await db.execute(f"UPDATE products SET {set_clause} WHERE id = ?", values)
    await db.commit()

    async with db.execute("SELECT * FROM products WHERE id = ?", (product_id,)) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return dict(row)


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """Delete a product. Only possible if it has no movements."""
    # Safety check — don't delete products that have history
    async with db.execute(
        "SELECT COUNT(*) FROM shopping_items WHERE product_id = ?", (product_id,)
    ) as cur:
        count = (await cur.fetchone())[0]
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer un produit ayant des mouvements enregistrés"
        )

    await db.execute("DELETE FROM products WHERE id = ?", (product_id,))
    await db.commit()
    return {"ok": True}
