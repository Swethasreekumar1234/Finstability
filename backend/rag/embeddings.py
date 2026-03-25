from __future__ import annotations
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

try:
    import numpy as np
    from sentence_transformers import SentenceTransformer
    import faiss
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logger.warning("sentence-transformers / faiss not installed — RAG disabled.")

_model: Optional[object] = None
_index: Optional[object] = None
_scheme_ids: List[str] = []


def _get_model() -> object:
    global _model
    if _model is None and EMBEDDINGS_AVAILABLE:
        logger.info("Loading sentence-transformer model (all-MiniLM-L6-v2)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Model loaded.")
    return _model


async def build_index() -> None:
    """Build FAISS index from schemes stored in MongoDB."""
    if not EMBEDDINGS_AVAILABLE:
        return

    from database.mongodb import get_db

    global _index, _scheme_ids

    db = get_db()
    schemes = await db["schemes"].find({}, {"_id": 0}).to_list(length=None)
    if not schemes:
        logger.warning("No schemes in DB to index.")
        return

    model = _get_model()
    texts: List[str] = []
    ids: List[str] = []

    for s in schemes:
        chunk = (
            f"{s.get('scheme_name', '')}. "
            f"{s.get('description', '')} "
            f"Eligibility: {s.get('eligibility', '')}. "
            f"Benefits: {s.get('benefits', '')}. "
            f"Category: {s.get('category', '')}."
        )
        # Keep chunks at max ~400 tokens (approx 1600 chars)
        texts.append(chunk[:1600])
        ids.append(s.get("scheme_id", ""))

    embeddings = model.encode(texts, show_progress_bar=False)  # type: ignore[union-attr]
    embeddings = np.array(embeddings, dtype="float32")          # type: ignore[name-defined]

    dim = embeddings.shape[1]
    idx = faiss.IndexFlatL2(dim)                                # type: ignore[name-defined]
    idx.add(embeddings)

    _index = idx
    _scheme_ids = ids
    logger.info(f"FAISS index built with {len(ids)} schemes (dim={dim}).")


def search_similar(query: str, top_k: int = 8) -> List[str]:
    """Return list of scheme_ids most semantically similar to query."""
    if not EMBEDDINGS_AVAILABLE or _index is None:
        return []

    model = _get_model()
    vec = model.encode([query])                                  # type: ignore[union-attr]
    vec = np.array(vec, dtype="float32")                        # type: ignore[name-defined]

    distances, indices = _index.search(vec, top_k)              # type: ignore[union-attr]
    results: List[str] = []
    for i in indices[0]:
        if 0 <= i < len(_scheme_ids):
            results.append(_scheme_ids[i])
    return results
