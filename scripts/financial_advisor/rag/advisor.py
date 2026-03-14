"""
rag/advisor.py – RAG Advisor: converts a user profile into scheme recommendations.

Two recommendation modes
------------------------
1. Rule-based (default, no API key required)
   - Builds a natural-language query from the user profile.
   - Retrieves the top ADVISOR_FETCH_K scheme chunks via FAISS.
   - Groups chunks by scheme and checks eligibility using structured fields.
   - Generates a plain-English "why_eligible" explanation from extracted rules.

2. LLM-enhanced (optional, requires OPENAI_API_KEY env var)
   - Uses the same retrieved chunks as context.
   - Passes them together with the user profile to OpenAI Chat Completions.
   - Parses the JSON response for richer narrative recommendations.

The public function `get_recommendations(user_profile)` automatically chooses
the correct mode based on whether USE_LLM is True.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import ADVISOR_FETCH_K, OPENAI_MODEL, USE_LLM
from rag.retriever import retrieve

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Step 1 – Build a natural-language query from the user profile
# ---------------------------------------------------------------------------

def build_profile_query(profile: dict) -> str:
    """
    Convert a structured user profile into a descriptive query string that
    can be sent to the semantic retriever.

    Example output:
        "Government scheme for a 32 year old female, working as farmer,
         annual income 1.8 lakh, residing in Maharashtra."
    """
    parts: list[str] = ["Indian government financial scheme"]

    age = profile.get("age")
    if age:
        parts.append(f"for {age} year old")

    gender = (profile.get("gender") or "").strip().lower()
    if gender and gender not in ("other", "prefer not to say"):
        parts.append(gender)

    occupation = (profile.get("occupation") or "").strip()
    if occupation:
        parts.append(f"working as {occupation}")

    income = profile.get("income")
    if income is not None:
        # Express income in lakh for natural matching with scheme descriptions
        lakh_val = float(income) / 100_000
        parts.append(f"annual income {lakh_val:.1f} lakh rupees")

    state = (profile.get("state") or "").strip()
    if state:
        parts.append(f"in {state}")

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Step 2 – Deduplicate and group retrieved chunks by scheme
# ---------------------------------------------------------------------------

def _group_by_scheme(chunks: list[dict]) -> list[dict]:
    """
    Merge chunks that belong to the same scheme into a single record.
    The record with the highest retrieval score is representative.
    Returns a list sorted by best score descending.
    """
    seen: dict[str, dict] = {}

    for chunk in chunks:
        name = chunk["metadata"].get("scheme_name") or chunk["metadata"].get("source_url", "unknown")
        if name not in seen:
            seen[name] = {
                "scheme_name":            name,
                "best_score":             chunk["score"],
                "metadata":               chunk["metadata"],
                "combined_text":          chunk["text"],
            }
        else:
            # Accumulate text for benefit extraction; keep best score
            seen[name]["combined_text"] += " " + chunk["text"]
            seen[name]["best_score"] = max(seen[name]["best_score"], chunk["score"])

    return sorted(seen.values(), key=lambda r: r["best_score"], reverse=True)


# ---------------------------------------------------------------------------
# Step 3 – Eligibility check (rule-based)
# ---------------------------------------------------------------------------

def _parse_income_number(value: Optional[str]) -> Optional[float]:
    """
    Try to parse an income-limit string like "2,50,000" or "3 lakh" into
    a float (absolute rupee value).  Returns None on failure.
    """
    if not value:
        return None
    value = value.strip().lower()
    try:
        # Remove commas and attempt direct parse
        return float(value.replace(",", ""))
    except ValueError:
        pass
    # Handle "X lakh" format
    import re
    m = re.match(r"([\d.]+)\s*(?:lakh|lakhs|lpa)", value)
    if m:
        return float(m.group(1)) * 100_000
    return None


def check_eligibility(profile: dict, elig_structured: dict) -> dict:
    """
    Compare *profile* against *elig_structured* extracted fields.

    Returns
    -------
    dict with:
        "is_eligible": bool
        "reasons":     list[str]   – bullet-point reasons the user qualifies
        "caveats":     list[str]   – potential mismatches / things to verify
    """
    reasons: list[str] = []
    caveats: list[str] = []

    user_age    = profile.get("age")
    user_income = profile.get("income")
    user_gender = (profile.get("gender") or "all").lower().strip()
    user_state  = (profile.get("state") or "").lower().strip()

    # ---- Age ----
    age_min = elig_structured.get("age_min")
    age_max = elig_structured.get("age_max")
    if user_age is not None:
        if age_min is not None and age_max is not None:
            if age_min <= int(user_age) <= age_max:
                reasons.append(
                    f"Your age ({user_age}) is within the eligible range ({age_min}–{age_max} years)."
                )
            else:
                caveats.append(
                    f"Age requirement is {age_min}–{age_max} years; your age is {user_age}."
                )
        elif age_min is not None:
            if int(user_age) >= age_min:
                reasons.append(f"You meet the minimum age requirement of {age_min} years.")
            else:
                caveats.append(f"Minimum age is {age_min} years; you are {user_age}.")
        elif age_max is not None:
            if int(user_age) <= age_max:
                reasons.append(f"You are within the maximum age limit of {age_max} years.")
            else:
                caveats.append(f"Maximum age is {age_max} years; you are {user_age}.")

    # ---- Income ----
    income_limit_str = elig_structured.get("income_limit")
    income_limit_val = _parse_income_number(income_limit_str)
    if user_income is not None and income_limit_val is not None:
        if float(user_income) <= income_limit_val:
            reasons.append(
                f"Your income (₹{float(user_income):,.0f}) is within the scheme's "
                f"income limit (₹{income_limit_val:,.0f})."
            )
        else:
            caveats.append(
                f"Income limit is ₹{income_limit_val:,.0f}; "
                f"your income is ₹{float(user_income):,.0f}."
            )
    elif income_limit_str:
        # Could not parse numerically – mention it as a note
        caveats.append(
            f"Please verify the income criterion: {income_limit_str}."
        )

    # ---- Gender ----
    elig_gender = elig_structured.get("gender", "all").lower()
    if elig_gender not in ("all", "any", ""):
        if user_gender.startswith(elig_gender) or elig_gender.startswith(user_gender):
            reasons.append(f"This scheme is targeted at {elig_gender}.")
        else:
            caveats.append(
                f"This scheme is primarily for {elig_gender}; your gender is {user_gender}."
            )

    # ---- State ----
    elig_state = elig_structured.get("state", "All India").lower()
    if "all india" in elig_state or "pan india" in elig_state:
        reasons.append("This scheme is available across all Indian states.")
    elif user_state and user_state in elig_state:
        reasons.append(f"This scheme is available in {profile.get('state')}.")
    elif user_state:
        caveats.append(
            f"This scheme is state-specific ({elig_state.title()}); "
            f"you are from {profile.get('state')}."
        )

    # A scheme passes if: no showstopper caveat about age or gender
    # (income/state checks are treated as informational unless restrictive)
    hard_block = any(
        "Age requirement" in c or "Minimum age" in c or "Maximum age" in c
        for c in caveats
    )
    gender_block = any("primarily for" in c for c in caveats)

    is_eligible = not (hard_block or gender_block)
    return {"is_eligible": is_eligible, "reasons": reasons, "caveats": caveats}


# ---------------------------------------------------------------------------
# Step 4 – Format individual recommendation
# ---------------------------------------------------------------------------

def _format_recommendation(scheme_record: dict, eligibility_result: dict) -> dict:
    """Build the final recommendation dict for a single scheme."""
    meta = scheme_record["metadata"]

    # "why_eligible" text
    reasons = eligibility_result["reasons"]
    caveats = eligibility_result["caveats"]
    why_parts: list[str] = []
    if reasons:
        why_parts.extend(reasons)
    if caveats:
        why_parts.append("Note: " + "; ".join(caveats))
    if not why_parts:
        why_parts.append(
            "Based on your profile, you may qualify for this scheme. "
            "Please verify the latest eligibility criteria on the official portal."
        )

    # Prefer the dedicated benefits field; fall back to extracted text snippet
    benefits_text = meta.get("benefits") or _extract_benefits_snippet(
        scheme_record.get("combined_text", "")
    )

    return {
        "scheme_name":    scheme_record["scheme_name"],
        "benefits":       benefits_text or "See official scheme page for details.",
        "why_eligible":   " ".join(why_parts),
        "application_link": meta.get("application_link") or meta.get("source_url", ""),
    }


def _extract_benefits_snippet(text: str, max_words: int = 60) -> str:
    """
    Pull a short snippet from *text* that appears right after a
    'benefits'-related keyword.  Used as a fallback when the metadata
    benefits field is empty.
    """
    import re
    m = re.search(
        r"(?:benefits?|features?|assistance|grant|subsidy)[:\s]+(.+?)(?:\.|$)",
        text, re.IGNORECASE
    )
    if m:
        snippet = m.group(1).strip()
        words = snippet.split()
        return " ".join(words[:max_words])
    return ""


# ---------------------------------------------------------------------------
# Step 5 – LLM-enhanced recommendation (optional)
# ---------------------------------------------------------------------------

def _llm_enhance(
    profile: dict,
    top_schemes: list[dict],
    retrieved_context: str,
) -> list[dict]:
    """
    Call OpenAI Chat Completions to generate richer recommendations.
    Falls back to rule-based output on any error.
    """
    try:
        from openai import OpenAI
        client = OpenAI()   # reads OPENAI_API_KEY from environment
    except ImportError:
        logger.warning("openai package not installed – LLM enhancement disabled.")
        return top_schemes

    profile_str = (
        f"Age: {profile.get('age')}, "
        f"Gender: {profile.get('gender')}, "
        f"Income: ₹{float(profile.get('income', 0)):,.0f}/year, "
        f"Occupation: {profile.get('occupation')}, "
        f"State: {profile.get('state')}"
    )

    scheme_names = "\n".join(
        f"- {s['scheme_name']}: {s['benefits'][:200]}"
        for s in top_schemes
    )

    prompt = f"""You are an Indian government financial advisor.

