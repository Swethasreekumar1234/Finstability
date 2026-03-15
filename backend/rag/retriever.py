from __future__ import annotations
from typing import List
from database.models import UserProfile
from rag.embeddings import search_similar


def _build_query(profile: UserProfile) -> str:
    return (
        f"I am a {profile.age}-year-old {profile.gender} "
        f"{profile.occupation} ({profile.employment_type}) from {profile.state}. "
        f"Monthly income ₹{profile.monthly_income:,.0f}, family size {profile.family_size}. "
        f"I am looking for government schemes, subsidies, insurance and financial benefits I qualify for."
    )


async def retrieve_scheme_ids(profile: UserProfile, top_k: int = 10) -> List[str]:
    """Retrieve scheme_ids relevant to this profile using semantic search."""
    query = _build_query(profile)
    return search_similar(query, top_k=top_k)
