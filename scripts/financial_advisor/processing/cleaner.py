"""
processing/cleaner.py – Data cleaning and structured field extraction.

This module takes the raw JSON produced by the scraper and:
  1. Strips any residual HTML tags from every text field.
  2. Normalises whitespace and Unicode characters.
  3. Parses the free-text eligibility string into structured sub-fields:
       - income_limit   (str)  e.g. "2,50,000"
       - age_range      (str)  e.g. "18-60"
       - age_min        (int)
       - age_max        (int)
       - gender         (str)  "all" | "women" | "men"
       - state          (str)  "All India" or a specific state name
  4. Outputs a list of clean, structured scheme records.
"""

from __future__ import annotations

import json
import logging
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup

# Ensure financial_advisor/ is on sys.path when run standalone
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import PROCESSED_SCHEMES_FILE, RAW_SCHEMES_FILE

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Indian states and union territories for state-matching
# ---------------------------------------------------------------------------
INDIAN_STATES = [
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
    "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya",
    "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim",
    "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand",
    "west bengal",
    # Union Territories
    "andaman and nicobar", "chandigarh", "dadra and nagar haveli",
    "daman and diu", "delhi", "jammu and kashmir", "ladakh", "lakshadweep",
    "puducherry",
]


# ---------------------------------------------------------------------------
# HTML / whitespace normalisation
# ---------------------------------------------------------------------------

def strip_html(text: str) -> str:
    """
    Remove all HTML tags from *text* using BeautifulSoup.
    Handles malformed HTML gracefully.
    """
    if not text:
        return ""
    return BeautifulSoup(text, "html.parser").get_text(separator=" ")


