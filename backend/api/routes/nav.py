from __future__ import annotations

from fastapi import APIRouter, HTTPException

from database.fund_nav import get_latest_nav_for_scheme, get_nav_history_for_scheme
from database.models import FundNavDocument, FundNavHistoryResponse

router = APIRouter()


@router.get("/{scheme_code}", response_model=FundNavDocument, summary="Latest NAV for a mutual fund scheme")
async def get_latest_nav(scheme_code: str):
    try:
        doc = await get_latest_nav_for_scheme(scheme_code)
        if not doc:
            raise HTTPException(status_code=404, detail="NAV not found")
        return doc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{scheme_code}/history", response_model=FundNavHistoryResponse, summary="Last 30 days of NAV history")
async def get_nav_history(scheme_code: str):
    try:
        items = await get_nav_history_for_scheme(scheme_code, days=30)
        return {
            "scheme_code": scheme_code,
            "count": len(items),
            "items": items,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))