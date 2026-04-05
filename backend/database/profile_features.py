from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Tuple


FIELD_LABELS = {
    "full_name": "your name",
    "email": "your email",
    "age": "your age",
    "age_confirmed": "age confirmation",
    "age_band": "your age band",
    "marital_status": "your marital status",
    "minority_status": "whether you belong to a minority community",
    "disability_status": "your disability status",
    "disability_percentage": "your disability percentage",
    "state": "your state",
    "city": "your city",
    "district": "your district",
    "urban_rural": "whether your residence is urban or rural",
    "domicile_years": "your domicile duration",
    "aspirational_district": "whether you are in an aspirational district",
    "special_region_flag": "special region flag",
    "employment_type": "your employment type",
    "occupation_subtype": "your occupation subtype",
    "sector": "your livelihood sector",
    "employment_proof_available": "employment proof availability",
    "education_level": "your education level",
    "student_status": "your student status",
    "institution_type": "your institution type",
    "course_stream": "your course stream",
    "household_size": "your household size",
    "dependent_children": "dependent children in household",
    "senior_citizens_in_household": "senior citizens in household",
    "single_woman_led_household": "single woman-led household status",
    "housing_status": "your housing status",
    "housing_ownership_type": "your housing ownership type",
    "pmay_eligible": "PMAY eligibility hint",
    "monthly_income": "your monthly income",
    "income_range": "your income range",
    "income_regular": "whether your income is regular",
    "earning_members": "number of earning members",
    "has_bank_account": "whether you have a bank account",
    "jan_dhan_account": "whether you have a Jan Dhan account",
    "has_aadhaar": "Aadhaar availability",
    "has_pan": "PAN availability",
    "monthly_expenses": "your monthly expenses",
    "total_savings": "your savings balance",
    "total_debts": "your debts",
    "existing_loans": "your loans",
    "landholding_acres": "your landholding size",
    "irrigation_status": "your irrigation status",
    "has_life_insurance": "life insurance",
    "has_health_insurance": "health insurance",
    "enrolled_pmjjby": "PMJJBY enrollment",
    "enrolled_pmsby": "PMSBY enrollment",
    "enrolled_apy": "APY enrollment",
    "enrolled_esic": "ESIC enrollment",
    "enrolled_epfo": "EPFO enrollment",
    "application_history_status": "scheme application history",
    "benefit_cap_reached": "benefit cap status",
    "has_ration_card": "ration card availability",
    "has_caste_certificate": "caste certificate availability",
    "has_disability_certificate": "disability certificate availability",
    "has_income_certificate": "income certificate availability",
    "has_domicile_certificate": "domicile certificate availability",
    "has_bank_passbook": "bank passbook availability",
    "has_ppf": "PPF",
    "has_fd": "fixed deposits",
    "has_mutual_funds": "mutual funds",
    "has_gold_investments": "gold investments",
    "financial_goals": "your financial goals",
    "investment_experience": "your investment experience",
    "has_land": "land ownership",
}

LAYER_FIELDS = {
    "identity": [
        "full_name", "email", "age", "age_confirmed", "age_band", "gender", "marital_status", "caste_category",
        "minority_status", "disability_status", "disability_percentage", "state", "city", "district", "urban_rural",
        "domicile_years", "aspirational_district", "special_region_flag",
    ],
    "income": [
        "employment_type", "occupation_subtype", "sector", "employment_proof_available", "education_level", "student_status",
        "institution_type", "course_stream", "monthly_income", "income_range", "income_regular", "earning_members",
        "has_bank_account", "jan_dhan_account", "has_aadhaar", "has_pan",
    ],
    "assets": [
        "household_size", "dependent_children", "senior_citizens_in_household", "single_woman_led_household",
        "housing_status", "housing_ownership_type", "pmay_eligible", "monthly_expenses", "total_savings", "total_debts",
        "existing_loans", "has_land", "landholding_acres", "irrigation_status", "has_life_insurance", "has_health_insurance",
        "enrolled_pmjjby", "enrolled_pmsby", "enrolled_apy", "enrolled_esic", "enrolled_epfo", "has_ppf", "has_fd",
        "has_mutual_funds", "has_gold_investments",
    ],
    "goals": [
        "financial_goals", "investment_experience", "application_history_status", "benefit_cap_reached", "has_ration_card",
        "has_caste_certificate", "has_disability_certificate", "has_income_certificate", "has_domicile_certificate",
        "has_bank_passbook",
    ],
}

LAYER_ORDER = ["identity", "income", "assets", "goals"]

LAYER_DESCRIPTIONS = {
    "identity": "Identity & life stage",
    "income": "Income & cash flow",
    "assets": "Assets & liabilities",
    "goals": "Goals & preferences",
}

