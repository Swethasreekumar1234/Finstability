# Indian Financial Schemes RAG Advisor

A Python backend that scrapes Indian government financial scheme data, builds a semantic search index, and serves personalised recommendations through a REST API.

---

## Project Structure

```
financial_advisor/
├── config.py               # All paths, model names, and parameters
├── pipeline.py             # End-to-end CLI runner (scrape → clean → embed)
├── requirements.txt
│
├── scraper/
│   └── scraper.py          # Crawls india.gov.in + data.gov.in
│
├── processing/
│   └── cleaner.py          # HTML stripping, field normalisation, eligibility parser
│
├── embeddings/
│   └── embedder.py         # Chunking, sentence-transformer encoding, FAISS builder
│
├── rag/
│   ├── retriever.py        # FAISS semantic search
│   └── advisor.py          # Profile → query → chunks → structured recommendations
│
├── api/
│   └── main.py             # FastAPI server  (POST /recommend-schemes)
│
├── scheduler/
│   └── scheduler.py        # APScheduler weekly update job with change detection
│
└── data/                   # Created automatically at runtime
    ├── raw/                # schemes_raw.json      (scraper output)
    ├── processed/          # schemes_processed.json, chunks.json
    └── embeddings/         # schemes.index (FAISS), schemes_metadata.json
```

---

## Prerequisites

- Python 3.11+
- ~2 GB free disk space (for PyTorch + FAISS + model weights)

---

## Installation

```bash
cd scripts/financial_advisor

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## Quick Start

### 1 – Build the data pipeline

```bash
# Full run: scrape → clean → chunk → embed
python pipeline.py

# Fast iteration (skip scraping, use cached raw JSON):
python pipeline.py --skip-scrape

# Verbose logging:
python pipeline.py -v
```

Pipeline flags:

| Flag | Effect |
|------|--------|
| `--skip-scrape` | Use existing `data/raw/schemes_raw.json` |
| `--skip-clean`  | Use existing `data/processed/schemes_processed.json` |
| `--skip-chunk`  | Use existing `data/processed/chunks.json` |
| `-v` / `--verbose` | Enable DEBUG logging |

### 2 – Start the API server

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger UI is available at **http://localhost:8000/docs**.

### 3 – Test the recommendation endpoint

```bash
curl -X POST http://localhost:8000/recommend-schemes \
     -H "Content-Type: application/json" \
     -d '{
           "age": 28,
           "gender": "female",
           "income": 180000,
           "occupation": "farmer",
           "state": "Maharashtra"
         }'
```

**Response:**

```json
{
  "recommended_schemes": [
    {
      "scheme_name": "PM-Kisan",
      "benefits": "₹6,000 per year direct income support to small and marginal farmers …",
      "why_eligible": "Your income (₹1,80,000) is within the scheme's income limit. This scheme is available across all Indian states.",
      "application_link": "https://pmkisan.gov.in"
    }
  ]
}
```

### 4 – Start the weekly update scheduler

```bash
# Schedule only (runs every 7 days):
python scheduler/scheduler.py

# Run an update immediately, then schedule:
python scheduler/scheduler.py --run-now
```

---

## API Reference

### `GET /health`

Returns the current status of the recommendation engine.

```json
{ "status": "ok", "index_loaded": true, "message": "RAG system is ready." }
```

### `POST /recommend-schemes`

**Request body:**

| Field | Type | Description |
|-------|------|-------------|
| `age` | int | User's age in years (0–120) |
| `gender` | string | `"male"`, `"female"`, or `"other"` |
| `income` | number | Annual income in INR |
| `occupation` | string | E.g. `"farmer"`, `"student"`, `"salaried"` |
| `state` | string | Indian state or UT, e.g. `"West Bengal"` |

**Response:**

```json
{
  "recommended_schemes": [
    {
      "scheme_name":      "string",
      "benefits":         "string",
      "why_eligible":     "string",
      "application_link": "string"
    }
  ]
}
```

---

## Optional: LLM-enhanced recommendations

Set the `OPENAI_API_KEY` environment variable (or add it to a `.env` file) to enable GPT-powered narrative recommendations:

```bash
export OPENAI_API_KEY="sk-..."
uvicorn api.main:app --port 8000
```

Uncomment `openai>=1.30.0` in `requirements.txt` and run `pip install openai` before starting.

---

## How the RAG pipeline works

```
User profile
    │
    ▼
build_profile_query()   ──►  "Government scheme for 28 year old female farmer
                               income 1.8 lakh in Maharashtra"
    │
    ▼
retrieve()              ──►  Top-15 semantically similar scheme chunks from FAISS
    │
    ▼
check_eligibility()     ──►  Rule-based matching against structured eligibility fields
    │                         (age_range, income_limit, gender, state)
    ▼
_format_recommendation()──►  {scheme_name, benefits, why_eligible, application_link}
    │
    ▼ (optional)
_llm_enhance()          ──►  GPT refines narrative using retrieved context
    │
    ▼
JSON response
```

---

## Configuration

All settings live in `config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformer model |
| `CHUNK_SIZE_WORDS` | `350` | Words per text chunk |
| `CHUNK_OVERLAP_WORDS` | `50` | Overlap between chunks |
| `TOP_K_RESULTS` | `5` | FAISS results per query |
| `SCRAPE_INTERVAL_DAYS` | `7` | Scheduler cadence |
| `REQUEST_DELAY` | `1.5` | Seconds between scraper requests |

---

## Troubleshooting

**"FAISS index not found"**
→ Run `python pipeline.py` first to build the index.

**Scraper returns 0 schemes**
→ The site layout may have changed.  The scraper falls back to `SEED_URLS` in `scraper/scraper.py`; add new URLs there as needed.

**Slow first API request**
→ The embedding model loads lazily on the first call (~3 s). Subsequent requests are fast.
