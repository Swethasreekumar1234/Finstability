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
    from database.fund_nav import ensure_fund_nav_indexes, start_fund_nav_scheduler, stop_fund_nav_scheduler

    logger.info("Starting Finstability API…")
    
    # MongoDB is optional for dev; API works without it but profile persistence disabled
    db_connected = False
    scheduler_started = False
    try:
        await connect_db()
        logger.info("MongoDB connected.")
        db_connected = True
        await seed()
        await ensure_fund_nav_indexes()
        start_fund_nav_scheduler()
        scheduler_started = True
    except Exception as exc:
        logger.warning("MongoDB unavailable: %s — profiles will not persist", exc)
        if scheduler_started:
            stop_fund_nav_scheduler()
            scheduler_started = False
        if db_connected:
            await close_db()
            db_connected = False

    try:
        await build_index()
        logger.info("FAISS index ready.")
    except Exception as exc:
        logger.warning("FAISS index unavailable: %s", exc)

    yield

    if scheduler_started:
        stop_fund_nav_scheduler()
    if db_connected:
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

from api.routes import profile, schemes, investments, transactions, nav  # noqa: E402

app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(schemes.router, prefix="/schemes", tags=["Schemes"])
app.include_router(investments.router, prefix="/investments", tags=["Investments"])
app.include_router(nav.router, prefix="/nav", tags=["NAV"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Finstability API v1.0"}
