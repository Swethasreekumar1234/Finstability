"""
scheduler/scheduler.py – Weekly update scheduler for the RAG pipeline.

What it does
------------
Every SCRAPE_INTERVAL_DAYS days this module:
  1. Runs the web scraper to fetch the latest scheme data.
  2. Compares the content hash of each scheme against the stored hashes
     from the previous run to detect new or changed schemes.
  3. Cleans and re-chunks only the changed/new schemes (incremental update).
  4. Appends new embeddings to the existing FAISS index.
  5. Re-loads the retriever's in-memory index so the API immediately serves
     fresh results without a restart.

Change detection
----------------
Each scheme is hashed using SHA-256 over its name + description + eligibility +
benefits fields.  The hash dictionary is persisted to disk between runs.

Running
-------
    # Blocking (runs until CTRL-C):
    python scheduler/scheduler.py

    # One-off immediate run (useful for testing):
    python scheduler/scheduler.py --run-now

APScheduler note
----------------
We use APScheduler's BackgroundScheduler so that the scheduler can run inside
the same process as the FastAPI server if desired, without blocking the event
loop.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    HASH_FILE,
    PROCESSED_SCHEMES_FILE,
    RAW_SCHEMES_FILE,
    SCRAPE_INTERVAL_DAYS,
    SCHEDULER_TIMEZONE,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Hash helpers
# ---------------------------------------------------------------------------

def _load_hashes() -> dict[str, str]:
    """Return the persisted {source_url: sha256} dict, or {} if not found."""
    if HASH_FILE.exists():
        with open(HASH_FILE, encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def _save_hashes(hashes: dict[str, str]) -> None:
    HASH_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(HASH_FILE, "w", encoding="utf-8") as fh:
        json.dump(hashes, fh, indent=2)


def _scheme_hash(scheme: dict) -> str:
    """SHA-256 over the scheme's core text content."""
    from scraper.scraper import content_hash
    return content_hash(scheme)


# ---------------------------------------------------------------------------
# Core update job
# ---------------------------------------------------------------------------

def run_update_job() -> None:
    """
    Full incremental update pipeline:
      scrape → detect changes → clean → chunk → embed → update FAISS → reload retriever.
    """
    logger.info("=== Scheduled update job started ===")

    # -- 1. Scrape ---------------------------------------------------------
    from scraper.scraper import scrape_all_schemes
    fresh_raw = scrape_all_schemes(output_file=RAW_SCHEMES_FILE)

    if not fresh_raw:
        logger.warning("Scraper returned no schemes – aborting update.")
        return

    # -- 2. Change detection -----------------------------------------------
    old_hashes = _load_hashes()
    new_hashes: dict[str, str] = {}
    changed_raw: list[dict] = []

    for scheme in fresh_raw:
        url  = scheme.get("source_url", "")
        h    = _scheme_hash(scheme)
        new_hashes[url] = h

        if old_hashes.get(url) != h:
            changed_raw.append(scheme)

    removed_urls = set(old_hashes.keys()) - set(new_hashes.keys())

    logger.info(
        "Change detection: %d new/updated, %d removed, %d unchanged.",
        len(changed_raw),
        len(removed_urls),
        len(fresh_raw) - len(changed_raw),
    )

    # -- 3. Persist updated hashes -----------------------------------------
    _save_hashes(new_hashes)

    # If nothing changed and nothing was removed, we're done
    if not changed_raw and not removed_urls:
        logger.info("No changes detected – skipping re-embedding.")
        return

    # -- 4. If removals occurred → full rebuild is simplest & safest -------
    if removed_urls:
        logger.info(
            "%d schemes removed – performing full index rebuild.", len(removed_urls)
        )
        _full_rebuild(fresh_raw)
        return

    # -- 5. Incremental: clean + chunk only the changed schemes ------------
    from processing.cleaner import clean_scheme
    changed_clean = [clean_scheme(r) for r in changed_raw]

    from embeddings.embedder import chunk_and_prepare, update_faiss_index
    # chunk_and_prepare with a temporary path so we don't overwrite the full chunks
    import tempfile, os
    tmp_chunks_file = Path(tempfile.mktemp(suffix=".json"))
    new_chunks = chunk_and_prepare(changed_clean, output_file=tmp_chunks_file)

    update_faiss_index(new_chunks)

    # Clean up temp file
    tmp_chunks_file.unlink(missing_ok=True)

    # -- 6. Reload retriever in-memory state --------------------------------
    from rag.retriever import reload as retriever_reload
    retriever_reload()

    logger.info("=== Update job completed – %d new chunks added ===", len(new_chunks))


def _full_rebuild(raw_schemes: list[dict]) -> None:
    """
    Clean, chunk, and rebuild the FAISS index from scratch using *raw_schemes*.
    Called when schemes are removed (to avoid stale vectors in the index).
    """
    logger.info("Full rebuild: cleaning %d schemes …", len(raw_schemes))

    from processing.cleaner import clean_scheme
    from embeddings.embedder import chunk_and_prepare, build_faiss_index

    cleaned = [clean_scheme(r) for r in raw_schemes]
    chunks  = chunk_and_prepare(cleaned)
    build_faiss_index(chunks)

    from rag.retriever import reload as retriever_reload
    retriever_reload()

    logger.info("Full rebuild complete.")


# ---------------------------------------------------------------------------
# Scheduler setup
# ---------------------------------------------------------------------------

def start_scheduler(run_now: bool = False) -> BackgroundScheduler:
    """
    Initialise and start the APScheduler BackgroundScheduler.

    Parameters
    ----------
    run_now
        If True, execute the update job immediately before scheduling the
        first interval trigger.

    Returns
    -------
    BackgroundScheduler
        The running scheduler instance.  Call .shutdown() to stop it.
    """
    scheduler = BackgroundScheduler(timezone=SCHEDULER_TIMEZONE)

    scheduler.add_job(
        func=run_update_job,
        trigger=IntervalTrigger(days=SCRAPE_INTERVAL_DAYS, timezone=SCHEDULER_TIMEZONE),
        id="weekly_scheme_update",
        name="Weekly Indian schemes scrape & re-embed",
        replace_existing=True,
        misfire_grace_time=3600,   # tolerate up to 1 h of missed-fire time
    )

    if run_now:
        logger.info("--run-now flag set: running update job immediately.")
        run_update_job()

    scheduler.start()
    logger.info(
        "Scheduler started – update job will run every %d day(s).",
        SCRAPE_INTERVAL_DAYS,
    )
    return scheduler


# ---------------------------------------------------------------------------
# Run standalone: python scheduler/scheduler.py [--run-now]
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    )

    parser = argparse.ArgumentParser(
        description="Run the weekly scheme update scheduler."
    )
    parser.add_argument(
        "--run-now",
        action="store_true",
        help="Execute the update job immediately in addition to scheduling it.",
    )
    args = parser.parse_args()

    sched = start_scheduler(run_now=args.run_now)

    try:
        import time
        print("Scheduler running. Press CTRL-C to stop.")
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        sched.shutdown()
        print("Scheduler stopped.")
