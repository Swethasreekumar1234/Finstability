from __future__ import annotations
from typing import List, Optional, Sequence
from database.models import UserProfile
from database.profile_features import profile_tags
from rag.embeddings import search_similar


def _build_query(profile: UserProfile) -> str:
    clauses: List[str] = []

    age_part = str(profile.age) if profile.age is not None else "unknown"
    gender_part = profile.gender or "unknown"
    occupation = profile.occupation or profile.employment_type or "unknown"
    location = ", ".join([p for p in [profile.city, profile.state] if p]) or "India"

    clauses.append(
        f"Applicant profile: age {age_part}, gender {gender_part}, occupation {occupation}, employment {profile.employment_type}, location {location}."
    )
    clauses.append(
        f"Financial profile: monthly income INR {profile.monthly_income:,.0f}, monthly expenses INR {profile.monthly_expenses:,.0f}, savings INR {profile.total_savings:,.0f}, debt INR {profile.total_debts:,.0f}, family size {profile.family_size}."
    )

    if profile.caste_category:
        clauses.append(f"Social category: {profile.caste_category}.")
    if profile.urban_rural:
        clauses.append(f"Area type: {profile.urban_rural}.")
    if profile.occupation_subtype:
        clauses.append(f"Occupation subtype: {profile.occupation_subtype}.")

    if profile.has_bank_account is False:
        clauses.append("No bank account currently.")
    if profile.has_health_insurance is False:
        clauses.append("No health insurance currently.")
    if profile.has_life_insurance is False:
        clauses.append("No life insurance currently.")
    if profile.owns_land is False or profile.has_land is False:
        clauses.append("Does not own agricultural land.")
    elif profile.owns_land is True or profile.has_land is True:
        clauses.append("Owns agricultural land.")

    if profile.financial_goals:
        clauses.append(f"Goals: {', '.join(profile.financial_goals)}.")

    tags = profile_tags(profile.model_dump(exclude_none=True))
    if tags:
        clauses.append(f"Profile tags: {', '.join(tags)}.")

    clauses.append(
        "Find Indian government schemes where eligibility and benefits best match this exact profile. Prioritize strict eligibility fit over generic popularity."
    )

    return " ".join(clauses)


async def retrieve_scheme_ids(
    profile: UserProfile,
    top_k: int = 10,
    user_tags: Optional[Sequence[str]] = None,
) -> List[str]:
    """Retrieve scheme_ids relevant to this profile using semantic search."""
    query = _build_query(profile)
    if user_tags:
        query = f"{query} Preference tags: {', '.join(user_tags)}."

    ids = search_similar(query, top_k=max(1, top_k))
    # Preserve order while removing duplicates from FAISS results.
    return list(dict.fromkeys(ids))
