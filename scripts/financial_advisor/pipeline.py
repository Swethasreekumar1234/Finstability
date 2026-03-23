"""
pipeline.py – End-to-end pipeline runner for the Indian Financial Schemes RAG Advisor.

This script orchestrates the entire data pipeline in the correct sequence:

    Step 1 – Scrape          Fetch raw scheme data from india.gov.in and data.gov.in
    Step 2 – Clean           Strip HTML, normalise text, extract structured fields
    Step 3 – Chunk           Split cleaned text into overlapping word-window chunks
    Step 4 – Embed & Index   Encode chunks with sentence-transformers, build FAISS index

Usage
-----
    python pipeline.py
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
import os
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load API key from .env
# ---------------------------------------------------------------------------
# .env should be in the project root (same folder as this pipeline.py)
load_dotenv('.env')
api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise ValueError("API key not found in .env!")
# Set globally for any library that reads env variables
os.environ["OPENROUTER_API_KEY"] = api_key

# ---------------------------------------------------------------------------
# Ensure financial_advisor/ is always the package root
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import (
    CHUNKS_FILE,
    PROCESSED_SCHEMES_FILE,
    RAW_SCHEMES_FILE,
)


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    )


def step_scrape() -> list[dict]:
    """Step 1 – Web scraping."""
    from scraper.scraper import scrape_all_schemes
    logging.getLogger(__name__).info("── Step 1/4: Scraping government scheme pages …")
    return scrape_all_schemes(output_file=RAW_SCHEMES_FILE)


def step_clean(raw_schemes: list[dict] | None = None) -> list[dict]:
    """Step 2 – Data cleaning and structured field extraction."""
    from processing.cleaner import clean_schemes
    logging.getLogger(__name__).info("── Step 2/4: Cleaning and structuring scheme data …")
    return clean_schemes(raw_file=RAW_SCHEMES_FILE, output_file=PROCESSED_SCHEMES_FILE)


def step_chunk(processed_schemes: list[dict] | None = None) -> list[dict]:
    """Step 3 – Text chunking."""
    from embeddings.embedder import chunk_and_prepare
    logging.getLogger(__name__).info("── Step 3/4: Chunking text for embedding …")

    if processed_schemes is None:
        if not PROCESSED_SCHEMES_FILE.exists():
            logging.getLogger(__name__).error(
                "Processed schemes file not found: %s", PROCESSED_SCHEMES_FILE
            )
            sys.exit(1)
        with open(PROCESSED_SCHEMES_FILE, encoding="utf-8") as fh:
            processed_schemes = json.load(fh)

    return chunk_and_prepare(processed_schemes, output_file=CHUNKS_FILE)


def step_embed(chunks: list[dict] | None = None) -> None:
    """Step 4 – Embedding generation and FAISS index construction."""
    from embeddings.embedder import build_faiss_index
    logging.getLogger(__name__).info(
        "── Step 4/4: Generating embeddings and building FAISS index …"
    )

    if chunks is None:
        if not CHUNKS_FILE.exists():
            logging.getLogger(__name__).error(
                "Chunks file not found: %s", CHUNKS_FILE
            )
            sys.exit(1)
        with open(CHUNKS_FILE, encoding="utf-8") as fh:
            chunks = json.load(fh)

    build_faiss_index(chunks)


def run_pipeline(
    skip_scrape: bool = False,
    skip_clean:  bool = False,
    skip_chunk:  bool = False,
) -> None:
    logger = logging.getLogger(__name__)
    logger.info("╔══════════════════════════════════════════════════╗")
    logger.info("║  Indian Financial Schemes RAG Pipeline           ║")
    logger.info("╚══════════════════════════════════════════════════╝")

    raw_schemes       = None
    processed_schemes = None
    chunks            = None

    # Step 1 – Scrape
    if not skip_scrape:
        raw_schemes = step_scrape()
        logger.info("   ✔ Scraped %d raw records.", len(raw_schemes))
    else:
        if not RAW_SCHEMES_FILE.exists():
            logger.error(
                "--skip-scrape was set but %s does not exist. Remove the flag or run without it first.",
                RAW_SCHEMES_FILE,
            )
            sys.exit(1)
        logger.info("   ↷ Skipping scrape – using %s", RAW_SCHEMES_FILE)

    # Step 2 – Clean
    if not skip_clean:
        processed_schemes = step_clean(raw_schemes)
        logger.info("   ✔ Cleaned %d scheme records.", len(processed_schemes))
    else:
        if not PROCESSED_SCHEMES_FILE.exists():
            logger.error("--skip-clean set but %s does not exist.", PROCESSED_SCHEMES_FILE)
            sys.exit(1)
        logger.info("   ↷ Skipping clean – using %s", PROCESSED_SCHEMES_FILE)

    # Step 3 – Chunk
    if not skip_chunk:
        chunks = step_chunk(processed_schemes)
        logger.info("   ✔ Created %d text chunks.", len(chunks))
    else:
        if not CHUNKS_FILE.exists():
            logger.error("--skip-chunk set but %s does not exist.", CHUNKS_FILE)
            sys.exit(1)
        logger.info("   ↷ Skipping chunking – using %s", CHUNKS_FILE)

    # Step 4 – Embed
    step_embed(chunks)

    logger.info("╔══════════════════════════════════════════════════╗")
    logger.info("║  Pipeline complete!  Start the API with:         ║")
    logger.info("║  uvicorn api.main:app --reload --port 8000       ║")
    logger.info("╚══════════════════════════════════════════════════╝")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the Indian Financial Schemes RAG pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--skip-scrape", action="store_true", help="Use existing raw JSON instead of re-scraping.")
    parser.add_argument("--skip-clean", action="store_true", help="Use existing processed JSON instead of re-cleaning.")
    parser.add_argument("--skip-chunk", action="store_true", help="Use existing chunks JSON instead of re-chunking.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable DEBUG-level logging.")
    args = parser.parse_args()

    _setup_logging(args.verbose)
    run_pipeline(
        skip_scrape=args.skip_scrape,
        skip_clean=args.skip_clean,
        skip_chunk=args.skip_chunk,
    )


if __name__ == "__main__":
    main()