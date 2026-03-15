from __future__ import annotations
from fastapi import APIRouter, HTTPException
from database.models import UserProfile
from database.mongodb import get_db

router = APIRouter()


@router.post("/", summary="Save or update a user profile")
async def save_profile(profile: UserProfile):
    try:
        db = get_db()
        doc = profile.model_dump()
        if profile.user_id:
            await db["profiles"].replace_one(
                {"user_id": profile.user_id}, doc, upsert=True
            )
        return {"message": "Profile saved", "user_id": profile.user_id}
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
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
