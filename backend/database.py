"""
database.py
"""

import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "palmeraie.db")

CREATE_TABLES = """

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    username   TEXT    NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'manager',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    category        TEXT    NOT NULL DEFAULT 'Autre',
    unit            TEXT    NOT NULL DEFAULT 'unité',
    alert_threshold INTEGER NOT NULL DEFAULT 5,
    current_stock   REAL    NOT NULL DEFAULT 0,
    selling_price   REAL    NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT UNIQUE);

CREATE TABLE IF NOT EXISTS shopping_sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id     INTEGER NOT NULL REFERENCES users(id),
    total_cost     REAL    NOT NULL DEFAULT 0,
    receipt_photo  TEXT,
    notes          TEXT,
    date           TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shopping_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES shopping_sessions(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    REAL    NOT NULL,
    unit_price  REAL    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exit_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id INTEGER NOT NULL REFERENCES users(id),
    notes      TEXT,
    date       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_exits (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id           INTEGER NOT NULL REFERENCES users(id),
    product_id           INTEGER NOT NULL REFERENCES products(id),
    exit_session_id      INTEGER REFERENCES exit_sessions(id),
    quantity             REAL    NOT NULL,
    notes                TEXT,
    selling_price_at_exit REAL   NOT NULL DEFAULT 0,
    date                 TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loss_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id  INTEGER NOT NULL REFERENCES users(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    REAL    NOT NULL,
    reason      TEXT    NOT NULL,
    date        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    action     TEXT NOT NULL,
    details    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS global_settings (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    key   TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
);
"""

async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(CREATE_TABLES)
        await db.commit()

        for migration in [
            "ALTER TABLE products ADD COLUMN selling_price REAL NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
            "ALTER TABLE stock_exits ADD COLUMN exit_session_id INTEGER REFERENCES exit_sessions(id)",
            "ALTER TABLE stock_exits ADD COLUMN selling_price_at_exit REAL NOT NULL DEFAULT 0",
        ]:
            try:
                await db.execute(migration)
                await db.commit()
            except Exception:
                pass

        async with db.execute("SELECT COUNT(*) FROM users") as cur:
            count = (await cur.fetchone())[0]

        if count == 0:
            from auth import get_password_hash
            hashed = get_password_hash("admin123")
            await db.execute(
                "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
                ("Administrateur", "admin", hashed, "admin")
            )
            await db.commit()
            print("✅ Default admin created: username=admin, password=admin123")

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