FIELD_TAGS = {
    "employment_type": lambda value: [f"employment_{str(value).lower()}"] if value else [],
    "state": lambda value: [f"state_{slugify(value)}"] if value else [],
    "city": lambda value: [f"city_{slugify(value)}"] if value else [],
    "income_range": lambda value: [f"income_range_{slugify(value)}"] if value else [],
    "income_regular": lambda value: ["income_fixed" if value else "income_irregular"] if value is not None else [],
    "has_bank_account": lambda value: ["banked"] if value else ["unbanked"] if value is False else [],
    "has_land": lambda value: ["land_owner"] if value else [],
    "housing_status": lambda value: [f"housing_{slugify(value)}"] if value else [],
    "has_life_insurance": lambda value: ["life_insured"] if value else [],
    "has_health_insurance": lambda value: ["health_insured"] if value else [],
    "has_ppf": lambda value: ["has_ppf"] if value else [],
    "has_fd": lambda value: ["has_fd"] if value else [],
    "has_mutual_funds": lambda value: ["has_mutual_funds"] if value else [],
    "has_gold_investments": lambda value: ["has_gold"] if value else [],
    "financial_goals": lambda value: [f"goal_{slugify(goal)}" for goal in value] if isinstance(value, list) else [],
    "investment_experience": lambda value: ["investor_beginner" if int(value or 0) < 3 else "investor_intermediate" if int(value or 0) < 7 else "investor_advanced"],
}

UNLOCKS_BY_LAYER = {
    "identity": ["scheme_eligibility"],
    "income": ["budgeting", "saving_tips"],
    "assets": ["net_worth_tracking", "insurance_gaps", "portfolio_insights"],
    "goals": ["goal_based_planning", "personalized_ai_tips"],
}

NEXT_PROMPT_BY_LAYER = {
    "identity": "Tell us your age, gender, state, and employment type so we can filter the right schemes.",
    "income": "Tell us your income range and whether it is regular so we can tailor budgets.",
    "assets": "Tell us about savings, loans, and insurance to improve recommendations.",
    "goals": "Tell us your goals so every tip can map to a purpose.",
}


def slugify(value: Any) -> str:
    text = str(value).strip().lower()
    text = text.replace("&", "and")
    text = "".join(ch if ch.isalnum() else "_" for ch in text)
    while "__" in text:
        text = text.replace("__", "_")
    return text.strip("_")


def is_filled(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, list):
        return len(value) > 0
    return True


def profile_layer(profile: Dict[str, Any]) -> str:
    layer_scores = []
    for layer in LAYER_ORDER:
        fields = LAYER_FIELDS[layer]
        filled = sum(1 for field in fields if is_filled(profile.get(field)))
        layer_scores.append((filled / max(len(fields), 1), layer))
    layer_scores.sort(key=lambda item: item[0])
    return layer_scores[-1][1] if layer_scores else "identity"


def completeness_score(profile: Dict[str, Any]) -> int:
    all_fields = [field for layer in LAYER_ORDER for field in LAYER_FIELDS[layer]]
    filled = sum(1 for field in all_fields if is_filled(profile.get(field)))
    return int(round((filled / max(len(all_fields), 1)) * 100))


def missing_fields(profile: Dict[str, Any]) -> List[str]:
    current_layer = profile_layer(profile)
    current_index = LAYER_ORDER.index(current_layer)
    ordered_layers = LAYER_ORDER[current_index:]

    missing: List[str] = []
    for layer in ordered_layers:
        for field in LAYER_FIELDS[layer]:
            if not is_filled(profile.get(field)):
                missing.append(FIELD_LABELS.get(field, field.replace("_", " ")))
    return missing


def profile_tags(profile: Dict[str, Any]) -> List[str]:
    tags: List[str] = []
    for field, tag_fn in FIELD_TAGS.items():
        tags.extend(tag_fn(profile.get(field)))

    age = profile.get("age")
    if is_filled(age):
        try:
            age_value = int(age)
            if age_value < 18:
                tags.append("age_under_18")
            elif age_value <= 24:
                tags.append("age_18_24")
            elif age_value <= 34:
                tags.append("age_25_34")
            elif age_value <= 44:
                tags.append("age_35_44")
            elif age_value <= 54:
                tags.append("age_45_54")
            else:
                tags.append("age_55_plus")
        except Exception:
            pass

    income = profile.get("monthly_income") or 0
    try:
        income_value = float(income)
        if income_value <= 25000:
            tags.append("income_low")
        elif income_value <= 50000:
            tags.append("income_mid")
        elif income_value <= 100000:
            tags.append("income_upper_mid")
        else:
            tags.append("income_high")
    except Exception:
        pass

    return sorted(set(tags))


def unlocked_capabilities(profile: Dict[str, Any]) -> List[str]:
    current_layer = profile_layer(profile)
    unlocked: List[str] = []
    for layer in LAYER_ORDER:
        unlocked.extend(UNLOCKS_BY_LAYER[layer])
        if layer == current_layer:
            break
    return sorted(set(unlocked))


def summarize_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    layer = profile_layer(profile)
    return {
        "profile_completeness": completeness_score(profile),
        "profile_layer": LAYER_DESCRIPTIONS.get(layer, layer),
        "profile_tags": profile_tags(profile),
        "missing_fields": missing_fields(profile),
        "unlocked_capabilities": unlocked_capabilities(profile),
        "next_prompt": NEXT_PROMPT_BY_LAYER.get(layer),
    }


def enrich_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    return {**profile, **summarize_profile(profile)}
