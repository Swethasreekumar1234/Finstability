from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from database.mongodb import connect_db, close_db
    from rag.embeddings import build_index
    from database.seed_schemes import seed

    logger.info("Starting Finstability API…")
    try:
        await connect_db()
        logger.info("MongoDB connected.")
        await seed()
    except Exception as exc:
        logger.error("MongoDB unavailable: %s — continuing without DB.", exc)

    try:
        await build_index()
        logger.info("FAISS index ready.")
    except Exception as exc:
        logger.warning("FAISS index unavailable: %s", exc)

    yield

    from database.mongodb import close_db
    await close_db()
    logger.info("Finstability API shut down.")


app = FastAPI(
    title="Finstability API",
    description="Backend for Indian government financial scheme discovery, eligibility & investment recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.routes import profile, schemes, investments  # noqa: E402

app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(schemes.router, prefix="/schemes", tags=["Schemes"])
app.include_router(investments.router, prefix="/investments", tags=["Investments"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Finstability API v1.0"}
