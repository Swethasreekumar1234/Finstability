from __future__ import annotations

import hashlib
import importlib
import io
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from database.models import BudgetIn, MonthlySummaryResponse, TransactionIn
from database.mongodb import get_db

pdfplumber = importlib.import_module("pdfplumber") if importlib.util.find_spec("pdfplumber") else None

router = APIRouter()

CATEGORY_KEYWORDS: Dict[str, str] = {
    "swiggy": "food",
    "zomato": "food",
    "uber": "transport",
    "amazon": "shopping",
    "netflix": "entertainment",
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
    if value is None:
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
      datetime.strptime(raw, "%Y-%m-%d")
      return raw

    ts = pd.to_datetime(raw, errors="coerce", dayfirst=True)
    if pd.isna(ts):
        raise ValueError(f"Invalid date value: {value}")
    return ts.strftime("%Y-%m-%d")


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

    if "date" not in mapped:
        raise HTTPException(status_code=400, detail="Missing required date column in statement")

    if "description" not in mapped:
        raise HTTPException(status_code=400, detail="Missing required description column in statement")

    if "debit" not in mapped and "credit" not in mapped and "amount" not in mapped:
        raise HTTPException(status_code=400, detail="Missing amount/debit/credit columns in statement")

    return mapped


def _rows_to_transactions(user_id: str, df: pd.DataFrame, source: str = "bank_upload") -> List[dict]:
    mapped = _map_columns(df)
    now = datetime.now(timezone.utc).isoformat()
    docs: List[dict] = []

    for _, row in df.iterrows():
        try:
            date = _normalize_date(row[mapped["date"]])
            description = str(row[mapped["description"]]).strip()
            if not description or description.lower() == "nan":
                continue

            tx_type = "expense"
            amount = 0.0

            if "debit" in mapped or "credit" in mapped:
                debit = _clean_amount(row[mapped.get("debit")]) if "debit" in mapped else 0.0
                credit = _clean_amount(row[mapped.get("credit")]) if "credit" in mapped else 0.0

                if credit > 0 and debit <= 0:
                    tx_type = "income"
                    amount = credit
                elif debit > 0:
                    tx_type = "expense"
                    amount = debit
                else:
                    continue
            else:
                raw_amount = _clean_amount(row[mapped["amount"]])
                if raw_amount == 0:
                    continue
                declared_type = str(row[mapped.get("type")]).strip().lower() if "type" in mapped else ""
                if declared_type in {"credit", "income", "cr"}:
                    tx_type = "income"
                    amount = abs(raw_amount)
                elif declared_type in {"debit", "expense", "dr"}:
                    tx_type = "expense"
                    amount = abs(raw_amount)
                else:
                    tx_type = "income" if raw_amount > 0 else "expense"
                    amount = abs(raw_amount)

            category = _categorize(description, None)
            docs.append(
                {
                    "user_id": user_id,
                    "date": date,
                    "amount": amount,
                    "type": tx_type,
                    "category": category,
                    "merchant": description,
                    "source": source,
                    "created_at": now,
                    "fingerprint": _fingerprint(user_id, date, amount, tx_type, description, source),
                }
            )
        except Exception:
            # Skip malformed row instead of failing the full upload.
            continue

    return docs


async def _ensure_indexes(db) -> None:
    await db["transactions"].create_index("user_id")
    await db["transactions"].create_index([("user_id", 1), ("date", 1)])
    await db["transactions"].create_index("fingerprint", unique=True)
    await db["budgets"].create_index([("user_id", 1), ("category", 1)], unique=True)


async def _overspending_alerts(db, user_id: str, month: str) -> List[str]:
    start = f"{month}-01"
    end = f"{month}-31"

    expense_pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "type": "expense",
                "date": {"$gte": start, "$lte": end},
            }
        },
        {"$group": {"_id": "$category", "spent": {"$sum": "$amount"}}},
    ]
    spent = await db["transactions"].aggregate(expense_pipeline).to_list(length=None)
    budgets = await db["budgets"].find({"user_id": user_id}, {"_id": 0}).to_list(length=None)
    budget_map = {b["category"].lower(): float(b["monthly_limit"]) for b in budgets}

    alerts: List[str] = []
    for item in spent:
        category = (item.get("_id") or "other").lower()
        total = float(item.get("spent", 0.0))
        limit = budget_map.get(category)
        if limit is not None and total > limit:
            diff = int(round(total - limit))
            alerts.append(f"You have exceeded your {category} budget by ₹{diff}")

    return alerts


