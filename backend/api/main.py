from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Setup Logging to track startup and errors
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup & Shutdown Logic:
    This runs once when the server starts and once when it stops.
    """
    # Local imports to avoid circular dependency issues
    from database.mongodb import connect_db, close_db
    from rag.embeddings import build_index
    from database.seed_schemes import seed
    from database.fund_nav import (
        ensure_fund_nav_indexes, 
        start_fund_nav_scheduler, 
        stop_fund_nav_scheduler
    )

    logger.info(" Starting Finstability API...")
    
    db_connected = False
    scheduler_started = False
    
    try:
        # 1. Connect to MongoDB (Required for profile enrichment storage)
        await connect_db()
        logger.info(" MongoDB connected successfully.")
        db_connected = True
        
        # 2. Seed the 20 schemes into the DB if they don't exist
        await seed()
        
        # 3. Setup Mutual Fund NAV tracking
        await ensure_fund_nav_indexes()
        start_fund_nav_scheduler()
        scheduler_started = True
        logger.info("NAV Update Scheduler started.")
        
    except Exception as exc:
        logger.warning(" MongoDB connection failed: %s. Persistence disabled.", exc)

    try:
        # 4. Build/Load the FAISS index for AI-based scheme matching (RAG)
        await build_index()
        logger.info("FAISS RAG index built and ready.")
    except Exception as exc:
        logger.error("FAISS index creation failed: %s", exc)

    yield  # --- App is now running and accepting requests ---

    # Shutdown Logic
    logger.info(" Shutting down Finstability API...")
    if scheduler_started:
        stop_fund_nav_scheduler()
    if db_connected:
        await close_db()
    logger.info("Shutdown complete.")

# --- APP INITIALIZATION ---
app = FastAPI(
    title="Finstability API",
    description="Backend for personalized Indian government financial schemes and investment discovery.",
    version="1.1.0",
    lifespan=lifespan,
)

# --- MIDDLEWARE (CORS) ---
# Allows your Mobile App (React Native) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to your specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER INCLUSION ---
# These are the modular files we just fixed in the /routes/ folder
from api.routes import profile, schemes, investments

# If you have transactions.py or nav.py files, you can uncomment these lines:
# from api.routes import transactions, nav

# Connect the endpoints to the main app
app.include_router(profile.router, prefix="/profile", tags=["Profile Management"])
app.include_router(schemes.router, prefix="/schemes", tags=["Personalized Schemes"])
app.include_router(investments.router, prefix="/investments", tags=["Investment Advice"])

# Uncomment if these files exist in your routes folder:
# app.include_router(nav.router, prefix="/nav", tags=["Mutual Fund NAV"])
# app.include_router(transactions.router, prefix="/transactions", tags=["Budgeting"])

@app.get("/health", tags=["System"])
async def health_check():
    """Simple endpoint to verify the API is alive."""
    return {
        "status": "healthy", 
        "version": "1.1.0",
        "personalization": "active",
        "enrichment_flow": "ready"
    }

# --- SERVER START ---
if __name__ == "__main__":
    import uvicorn
    # Runs the server on localhost:8000
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)