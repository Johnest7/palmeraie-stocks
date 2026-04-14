"""
routes/intelligence.py
----------------------
Business intelligence endpoints:
- Anomaly detection (suspicious exits vs historical average)
- Profitability scores per product
- Stock depletion predictions
- Day-of-week consumption heatmap
- AI business advisor (calls Claude API)
- Push notification subscription management
"""

from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import require_admin, get_current_user
from pydantic import BaseModel
from typing import Optional
import aiosqlite, json, httpx, os

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ─── ANOMALY DETECTION ───────────────────────────────────────────────────────

@router.get("/anomalies")
async def detect_anomalies(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """
    Flags exits that are unusually high compared to the product's historical average.
    An exit is flagged if it's more than 2x the average daily exit for that product.
    """
    # Get average daily exit per product

    # Manual approach: get all exits and compute stats per product
    async with db.execute("""
        SELECT e.id, e.product_id, e.quantity, e.date, e.manager_id,
               p.name as product_name, p.unit,
               u.name as manager_name
        FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        JOIN users u ON u.id = e.manager_id
        ORDER BY e.date DESC
    """) as cur:
        all_exits = [dict(r) for r in await cur.fetchall()]

    # Compute average per product
    from collections import defaultdict
    product_exits = defaultdict(list)
    for e in all_exits:
        product_exits[e['product_id']].append(e['quantity'])

    product_avg = {}
    for pid, quantities in product_exits.items():
        if len(quantities) >= 2:
            avg = sum(quantities) / len(quantities)
            product_avg[pid] = avg

    # Flag exits that are > 2.5x the average
    anomalies = []
    for e in all_exits:
        pid = e['product_id']
        if pid in product_avg:
            avg = product_avg[pid]
            if avg > 0 and e['quantity'] > avg * 2.5:
                anomalies.append({
                    **e,
                    "average_quantity": round(avg, 2),
                    "ratio": round(e['quantity'] / avg, 1),
                    "severity": "high" if e['quantity'] > avg * 4 else "medium"
                })

    return sorted(anomalies, key=lambda x: x['ratio'], reverse=True)


# ─── PROFITABILITY SCORES ─────────────────────────────────────────────────────

@router.get("/profitability")
async def get_profitability_scores(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """
    Ranks products by profitability score.
    Score = (revenue - purchase_cost_estimate - loss_value) / revenue * 100
    """
    async with db.execute("""
        SELECT
            p.id, p.name, p.category, p.unit, p.selling_price, p.current_stock,
            COALESCE(SUM(e.quantity), 0) as total_sold,
            COALESCE(SUM(e.quantity * p.selling_price), 0) as revenue,
            COALESCE(AVG(si.unit_price), 0) as avg_purchase_price,
            COALESCE(SUM(l.quantity), 0) as total_lost,
            COALESCE(SUM(l.quantity * p.selling_price), 0) as loss_value
        FROM products p
        LEFT JOIN stock_exits e ON e.product_id = p.id
        LEFT JOIN shopping_items si ON si.product_id = p.id
        LEFT JOIN loss_logs l ON l.product_id = p.id
        GROUP BY p.id
        ORDER BY revenue DESC
    """) as cur:
        rows = [dict(r) for r in await cur.fetchall()]

    results = []
    for r in rows:
        revenue = r['revenue']
        purchase_cost_est = r['total_sold'] * r['avg_purchase_price']
        gross_profit = revenue - purchase_cost_est - r['loss_value']
        margin_pct = (gross_profit / revenue * 100) if revenue > 0 else 0

        # Score 0-100: weighted by revenue volume + margin
        volume_score = min(revenue / 50000 * 50, 50) if revenue > 0 else 0
        margin_score = max(min(margin_pct / 100 * 50, 50), 0)
        score = round(volume_score + margin_score)

        results.append({
            **r,
            "gross_profit": round(gross_profit),
            "margin_pct": round(margin_pct, 1),
            "score": score,
            "grade": "A" if score >= 75 else "B" if score >= 50 else "C" if score >= 25 else "D"
        })

    return sorted(results, key=lambda x: x['score'], reverse=True)


# ─── STOCK PREDICTIONS ───────────────────────────────────────────────────────

@router.get("/predictions")
async def get_stock_predictions(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Predicts how many days until each product runs out,
    based on average daily consumption over the last 14 days.
    """
    async with db.execute("""
        SELECT p.id, p.name, p.unit, p.current_stock, p.alert_threshold,
               COALESCE(
                   (SELECT SUM(quantity) / 14.0
                    FROM stock_exits
                    WHERE product_id = p.id
                    AND date >= date('now', '-14 days')),
                   0
               ) as avg_daily_consumption
        FROM products p
        WHERE p.current_stock > 0
        ORDER BY p.name
    """) as cur:
        rows = [dict(r) for r in await cur.fetchall()]

    predictions = []
    for r in rows:
        avg = r['avg_daily_consumption']
        if avg > 0:
            days_left = r['current_stock'] / avg
            urgency = "critical" if days_left <= 2 else "warning" if days_left <= 5 else "ok"
        else:
            days_left = None
            urgency = "no_data"

        predictions.append({
            **r,
            "days_until_empty": round(days_left, 1) if days_left is not None else None,
            "urgency": urgency
        })

    return sorted(predictions, key=lambda x: (
        x['days_until_empty'] if x['days_until_empty'] is not None else 9999
    ))


# ─── DAY OF WEEK HEATMAP ─────────────────────────────────────────────────────

@router.get("/heatmap")
async def get_consumption_heatmap(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """
    Returns total consumption per day of week (0=Monday, 6=Sunday)
    and per product category — used to draw a heatmap.
    """
    days_fr = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

    # SQLite: strftime('%w') = 0 for Sunday, 1 for Monday, etc.
    async with db.execute("""
        SELECT
            CASE CAST(strftime('%w', e.date) AS INTEGER)
                WHEN 0 THEN 6
                ELSE CAST(strftime('%w', e.date) AS INTEGER) - 1
            END as day_of_week,
            p.category,
            SUM(e.quantity * p.selling_price) as value
        FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        GROUP BY day_of_week, p.category
        ORDER BY day_of_week
    """) as cur:
        rows = [dict(r) for r in await cur.fetchall()]

    # Also get total per day
    async with db.execute("""
        SELECT
            CASE CAST(strftime('%w', e.date) AS INTEGER)
                WHEN 0 THEN 6
                ELSE CAST(strftime('%w', e.date) AS INTEGER) - 1
            END as day_of_week,
            SUM(e.quantity * p.selling_price) as total_value,
            COUNT(DISTINCT date(e.date)) as num_days
        FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        GROUP BY day_of_week
    """) as cur:
        day_totals = {r["day_of_week"]: dict(r) for r in await cur.fetchall()}

    heatmap = []
    for i, day in enumerate(days_fr):
        total = day_totals.get(i, {})
        avg = (total.get('total_value', 0) / total.get('num_days', 1)) if total else 0
        heatmap.append({
            "day": day,
            "day_index": i,
            "total_value": round(total.get('total_value', 0)),
            "avg_daily_value": round(avg),
            "num_recorded_days": total.get('num_days', 0)
        })

    return {
        "heatmap": heatmap,
        "best_day": max(heatmap, key=lambda x: x['total_value'])['day'] if any(h['total_value'] > 0 for h in heatmap) else "Pas encore de données",
        "worst_day": min(heatmap, key=lambda x: x['total_value'])['day'] if any(h['total_value'] > 0 for h in heatmap) else "Pas encore de données",
        "by_category": rows
    }


# ─── AI BUSINESS ADVISOR ─────────────────────────────────────────────────────

class AIAdvisorRequest(BaseModel):
    context: Optional[str] = None  # optional extra context from admin

@router.post("/ai-advisor")
async def get_ai_advice(
    body: AIAdvisorRequest,
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """
    Sends real business data to Claude API and gets personalized advice.
    """
    # Gather all the data Claude needs to give real advice
    async with db.execute("SELECT COUNT(*) as n, SUM(current_stock * selling_price) as stock_value FROM products") as cur:
        prod_summary = dict(await cur.fetchone())

    async with db.execute("""
        SELECT p.name, p.category, p.current_stock, p.selling_price, p.alert_threshold,
               COALESCE(SUM(e.quantity), 0) as total_sold,
               COALESCE(SUM(e.quantity * p.selling_price), 0) as revenue,
               COALESCE(SUM(l.quantity * p.selling_price), 0) as loss_value
        FROM products p
        LEFT JOIN stock_exits e ON e.product_id = p.id
        LEFT JOIN loss_logs l ON l.product_id = p.id
        GROUP BY p.id
        ORDER BY revenue DESC
    """) as cur:
        products = [dict(r) for r in await cur.fetchall()]

    async with db.execute("SELECT COALESCE(SUM(total_cost),0) as total FROM shopping_sessions") as cur:
        total_spend = (await cur.fetchone())["total"]

    async with db.execute("""
        SELECT COUNT(*) as anomaly_count FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        WHERE e.quantity > (
            SELECT AVG(e2.quantity) * 2.5 FROM stock_exits e2
            WHERE e2.product_id = e.product_id
        )
    """) as cur:
        anomaly_count = (await cur.fetchone())["anomaly_count"]

    async with db.execute("""
        SELECT p.name, p.current_stock, p.unit FROM products p
        WHERE p.current_stock <= p.alert_threshold
        ORDER BY p.current_stock ASC LIMIT 5
    """) as cur:
        low_stock = [dict(r) for r in await cur.fetchall()]

    # Build the prompt with real data
    data_summary = f"""
Tu es un conseiller business expert en restauration/bar pour "La Palmeraie".
Voici les données réelles actuelles du restaurant :

FINANCES:
- Dépenses d'achat totales: {total_spend:,.0f} FCFA
- Valeur du stock actuel: {prod_summary.get('stock_value', 0) or 0:,.0f} FCFA
- Produits catalogués: {prod_summary['n']}

TOP PRODUITS PAR REVENU:
{json.dumps([{k: v for k, v in p.items() if k in ['name','category','total_sold','revenue','loss_value']} for p in products[:5]], ensure_ascii=False, indent=2)}

STOCKS FAIBLES:
{json.dumps(low_stock, ensure_ascii=False, indent=2)}

ANOMALIES DÉTECTÉES: {anomaly_count} sorties suspectes (possibles vols ou erreurs)

{f"CONTEXTE SUPPLÉMENTAIRE DE L'ADMIN: {body.context}" if body.context else ""}

Donne des conseils business CONCRETS et ACTIONNABLES en français. Structure ta réponse ainsi:
1. 🔍 ANALYSE RAPIDE (2-3 phrases sur l'état général)
2. ⚠️ ALERTES PRIORITAIRES (ce qui nécessite une action immédiate)
3. 📈 OPPORTUNITÉS (produits à mettre en avant, tendances positives)
4. 💡 RECOMMANDATIONS (3-5 actions concrètes pour améliorer la rentabilité)
5. 🎯 OBJECTIF DU MOIS (une priorité claire)

Sois direct, précis, utilise les vrais chiffres. Parle comme un consultant qui connaît bien les bars africains.
"""

    # Call Claude API
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"Content-Type": "application/json"},
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1000,
                    "messages": [{"role": "user", "content": data_summary}]
                }
            )
            result = response.json()
            advice = result["content"][0]["text"]
            return {"advice": advice, "status": "ok"}
    except Exception as e:
        return {
            "advice": "⚠️ L'agent IA est temporairement indisponible. Vérifiez votre connexion internet.",
            "status": "error",
            "error": str(e)
        }


# ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

@router.post("/push-subscribe")
async def subscribe_push(
    body: PushSubscription,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Save a push notification subscription for a user."""
    # Create table if not exists
    await db.execute("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            endpoint TEXT NOT NULL UNIQUE,
            keys TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    await db.execute("""
        INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, keys)
        VALUES (?, ?, ?)
    """, (int(current_user["sub"]), body.endpoint, json.dumps(body.keys)))
    await db.commit()
    return {"ok": True}
