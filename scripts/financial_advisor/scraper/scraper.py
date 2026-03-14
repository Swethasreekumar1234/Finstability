"""
scraper/scraper.py – Web scraper for Indian Government Financial Schemes.

Data sources
------------
1. https://www.india.gov.in/my-government/schemes  (primary)
2. https://data.gov.in                              (secondary – open-data catalogue)

Approach
--------
1. Fetch the scheme listing page and detect pagination (?page=N).
2. Collect all unique scheme-detail URLs from each listing page.
3. Visit every detail URL and pull structured fields.
4. Persist the raw results to JSON so the rest of the pipeline can re-run
   without network access.

Design notes
------------
- Uses a polite REQUEST_DELAY between every HTTP call.
- Tries multiple CSS-selector patterns to handle Drupal/CMS layout variations.
- Falls back to a hand-curated seed list of known permanent URLs if dynamic
  discovery yields nothing.
- data.gov.in supplement: searches the open-data catalogue for scheme datasets
  and merges the catalogue titles / descriptions.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import sys
import time
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

# Make the parent directory (financial_advisor/) importable as a package root
# so that `from config import …` works when this module is run standalone.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    DATA_GOV_IN_BASE_URL,
    HEADERS,
    INDIA_GOV_BASE_URL,
    INDIA_GOV_SCHEMES_URL,
    MAX_PAGES,
    MAX_SCHEMES,
    RAW_SCHEMES_FILE,
    REQUEST_DELAY,
    REQUEST_TIMEOUT,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper – HTTP fetch with retry
# ---------------------------------------------------------------------------

def _fetch(url: str, session: requests.Session, retries: int = 3) -> Optional[BeautifulSoup]:
    """
    Fetch *url* and parse the response into a BeautifulSoup tree.
    Returns None if all retry attempts fail.
    """
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except requests.RequestException as exc:
            logger.warning(
                "Attempt %d/%d failed for %s – %s", attempt, retries, url, exc
            )
            if attempt < retries:
                time.sleep(REQUEST_DELAY * attempt)   # back-off
    return None


# ---------------------------------------------------------------------------
# Step 1 – Collect scheme-detail URLs from listing pages
# ---------------------------------------------------------------------------

def _is_scheme_detail_url(url: str) -> bool:
    """
    Heuristic to decide whether a URL points to a single scheme detail page
    rather than a category listing or unrelated page.
    """
    parsed = urlparse(url)
    # Must be on india.gov.in
    if parsed.netloc and "india.gov.in" not in parsed.netloc:
        return False
    path = parsed.path.lower()
    # Reject obvious non-scheme paths
    skip_parts = ["/search", "/contact", "/sitemap", "/login", "/user", "/tag/"]
    if any(s in path for s in skip_parts):
        return False
    # Accept paths that contain known scheme-related keywords
    accept_parts = [
        "/scheme/", "/schemes/", "/spotlight/", "/pm-", "/pmay", "/pmjdy",
        "/yojana", "/kisan", "/mudra", "/pradhan-mantri",
    ]
    return any(kw in path for kw in accept_parts)


def _find_next_page(soup: BeautifulSoup, current_url: str) -> Optional[str]:
    """Return the URL of the next listing page, or None if on the last page."""
    # Common 'Next page' selectors used by Drupal-based Govt websites
    next_selectors = [
        "a.pager__item--next",
        "li.next > a",
        "a[rel='next']",
        ".pager-next a",
        "li.pager-next a",
    ]
    for sel in next_selectors:
        el = soup.select_one(sel)
        if el and el.get("href"):
            return urljoin(current_url, el["href"])

    # Also handle text-based next links
    for a in soup.find_all("a", href=True):
        txt = a.get_text(strip=True).lower()
        if txt in ["next", "next »", "›", "next page", "next ›"]:
            return urljoin(current_url, a["href"])

    # Fall back to incrementing ?page=N in the query string
    parsed = urlparse(current_url)
    qs = parse_qs(parsed.query)
    try:
        current_page = int(qs.get("page", ["0"])[0])
    except (ValueError, IndexError):
        return None
    next_page_num = current_page + 1
    if next_page_num > MAX_PAGES:
        return None
    qs["page"] = [str(next_page_num)]
    return urlunparse(parsed._replace(query=urlencode(qs, doseq=True)))


def _collect_scheme_urls(session: requests.Session) -> list[str]:
    """
    Crawl paginated listing pages and return a deduplicated list of
    scheme-detail page URLs.
    """
    visited_listings: set[str] = set()
    scheme_urls: set[str] = set()

    current_url: Optional[str] = INDIA_GOV_SCHEMES_URL
    page = 0

    while current_url and page < MAX_PAGES and len(scheme_urls) < MAX_SCHEMES:
        if current_url in visited_listings:
            break
        visited_listings.add(current_url)
        logger.info("Fetching listing page %d: %s", page, current_url)

        soup = _fetch(current_url, session)
        if soup is None:
            break

        # --- Extract scheme links using multiple selector strategies ---
        found_any = False
        for selector in [
            "a[href*='/scheme/']",
            "a[href*='/schemes/']",
            "a[href*='/spotlight/']",
            ".scheme-title a",
            ".views-row a",
            ".view-content a",
            ".field-content a",
            "h3 > a",
            "h2 > a",
            "article a",
        ]:
            for anchor in soup.select(selector):
                href = anchor.get("href", "")
                if href:
                    full = urljoin(INDIA_GOV_BASE_URL, href)
                    if _is_scheme_detail_url(full):
                        scheme_urls.add(full)
                        found_any = True

        # Fallback: scan ALL links on the page
        if not found_any:
            for anchor in soup.find_all("a", href=True):
                full = urljoin(INDIA_GOV_BASE_URL, anchor["href"])
                if _is_scheme_detail_url(full):
                    scheme_urls.add(full)

        current_url = _find_next_page(soup, current_url)
        page += 1
        time.sleep(REQUEST_DELAY)

    logger.info("Discovered %d unique scheme URLs", len(scheme_urls))
    return sorted(scheme_urls)


# ---------------------------------------------------------------------------
# Step 2 – Scrape an individual scheme detail page
# ---------------------------------------------------------------------------

# Labels that map to our target fields
_LABEL_MAP: dict[str, list[str]] = {
    "description": [
        "description", "about", "overview", "objective",
        "about the scheme", "scheme overview",
    ],
    "eligibility": [
        "eligibility", "who can apply", "eligible beneficiaries",
        "target beneficiaries", "eligible", "beneficiaries",
    ],
    "benefits": [
        "benefits", "benefit", "features", "financial assistance",
        "what you get", "grant", "subsidy",
    ],
    "ministry": [
        "ministry", "department", "nodal ministry",
        "implementing agency", "implementing ministry",
    ],
    "application_link": [
        "apply", "application link", "how to apply",
        "apply now", "apply online",
    ],
    "category": [
        "category", "sector", "scheme type", "type",
    ],
}


def _match_and_set(scheme: dict, label_text: str, value_text: str) -> None:
    """Set the first matching empty scheme field whose keywords appear in label_text."""
    label_lower = label_text.lower().strip()
    for field, keywords in _LABEL_MAP.items():
        if not scheme[field] and any(kw in label_lower for kw in keywords):
            scheme[field] = value_text.strip()
            break


def _extract_labelled_sections(soup: BeautifulSoup, scheme: dict) -> None:
    """
    Fill scheme fields from labelled HTML sections.
    Supports three common layout patterns:
      A) Definition lists – <dt> / <dd>
      B) Table rows      – <th> / <td>
      C) Drupal field    – .field__label / .field__item
    """
    # Pattern A – definition lists
    for dt in soup.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            _match_and_set(scheme, dt.get_text(), dd.get_text(separator=" "))

    # Pattern B – table rows
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) >= 2:
            _match_and_set(
                scheme,
                cells[0].get_text(),
                cells[1].get_text(separator=" ")
            )

    # Pattern C – Drupal inline-label fields
    for wrapper in soup.select(
        ".field--label-inline, .field-label-inline, .field-group-format"
    ):
        label_el = wrapper.select_one(".field__label, .field-label")
        value_el = wrapper.select_one(".field__item, .field-items, .field__items")
        if label_el and value_el:
            _match_and_set(
                scheme,
                label_el.get_text(),
                value_el.get_text(separator=" ")
            )


def _extract_ministry_heuristic(soup: BeautifulSoup) -> str:
    """Scan page text for 'Ministry of …' or 'Department of …' patterns."""
    text = soup.get_text()
    match = re.search(
        r"(Ministry of [A-Za-z ,&]+|Department of [A-Za-z ,&]+)", text
    )
    return match.group(1).strip() if match else ""


def _extract_category_from_breadcrumb(soup: BeautifulSoup) -> str:
    """Read the penultimate breadcrumb item as the scheme category."""
    breadcrumb = soup.select_one(
        "nav.breadcrumb, ol.breadcrumb, ul.breadcrumb, .breadcrumb"
    )
    if not breadcrumb:
        return ""
    items = [li.get_text(strip=True) for li in breadcrumb.find_all("li")]
    # Typical breadcrumb: Home > Category > Scheme Name
    if len(items) >= 3:
        return items[-2]
    if len(items) == 2:
        return items[0]
    return ""


def _extract_application_link(soup: BeautifulSoup, base_url: str) -> str:
    """Find an 'Apply Now' or similar CTA anchor and return its absolute URL."""
    cta_keywords = [
        "apply now", "apply online", "apply here", "click here to apply",
        "online application", "register now",
    ]
    for anchor in soup.find_all("a", href=True):
        if any(kw in anchor.get_text(strip=True).lower() for kw in cta_keywords):
            href = anchor["href"]
            # Avoid mailto: / javascript: / fragment-only links
            if href.startswith(("http", "/")):
                return urljoin(base_url, href)
    return ""


def _scrape_scheme_page(url: str, session: requests.Session) -> Optional[dict]:
    """
    Visit *url*, extract structured scheme fields, and return a dict.
    Returns None if the page cannot be fetched or yields no useful content.
    """
    soup = _fetch(url, session)
    if soup is None:
        return None

    scheme: dict = {
        "source_url":       url,
        "scheme_name":      "",
        "description":      "",
        "eligibility":      "",
        "benefits":         "",
        "ministry":         "",
        "application_link": "",
        "category":         "",
    }

    # --- Scheme name ---
    for selector in ["h1.page-header", "h1.title", ".page-title h1", "h1", "title"]:
        el = soup.select_one(selector)
        if el:
            name = el.get_text(strip=True)
            # Strip common suffixes that appear on <title> tags
            name = re.sub(r"\s*\|.*$", "", name).strip()
            if name:
                scheme["scheme_name"] = name
                break

    # --- Fill labelled sections ---
    _extract_labelled_sections(soup, scheme)

    # --- Description fallback – scan main content areas ---
    if not scheme["description"]:
        for selector in [
            ".field--type-text-with-summary .field__item",
            ".field-body",
            ".field-type-text-with-summary",
            "article .content",
            "main article",
            "#block-system-main .content",
            ".view-content",
        ]:
            el = soup.select_one(selector)
            if el and len(el.get_text(strip=True)) > 80:
                scheme["description"] = el.get_text(separator=" ", strip=True)
                break

    # --- Ministry heuristic ---
    if not scheme["ministry"]:
        scheme["ministry"] = _extract_ministry_heuristic(soup)

    # --- Category from breadcrumb ---
    if not scheme["category"]:
        scheme["category"] = _extract_category_from_breadcrumb(soup)

    # --- Application link ---
    if not scheme["application_link"]:
        scheme["application_link"] = _extract_application_link(soup, INDIA_GOV_BASE_URL)

    # Discard pages that look like listing pages rather than scheme detail pages
    if not scheme["scheme_name"] and not scheme["description"]:
        logger.debug("Skipping non-content page: %s", url)
        return None

    return scheme


# ---------------------------------------------------------------------------
# Step 3 – Supplement with data.gov.in catalogue
# ---------------------------------------------------------------------------

def _scrape_data_gov_in(session: requests.Session) -> list[dict]:
    """
    Fetch scheme-related dataset listings from data.gov.in and convert
    them into lightweight scheme records (name + description only).
    These supplement the india.gov.in records.
    """
    search_url = (
        f"{DATA_GOV_IN_BASE_URL}/search/type/dataset?query=india+financial+schemes"
    )
    logger.info("Fetching data.gov.in catalogue: %s", search_url)
    soup = _fetch(search_url, session)
    if soup is None:
        logger.warning("Could not reach data.gov.in – skipping secondary source.")
        return []

    records: list[dict] = []
    # data.gov.in search results use <h3 class="..."> for dataset titles
    for card in soup.select(".search-result, .dataset-item, article"):
        title_el = card.select_one("h3, h2, .dataset-heading, .result-title")
        desc_el  = card.select_one("p, .notes, .dataset-description")
        link_el  = card.select_one("a[href]")

        title = title_el.get_text(strip=True) if title_el else ""
        desc  = desc_el.get_text(strip=True)  if desc_el  else ""
        link  = urljoin(DATA_GOV_IN_BASE_URL, link_el["href"]) if link_el else ""

        if title:
            records.append({
                "source_url":       link,
                "scheme_name":      title,
                "description":      desc,
                "eligibility":      "",
                "benefits":         "",
                "ministry":         "",
                "application_link": link,
                "category":         "Open Data",
            })

    logger.info("data.gov.in yielded %d supplementary records", len(records))
    return records


# ---------------------------------------------------------------------------
# Step 4 – Fallback: hardcoded seed URLs for well-known schemes
# ---------------------------------------------------------------------------

SEED_URLS: list[str] = [
    "https://www.india.gov.in/spotlight/pradhan-mantri-jan-dhan-yojana",
    "https://www.india.gov.in/spotlight/pradhan-mantri-mudra-yojana",
    "https://www.india.gov.in/spotlight/pradhan-mantri-awas-yojana",
    "https://www.india.gov.in/spotlight/pradhan-mantri-jeevan-jyoti-bima-yojana",
    "https://www.india.gov.in/spotlight/pradhan-mantri-suraksha-bima-yojana",
    "https://www.india.gov.in/spotlight/atal-pension-yojana",
    "https://www.india.gov.in/spotlight/national-pension-system",
    "https://www.india.gov.in/spotlight/sukanya-samriddhi-yojana",
    "https://www.india.gov.in/spotlight/kisan-credit-card",
    "https://www.india.gov.in/spotlight/pm-kisan",
    "https://www.india.gov.in/spotlight/pmegp",
    "https://www.india.gov.in/spotlight/standup-india",
    "https://www.india.gov.in/spotlight/startup-india",
    "https://www.india.gov.in/spotlight/national-health-mission",
    "https://www.india.gov.in/spotlight/ayushman-bharat",
    "https://www.india.gov.in/spotlight/beti-bachao-beti-padhao",
    "https://www.india.gov.in/spotlight/skill-india",
    "https://www.india.gov.in/spotlight/digital-india",
    "https://www.india.gov.in/spotlight/make-in-india",
    "https://www.india.gov.in/spotlight/national-rural-livelihood-mission",
]


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def scrape_all_schemes(output_file: Path = RAW_SCHEMES_FILE) -> list[dict]:
    """
    Run the full scrape pipeline:
      1. Collect scheme detail URLs from paginated listing.
      2. Visit each URL and extract structured fields.
      3. Supplement with data.gov.in catalogue entries.
      4. Deduplicate by URL.
      5. Persist results to *output_file*.

    Parameters
    ----------
    output_file
        JSON file to write raw scheme records into.

    Returns
    -------
    list[dict]
        Raw scheme records (pre-cleaning).
    """
    session = requests.Session()
    session.headers.update(HEADERS)

    # --- Collect URLs ---
    scheme_urls = _collect_scheme_urls(session)
    if not scheme_urls:
        logger.warning(
            "Dynamic URL collection returned nothing – using hardcoded seed URLs."
        )
        scheme_urls = SEED_URLS

    # --- Scrape each scheme page ---
    schemes: list[dict] = []
    for idx, url in enumerate(scheme_urls[:MAX_SCHEMES], start=1):
        logger.info("[%d/%d] Scraping scheme page: %s", idx, len(scheme_urls), url)
        record = _scrape_scheme_page(url, session)
        if record:
            schemes.append(record)
        time.sleep(REQUEST_DELAY)

    # --- Supplement with data.gov.in ---
    dgi_records = _scrape_data_gov_in(session)

    # --- Deduplicate by source URL ---
    seen_urls: set[str] = {s["source_url"] for s in schemes}
    for rec in dgi_records:
        if rec["source_url"] not in seen_urls:
            schemes.append(rec)
            seen_urls.add(rec["source_url"])

    # --- Persist ---
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as fh:
        json.dump(schemes, fh, ensure_ascii=False, indent=2)

    logger.info("Saved %d raw scheme records → %s", len(schemes), output_file)
    return schemes


def content_hash(scheme: dict) -> str:
    """Return a stable SHA-256 hash of a scheme's core textual content."""
    key = "".join([
        scheme.get("scheme_name", ""),
        scheme.get("description", ""),
        scheme.get("eligibility", ""),
        scheme.get("benefits", ""),
    ])
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Run standalone: python scraper/scraper.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    results = scrape_all_schemes()
    print(f"Scraped {len(results)} schemes.")
