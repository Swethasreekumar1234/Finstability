from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Sequence
from zoneinfo import ZoneInfo

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database.mongodb import get_db

logger = logging.getLogger(__name__)

AMFI_NAV_URL = "https://portal.amfiindia.com/spages/NAVAll.txt"
FUND_NAV_COLLECTION = "fund_nav"
IST = ZoneInfo("Asia/Kolkata")

_scheduler: Optional[AsyncIOScheduler] = None


def _collection():
    return get_db()[FUND_NAV_COLLECTION]


def _parse_nav_date(nav_date: str) -> datetime:
    return datetime.strptime(nav_date.strip(), "%d-%b-%Y").replace(tzinfo=timezone.utc)


def _normalize_nav_date(nav_date: str) -> str:
    return _parse_nav_date(nav_date).strftime("%d-%b-%Y")


def parse_amfi_nav_text(text: str) -> tuple[list[dict], int]:
    records: list[dict] = []
    skipped = 0
    fetched_at = datetime.now(timezone.utc)

    for raw_line in text.splitlines():
        line = raw_line.lstrip("\ufeff").strip()
        if not line or ";" not in line:
          skipped += 1
          continue

        fields = [part.strip() for part in line.split(";")]
        if len(fields) < 6:
            skipped += 1
            continue

        scheme_code, isin_div, isin_growth, scheme_name, nav_raw, nav_date = fields[:6]
        if not scheme_code or not scheme_name:
            skipped += 1
            continue
        if nav_raw.upper() == "N.A.":
            skipped += 1
            continue

        try:
            nav = float(nav_raw)
        except ValueError:
            skipped += 1
            continue

        try:
            normalized_date = _normalize_nav_date(nav_date)
        except ValueError:
            skipped += 1
            continue

        records.append(
            {
                "scheme_code": scheme_code,
                "scheme_name": scheme_name,
                "isin": isin_growth or isin_div or "",
                "nav": nav,
                "nav_date": normalized_date,
                "fetched_at": fetched_at,
            }
        )

    return records, skipped


async def ensure_fund_nav_indexes() -> None:
    collection = _collection()
    await collection.create_index([
        ("scheme_code", 1),
        ("nav_date", 1),
    ], unique=True, name="uniq_scheme_code_nav_date")
    await collection.create_index([
        ("scheme_code", 1),
        ("fetched_at", -1),
    ], name="scheme_code_fetched_at_desc")


async def sync_amfi_nav_data() -> dict[str, int]:
    upserted = 0
    skipped = 0

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(AMFI_NAV_URL)
            response.raise_for_status()
            text = response.text
    except Exception:
        logger.exception("Failed to fetch AMFI NAV file")
        return {"upserted": 0, "skipped": 0}

    try:
        records, skipped = parse_amfi_nav_text(text)
    except Exception:
        logger.exception("Failed to parse AMFI NAV file")
        return {"upserted": 0, "skipped": 0}

    try:
        collection = _collection()
        for record in records:
            try:
                await collection.update_one(
                    {"scheme_code": record["scheme_code"], "nav_date": record["nav_date"]},
                    {
                        "$set": record,
                        "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
                    },
                    upsert=True,
                )
                upserted += 1
            except Exception:
                skipped += 1
                logger.exception(
                    "Failed to upsert AMFI NAV row for scheme_code=%s nav_date=%s",
                    record.get("scheme_code"),
                    record.get("nav_date"),
                )
    except Exception:
        logger.exception("Failed while writing AMFI NAV rows")

    logger.info("AMFI NAV sync complete: upserted=%s skipped=%s", upserted, skipped)
    return {"upserted": upserted, "skipped": skipped}


async def get_latest_nav_for_scheme(scheme_code: str) -> Optional[dict]:
    collection = _collection()
    docs = await collection.find(
        {"scheme_code": scheme_code},
        {"_id": 0},
    ).sort([("fetched_at", -1)]).limit(1).to_list(length=1)
    return docs[0] if docs else None


async def get_nav_history_for_scheme(scheme_code: str, days: int = 30) -> list[dict]:
    collection = _collection()
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    docs = await collection.find(
        {"scheme_code": scheme_code},
        {"_id": 0},
    ).sort([("fetched_at", -1)]).to_list(length=200)

    history: list[dict] = []
    for doc in docs:
        try:
            if _parse_nav_date(doc["nav_date"]) >= cutoff:
                history.append(doc)
        except Exception:
            logger.exception(
                "Skipping malformed NAV history row for scheme_code=%s",
                doc.get("scheme_code"),
            )
    return history


async def get_portfolio_nav_highlights(keywords: Sequence[str], limit: int = 3) -> list[dict]:
    if not keywords:
        return []

    regex = "|".join(re.escape(keyword) for keyword in keywords if keyword)
    if not regex:
        return []

    collection = _collection()
    pipeline = [
        {"$match": {"scheme_name": {"$regex": regex, "$options": "i"}}},
        {"$sort": {"fetched_at": -1}},
        {"$group": {"_id": "$scheme_code", "doc": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$doc"}},
        {"$sort": {"fetched_at": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0}},
    ]
    docs = await collection.aggregate(pipeline).to_list(length=limit)
    return docs


def start_fund_nav_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    scheduler = AsyncIOScheduler(timezone=IST)
    scheduler.add_job(
        sync_amfi_nav_data,
        CronTrigger(hour=21, minute=30, timezone=IST),
        id="amfi_nav_sync",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600,
    )
    scheduler.start()
    _scheduler = scheduler
    logger.info("AMFI NAV scheduler started for 9:30 PM IST daily")


def stop_fund_nav_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
    logger.info("AMFI NAV scheduler stopped")