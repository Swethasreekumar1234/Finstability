from __future__ import annotations
import re
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


def _clean_text(value: str | None) -> str:
    if not value:
        return ""

    cleaned = value
    # Replace unicode dashes/bullets that can render as odd symbols on some devices.
    cleaned = cleaned.replace("–", "-").replace("—", "-").replace("•", ", ")
    # Expand common finance shorthand for readability.
    cleaned = re.sub(r"\bu/s\b", "under Section", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bL\b", "lakh", cleaned)
    # Collapse extra whitespace introduced by replacements.
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


TA_SCHEME_COPY: Dict[str, Dict[str, str]] = {
    "pmjdy": {
        "scheme_name": "பி.எம். ஜன்தன் யோஜனா (PMJDY)",
        "ministry": "நிதி அமைச்சகம்",
        "description": "பூஜ்ய இருப்பு வங்கி கணக்கு, ரூபே டெபிட் அட்டை, மற்றும் விபத்து காப்பீடு வழங்கும் தேசிய நிதி சேர்க்கை திட்டம்.",
        "benefits": "பூஜ்ய இருப்பு கணக்கு, ரூபே டெபிட் அட்டை, ₹2 லட்சம் விபத்து காப்பீடு, ₹10,000 ஓவர்டிராஃப்ட்.",
        "eligibility": "வங்கி கணக்கு இல்லாத 10 வயதுக்கு மேற்பட்ட இந்திய குடிமக்கள்.",
    },
    "pmkisan": {
        "scheme_name": "பிரதான் மந்திரி கிசான் சம்மான் நிதி",
        "ministry": "வேளாண்மை அமைச்சகம்",
        "description": "சிறு மற்றும் எல்லை விவசாயி குடும்பங்களுக்கு வருடத்திற்கு ₹6,000 நேரடி வருமான உதவி வழங்கும் திட்டம்.",
        "benefits": "வருடத்திற்கு ₹6,000, மூன்று தவணைகளில் நேரடி வங்கி பரிமாற்றம்.",
        "eligibility": "சாகுபடி நிலம் வைத்துள்ள சிறு மற்றும் எல்லை விவசாயி குடும்பங்கள்.",
    },
    "pmsby": {
        "scheme_name": "பி.எம். சுரக்ஷா பீமா யோஜனா (PMSBY)",
        "ministry": "நிதி அமைச்சகம்",
        "description": "விபத்து மரணம் அல்லது நிரந்தர ஊனமுற்ற நிலைக்கு குறைந்த பிரீமியத்தில் காப்பீடு வழங்கும் திட்டம்.",
        "benefits": "₹2 லட்சம் வரை காப்பீடு; பகுதி ஊனமுற்ற நிலைக்கு ₹1 லட்சம்.",
        "eligibility": "18 முதல் 70 வயதுள்ள வங்கி கணக்கு வைத்திருப்பவர்கள்.",
    },
    "pmjjby": {
        "scheme_name": "பி.எம். ஜீவன் ஜ்யோதி பீமா யோஜனா (PMJJBY)",
        "ministry": "நிதி அமைச்சகம்",
        "description": "வங்கி கணக்கு வைத்திருப்பவர்களுக்கு குறைந்த பிரீமியத்தில் உயிர் காப்பீடு வழங்கும் திட்டம்.",
        "benefits": "₹2 லட்சம் உயிர் காப்பீடு.",
        "eligibility": "18 முதல் 50 வயதுள்ள வங்கி கணக்கு வைத்திருப்பவர்கள்.",
    },
    "atal_pension": {
        "scheme_name": "அடல் ஓய்வூதிய திட்டம்",
        "ministry": "நிதி அமைச்சகம்",
        "description": "அமைப்புசாரா துறை தொழிலாளர்களுக்கான உறுதியான மாதாந்திர ஓய்வூதியத் திட்டம்.",
        "benefits": "60 வயதுக்குப் பிறகு ₹1,000 முதல் ₹5,000 வரை உறுதியான மாத ஓய்வூதியம்.",
        "eligibility": "18 முதல் 40 வயதுள்ள, வங்கி கணக்கு கொண்ட இந்திய குடிமக்கள்.",
    },
    "pmmvy": {
        "scheme_name": "பிரதான் மந்திரி மாத்ரு வந்தனா யோஜனா (PMMVY)",
        "ministry": "பெண்கள் மற்றும் குழந்தைகள் மேம்பாட்டு அமைச்சகம்",
        "description": "கர்ப்பிணி மற்றும் பாலூட்டும் தாய்மார்களுக்கு முதல் குழந்தை பிறப்புக்கான நிதி உதவி.",
        "benefits": "தவணைகளாக ₹5,000 நிதி உதவி.",
        "eligibility": "19 வயதுக்கு மேற்பட்ட முதல் குழந்தை பெற்ற கர்ப்பிணி/பாலூட்டும் பெண்கள்.",
    },
    "pmay_urban": {
        "scheme_name": "பிரதான் மந்திரி ஆவாஸ் யோஜனா - நகரம் (PMAY-U)",
        "ministry": "வீட்டு மற்றும் நகர்ப்புற விவகார அமைச்சகம்",
        "description": "நகர்ப்புற வீடு வாங்குபவர்களுக்கான வட்டி தள்ளுபடி திட்டம்.",
        "benefits": "வீட்டுக்கடனில் ₹2.67 லட்சம் வரை வட்டி தள்ளுபடி.",
        "eligibility": "நகர்ப்புற முதன்மை வீடு வாங்குபவர்கள்; மாத வருமானம் ₹1.5 லட்சத்துக்கு கீழ்.",
    },
    "mudra": {
        "scheme_name": "பி.எம். முத்ரா யோஜனா (PMMY)",
        "ministry": "நிதி அமைச்சகம்",
        "description": "சிறு தொழில் முனைவோர்களுக்கான குறைந்த வட்டி மைக்ரோ கடன் திட்டம்.",
        "benefits": "₹50 ஆயிரம் முதல் ₹10 லட்சம் வரை கடன் வாய்ப்பு.",
        "eligibility": "நிறுவனம் அல்லாத சிறு தொழில் மற்றும் மைக்ரோ நிறுவனங்கள்.",
    },
    "stand_up_india": {
        "scheme_name": "ஸ்டாண்ட்-அப் இந்தியா திட்டம்",
        "ministry": "நிதி அமைச்சகம்",
        "description": "பெண்கள், SC/ST தொழில்முனைவோருக்கான பச்சை-புலம் தொழில் அமைப்பு கடன் திட்டம்.",
        "benefits": "₹10 லட்சம் முதல் ₹1 கோடி வரை வங்கிக் கடன்.",
        "eligibility": "18 வயதுக்கு மேற்பட்ட SC/ST அல்லது பெண்கள் தொழில்முனைவோர்.",
    },
    "nsc": {
        "scheme_name": "தேசிய சேமிப்பு சான்றிதழ் (NSC)",
        "ministry": "நிதி அமைச்சகம்",
        "description": "அரசு ஆதரவு கொண்ட பாதுகாப்பான நிலையான வருமான சேமிப்பு திட்டம்.",
        "benefits": "வருடத்திற்கு 7.7% வட்டி; பிரிவு 80C வரிவிலக்கு.",
        "eligibility": "18 வயது மேற்பட்ட இந்திய குடிமக்கள்.",
    },
    "scss": {
        "scheme_name": "மூத்த குடிமக்கள் சேமிப்பு திட்டம் (SCSS)",
        "ministry": "நிதி அமைச்சகம்",
        "description": "மூத்த குடிமக்களுக்கான உயர்வட்டி சேமிப்பு திட்டம்.",
        "benefits": "8.2% வருடாந்திர வட்டி, காலாண்டு வருமானம்.",
        "eligibility": "60 வயது மேற்பட்ட இந்திய குடிமக்கள்.",
    },
    "ssy": {
        "scheme_name": "சுகன்யா சம்ரித்தி யோஜனா (SSY)",
        "ministry": "நிதி அமைச்சகம்",
        "description": "பெண் குழந்தையின் கல்வி மற்றும் திருமணத்திற்கான உயர்வட்டி சேமிப்பு திட்டம்.",
        "benefits": "8.2% வருடாந்திர வட்டி, வரிவிலக்கு, வரிவிலக்கு பெற்ற காலாவதி தொகை.",
        "eligibility": "10 வயதிற்குக் கீழ் உள்ள பெண் குழந்தையின் பெற்றோர் அல்லது பாதுகாவலர்.",
    },
    "pmay_gramin": {
        "scheme_name": "பிரதான் மந்திரி ஆவாஸ் யோஜனா - கிராமம் (PMAY-G)",
        "ministry": "கிராம வளர்ச்சி அமைச்சகம்",
        "description": "கிராமப்புற குடும்பங்களுக்கு வீடு கட்ட உதவும் வீட்டு உதவித் திட்டம்.",
        "benefits": "புதி்னா வீடு கட்ட ₹1.2 லட்சம் அல்லது ₹1.3 லட்சம் வரை உதவி.",
        "eligibility": "குச்சா அல்லது பழுதடைந்த வீட்டில் வாழும் கிராமப்புற குடும்பங்கள்.",
    },
    "pm_ujjwala": {
        "scheme_name": "பி.எம். உஜ்ஜ்வலா யோஜனா (PMUY)",
        "ministry": "பெட்ரோலியம் மற்றும் இயற்கை எரிவாயு அமைச்சகம்",
        "description": "பின்தங்கிய குடும்பங்களின் பெண்களுக்கு இலவச எல்பிஜி இணைப்பு வழங்கும் திட்டம்.",
        "benefits": "இலவச எல்பிஜி இணைப்பு மற்றும் முதல் நிரப்பு உதவி.",
        "eligibility": "BPL/SC/ST குடும்பங்களைச் சேர்ந்த பெண்கள்; மாத வருமானம் ₹2,500க்கும் கீழ்.",
    },
    "ayushman_bharat": {
        "scheme_name": "ஆயுஷ்மான் பாரத் - PM-JAY",
        "ministry": "சுகாதாரம் மற்றும் குடும்ப நல அமைச்சகம்",
        "description": "பயனற்ற மற்றும் நடுத்தர நிலை மருத்துவமனை சிகிச்சைக்கு குடும்ப அடிப்படையிலான சுகாதாரக் காப்பீடு.",
        "benefits": "ஒரு குடும்பத்திற்கு வருடத்திற்கு ₹5 லட்சம் வரை சுகாதாரக் காப்பீடு.",
        "eligibility": "SECC தரவு / BPL குடும்பங்கள்; மாத வருமானம் ₹4,200க்கு கீழ்.",
    },
    "e_shram": {
        "scheme_name": "e-SHRAM பதிவு",
        "ministry": "தொழில் மற்றும் வேலைவாய்ப்பு அமைச்சகம்",
        "description": "அமைப்புசாரா தொழிலாளர்களுக்கான தேசிய தரவுத்தளம் மற்றும் சமூக பாதுகாப்பு பதிவு.",
        "benefits": "₹2 லட்சம் விபத்து காப்பீடு மற்றும் எதிர்கால நலன்கள் அணுகல்.",
        "eligibility": "EPFO/ESIC பாதுகாப்பு இல்லாத 16 முதல் 59 வயது அமைப்புசாரா தொழிலாளர்கள்.",
    },
    "nps_all": {
        "scheme_name": "தேசிய ஓய்வூதிய அமைப்பு (NPS) - அனைத்து குடிமக்கள்",
        "ministry": "நிதி அமைச்சகம்",
        "description": "சந்தை இணைப்புடைய வருமானமும் வரிவிலக்கும் கொண்ட ஓய்வூதிய சேமிப்பு திட்டம்.",
        "benefits": "₹1.5 லட்சம் 80C விலக்கு + கூடுதல் ₹50,000 80CCD(1B) விலக்கு.",
        "eligibility": "18 முதல் 70 வயதுள்ள இந்திய குடிமக்கள்.",
    },
    "startup_india_seed": {
        "scheme_name": "ஸ்டார்ட்அப் இந்தியா சீட் ஃபண்ட் திட்டம்",
        "ministry": "வர்த்தகம் மற்றும் தொழில் அமைச்சகம்",
        "description": "ஆரம்ப நிலை ஸ்டார்ட்அப்களுக்கு புரூஃப் ஆப் கான்செப்ட், ப்ரொடோடைப் மற்றும் சந்தை நுழைவுக்கு உதவி.",
        "benefits": "₹20 லட்சம் வரை உதவி; சந்தை நுழைவுக்கு ₹50 லட்சம் வரை ஆதரவு.",
        "eligibility": "இந்தியாவில் பதிவு செய்யப்பட்ட, 2 ஆண்டிற்குள் உருவான DPIIT அங்கீகரிக்கப்பட்ட ஸ்டார்ட்அப்கள்.",
    },
    "kcc": {
        "scheme_name": "கிசான் கிரெடிட் கார்ட் (KCC)",
        "ministry": "வேளாண்மை அமைச்சகம்",
        "description": "விவசாய தேவைகளுக்கான எளிதான குறுகிய கால கடன் திட்டம்.",
        "benefits": "₹3 லட்சம் வரை கடன்; 7% வட்டி (சுமார் 4% பயன்தர வட்டி).",
        "eligibility": "விவசாயிகள், குத்தகை விவசாயிகள், பகிர்மான பயிர் செய்பவர்கள்.",
    },
    "mgnregs": {
        "scheme_name": "MGNREGS (NREGA) - கிராமப்புற வேலைவாய்ப்பு",
        "ministry": "கிராம வளர்ச்சி அமைச்சகம்",
        "description": "கிராமப்புற குடும்பங்களுக்கு வருடத்திற்கு 100 நாள் கூலி வேலை உறுதி செய்கிறது.",
        "benefits": "வருடத்திற்கு 100 நாள் வேலை; மாநில அறிவித்த கூலி.",
        "eligibility": "கிராமப்புற குடும்பங்களில் உள்ள பெரியவர்கள், குறைந்த திறன் உடலுழைப்புக்கு தயாராக இருப்பவர்கள்.",
    },
}


def _clean_scheme_text(rec, language: str = "en"):
    rec.scheme.scheme_name = _clean_text(rec.scheme.scheme_name)
    rec.scheme.ministry = _clean_text(rec.scheme.ministry)
    rec.scheme.description = _clean_text(rec.scheme.description)
    rec.scheme.benefits = _clean_text(rec.scheme.benefits)
    rec.scheme.eligibility = _clean_text(rec.scheme.eligibility)

    if language == "ta":
        localized = TA_SCHEME_COPY.get(rec.scheme.scheme_id)
        if localized:
            rec.scheme.scheme_name = localized["scheme_name"]
            rec.scheme.ministry = localized["ministry"]
            rec.scheme.description = localized["description"]
            rec.scheme.benefits = localized["benefits"]
            rec.scheme.eligibility = localized["eligibility"]
        rec.reason = f"{rec.scheme.scheme_name} உங்கள் சுயவிவரத்துடன் பொருந்துகிறது."


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
        language = (effective_profile.language or profile.language or "en").lower()
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

        for rec in eligible:
            _clean_scheme_text(rec, language)

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