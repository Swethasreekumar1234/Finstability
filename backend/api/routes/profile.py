from __future__ import annotations
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from database.models import UserProfile
from database.mongodb import get_db
from database.profile_features import enrich_profile

router = APIRouter()

@router.post("/", summary="Save or update a full user profile")
async def save_profile(profile: UserProfile):
    """
    Standard endpoint for full profile creation or submission.
    """
    try:
        db = get_db()
        user_id = profile.user_id or str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Prepare document data
        full_doc = profile.model_dump(exclude_none=True)
        provided_fields = set(getattr(profile, "model_fields_set", set()))
        
        # Only update fields that were actually sent to prevent overwriting with defaults
        doc = {k: v for k, v in full_doc.items() if k in provided_fields}
        
        # Email normalization and de-duplication logic
        email = (doc.get("email") or "").strip().lower()
        if email:
            doc["email"] = email
            # Ensure we reuse the same user_id for the same email
            existing = await db["profiles"].find_one(
                {"email": email},
                {"_id": 0, "user_id": 1}
            )
            if existing:
                user_id = existing["user_id"]

        doc["user_id"] = user_id
        doc["updated_at"] = now

        # Update MongoDB (Upsert ensures document is created if it doesn't exist)
        await db["profiles"].update_one(
            {"user_id": user_id},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        
        # Fetch final doc and enrich it with completeness score and tags
        saved = await db["profiles"].find_one({"user_id": user_id}, {"_id": 0})
        return enrich_profile(saved)
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Profile Save Error: {str(exc)}")


@router.post("/update", summary="Incremental update for the one-question-at-a-time flow")
async def update_user_profile(user_id: str, data: dict):
    """
    This endpoint handles immediate persistence for individual field answers.
    Example body: {"caste_category": "OBC"} or {"has_bank_account": false}
    """
    try:
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        
        # Add timestamp to the update
        update_payload = {**data, "updated_at": now}
        
        # Update only the specific fields provided
        await db["profiles"].update_one(
            {"user_id": user_id}, 
            {"$set": update_payload}, 
            upsert=True
        )
        
        # Retrieve the updated document
        updated_doc = await db["profiles"].find_one({"user_id": user_id}, {"_id": 0})
        if not updated_doc:
            raise HTTPException(status_code=404, detail="User not found after update")
            
        # Return the enriched profile so the mobile app gets 
        # the new 'missing_fields' list and 'next_prompt' immediately.
        return enrich_profile(updated_doc)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.get("/by-email", summary="Retrieve a user profile by email")
async def get_profile_by_email(email: str):
    """
    Normalized email lookup for profile retrieval.
    """
    try:
        db = get_db()
        normalized = email.strip().lower()
        if not normalized:
            raise HTTPException(status_code=400, detail="Email is required")

        doc = await db["profiles"].find_one(
            {"email": normalized},
            {"_id": 0},
            sort=[("updated_at", -1)],
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return enrich_profile(doc)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{user_id}", summary="Retrieve a user profile by ID")
async def get_profile(user_id: str):
    """
    Fetches the profile and returns it enriched with completeness summary.
    """
    try:
        db = get_db()
        doc = await db["profiles"].find_one({"user_id": user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return enrich_profile(doc)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))