User profile: {profile_str}

Retrieved scheme information:
{retrieved_context[:3000]}

Based on the above, return a JSON array of up to 5 recommended schemes:
[
  {{
    "scheme_name": "<name>",
    "benefits": "<2–3 sentence summary of key benefits>",
    "why_eligible": "<personalised explanation for this user>",
    "application_link": "<URL or empty string>"
  }},
  ...
]
Return ONLY the JSON array, no other text."""

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
        )
        content = response.choices[0].message.content or "[]"
        # Strip markdown code fences if present
        import re
        content = re.sub(r"^```(?:json)?\s*", "", content.strip())
        content = re.sub(r"\s*```$", "", content)
        recommendations = json.loads(content)
        if isinstance(recommendations, list):
            return recommendations
    except Exception as exc:
        logger.warning("LLM enhancement failed (%s) – using rule-based output.", exc)

    return top_schemes


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def get_recommendations(user_profile: dict, top_n: int = 5) -> list[dict]:
    """
    Generate personalised scheme recommendations for a user profile.

    Parameters
    ----------
    user_profile
        Dict with keys: age (int), gender (str), income (float),
        occupation (str), state (str).
    top_n
        Maximum number of schemes to return.

    Returns
    -------
    list[dict]
        Each element:
        {
            "scheme_name":     str,
            "benefits":        str,
            "why_eligible":    str,
            "application_link": str,
        }
    """
    # 1. Build retrieval query
    query       = build_profile_query(user_profile)
    logger.info("Retrieval query: %s", query)

    # 2. Retrieve chunks
    raw_chunks  = retrieve(query, top_k=ADVISOR_FETCH_K)
    if not raw_chunks:
        logger.warning("No chunks retrieved – the FAISS index may be empty.")
        return []

    # 3. Group by scheme and take top candidates
    scheme_groups = _group_by_scheme(raw_chunks)[:top_n * 2]  # over-fetch then filter

    # 4. Check eligibility and build recommendations
    recommendations: list[dict] = []
    for grp in scheme_groups:
        elig_result = check_eligibility(
            user_profile,
            grp["metadata"].get("eligibility_structured", {}),
        )
        if elig_result["is_eligible"]:
            recommendations.append(_format_recommendation(grp, elig_result))
        if len(recommendations) >= top_n:
            break

    # If strict filtering removed everything, fall back to top retrieval results
    if not recommendations:
        logger.info(
            "Strict eligibility filter removed all results – returning top retrieved schemes."
        )
        for grp in scheme_groups[:top_n]:
            elig_result = {"is_eligible": True, "reasons": [], "caveats": []}
            recommendations.append(_format_recommendation(grp, elig_result))

    # 5. Optionally enhance with LLM
    if USE_LLM and recommendations:
        combined_context = "\n\n".join(c.get("combined_text", c["text"])  # type: ignore
                                       for c in raw_chunks[:10]
                                       if isinstance(c, dict))
        recommendations = _llm_enhance(user_profile, recommendations, combined_context)

    return recommendations[:top_n]
