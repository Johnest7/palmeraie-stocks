"""
main.py
-------
FastAPI application entry point.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from routes import superadmin

from database import init_db
from routes import auth, products, shopping, exits, losses, reports, analytics, intelligence, dishes

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="La Palmeraie — Gestion des Stocks",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(shopping.router)
app.include_router(exits.router)
app.include_router(losses.router)
app.include_router(reports.router)
app.include_router(analytics.router)
app.include_router(intelligence.router)
app.include_router(superadmin.router)
app.include_router(dishes.router)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
async def root():
    return {"message": "La Palmeraie API is running. Go to /docs for the API documentation."}