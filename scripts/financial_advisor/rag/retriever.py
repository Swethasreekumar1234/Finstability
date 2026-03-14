"""
rag/retriever.py – FAISS-backed semantic retriever.

Usage
-----
    from rag.retriever import retrieve

    results = retrieve("housing loan scheme for low income families")
    for r in results:
        print(r["metadata"]["scheme_name"], "score:", r["score"])

How it works
------------
1. The FAISS index and companion metadata JSON are loaded lazily on the first
   call and kept in module-level variables to avoid repeated disk I/O.
2. The user query is encoded with the same sentence-transformer model used
   during index construction.
3. The L2-normalised query vector is searched against the IndexFlatIP, which
   returns cosine-similarity scores (float32, range −1…1).
4. The top-k results are returned as dicts: {text, metadata, score}.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    EMBEDDING_MODEL,
    FAISS_INDEX_FILE,
    FAISS_METADATA_FILE,
    TOP_K_RESULTS,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level cache (lazy-loaded on first call)
# ---------------------------------------------------------------------------
_index:    Optional[faiss.IndexFlatIP] = None
_texts:    Optional[list[str]]         = None
_metadata: Optional[list[dict]]        = None
_model:    Optional[SentenceTransformer] = None


def _ensure_loaded() -> bool:
    """
    Load the FAISS index, metadata, and embedding model into module globals.
    Returns True if everything is loaded successfully, False otherwise.
    """
    global _index, _texts, _metadata, _model

    if _index is not None:
        return True   # already loaded

    if not Path(FAISS_INDEX_FILE).exists():
        logger.error(
            "FAISS index not found at %s. "
            "Run the full pipeline first (python pipeline.py).",
            FAISS_INDEX_FILE,
        )
        return False

    if not Path(FAISS_METADATA_FILE).exists():
        logger.error("Metadata file not found at %s.", FAISS_METADATA_FILE)
        return False

    logger.info("Loading FAISS index from %s …", FAISS_INDEX_FILE)
    _index = faiss.read_index(FAISS_INDEX_FILE)

    with open(FAISS_METADATA_FILE, encoding="utf-8") as fh:
        store = json.load(fh)
    _texts    = store["texts"]
    _metadata = store["metadata"]

    logger.info("Loading sentence-transformer: %s …", EMBEDDING_MODEL)
    _model = SentenceTransformer(EMBEDDING_MODEL)

    logger.info(
        "Retriever ready – index has %d vectors.", _index.ntotal
    )
    return True


def reload() -> None:
    """
    Force-reload the index and model from disk.
    Call this after the scheduler updates the index.
    """
    global _index, _texts, _metadata, _model
    _index = _texts = _metadata = _model = None
    _ensure_loaded()


# ---------------------------------------------------------------------------
# Public retriever function
# ---------------------------------------------------------------------------

def retrieve(query: str, top_k: int = TOP_K_RESULTS) -> list[dict]:
    """
    Retrieve the *top_k* most semantically similar scheme chunks for *query*.

    Parameters
    ----------
    query
        Free-text user query, e.g.
        "scheme for women entrepreneurs with income below 3 lakh in Maharashtra"
    top_k
        Number of results to return.

    Returns
    -------
    list[dict]
        Each element:
        {
            "text":     str,      # raw chunk text
            "metadata": dict,     # scheme metadata (name, ministry, url …)
            "score":    float,    # cosine similarity (higher = more relevant)
        }
        Sorted by score descending.  Returns [] if the index is unavailable.
    """
    if not _ensure_loaded():
        return []

    # Encode and L2-normalise the query vector
    query_vec: np.ndarray = _model.encode(         # type: ignore[union-attr]
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)

    # Search FAISS
    effective_k = min(top_k, _index.ntotal)          # type: ignore[union-attr]
    scores, indices = _index.search(query_vec, effective_k)  # type: ignore[union-attr]

    results: list[dict] = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:   # FAISS uses −1 as a sentinel for missing results
            continue
        results.append({
            "text":     _texts[idx],      # type: ignore[index]
            "metadata": _metadata[idx],   # type: ignore[index]
            "score":    float(score),
        })

    return results
