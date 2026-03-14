"""
embeddings/embedder.py – Text chunking, embedding generation, and FAISS management.

Pipeline
--------
1. chunk_and_prepare(schemes)
   Converts scheme records into overlapping word-window text chunks, each
   carrying a copy of the scheme's metadata as payload.

2. build_faiss_index(chunks)
   Encodes all chunks with "all-MiniLM-L6-v2", L2-normalises the vectors
   (so inner-product search equals cosine similarity), builds a FAISS
   IndexFlatIP, and saves both the index and a parallel metadata JSON file.

3. update_faiss_index(new_chunks)
   Appends new chunks to an existing index without rebuilding from scratch.

FAISS index design
------------------
- IndexFlatIP with L2-normalised vectors  →  exact cosine similarity search.
- Suitable for up to ~100 k vectors; fast enough for scheme counts in practice.
- Index file:    data/embeddings/schemes.index       (binary, FAISS format)
- Metadata file: data/embeddings/schemes_metadata.json
  Structure: {"texts": [...], "metadata": [...]}
  Index i in each list corresponds to vector i in the FAISS index.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# Ensure financial_advisor/ is importable when run standalone
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    CHUNK_OVERLAP_WORDS,
    CHUNK_SIZE_WORDS,
    CHUNKS_FILE,
    EMBEDDING_MODEL,
    FAISS_INDEX_FILE,
    FAISS_METADATA_FILE,
    PROCESSED_SCHEMES_FILE,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Step 1 – Text chunking
# ---------------------------------------------------------------------------

def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Split *text* into word-based overlapping chunks.

    Parameters
    ----------
    text       : source string
    chunk_size : maximum words per chunk
    overlap    : number of words shared between consecutive chunks

    Returns
    -------
    list[str]  – one or more chunk strings
    """
    if not text.strip():
        return []

    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end   = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap   # advance by (size − overlap)

    return chunks


def chunk_and_prepare(
    schemes:    list[dict],
    chunk_size: int = CHUNK_SIZE_WORDS,
    overlap:    int = CHUNK_OVERLAP_WORDS,
    output_file: Path = CHUNKS_FILE,
) -> list[dict]:
    """
    Convert a list of cleaned scheme records into embeddable chunk dicts.

    Each scheme is converted to a single concatenated text block:
        "Scheme: <name>  Description: <desc>  Eligibility: <elig>  Benefits: <ben>"
    This block is then split into overlapping chunks.

    Every chunk carries a *metadata* dict with fields useful at retrieval time:
        scheme_name, ministry, state, category, source_url,
        application_link, benefits, eligibility_structured.

    Parameters
    ----------
    schemes
        Output from processing.cleaner.clean_schemes().
    chunk_size / overlap
        Chunking hyperparameters (words).
    output_file
        Where to save the chunk list as JSON (may be reused to skip re-chunking).

    Returns
    -------
    list[dict]  – chunk records
    """
    all_chunks: list[dict] = []

    for scheme in schemes:
        # Build the full text block for this scheme
        parts: list[str] = []
        if scheme.get("scheme_name"):
            parts.append(f"Scheme: {scheme['scheme_name']}")
        if scheme.get("description"):
            parts.append(f"Description: {scheme['description']}")
        if scheme.get("eligibility"):
            parts.append(f"Eligibility: {scheme['eligibility']}")
        if scheme.get("benefits"):
            parts.append(f"Benefits: {scheme['benefits']}")
        if scheme.get("ministry"):
            parts.append(f"Ministry: {scheme['ministry']}")
        if scheme.get("category"):
            parts.append(f"Category: {scheme['category']}")

        full_text = "  ".join(parts)
        text_chunks = _chunk_text(full_text, chunk_size, overlap)

        # Shared metadata payload for all chunks of this scheme
        metadata: dict[str, Any] = {
            "scheme_name":            scheme.get("scheme_name", ""),
            "ministry":               scheme.get("ministry", ""),
            "state":                  scheme.get("eligibility_structured", {}).get("state", "All India"),
            "category":               scheme.get("category", ""),
            "source_url":             scheme.get("source_url", ""),
            "application_link":       scheme.get("application_link", ""),
            "benefits":               scheme.get("benefits", ""),
            "eligibility":            scheme.get("eligibility", ""),
            "eligibility_structured": scheme.get("eligibility_structured", {}),
        }

        for i, chunk_text in enumerate(text_chunks):
            all_chunks.append({
                "chunk_id":    f"{scheme.get('scheme_name', 'unknown')}__chunk_{i}",
                "text":        chunk_text,
                "chunk_index": i,
                "total_chunks": len(text_chunks),
                "metadata":    metadata,
            })

    logger.info("Generated %d chunks from %d schemes.", len(all_chunks), len(schemes))

    # Persist so the pipeline can skip chunking on subsequent runs
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as fh:
        json.dump(all_chunks, fh, ensure_ascii=False, indent=2)

    return all_chunks