def normalise_whitespace(text: str) -> str:
    """
    Collapse multiple spaces/newlines/tabs into a single space and strip
    leading/trailing whitespace.
    Also normalise unicode (NFC) to resolve encoding artefacts from scraped pages.
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    # Replace various dash/quote variants with ASCII equivalents
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_text(text: str) -> str:
    """Strip HTML then normalise whitespace."""
    return normalise_whitespace(strip_html(text))


# ---------------------------------------------------------------------------
# Structured eligibility field extraction
# ---------------------------------------------------------------------------

# ---- Income limit --------------------------------------------------------

# Matches patterns like:
#   "below Rs. 2,50,000", "upto INR 3 lakh", "annual income not exceeding 8 LPA",
#   "household income < 2.5 lakhs", "up to ₹6 lakh per annum"
_INCOME_PATTERN = re.compile(
    r"(?:below|upto|up to|not exceeding|less than|under|<)\s*"
    r"(?:rs\.?|inr|₹)?\s*"
    r"([\d,]+(?:\.\d+)?)\s*"
    r"(lakh|lakhs|lpa|crore|crores)?",
    re.IGNORECASE,
)
# Standalone: "Rs. 2,50,000 per year"
_INCOME_AMOUNT_PATTERN = re.compile(
    r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|lpa|crore|crores)?",
    re.IGNORECASE,
)


def _extract_income_limit(text: str) -> Optional[str]:
    """
    Return a normalised income-limit string if found, e.g. "2,50,000" or "3 lakh".
    Returns None when no income criterion is detected.
    """
    for pattern in (_INCOME_PATTERN, _INCOME_AMOUNT_PATTERN):
        m = pattern.search(text)
        if m:
            amount = m.group(1)
            unit   = (m.group(2) or "").strip().lower()
            # Normalise lakh → actual number for uniform comparison
            if unit in ("lakh", "lakhs", "lpa"):
                try:
                    val = float(amount.replace(",", "")) * 100_000
                    return f"{int(val):,}"
                except ValueError:
                    pass
            return f"{amount} {unit}".strip() if unit else amount
    return None


# ---- Age range ------------------------------------------------------------

# Handles: "18 to 60 years", "between 21 and 65", "above 18", "up to 60 years"
_AGE_RANGE_PATTERN = re.compile(
    r"(?:age|aged)\s*(?:between\s*)?(\d{1,3})\s*(?:to|-|and)\s*(\d{1,3})\s*years?",
    re.IGNORECASE,
)
_AGE_MIN_PATTERN = re.compile(
    r"(?:above|minimum|at least|over|more than)\s*(\d{1,3})\s*years?",
    re.IGNORECASE,
)
_AGE_MAX_PATTERN = re.compile(
    r"(?:up to|below|under|maximum|not more than|less than)\s*(\d{1,3})\s*years?",
    re.IGNORECASE,
)


def _extract_age_range(text: str) -> dict:
    """
    Return {"age_range": "18-60", "age_min": 18, "age_max": 60}.
    Any field may be None if not found.
    """
    result: dict = {"age_range": None, "age_min": None, "age_max": None}

    m = _AGE_RANGE_PATTERN.search(text)
    if m:
        lo, hi = int(m.group(1)), int(m.group(2))
        result["age_range"] = f"{lo}-{hi}"
        result["age_min"]   = lo
        result["age_max"]   = hi
        return result

    lo_m = _AGE_MIN_PATTERN.search(text)
    hi_m = _AGE_MAX_PATTERN.search(text)
    if lo_m:
        result["age_min"] = int(lo_m.group(1))
    if hi_m:
        result["age_max"] = int(hi_m.group(1))
    if result["age_min"] is not None or result["age_max"] is not None:
        lo_str = str(result["age_min"]) if result["age_min"] else ""
        hi_str = str(result["age_max"]) if result["age_max"] else ""
        result["age_range"] = f"{lo_str}-{hi_str}".strip("-")

    return result


# ---- Gender ---------------------------------------------------------------

def _extract_gender(text: str) -> str:
    """
    Return "women", "men", or "all" based on keywords in *text*.
    Defaults to "all" when no gender restriction is detected.
    """
    lower = text.lower()
    # Female-targeted keywords
    if any(kw in lower for kw in ["women", "female", "girl", "mahila", "widow"]):
        # Check if it explicitly excludes males as well
        if any(kw in lower for kw in ["man", "male", "men", "boy"]):
            return "all"
        return "women"
    # Male-targeted (less common)
    if any(kw in lower for kw in [" male ", " men ", " man "]):
        return "men"
    return "all"


# ---- State ----------------------------------------------------------------

def _extract_state(text: str) -> str:
    """
    Return the state name if eligibility is restricted to one state,
    otherwise "All India".
    """
    lower = text.lower()
    if "all india" in lower or "entire india" in lower or "pan india" in lower:
        return "All India"
    for state in INDIAN_STATES:
        if state in lower:
            return state.title()
    return "All India"


# ---- Composite eligibility parser ----------------------------------------

def extract_eligibility_structured(eligibility_text: str) -> dict:
    """
    Parse a free-text eligibility string and return a structured dict:
    {
        "income_limit": str | None,
        "age_range":    str | None,
        "age_min":      int | None,
        "age_max":      int | None,
        "gender":       str,          # "all" | "women" | "men"
        "state":        str,          # "All India" or a state name
    }
    """
    text = clean_text(eligibility_text)
    age_info = _extract_age_range(text)
    return {
        "income_limit": _extract_income_limit(text),
        "age_range":    age_info["age_range"],
        "age_min":      age_info["age_min"],
        "age_max":      age_info["age_max"],
        "gender":       _extract_gender(text),
        "state":        _extract_state(text),
    }


# ---------------------------------------------------------------------------
# Per-record cleaner
# ---------------------------------------------------------------------------

def clean_scheme(raw: dict) -> dict:
    """
    Clean a single raw scheme record: strip HTML, normalise whitespace,
    and attach structured eligibility sub-fields.
    """
    cleaned = {
        "source_url":            raw.get("source_url", ""),
        "scheme_name":           clean_text(raw.get("scheme_name", "")),
        "description":           clean_text(raw.get("description", "")),
        "eligibility":           clean_text(raw.get("eligibility", "")),
        "benefits":              clean_text(raw.get("benefits", "")),
        "ministry":              clean_text(raw.get("ministry", "")),
        "application_link":      raw.get("application_link", ""),  # URLs stay as-is
        "category":              clean_text(raw.get("category", "")),
        "eligibility_structured": extract_eligibility_structured(
            raw.get("eligibility", "")
        ),
    }
    return cleaned


# ---------------------------------------------------------------------------
# Batch cleaner
# ---------------------------------------------------------------------------

def clean_schemes(
    raw_file:        Path = RAW_SCHEMES_FILE,
    output_file:     Path = PROCESSED_SCHEMES_FILE,
    min_description: int  = 30,
) -> list[dict]:
    """
    Load raw scheme records, clean each one, drop records with too little
    content, and persist the result.

    Parameters
    ----------
    raw_file
        Path to the JSON file produced by the scraper.
    output_file
        Destination for the cleaned JSON.
    min_description
        Minimum character length for a description field; records below this
        threshold are discarded as likely stub/error pages.

    Returns
    -------
    list[dict]
        Cleaned, structured scheme records.
    """
    if not raw_file.exists():
        logger.error("Raw data file not found: %s", raw_file)
        return []

    with open(raw_file, encoding="utf-8") as fh:
        raw_schemes: list[dict] = json.load(fh)

    logger.info("Cleaning %d raw scheme records …", len(raw_schemes))
    cleaned: list[dict] = []
    skipped = 0

    for raw in raw_schemes:
        record = clean_scheme(raw)
        # Skip records with no substantive content
        if (
            not record["scheme_name"]
            and len(record["description"]) < min_description
        ):
            skipped += 1
            continue
        cleaned.append(record)

    logger.info("Retained %d records, skipped %d low-content records.", len(cleaned), skipped)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as fh:
        json.dump(cleaned, fh, ensure_ascii=False, indent=2)

    logger.info("Saved cleaned schemes → %s", output_file)
    return cleaned


# ---------------------------------------------------------------------------
# Run standalone: python processing/cleaner.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = clean_schemes()
    print(f"Cleaned {len(results)} scheme records.")
