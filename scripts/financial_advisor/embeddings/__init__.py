"""Embeddings package – exposes the public build/update functions."""
from .embedder import build_faiss_index, chunk_and_prepare, update_faiss_index

__all__ = ["chunk_and_prepare", "build_faiss_index", "update_faiss_index"]
