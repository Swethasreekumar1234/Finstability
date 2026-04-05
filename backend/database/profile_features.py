from __future__ import annotations
from typing import Any, Dict, List, Optional

# Human-readable labels for the UI and "Missing Fields" list
FIELD_LABELS = {
    # Identity Layer
    "full_name": "your name",
    "email": "your email",
    "age": "your age",
    "gender": "your gender",
    "marital_status": "your marital status",
    "state": "your state",
    "caste_category": "your caste category",  # ENRICHMENT FIELD
    
    # Income Layer
    "employment_type": "your employment type",
    "monthly_income": "your monthly income",
    "has_bank_account": "whether you have a bank account", # ENRICHMENT FIELD
    "has_aadhaar": "Aadhaar availability",
    "has_pan": "PAN availability",
    
    # Assets Layer
    "owns_land": "agricultural land ownership", # ENRICHMENT FIELD
    "has_health_insurance": "health insurance status", # ENRICHMENT FIELD
    "has_life_insurance": "life insurance status", # ENRICHMENT FIELD
    "total_savings": "your savings balance",
    "total_debts": "your total debts",
    
    # Goals Layer
    "financial_goals": "your financial goals",
    "has_ration_card": "ration card availability",
}

# Organizes the flow of questions. The app moves from Identity -> Income -> Assets -> Goals
LAYER_FIELDS = {
    "identity": [
        "full_name", "age", "gender", "state", "caste_category"
    ],
    "income": [
        "employment_type", "monthly_income", "has_bank_account", "has_aadhaar"
    ],
    "assets": [
        "owns_land", "has_health_insurance", "has_life_insurance", "total_savings", "total_debts"
    ],
    "goals": [
        "financial_goals", "has_ration_card"
    ],
}

LAYER_ORDER = ["identity", "income", "assets", "goals"]

LAYER_DESCRIPTIONS = {
    "identity": "Identity & Life Stage",
    "income": "Income & Cash Flow",
    "assets": "Assets & Liabilities",
    "goals": "Goals & Preferences",
}

# --- PERSONALIZATION TAGS ---
# This logic converts user answers into "Tags". 
# The Recommendation Engine looks for these tags to boost schemes.
FIELD_TAGS = {
    "employment_type": lambda value: [f"employment_{str(value).lower()}"] if value else [],
    "state": lambda value: [f"state_{slugify(value)}"] if value else [],
    "has_bank_account": lambda value: ["banked"] if value is True else ["unbanked"] if value is False else [],
    "owns_land": lambda value: ["land_owner"] if value is True else ["landless"] if value is False else [],
    "has_health_insurance": lambda value: ["health_insured"] if value is True else ["health_uninsured"] if value is False else [],
    "has_life_insurance": lambda value: ["life_insured"] if value is True else ["life_uninsured"] if value is False else [],
    "caste_category": lambda value: [f"caste_{str(value).lower()}"] if value else [],
}

def slugify(value: Any) -> str:
    text = str(value).strip().lower()
    text = "".join(ch if ch.isalnum() else "_" for ch in text)
    return text.strip("_")

def is_filled(value: Any) -> bool:
    """Check if a profile field has a meaningful value."""
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, bool):
        return True # Even 'False' counts as an answer/filled
    if isinstance(value, (int, float)):
        return True
    return False

def profile_layer(profile: Dict[str, Any]) -> str:
    """Determines which layer the user is currently working on."""
    for layer in LAYER_ORDER:
        fields = LAYER_FIELDS[layer]
        # If any field in this layer is missing, this is the current layer
        if any(not is_filled(profile.get(f)) for f in fields):
            return layer
    return "goals"

def completeness_score(profile: Dict[str, Any]) -> int:
    """Calculates % of profile filled."""
    all_fields = [f for layer in LAYER_FIELDS.values() for f in layer]
    filled = sum(1 for f in all_fields if is_filled(profile.get(f)))
    return int(round((filled / len(all_fields)) * 100))

def missing_fields(profile: Dict[str, Any]) -> List[str]:
    """
    Returns a list of fields (by label) that are not yet filled, 
    starting from the user's current layer.
    """
    current_layer = profile_layer(profile)
    start_index = LAYER_ORDER.index(current_layer)
    remaining_layers = LAYER_ORDER[start_index:]

    missing = []
    for layer in remaining_layers:
        for field in LAYER_FIELDS[layer]:
            if not is_filled(profile.get(field)):
                missing.append(FIELD_LABELS.get(field, field))
    return missing

def profile_tags(profile: Dict[str, Any]) -> List[str]:
    """Generates a list of strings used by the Schemes Recommend engine."""
    tags = []
    for field, tag_fn in FIELD_TAGS.items():
        tags.extend(tag_fn(profile.get(field)))
    
    # Add age-based tags
    age = profile.get("age")
    if is_filled(age):
        age_val = int(age)
        if age_val < 18: tags.append("minor")
        elif age_val >= 60: tags.append("senior_citizen")

    return sorted(set(tags))

def summarize_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Standardizes the summary object sent to the Mobile App."""
    layer = profile_layer(profile)
    return {
        "profile_completeness": completeness_score(profile),
        "profile_layer": LAYER_DESCRIPTIONS.get(layer, layer),
        "profile_tags": profile_tags(profile),
        "missing_fields": missing_fields(profile),
        "next_prompt": f"Please tell us {missing_fields(profile)[0]}" if missing_fields(profile) else "Profile Complete!",
    }

def enrich_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Main entry point: Merges raw profile data with computed summary data."""
    return {**profile, **summarize_profile(profile)}