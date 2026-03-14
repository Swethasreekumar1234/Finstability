"""
api/main.py – FastAPI application for the Indian Financial Schemes RAG Advisor.

Endpoints
---------
GET  /health              – liveness check; reports whether the index is loaded
POST /recommend-schemes   – accepts a user profile, returns scheme recommendations

Running
-------
    # From the financial_advisor/ directory:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

Environment variables
---------------------
    OPENAI_API_KEY  –  (optional) enables LLM-enhanced recommendations
"""
from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# Ensure financial_advisor/ is on sys.path when uvicorn imports this module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import API_HOST, API_PORT
from rag.advisor import get_recommendations
from rag.retriever import _ensure_loaded   # load index at startup

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan – warm up the FAISS index on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Load the FAISS index and embedding model into memory before the first
    request.  This avoids cold-start latency on the initial API call.
    """
    logger.info("Loading FAISS index and embedding model …")
    ok = _ensure_loaded()
    if not ok:
        logger.warning(
            "FAISS index could not be loaded. "
            "Run 'python pipeline.py' to build the index before starting the API."
        )
    else:
        logger.info("RAG system ready.")
    yield   # application runs here
    # Cleanup (nothing needed for FAISS)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Indian Financial Schemes RAG Advisor",
    description=(
        "Retrieve and recommend Indian government financial schemes "
        "personalised to a user's age, income, gender, occupation, and state."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Allow all origins for development; tighten in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    """Input payload representing a user seeking scheme recommendations."""

    age:        int   = Field(..., ge=0,   le=120, description="User's age in years")
    gender:     str   = Field(..., description="'male', 'female', or 'other'")
    income:     float = Field(..., ge=0,            description="Annual income in INR")
    occupation: str   = Field(..., description="E.g. 'farmer', 'student', 'salaried'")
    state:      str   = Field(..., description="Indian state or UT, e.g. 'Maharashtra'")

    @field_validator("gender")
    @classmethod
    def _normalise_gender(cls, v: str) -> str:
        normalised = v.strip().lower()
        if normalised not in ("male", "female", "other"):
            raise ValueError("gender must be 'male', 'female', or 'other'")
        return normalised

    @field_validator("state", "occupation")
    @classmethod
    def _strip_strings(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field must not be blank.")
        return stripped


class RecommendedScheme(BaseModel):
    """A single scheme recommendation returned by the advisor."""
    scheme_name:      str
    benefits:         str
    why_eligible:     str
    application_link: str


class RecommendationResponse(BaseModel):
    """Response envelope for /recommend-schemes."""
    recommended_schemes: list[RecommendedScheme]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Utilities"])
def health_check():
    """
    Liveness check.  Returns index status so callers know whether the
    FAISS index has been loaded successfully.
    """
    from rag.retriever import _index
    index_loaded = _index is not None
    return {
        "status":       "ok",
        "index_loaded": index_loaded,
        "message":      (
            "RAG system is ready."
            if index_loaded
            else "Index not loaded. Run pipeline.py then restart the API."
        ),
    }


@app.post(
    "/recommend-schemes",
    response_model=RecommendationResponse,
    tags=["Recommendations"],
    summary="Get personalised government scheme recommendations",
)
def recommend_schemes(profile: UserProfile):
    """
    Accept a user profile and return the top-5 most relevant Indian
    government financial schemes, with eligibility explanations.

    **Input:**
    ```json
    {
      "age":        32,
      "gender":     "female",
      "income":     180000,
      "occupation": "farmer",
      "state":      "Maharashtra"
    }
    ```

    **Output:**
    ```json
    {
      "recommended_schemes": [
        {
          "scheme_name":      "PM-Kisan",
          "benefits":         "₹6,000 per year direct income support …",
          "why_eligible":     "Your income qualifies …",
          "application_link": "https://pmkisan.gov.in"
        }
      ]
    }
    ```
    """
    from rag.retriever import _index
    if _index is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "The recommendation engine is not ready. "
                "Please run 'python pipeline.py' to build the FAISS index, "
                "then restart the API server."
            ),
        )

    try:
        raw_recommendations = get_recommendations(profile.model_dump(), top_n=5)
    except Exception as exc:
        logger.exception("Error generating recommendations for profile %s", profile)
        raise HTTPException(status_code=500, detail=f"Recommendation error: {exc}") from exc

    if not raw_recommendations:
        return RecommendationResponse(recommended_schemes=[])

    schemes = [
        RecommendedScheme(
            scheme_name=      r.get("scheme_name", ""),
            benefits=         r.get("benefits", ""),
            why_eligible=     r.get("why_eligible", ""),
            application_link= r.get("application_link", ""),
        )
        for r in raw_recommendations
    ]

    return RecommendationResponse(recommended_schemes=schemes)


# ---------------------------------------------------------------------------
# Run standalone: python api/main.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host=API_HOST, port=API_PORT, reload=True)