# ---------------------------------------------------------------------------
# Step 2 – Embedding and FAISS index construction
# ---------------------------------------------------------------------------

def _load_model(model_name: str = EMBEDDING_MODEL) -> SentenceTransformer:
    """Load the sentence-transformer model (cached after first call)."""
    logger.info("Loading embedding model: %s", model_name)
    return SentenceTransformer(model_name)


def _encode_chunks(model: SentenceTransformer, chunks: list[dict]) -> np.ndarray:
    """
    Encode chunk texts into L2-normalised float32 numpy array.

    Shape: (n_chunks, embedding_dim)
    """
    texts = [c["text"] for c in chunks]
    logger.info("Encoding %d chunks …", len(texts))
    embeddings: np.ndarray = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,   # L2-normalise → cosine via inner product
    )
    # Ensure float32 for FAISS
    return embeddings.astype(np.float32)


def build_faiss_index(
    chunks:        list[dict],
    model_name:    str  = EMBEDDING_MODEL,
    index_file:    str  = FAISS_INDEX_FILE,
    metadata_file: str  = FAISS_METADATA_FILE,
) -> None:
    """
    Encode *chunks* and build a fresh FAISS index from scratch.

    Saves:
      - *index_file*    – binary FAISS index
      - *metadata_file* – JSON {"texts": [...], "metadata": [...]}

    Parameters
    ----------
    chunks
        Output from chunk_and_prepare().
    model_name
        Sentence-Transformer model identifier.
    index_file / metadata_file
        Destination file paths.
    """
    if not chunks:
        logger.warning("No chunks provided – skipping index build.")
        return

    model = _load_model(model_name)
    embeddings = _encode_chunks(model, chunks)

    dim   = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)   # Inner-Product (= cosine after L2-norm)
    index.add(embeddings)

    # Save FAISS index
    Path(index_file).parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, index_file)

    # Save parallel metadata + text list
    store = {
        "texts":    [c["text"] for c in chunks],
        "metadata": [c["metadata"] for c in chunks],
    }
    with open(metadata_file, "w", encoding="utf-8") as fh:
        json.dump(store, fh, ensure_ascii=False, indent=2)

    logger.info(
        "FAISS index built: %d vectors (dim=%d)  →  %s",
        index.ntotal, dim, index_file,
    )


def update_faiss_index(
    new_chunks:    list[dict],
    model_name:    str = EMBEDDING_MODEL,
    index_file:    str = FAISS_INDEX_FILE,
    metadata_file: str = FAISS_METADATA_FILE,
) -> None:
    """
    Append *new_chunks* to an existing FAISS index without full rebuild.

    If the index file does not yet exist, delegates to build_faiss_index().

    Parameters
    ----------
    new_chunks
        Chunk dicts to add (same format as build_faiss_index input).
    """
    if not Path(index_file).exists():
        logger.info("No existing index found – building from scratch.")
        build_faiss_index(new_chunks, model_name, index_file, metadata_file)
        return

    if not new_chunks:
        logger.info("No new chunks to add.")
        return

    # Load existing state
    index = faiss.read_index(index_file)
    with open(metadata_file, encoding="utf-8") as fh:
        store: dict = json.load(fh)

    model      = _load_model(model_name)
    new_embs   = _encode_chunks(model, new_chunks)

    index.add(new_embs)
    faiss.write_index(index, index_file)

    store["texts"]    += [c["text"] for c in new_chunks]
    store["metadata"] += [c["metadata"] for c in new_chunks]
    with open(metadata_file, "w", encoding="utf-8") as fh:
        json.dump(store, fh, ensure_ascii=False, indent=2)

    logger.info(
        "Appended %d vectors to FAISS index.  Total: %d",
        len(new_chunks), index.ntotal,
    )


# ---------------------------------------------------------------------------
# Run standalone: python embeddings/embedder.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    if not PROCESSED_SCHEMES_FILE.exists():
        print("No processed schemes file found. Run the cleaner first.")
        sys.exit(1)
    with open(PROCESSED_SCHEMES_FILE, encoding="utf-8") as fh:
        schemes = json.load(fh)
    chunks = chunk_and_prepare(schemes)
    build_faiss_index(chunks)
    print(f"Index built from {len(chunks)} chunks.")
