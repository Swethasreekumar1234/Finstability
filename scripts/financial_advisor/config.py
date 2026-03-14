"""
config.py – Central configuration for the Indian Financial Schemes RAG Advisor.

Every path, model name, and tunable parameter lives here.
Other modules import from this file rather than hard-coding values.
"""

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Directory layout
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent

DATA_DIR           = BASE_DIR / "data"
RAW_DATA_DIR       = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
EMBEDDINGS_DIR     = DATA_DIR / "embeddings"

# Create directories on import (safe to call repeatedly)
for _d in [DATA_DIR, RAW_DATA_DIR, PROCESSED_DATA_DIR, EMBEDDINGS_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Data source URLs
# ---------------------------------------------------------------------------
# Primary: official Government of India portal
INDIA_GOV_SCHEMES_URL = "https://www.india.gov.in/my-government/schemes"
INDIA_GOV_BASE_URL    = "https://www.india.gov.in"

# Secondary: open-data catalogue
DATA_GOV_IN_BASE_URL  = "https://data.gov.in"
DATA_GOV_IN_SEARCH    = "https://data.gov.in/search/type/dataset?query=financial+schemes"

# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------
RAW_SCHEMES_FILE       = RAW_DATA_DIR      / "schemes_raw.json"
PROCESSED_SCHEMES_FILE = PROCESSED_DATA_DIR / "schemes_processed.json"
CHUNKS_FILE            = PROCESSED_DATA_DIR / "chunks.json"
# Stores SHA-256 hashes of each scheme to detect changes between scrape runs
HASH_FILE              = DATA_DIR          / "scheme_hashes.json"

FAISS_INDEX_FILE    = str(EMBEDDINGS_DIR / "schemes.index")
FAISS_METADATA_FILE = str(EMBEDDINGS_DIR / "schemes_metadata.json")

# ---------------------------------------------------------------------------
# Sentence-Transformer embedding model
# ---------------------------------------------------------------------------
# "all-MiniLM-L6-v2" – lightweight (~80 MB), 384-dim, good balance of
# speed and quality for retrieval tasks.
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# ---------------------------------------------------------------------------
# Text chunking parameters
# ---------------------------------------------------------------------------
CHUNK_SIZE_WORDS    = 350   # target words per chunk (≈ 450–500 tokens)
CHUNK_OVERLAP_WORDS = 50    # words of overlap between adjacent chunks

# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------
TOP_K_RESULTS = 5    # chunks returned per query by the retriever
ADVISOR_FETCH_K = 15 # retrieve extra chunks for the advisor to filter/rank

# ---------------------------------------------------------------------------
# HTTP scraper settings
# ---------------------------------------------------------------------------
REQUEST_TIMEOUT = 30        # seconds per request
REQUEST_DELAY   = 1.5       # polite delay between consecutive requests
MAX_PAGES       = 20        # maximum paginated listing pages to crawl
MAX_SCHEMES     = 500       # safety cap on total schemes scraped per run

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection":      "keep-alive",
}

# ---------------------------------------------------------------------------
# FastAPI server
# ---------------------------------------------------------------------------
API_HOST = "0.0.0.0"
API_PORT = 8000

# ---------------------------------------------------------------------------
# Optional LLM integration
# Set OPENAI_API_KEY in your .env or shell environment to enable LLM-enhanced
# recommendations.  When absent, the advisor uses a rule-based fallback.
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
USE_LLM        = bool(OPENAI_API_KEY)

# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------
SCRAPE_INTERVAL_DAYS = 7       # run the full scrape + re-embed every N days
SCHEDULER_TIMEZONE   = "Asia/Kolkata"
