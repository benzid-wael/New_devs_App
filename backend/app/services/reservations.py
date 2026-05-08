from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings


def _to_async_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url
    if database_url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + database_url[len("postgresql://"):]
    return database_url


_engine = create_async_engine(_to_async_url(settings.database_url), pool_pre_ping=True)
_session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


async def _get_property_timezone(session: AsyncSession, property_id: str, tenant_id: str) -> ZoneInfo:
    row = (await session.execute(
        text("SELECT timezone FROM properties WHERE id = :p AND tenant_id = :t"),
        {"p": property_id, "t": tenant_id},
    )).fetchone()
    if row is None:
        raise LookupError(f"property {property_id} not found for tenant {tenant_id}")
    return ZoneInfo(row.timezone or "UTC")


def _month_bounds_utc(year: int, month: int, tz: ZoneInfo) -> tuple[datetime, datetime]:
    start_local = datetime(year, month, 1, tzinfo=tz)
    if month == 12:
        end_local = datetime(year + 1, 1, 1, tzinfo=tz)
    else:
        end_local = datetime(year, month + 1, 1, tzinfo=tz)
    return start_local.astimezone(ZoneInfo("UTC")), end_local.astimezone(ZoneInfo("UTC"))


async def calculate_revenue(
    property_id: str,
    tenant_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> Dict[str, Any]:
    """Aggregate revenue for a property, optionally scoped to a calendar month
    in the property's local timezone. Returns per-currency totals."""
    async with _session_factory() as session:
        tz = await _get_property_timezone(session, property_id, tenant_id)

        params: Dict[str, Any] = {"property_id": property_id, "tenant_id": tenant_id}
        date_clause = ""

        if month is not None and year is not None:
            start_utc, end_utc = _month_bounds_utc(year, month, tz)
            date_clause = " AND check_in_date >= :start_utc AND check_in_date < :end_utc"
            params["start_utc"] = start_utc
            params["end_utc"] = end_utc

        query = text(f"""
            SELECT currency, SUM(total_amount) AS total, COUNT(*) AS reservation_count
            FROM reservations
            WHERE property_id = :property_id
              AND tenant_id  = :tenant_id
              {date_clause}
            GROUP BY currency
            ORDER BY currency
        """)

        rows = (await session.execute(query, params)).fetchall()

    totals: List[Dict[str, Any]] = [
        {"currency": row.currency or "USD", "amount": str(Decimal(row.total))}
        for row in rows
    ]
    return {
        "property_id": property_id,
        "tenant_id": tenant_id,
        "totals": totals,
        "count": sum(row.reservation_count for row in rows),
        "month": month,
        "year": year,
    }
