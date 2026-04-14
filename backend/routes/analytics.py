"""
routes/analytics.py
-------------------
Financial analytics for the admin dashboard.

Calculations:
- Purchase cost    = sum of shopping session total_costs
- Theoretical gain = sum of (exit quantity × product selling_price)
- Loss value       = sum of (loss quantity × product selling_price)
- Real gain        = theoretical gain - loss value
- Margin           = real gain - purchase cost
"""

from fastapi import APIRouter, Depends
from database import get_db
from auth import require_admin
import aiosqlite

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def _get_period_data(db, period: str):
    """
    Returns financial data for a given period.
    period: 'day' | 'week' | 'month'
    """
    if period == 'day':
        interval = "date('now')"
        trunc = "%Y-%m-%d"
        group_format = "date(date)"
    elif period == 'week':
        interval = "date('now', '-7 days')"
        trunc = "%Y-%m-%d"
        group_format = "date(date)"
    else:  # month
        interval = "date('now', '-30 days')"
        trunc = "%Y-%m-%d"
        group_format = "date(date)"

    # Purchase cost per day
    async with db.execute(f"""
        SELECT date(date) as day, SUM(total_cost) as cost
        FROM shopping_sessions
        WHERE date(date) >= {interval}
        GROUP BY date(date)
        ORDER BY day
    """) as cur:
        costs = {r["day"]: r["cost"] for r in await cur.fetchall()}

    # Theoretical gain per day (exits × selling_price)
    async with db.execute(f"""
        SELECT date(e.date) as day, SUM(e.quantity * p.selling_price) as gain
        FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        WHERE date(e.date) >= {interval}
        GROUP BY date(e.date)
        ORDER BY day
    """) as cur:
        gains = {r["day"]: r["gain"] for r in await cur.fetchall()}

    # Loss value per day (losses × selling_price)
    async with db.execute(f"""
        SELECT date(l.date) as day, SUM(l.quantity * p.selling_price) as loss_val
        FROM loss_logs l
        JOIN products p ON p.id = l.product_id
        WHERE date(l.date) >= {interval}
        GROUP BY date(l.date)
        ORDER BY day
    """) as cur:
        losses = {r["day"]: r["loss_val"] for r in await cur.fetchall()}

    # Merge all days
    all_days = sorted(set(list(costs.keys()) + list(gains.keys()) + list(losses.keys())))

    result = []
    for day in all_days:
        cost = costs.get(day, 0) or 0
        gain_theo = gains.get(day, 0) or 0
        loss_val = losses.get(day, 0) or 0
        real_gain = gain_theo - loss_val
        margin = real_gain - cost
        result.append({
            "date": day,
            "purchase_cost": round(cost, 0),
            "theoretical_gain": round(gain_theo, 0),
            "loss_value": round(loss_val, 0),
            "real_gain": round(real_gain, 0),
            "margin": round(margin, 0),
        })

    return result


async def _get_summary(db):
    """Overall totals — all time."""

    async with db.execute("SELECT COALESCE(SUM(total_cost), 0) FROM shopping_sessions") as cur:
        total_cost = (await cur.fetchone())[0]

    async with db.execute("""
        SELECT COALESCE(SUM(e.quantity * p.selling_price), 0)
        FROM stock_exits e JOIN products p ON p.id = e.product_id
    """) as cur:
        total_theo = (await cur.fetchone())[0]

    async with db.execute("""
        SELECT COALESCE(SUM(l.quantity * p.selling_price), 0)
        FROM loss_logs l JOIN products p ON p.id = l.product_id
    """) as cur:
        total_losses = (await cur.fetchone())[0]

    real_gain = total_theo - total_losses
    margin = real_gain - total_cost

    return {
        "total_purchase_cost": round(total_cost, 0),
        "total_theoretical_gain": round(total_theo, 0),
        "total_loss_value": round(total_losses, 0),
        "total_real_gain": round(real_gain, 0),
        "total_margin": round(margin, 0),
    }


