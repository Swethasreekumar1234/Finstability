from __future__ import annotations
from typing import List, Tuple
from database.models import UserProfile, GovernmentScheme, SchemeRecommendation


def check_eligibility(
    profile: UserProfile, scheme: GovernmentScheme
) -> Tuple[bool, float, str]:
    """
    Check whether a user is eligible for a scheme.
    Returns (is_eligible, match_score 0.0–1.0, human-readable reason).
    """
    score = 1.0
    reasons: List[str] = []
    fails: List[str] = []

    # --- Age ---
    if profile.age is not None:
        if scheme.min_age is not None and profile.age < scheme.min_age:
            fails.append(f"Minimum age is {scheme.min_age} (yours: {profile.age})")
        if scheme.max_age is not None and profile.age > scheme.max_age:
            fails.append(f"Maximum age is {scheme.max_age} (yours: {profile.age})")
        if fails:
            return False, 0.0, "; ".join(fails)

        if scheme.min_age and scheme.max_age:
            reasons.append(f"Age {profile.age} is in the {scheme.min_age}–{scheme.max_age} eligible range")
        elif scheme.min_age:
            reasons.append(f"Age {profile.age} meets minimum age {scheme.min_age}")
    else:
        reasons.append("Age not confirmed yet")

    # --- Income ---
    if scheme.income_limit is not None:
        if profile.monthly_income > scheme.income_limit:
            fails.append(
                f"Monthly income ₹{profile.monthly_income:,.0f} exceeds ₹{scheme.income_limit:,.0f} limit"
            )
        else:
            ratio = profile.monthly_income / scheme.income_limit
            score *= 1.0 - ratio * 0.2
            reasons.append(f"Income within ₹{scheme.income_limit:,.0f}/month limit")
    else:
        reasons.append("No income restriction")

    if fails:
        return False, 0.0, "; ".join(fails)

    # --- Gender ---
    if scheme.gender and scheme.gender != "all" and profile.gender:
        if profile.gender.lower() != scheme.gender.lower():
            fails.append(f"Scheme is for {scheme.gender} applicants only")
    if fails:
        return False, 0.0, "; ".join(fails)

    # --- Occupation ---
    if scheme.occupation:
        matched = profile.employment_type.lower() in [o.lower() for o in scheme.occupation]
        if not matched:
            return False, 0.0, f"Occupation '{profile.employment_type}' not in eligible list: {scheme.occupation}"
        reasons.append(f"Your occupation ({profile.employment_type}) qualifies")

    # --- State (informational only, don't hard-fail) ---
    if scheme.states and profile.state not in scheme.states:
        score *= 0.7

    reason_text = ". ".join(reasons) + "." if reasons else "Meets general eligibility criteria."
    return True, min(1.0, max(0.2, score)), reason_text


def get_eligible_schemes(
    profile: UserProfile, all_schemes: List[GovernmentScheme]
) -> List[SchemeRecommendation]:
    recs: List[SchemeRecommendation] = []
    for scheme in all_schemes:
        eligible, score, reason = check_eligibility(profile, scheme)
        if eligible:
            recs.append(
                SchemeRecommendation(
                    scheme=scheme,
                    eligibility_match=score,
                    reason=reason,
                    estimated_annual_benefit=scheme.estimated_annual_benefit or 0.0,
                )
            )
    # Sort by (score × benefit), highest first
    recs.sort(
        key=lambda r: r.eligibility_match * (r.estimated_annual_benefit or 500),
        reverse=True,
    )
    return recs
