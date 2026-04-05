from __future__ import annotations
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from database.models import (
    UserProfile, GovernmentScheme,
    EligibleSchemesResponse, BenefitEstimateResponse,
)
from database.mongodb import get_db
from database.profile_features import profile_tags
from eligibility.engine import get_eligible_schemes
from eligibility.benefits import estimate_total_benefits
from rag.retriever import retrieve_scheme_ids

router = APIRouter()


def _normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    normalized = email.strip().lower()
    return normalized or None


async def _resolve_effective_profile(db, incoming: UserProfile) -> UserProfile:
    """
    Build an authoritative profile for recommendations.
    Prefer persisted Mongo profile values (latest user inputs), and only use
    request values to fill gaps.
    """
    incoming_doc = incoming.model_dump(exclude_none=True)
    user_id = incoming.user_id or incoming.firebase_uid
    email = _normalize_email(incoming.email)

    mongo_doc: Dict[str, Any] | None = None
    if user_id:
        mongo_doc = await db["profiles"].find_one(
            {
                "$or": [
                    {"user_id": user_id},
                    {"firebase_uid": user_id},
                ]
            },
            {"_id": 0},
        )

    if not mongo_doc and email:
        mongo_doc = await db["profiles"].find_one(
            {"email": email},
            {"_id": 0},
            sort=[("updated_at", -1)],
        )

    merged = {**incoming_doc}
    if mongo_doc:
        merged = {**incoming_doc, **mongo_doc}

    # Backward compatibility: some payloads still send has_land only.
    if "owns_land" not in merged and "has_land" in merged:
        merged["owns_land"] = merged.get("has_land")

    allowed = set(UserProfile.model_fields.keys())
    clean = {k: v for k, v in merged.items() if k in allowed}
    return UserProfile(**clean)

async def _load_schemes(db) -> List[GovernmentScheme]:
    """Helper to fetch all seeded schemes from MongoDB."""
    docs = await db["schemes"].find({}, {"_id": 0}).to_list(length=None)
    return [GovernmentScheme(**d) for d in docs]

@router.post(
    "/recommend",
    response_model=EligibleSchemesResponse,
    summary="Get personalized government schemes based on profile enrichment",
)
async def recommend_schemes(profile: UserProfile):
    try:
        db = get_db()
        effective_profile = await _resolve_effective_profile(db, profile)
        all_schemes = await _load_schemes(db)

        if not all_schemes:
            return EligibleSchemesResponse(
                schemes=[], total_estimated_benefits=0.0, missing_benefit_count=0
            )

        # 1. Get profile-derived tags (e.g., 'unbanked', 'landless', 'health_uninsured')
        # These tags are generated in profile_features.py based on user answers
        user_tags = profile_tags(effective_profile.model_dump())

        # 2. Use RAG retrieval as the primary candidate stage, driven by profile inputs.
        rag_ids = await retrieve_scheme_ids(effective_profile, top_k=20, user_tags=user_tags)
        by_id = {s.scheme_id: s for s in all_schemes}
        rag_candidates = [by_id[sid] for sid in rag_ids if sid in by_id]

        # 3. Apply hard-eligibility checks on top of retrieved candidates.
        candidate_pool = rag_candidates if rag_candidates else all_schemes
        eligible = get_eligible_schemes(effective_profile, candidate_pool)
        if not eligible and rag_candidates:
            # Fallback safety for sparse retrieval: don't return empty when valid options exist.
            eligible = get_eligible_schemes(effective_profile, all_schemes)

        # 4. Apply personalization boosts/re-weights.
        for rec in eligible:
            # A. Semantic Boost (RAG)
            if rec.scheme.scheme_id in rag_ids:
                rec.eligibility_match = min(1.0, rec.eligibility_match * 1.15)

            # B. Enrichment: Caste Category Boost
            if effective_profile.caste_category:
                caste_str = effective_profile.caste_category.lower()
                # Check if the scheme details or eligibility text mentions their caste
                if caste_str in str(rec.scheme.description).lower() or caste_str in str(rec.scheme.eligibility).lower():
                    rec.eligibility_match = min(1.0, rec.eligibility_match * 1.25)

            # C. Enrichment: Financial Inclusion (Bank Account)
            # If 'unbanked' tag exists, boost schemes like Jan Dhan Yojana
            if "unbanked" in user_tags:
                if "bank" in rec.scheme.scheme_name.lower() or rec.scheme.category == "insurance":
                    rec.eligibility_match = min(1.0, rec.eligibility_match * 1.40)

            # D. Enrichment: Insurance Gaps
            # If user has no health insurance, prioritize Ayushman Bharat or similar
            if "health_uninsured" in user_tags:
                if "health" in rec.scheme.category.lower() or "insurance" in rec.scheme.category.lower():
                    rec.eligibility_match = min(1.0, rec.eligibility_match * 1.30)

            # E. Enrichment: Land Ownership (Hard Filter)
            # If they definitely don't own land, de-prioritize Agriculture schemes (e.g., PM-KISAN)
            if "landless" in user_tags and "agriculture" in rec.scheme.ministry.lower():
                rec.eligibility_match *= 0.3

        # 5. Final ranking.
        # We sort by (Match Score * Annual Benefit Value) to show the most useful things first
        eligible.sort(
            key=lambda r: (r.eligibility_match * (r.estimated_annual_benefit or 1000)),
            reverse=True,
        )

        total = sum(r.estimated_annual_benefit for r in eligible)
        
        return EligibleSchemesResponse(
            schemes=eligible[:20], # Return top 20 personalized results
            total_estimated_benefits=total,
            missing_benefit_count=max(0, len(all_schemes) - len(eligible)),
        )
    except Exception as exc:
        import logging
        logging.error(f"Personalized Recommendation Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@router.post(
    "/estimate-benefits",
    response_model=BenefitEstimateResponse,
    summary="Estimate total yearly monetary benefits",
)
async def estimate_benefits(profile: UserProfile):
    try:
        db = get_db()
        effective_profile = await _resolve_effective_profile(db, profile)
        all_schemes = await _load_schemes(db)
        eligible = get_eligible_schemes(effective_profile, all_schemes)
        return estimate_total_benefits(eligible)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))