async def _get_top_products(db):
    """Top 5 most profitable products (by revenue from exits)."""
    async with db.execute("""
        SELECT p.name, p.unit, p.selling_price,
               SUM(e.quantity) as total_sold,
               SUM(e.quantity * p.selling_price) as revenue
        FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 5
    """) as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def _get_loss_by_product(db):
    """Top products with most losses (by value)."""
    async with db.execute("""
        SELECT p.name, p.unit,
               SUM(l.quantity) as total_lost,
               SUM(l.quantity * p.selling_price) as loss_value
        FROM loss_logs l
        JOIN products p ON p.id = l.product_id
        GROUP BY p.id
        ORDER BY loss_value DESC
        LIMIT 5
    """) as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def _get_category_breakdown(db):
    """Revenue breakdown by product category."""
    async with db.execute("""
        SELECT p.category,
               SUM(e.quantity * p.selling_price) as revenue,
               SUM(e.quantity * (p.selling_price - COALESCE(
                   (SELECT AVG(si.unit_price) FROM shopping_items si WHERE si.product_id = p.id), 0
               ))) as profit
        FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        GROUP BY p.category
        ORDER BY revenue DESC
    """) as cur:
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/full")
async def get_full_analytics(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """Returns everything needed for the analytics page."""
    daily   = await _get_period_data(db, 'day')
    weekly  = await _get_period_data(db, 'week')
    monthly = await _get_period_data(db, 'month')
    summary = await _get_summary(db)
    top_products  = await _get_top_products(db)
    loss_products = await _get_loss_by_product(db)
    categories    = await _get_category_breakdown(db)

    return {
        "summary": summary,
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly,
        "top_products": top_products,
        "loss_by_product": loss_products,
        "category_breakdown": categories,
    }


# ─── MONTH COMPARISON ────────────────────────────────────────────────────────

@router.get("/monthly-comparison")
async def get_monthly_comparison(
    db: aiosqlite.Connection = Depends(get_db),
    _=Depends(require_admin)
):
    """
    Returns financial data grouped by month for the last 6 months.
    Used to draw the month-by-month comparison chart.
    """
    async with db.execute("""
        SELECT
            strftime('%Y-%m', date) as month,
            SUM(total_cost) as purchase_cost
        FROM shopping_sessions
        WHERE date >= date('now', '-6 months')
        GROUP BY month ORDER BY month
    """) as cur:
        costs = {r["month"]: r["purchase_cost"] for r in await cur.fetchall()}

    async with db.execute("""
        SELECT
            strftime('%Y-%m', e.date) as month,
            SUM(e.quantity * p.selling_price) as theoretical_gain
        FROM stock_exits e
        JOIN products p ON p.id = e.product_id
        WHERE e.date >= date('now', '-6 months')
        GROUP BY month ORDER BY month
    """) as cur:
        gains = {r["month"]: r["theoretical_gain"] for r in await cur.fetchall()}

    async with db.execute("""
        SELECT
            strftime('%Y-%m', l.date) as month,
            SUM(l.quantity * p.selling_price) as loss_value
        FROM loss_logs l
        JOIN products p ON p.id = l.product_id
        WHERE l.date >= date('now', '-6 months')
        GROUP BY month ORDER BY month
    """) as cur:
        losses = {r["month"]: r["loss_value"] for r in await cur.fetchall()}

    # Build last 6 months list
    from datetime import datetime, timedelta
    months = []
    for i in range(5, -1, -1):
        d = datetime.now().replace(day=1)
        # go back i months
        month = (d.month - i - 1) % 12 + 1
        year  = d.year - ((d.month - i - 1) // 12 + (1 if (d.month - i - 1) < 0 else 0))
        key   = f"{year}-{month:02d}"
        months.append(key)

    result = []
    months_fr = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
    for key in months:
        y, m = key.split('-')
        cost      = costs.get(key, 0) or 0
        gain_theo = gains.get(key, 0) or 0
        loss_val  = losses.get(key, 0) or 0
        real_gain = gain_theo - loss_val
        margin    = real_gain - cost
        result.append({
            "month": key,
            "label": f"{months_fr[int(m)-1]} {y}",
            "purchase_cost":      round(cost),
            "theoretical_gain":   round(gain_theo),
            "loss_value":         round(loss_val),
            "real_gain":          round(real_gain),
            "margin":             round(margin),
        })

    # Compute month-over-month changes for the last 2 months
    comparison = None
    if len(result) >= 2:
        prev = result[-2]
        curr = result[-1]
        def pct_change(a, b):
            return round((b - a) / a * 100, 1) if a != 0 else None
        comparison = {
            "current_month": curr["label"],
            "previous_month": prev["label"],
            "revenue_change": pct_change(prev["real_gain"], curr["real_gain"]),
            "cost_change":    pct_change(prev["purchase_cost"], curr["purchase_cost"]),
            "margin_change":  pct_change(prev["margin"], curr["margin"]),
            "loss_change":    pct_change(prev["loss_value"], curr["loss_value"]),
        }

    return {"months": result, "comparison": comparison}
