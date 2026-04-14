"""
models.py
---------
Pydantic models define the shape of data coming IN (requests)
and going OUT (responses) of the API.

WHY PYDANTIC?
FastAPI uses these to automatically validate request bodies.
If a required field is missing or the wrong type, FastAPI returns
a clear error before your code even runs. No manual validation needed.
"""

from pydantic import BaseModel
from typing import Optional, List


# ─── AUTH ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user_id: int
    name: str
    role: str


# ─── USERS ───────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str = "manager"  # default role is manager

class UserOut(BaseModel):
    id: int
    name: str
    username: str
    role: str
    created_at: str


# ─── PRODUCTS ────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    category: str = "Autre"
    unit: str = "unité"
    alert_threshold: int = 5
    current_stock: float = 0
    selling_price: float = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    alert_threshold: Optional[int] = None
    selling_price: Optional[float] = None

class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    unit: str
    alert_threshold: int
    current_stock: float
    selling_price: float
    created_at: str


# ─── SHOPPING ────────────────────────────────────────────────────────────────

class ShoppingItemIn(BaseModel):
    product_id: int
    quantity: float
    unit_price: float = 0

class ShoppingSessionCreate(BaseModel):
    total_cost: float
    notes: Optional[str] = None
    items: List[ShoppingItemIn]  # all items in the session

class ShoppingItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: float
    unit_price: float
    unit: str

class ShoppingSessionOut(BaseModel):
    id: int
    manager_id: int
    manager_name: str
    total_cost: float
    receipt_photo: Optional[str]
    notes: Optional[str]
    date: str
    items: List[ShoppingItemOut]


# ─── STOCK EXITS ─────────────────────────────────────────────────────────────

class ExitItemIn(BaseModel):
    product_id: int
    quantity: float
    notes: Optional[str] = None

class EndOfDayCreate(BaseModel):
    items: List[ExitItemIn]  # multiple products at once

class ExitOut(BaseModel):
    id: int
    manager_id: int
    manager_name: str
    product_id: int
    product_name: str
    quantity: float
    unit: str
    notes: Optional[str]
    date: str


# ─── LOSSES ──────────────────────────────────────────────────────────────────

class LossCreate(BaseModel):
    product_id: int
    quantity: float
    reason: str  # required — manager must explain the loss

class LossOut(BaseModel):
    id: int
    manager_id: int
    manager_name: str
    product_id: int
    product_name: str
    quantity: float
    unit: str
    reason: str
    date: str


# ─── DASHBOARD / REPORTS ─────────────────────────────────────────────────────

class StockAlert(BaseModel):
    product_id: int
    product_name: str
    current_stock: float
    alert_threshold: int
    unit: str
    status: str  # 'low' or 'out'

class DashboardStats(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    shopping_sessions_this_month: int
    alerts: List[StockAlert]
