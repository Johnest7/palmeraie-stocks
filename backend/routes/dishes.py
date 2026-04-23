"""
routes/dishes.py
----------------
Gestion des plats et de leurs recettes.
- CRUD plats (admin only)
- Gestion des ingrédients par plat (admin only)
- Enregistrement des ventes de plats (manager)
- Liste des ventes par session
"""

from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth import get_current_user, require_admin
from pydantic import BaseModel
from typing import List, Optional
import aiosqlite

router = APIRouter(prefix="/dishes", tags=["dishes"])


# ─── MODELS ──────────────────────────────────────────────────────────────────

class IngredientIn(BaseModel):
    product_id: int
    quantity: float
    unit: str

class DishCreate(BaseModel):
    name: str
    selling_price: float
    description: Optional[str] = None
    ingredients: List[IngredientIn]

class DishUpdate(BaseModel):
    name: Optional[str] = None
    selling_price: Optional[float] = None
    description: Optional[str] = None
    active: Optional[int] = None

class DishSaleIn(BaseModel):
    dish_id: int
    quantity_sold: int

class EndOfDayDishSales(BaseModel):
    sales: List[DishSaleIn]
    exit_session_id: Optional[int] = None


# ─── GET ALL DISHES ───────────────────────────────────────────────────────────

@router.get("")
async def list_dishes(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """List all active dishes with their ingredients."""
    async with db.execute(
        "SELECT * FROM dishes WHERE active = 1 ORDER BY name"
    ) as cur:
        dishes = [dict(r) for r in await cur.fetchall()]

    for dish in dishes:
        async with db.execute(
            """SELECT di.quantity, di.unit, p.id as product_id, p.name as product_name
               FROM dish_ingredients di
               JOIN products p ON p.id = di.product_id
               WHERE di.dish_id = ?""",
            (dish["id"],)
        ) as cur:
            dish["ingredients"] = [dict(r) for r in await cur.fetchall()]

        # Calculate cost of ingredients
        cost = sum(
            i["quantity"] * await _get_avg_purchase_price(db, i["product_id"])
            for i in dish["ingredients"]
        )
        dish["estimated_cost"] = round(cost, 0)
        dish["estimated_margin"] = round(dish["selling_price"] - cost, 0)

    return dishes


async def _get_avg_purchase_price(db, product_id: int) -> float:
    async with db.execute(
        "SELECT COALESCE(AVG(unit_price), 0) FROM shopping_items WHERE product_id = ? AND unit_price > 0",
        (product_id,)
    ) as cur:
        return (await cur.fetchone())[0] or 0


# ─── CREATE DISH ──────────────────────────────────────────────────────────────

@router.post("")
async def create_dish(
    body: DishCreate,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """Create a new dish with its recipe."""
    async with db.execute(
        "INSERT INTO dishes (name, selling_price, description) VALUES (?, ?, ?) RETURNING id",
        (body.name, body.selling_price, body.description)
    ) as cur:
        dish_id = (await cur.fetchone())["id"]

    for ing in body.ingredients:
        await db.execute(
            "INSERT INTO dish_ingredients (dish_id, product_id, quantity, unit) VALUES (?, ?, ?, ?)",
            (dish_id, ing.product_id, ing.quantity, ing.unit)
        )

    await db.commit()
    return await _get_dish(db, dish_id)


# ─── UPDATE DISH ──────────────────────────────────────────────────────────────

@router.put("/{dish_id}")
async def update_dish(
    dish_id: int,
    body: DishUpdate,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    fields = {k: v for k, v in body.dict().items() if v is not None}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [dish_id]
    await db.execute(f"UPDATE dishes SET {set_clause} WHERE id = ?", values)
    await db.commit()
    return await _get_dish(db, dish_id)


# ─── UPDATE INGREDIENTS ───────────────────────────────────────────────────────

@router.put("/{dish_id}/ingredients")
async def update_ingredients(
    dish_id: int,
    ingredients: List[IngredientIn],
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """Replace all ingredients of a dish."""
    await db.execute("DELETE FROM dish_ingredients WHERE dish_id = ?", (dish_id,))
    for ing in ingredients:
        await db.execute(
            "INSERT INTO dish_ingredients (dish_id, product_id, quantity, unit) VALUES (?, ?, ?, ?)",
            (dish_id, ing.product_id, ing.quantity, ing.unit)
        )
    await db.commit()
    return await _get_dish(db, dish_id)


# ─── RECORD DISH SALES ────────────────────────────────────────────────────────

@router.post("/sales")
async def record_dish_sales(
    body: EndOfDayDishSales,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Record dish sales for end of day.
    For each dish sold:
    1. Save the sale record
    2. Deduct all ingredients from stock automatically
    """
    manager_id = int(current_user["sub"])
    results = []

    for sale in body.sales:
        if sale.quantity_sold <= 0:
            continue

        # Get dish info
        async with db.execute(
            "SELECT * FROM dishes WHERE id = ?", (sale.dish_id,)
        ) as cur:
            dish = await cur.fetchone()

        if not dish:
            raise HTTPException(status_code=404, detail=f"Plat {sale.dish_id} introuvable")

        # Get recipe
        async with db.execute(
            "SELECT * FROM dish_ingredients WHERE dish_id = ?", (sale.dish_id,)
        ) as cur:
            ingredients = await cur.fetchall()

        # Save sale
        async with db.execute(
            """INSERT INTO dish_sales
               (manager_id, dish_id, quantity_sold, selling_price_at_sale, exit_session_id)
               VALUES (?, ?, ?, ?, ?) RETURNING id""",
            (manager_id, sale.dish_id, sale.quantity_sold,
             dish["selling_price"], body.exit_session_id)
        ) as cur:
            sale_id = (await cur.fetchone())["id"]

        # Deduct ingredients from stock automatically
        for ing in ingredients:
            total_qty = ing["quantity"] * sale.quantity_sold
            await db.execute(
                "UPDATE products SET current_stock = current_stock - ? WHERE id = ?",
                (total_qty, ing["product_id"])
            )

        results.append({
            "sale_id": sale_id,
            "dish_name": dish["name"],
            "quantity_sold": sale.quantity_sold,
            "revenue": round(dish["selling_price"] * sale.quantity_sold),
            "ingredients_deducted": len(ingredients)
        })

    await db.commit()
    return {"sales": results, "total_dishes_sold": len(results)}


# ─── GET DISH SALES HISTORY ───────────────────────────────────────────────────

@router.get("/sales")
async def list_dish_sales(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """List all dish sales grouped by date."""
    async with db.execute(
        """SELECT ds.id, ds.date, ds.quantity_sold, ds.selling_price_at_sale,
                  d.name as dish_name,
                  u.name as manager_name,
                  (ds.quantity_sold * ds.selling_price_at_sale) as revenue
           FROM dish_sales ds
           JOIN dishes d ON d.id = ds.dish_id
           JOIN users u ON u.id = ds.manager_id
           ORDER BY ds.date DESC
           LIMIT 100"""
    ) as cur:
        rows = [dict(r) for r in await cur.fetchall()]
    return rows


# ─── HELPER ──────────────────────────────────────────────────────────────────

async def _get_dish(db, dish_id: int) -> dict:
    async with db.execute("SELECT * FROM dishes WHERE id = ?", (dish_id,)) as cur:
        dish = await cur.fetchone()
    if not dish:
        raise HTTPException(status_code=404, detail="Plat introuvable")

    async with db.execute(
        """SELECT di.quantity, di.unit, p.id as product_id, p.name as product_name
           FROM dish_ingredients di
           JOIN products p ON p.id = di.product_id
           WHERE di.dish_id = ?""",
        (dish_id,)
    ) as cur:
        ingredients = [dict(r) for r in await cur.fetchall()]

    return {**dict(dish), "ingredients": ingredients}