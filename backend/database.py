"""
database.py
-----------
This file handles everything related to the database:
- Connecting to SQLite
- Creating all tables on startup
- Providing a reusable DB connection for routes

WHY SQLITE?
SQLite stores everything in a single file (palmeraie.db).
No server to install, easy to backup (just copy the file),
and perfectly sufficient for a single-restaurant app.
"""

import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "palmeraie.db")

# SQL to create all tables if they don't exist yet.
# We use IF NOT EXISTS so this is safe to run on every startup.
CREATE_TABLES = """

-- USERS: who can log in and what role they have
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    username   TEXT    NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'manager',  -- 'admin' or 'manager'
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- PRODUCTS: the catalog of all items tracked in stock
CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    category        TEXT    NOT NULL DEFAULT 'Autre',
    unit            TEXT    NOT NULL DEFAULT 'unité',  -- bouteille, kg, litre, caisse...
    alert_threshold INTEGER NOT NULL DEFAULT 5,        -- warn when stock falls below this
    current_stock   REAL    NOT NULL DEFAULT 0,
    selling_price   REAL    NOT NULL DEFAULT 0,        -- prix de vente unitaire
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Migration: add selling_price if it doesn't exist yet (for existing databases)
CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT UNIQUE);

-- SHOPPING_SESSIONS: one row per shopping trip
CREATE TABLE IF NOT EXISTS shopping_sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id     INTEGER NOT NULL REFERENCES users(id),
    total_cost     REAL    NOT NULL DEFAULT 0,
    receipt_photo  TEXT,                               -- filename of uploaded photo
    notes          TEXT,
    date           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- SHOPPING_ITEMS: each product bought in a session
CREATE TABLE IF NOT EXISTS shopping_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES shopping_sessions(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    REAL    NOT NULL,
    unit_price  REAL    NOT NULL DEFAULT 0
);

-- STOCK_EXITS: end-of-day consumption log, one row per product per day
CREATE TABLE IF NOT EXISTS stock_exits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id  INTEGER NOT NULL REFERENCES users(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    REAL    NOT NULL,
    notes       TEXT,
    date        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- LOSS_LOGS: broken, spoiled or missing items with a reason
CREATE TABLE IF NOT EXISTS loss_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id  INTEGER NOT NULL REFERENCES users(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    REAL    NOT NULL,
    reason      TEXT    NOT NULL,
    date        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ACTIVITY LOGS: tracks all user actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    action     TEXT NOT NULL,
    details    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- GLOBAL SETTINGS: app-wide settings (maintenance mode, etc.)
CREATE TABLE IF NOT EXISTS global_settings (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    key   TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
);
"""

async def get_db():
    """
    Returns an async SQLite connection.
    Used in every route as a dependency.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row  # rows behave like dicts
        yield db

async def init_db():
    """
    Creates all tables on startup.
    Also inserts a default admin user if none exists.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(CREATE_TABLES)
        await db.commit()

        # Migration: add selling_price column if it doesn't exist (for existing DBs)
        try:
            await db.execute("ALTER TABLE products ADD COLUMN selling_price REAL NOT NULL DEFAULT 0")
            await db.commit()
            print("Migration: selling_price column added")
        except Exception:
            pass  # Column already exists

        # Migration: add active column to users
        try:
            await db.execute("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1")
            await db.commit()
        except Exception:
            pass  # Column already exists

        # Check if any user exists
        async with db.execute("SELECT COUNT(*) FROM users") as cur:
            count = (await cur.fetchone())[0]

        if count == 0:
            # Create default admin: username=admin, password=admin123
            from auth import get_password_hash
            hashed = get_password_hash("admin123")
            await db.execute(
                "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
                ("Administrateur", "admin", hashed, "admin")
            )
            await db.commit()
            print("✅ Default admin created: username=admin, password=admin123")

        # Create superadmin (Johnest7) if not exists
        async with db.execute("SELECT COUNT(*) FROM users WHERE role = 'superadmin'") as cur:
            sa_count = (await cur.fetchone())[0]

        if sa_count == 0:
            from auth import get_password_hash
            sa_hash = get_password_hash("Johnest7@2026!")
            await db.execute(
                "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
                ("Johnest7", "johnest7", sa_hash, "superadmin")
            )
            await db.commit()
            print("✅ Superadmin Johnest7 created")