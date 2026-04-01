from __future__ import annotations
import re
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from database.models import UserProfile
from database.mongodb import get_db

router = APIRouter()


@router.post("/", summary="Save or update a user profile")
async def save_profile(profile: UserProfile):
    try:
        db = get_db()
        user_id = profile.user_id or str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        doc = profile.model_dump(exclude_none=True)
        doc["user_id"] = user_id

        await db["profiles"].update_one(
            {"user_id": user_id},
            {
                "$set": {**doc, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        return {"message": "Profile saved", "user_id": user_id}
    except RuntimeError as e:
        if "not connected" in str(e):
            raise HTTPException(status_code=503, detail="Database unavailable. MongoDB not configured.")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))



@router.get("/{user_id}", summary="Retrieve a saved user profile")
async def get_profile(user_id: str):
    try:
        db = get_db()
        doc = await db["profiles"].find_one({"user_id": user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Profile not found")
        return doc
    except RuntimeError as e:
        if "not connected" in str(e):
            raise HTTPException(status_code=503, detail="Database unavailable. MongoDB not configured.")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/by-email", summary="Retrieve a saved user profile by email")
async def get_profile_by_email(email: str):
    try:
        db = get_db()
        normalized = email.strip().lower()
        if not normalized:
            raise HTTPException(status_code=400, detail="Email is required")

        doc = await db["profiles"].find_one(
            {"email": {"$regex": f"^{re.escape(normalized)}$", "$options": "i"}},
            {"_id": 0},
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Profile not found")
        return doc
    except RuntimeError as e:
        if "not connected" in str(e):
            raise HTTPException(status_code=503, detail="Database unavailable. MongoDB not configured.")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
