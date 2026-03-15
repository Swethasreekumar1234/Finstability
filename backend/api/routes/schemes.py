from __future__ import annotations
from typing import List
from fastapi import APIRouter, HTTPException
from database.models import (
    UserProfile, GovernmentScheme,
    EligibleSchemesResponse, BenefitEstimateResponse,
)
from database.mongodb import get_db
from eligibility.engine import get_eligible_schemes
from eligibility.benefits import estimate_total_benefits
from rag.retriever import retrieve_scheme_ids

router = APIRouter()


async def _load_schemes(db) -> List[GovernmentScheme]:
    docs = await db["schemes"].find({}, {"_id": 0}).to_list(length=None)
    return [GovernmentScheme(**d) for d in docs]


@router.post(
    "/recommend",
    response_model=EligibleSchemesResponse,
    summary="Get eligible government schemes for a user profile",
)
async def recommend_schemes(profile: UserProfile):
    try:
        db = get_db()
        all_schemes = await _load_schemes(db)

        if not all_schemes:
            return EligibleSchemesResponse(
                schemes=[], total_estimated_benefits=0.0, missing_benefit_count=0
            )

        # RAG-boost: bump eligibility_match for semantically similar schemes
        rag_ids = await retrieve_scheme_ids(profile, top_k=10)
        eligible = get_eligible_schemes(profile, all_schemes)

        for rec in eligible:
            if rec.scheme.scheme_id in rag_ids:
                rec.eligibility_match = min(1.0, rec.eligibility_match * 1.12)

        eligible.sort(
            key=lambda r: r.eligibility_match * (r.estimated_annual_benefit or 500),
            reverse=True,
        )

        total = sum(r.estimated_annual_benefit for r in eligible)
        return EligibleSchemesResponse(
            schemes=eligible[:20],
            total_estimated_benefits=total,
            missing_benefit_count=len(all_schemes) - len(eligible),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post(
    "/estimate-benefits",
    response_model=BenefitEstimateResponse,
    summary="Estimate total yearly benefits for a user profile",
)
async def estimate_benefits(profile: UserProfile):
    try:
        db = get_db()
        all_schemes = await _load_schemes(db)
        eligible = get_eligible_schemes(profile, all_schemes)
        return estimate_total_benefits(eligible)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