@router.post("/add-transaction", summary="Add a manual transaction")
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

        existing = await db["transactions"].find_one({"fingerprint": doc["fingerprint"]})
        if existing:
            raise HTTPException(status_code=409, detail="Duplicate transaction detected")

        await db["transactions"].insert_one(doc)
        return {"message": "Transaction saved", "transaction": {k: v for k, v in doc.items() if k != "fingerprint"}}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/set-budget", summary="Set or update a category budget")
async def set_budget(payload: BudgetIn):
    try:
        db = get_db()
        await _ensure_indexes(db)
        category = payload.category.strip().lower()

        if payload.monthly_limit <= 0:
            raise HTTPException(status_code=400, detail="monthly_limit must be greater than zero")

        await db["budgets"].update_one(
            {"user_id": payload.user_id, "category": category},
            {"$set": {"user_id": payload.user_id, "category": category, "monthly_limit": float(payload.monthly_limit)}},
            upsert=True,
        )
        return {"message": "Budget saved"}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/upload-bank-statement", summary="Upload CSV/PDF bank statement")
async def upload_bank_statement(
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        db = get_db()
        await _ensure_indexes(db)

        name = (file.filename or "").lower()
        content = await file.read()

        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif name.endswith(".pdf"):
            if pdfplumber is None:
                raise HTTPException(status_code=500, detail="PDF parsing is unavailable. Install pdfplumber.")
            rows: List[List[str]] = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    for table in page.extract_tables() or []:
                        if not table or len(table) < 2:
                            continue
                        rows.extend(table)
            if not rows:
                raise HTTPException(status_code=400, detail="No table data found in uploaded PDF")
            header = [str(h or "") for h in rows[0]]
            body = rows[1:]
            df = pd.DataFrame(body, columns=header)
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Use CSV or PDF")

        tx_docs = _rows_to_transactions(user_id=user_id, df=df, source="bank_upload")
        if not tx_docs:
            raise HTTPException(status_code=400, detail="No valid transactions found in file")

        inserted = 0
        duplicates = 0
        for doc in tx_docs:
            try:
                await db["transactions"].insert_one(doc)
                inserted += 1
            except Exception:
                duplicates += 1

        return {
            "message": "Statement processed",
            "total_rows": len(tx_docs),
            "inserted": inserted,
            "duplicates": duplicates,
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/list", summary="List transactions with filters")
async def list_transactions(
    user_id: str = Query(...),
    month: Optional[str] = Query(None, description="YYYY-MM"),
    category: Optional[str] = Query(None),
):
    try:
        db = get_db()
        query = {"user_id": user_id}
        if month:
            query["date"] = {"$gte": f"{month}-01", "$lte": f"{month}-31"}
        if category:
            query["category"] = category.lower()

        docs = await db["transactions"].find(query, {"_id": 0, "fingerprint": 0}).sort("date", -1).to_list(length=500)
        return {"transactions": docs}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/monthly-summary", response_model=MonthlySummaryResponse, summary="Monthly income/expense summary")
async def monthly_summary(
    user_id: str = Query(...),
    month: str = Query(..., description="YYYY-MM"),
):
    try:
        db = get_db()
        start = f"{month}-01"
        end = f"{month}-31"

        pipeline = [
            {"$match": {"user_id": user_id, "date": {"$gte": start, "$lte": end}}},
            {
                "$group": {
                    "_id": "$type",
                    "total": {"$sum": "$amount"},
                }
            },
        ]
        totals = await db["transactions"].aggregate(pipeline).to_list(length=None)
        total_income = sum(float(x["total"]) for x in totals if x.get("_id") == "income")
        total_expenses = sum(float(x["total"]) for x in totals if x.get("_id") == "expense")
        savings = total_income - total_expenses
        expense_ratio = (total_expenses / total_income) if total_income > 0 else 0.0

        cat_pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "type": "expense",
                    "date": {"$gte": start, "$lte": end},
                }
            },
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        ]
        cats = await db["transactions"].aggregate(cat_pipeline).to_list(length=None)
        category_breakdown = {(c.get("_id") or "other"): float(c.get("total", 0.0)) for c in cats}
        alerts = await _overspending_alerts(db, user_id, month)

        return MonthlySummaryResponse(
            total_income=round(total_income, 2),
            total_expenses=round(total_expenses, 2),
            savings=round(savings, 2),
            expense_ratio=round(expense_ratio, 4),
            category_breakdown=category_breakdown,
            alerts=alerts,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/health-metrics", summary="Metrics for Financial Health Score integration")
async def health_metrics(
    user_id: str = Query(...),
    month: str = Query(..., description="YYYY-MM"),
):
    summary = await monthly_summary(user_id=user_id, month=month)
    return {
        "total_savings": summary.savings,
        "expense_ratio": summary.expense_ratio,
        "total_income": summary.total_income,
        "total_expenses": summary.total_expenses,
    }
