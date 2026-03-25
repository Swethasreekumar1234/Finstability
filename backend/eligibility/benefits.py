from __future__ import annotations
from typing import List
from database.models import SchemeRecommendation, BenefitEstimate, BenefitEstimateResponse


def estimate_total_benefits(recs: List[SchemeRecommendation]) -> BenefitEstimateResponse:
    """
    Compute total estimated annual benefits from eligible schemes.
    Avoids double-counting by keeping only the highest-value scheme per category.
    """
    cat_best: dict[str, BenefitEstimate] = {}

    for rec in recs:
        cat = rec.scheme.category
        amount = rec.estimated_annual_benefit
        existing = cat_best.get(cat)
        if existing is None or amount > existing.annual_amount:
            cat_best[cat] = BenefitEstimate(
                scheme_name=rec.scheme.scheme_name,
                annual_amount=amount,
                category=cat,
            )

    breakdown = list(cat_best.values())
    total = sum(b.annual_amount for b in breakdown)

    return BenefitEstimateResponse(
        total_estimated_benefits=total,
        breakdown=breakdown,
    )
