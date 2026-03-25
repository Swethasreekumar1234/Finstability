from __future__ import annotations
import logging
import asyncio
import httpx
from bs4 import BeautifulSoup
from typing import Optional, List

logger = logging.getLogger(__name__)

SOURCE_URLS = [
    "https://www.india.gov.in/my-government/schemes",
    "https://data.gov.in/",
]


async def _fetch(url: str) -> Optional[str]:
    """Fetch a page with a safe timeout and error handling."""
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; FinstabilityBot/1.0)"},
            )
            resp.raise_for_status()
            return resp.text
    except Exception as exc:
        logger.error("Fetch failed for %s: %s", url, exc)
        return None


def _parse(html: str) -> List[dict]:
    soup = BeautifulSoup(html, "html.parser")
    results: List[dict] = []

    for item in soup.find_all(["article", "div", "li"], limit=50):
        name_tag = item.find(["h2", "h3", "h4", "a"])
        desc_tag = item.find("p")
        link_tag = item.find("a", href=True)

        name = name_tag.get_text(strip=True) if name_tag else ""
        if not name or len(name) < 10:
            continue

        results.append(
            {
                "scheme_name": name[:200],
                "description": desc_tag.get_text(strip=True)[:500] if desc_tag else "",
                "application_link": link_tag["href"] if link_tag else "https://india.gov.in",
                "source_url": "https://india.gov.in",
            }
        )

    return results


async def scrape_all() -> List[dict]:
    """Scrape all source URLs and return raw scheme data dicts."""
    all_schemes: List[dict] = []
    for url in SOURCE_URLS:
        html = await _fetch(url)
        if html:
            found = _parse(html)
            logger.info("Scraped %d items from %s", len(found), url)
            all_schemes.extend(found)
    return all_schemes


if __name__ == "__main__":
    asyncio.run(scrape_all())
