from __future__ import annotations
import hashlib
import importlib
import io
import re
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from database.models import BudgetIn, MonthlySummaryResponse, TransactionIn
from database.mongodb import get_db

# Setup logging to see errors in your terminal
logger = logging.getLogger(__name__)

pdfplumber = importlib.import_module("pdfplumber") if importlib.util.find_spec("pdfplumber") else None

router = APIRouter()

CATEGORY_KEYWORDS: Dict[str, str] = {
    "swiggy": "food",
    "zomato": "food",
    "uber": "transport",
    "amazon": "shopping",
    "netflix": "entertainment",
    "jio": "bills",
    "airtel": "bills",
}

COLUMN_ALIASES: Dict[str, List[str]] = {
    "date": ["date", "txn_date", "transaction_date", "value_date"],
    "description": ["description", "merchant", "narration", "details", "remarks"],
    "debit": ["debit", "withdrawal", "withdraw", "dr"],
    "credit": ["credit", "deposit", "cr"],
    "amount": ["amount", "transaction_amount"],
    "type": ["type", "txn_type", "transaction_type"],
}

def _normalize_col(col: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", col.strip().lower()).strip("_")

def _clean_amount(value) -> float:
    if value is None or pd.isna(value):
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    text = text.replace(",", "")
    text = re.sub(r"[^0-9.\-]", "", text)
    try:
        return float(text)
    except ValueError:
        return 0.0

def _normalize_date(value) -> str:
    raw = str(value).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw
    try:
        ts = pd.to_datetime(raw, errors="coerce", dayfirst=True)
        if pd.isna(ts):
            raise ValueError
        return ts.strftime("%Y-%m-%d")
    except:
        # Fallback to today if date is unparseable to avoid crashing
        return datetime.now().strftime("%Y-%m-%d")

def _categorize(merchant: str, provided: Optional[str]) -> str:
    if provided and provided.strip():
        return provided.strip().lower()
    m = merchant.lower()
    for key, category in CATEGORY_KEYWORDS.items():
        if key in m:
            return category
    return "other"

def _fingerprint(user_id: str, date: str, amount: float, tx_type: str, merchant: str, source: str) -> str:
    raw = f"{user_id}|{date}|{amount:.2f}|{tx_type}|{merchant.strip().lower()}|{source}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def _map_columns(df: pd.DataFrame) -> Dict[str, str]:
    mapped: Dict[str, str] = {}
    normalized = {_normalize_col(c): c for c in df.columns}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                mapped[canonical] = normalized[alias]
                break
    return mapped

async def _ensure_indexes(db) -> None:
    try:
        await db["transactions"].create_index("user_id")
        await db["transactions"].create_index([("user_id", 1), ("date", 1)])
        await db["transactions"].create_index("fingerprint", unique=True)
    except:
        pass # Index already exists

@router.get("/list", summary="List transactions with filters")
async def list_transactions(
    user_id: str = Query(...),
    month: Optional[str] = Query(None, description="YYYY-MM"),
    category: Optional[str] = Query(None),
):
    try:
        db = get_db()
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        query = {"user_id": user_id}
        if month:
            # Safer date range matching
            query["date"] = {"$regex": f"^{month}"}
        if category:
            query["category"] = category.lower()

        docs = await db["transactions"].find(query, {"_id": 0, "fingerprint": 0}).sort("date", -1).to_list(length=500)
        return {"transactions": docs}
    except Exception as exc:
        logger.error(f"Error fetching transactions: {exc}")
        raise HTTPException(status_code=500, detail="Unable to fetch transactions")

@router.get("/monthly-summary", response_model=MonthlySummaryResponse)
async def monthly_summary(
    user_id: str = Query(...),
    month: str = Query(..., description="YYYY-MM"),
):
    try:
        db = get_db()
        # Use regex to match all days in that month (YYYY-MM-DD)
        query_filter = {"user_id": user_id, "date": {"$regex": f"^{month}"}}

        pipeline = [
            {"$match": query_filter},
            {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
        ]
        
        totals = await db["transactions"].aggregate(pipeline).to_list(length=None)
        
        total_income = sum(float(x["total"]) for x in totals if x.get("_id") == "income")
        total_expenses = sum(float(x["total"]) for x in totals if x.get("_id") == "expense")
        savings = total_income - total_expenses
        expense_ratio = (total_expenses / total_income) if total_income > 0 else 0.0

        # Category breakdown
        cat_pipeline = [
            {"$match": {**query_filter, "type": "expense"}},
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
        ]
        cats = await db["transactions"].aggregate(cat_pipeline).to_list(length=None)
        category_breakdown = {(c.get("_id") or "other"): float(c.get("total", 0.0)) for c in cats}

        return MonthlySummaryResponse(
            total_income=round(total_income, 2),
            total_expenses=round(total_expenses, 2),
            savings=round(savings, 2),
            expense_ratio=round(expense_ratio, 4),
            category_breakdown=category_breakdown,
            alerts=[] # Can be expanded with _overspending_alerts logic
        )
    except Exception as exc:
        logger.error(f"Error in monthly summary: {exc}")
        raise HTTPException(status_code=500, detail="Unable to generate summary")

@router.post("/add-transaction")
async def add_transaction(payload: TransactionIn):
    try:
        db = get_db()
        await _ensure_indexes(db)

        category = _categorize(payload.merchant, payload.category)
        doc = {
            "user_id": payload.user_id,
            "date": _normalize_date(payload.date),
            "amount": abs(float(payload.amount)),
            "type": payload.type,
            "category": category,
            "merchant": payload.merchant.strip(),
            "source": "manual",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        doc["fingerprint"] = _fingerprint(
            doc["user_id"], doc["date"], doc["amount"], doc["type"], doc["merchant"], doc["source"]
        )

        try:
            await db["transactions"].insert_one(doc)
        except:
            raise HTTPException(status_code=409, detail="Duplicate transaction detected")

        return {
            "message": "Transaction saved",
            "transaction": {k: v for k, v in doc.items() if k not in {"fingerprint", "_id"}},
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/set-budget")
async def set_budget(payload: BudgetIn):
    try:
        db = get_db()
        category = payload.category.strip().lower()
        await db["budgets"].update_one(
            {"user_id": payload.user_id, "category": category},
            {"$set": {"monthly_limit": float(payload.monthly_limit)}},
            upsert=True,
        )
        return {"message": "Budget saved"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))