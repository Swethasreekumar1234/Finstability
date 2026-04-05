from __future__ import annotations
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from database.models import UserProfile
from database.mongodb import get_db
from database.profile_features import enrich_profile

router = APIRouter()


@router.post("/", summary="Save or update a user profile")
async def save_profile(profile: UserProfile):
    try:
        db = get_db()
        user_id = profile.user_id or str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        full_doc = profile.model_dump(exclude_none=True)
        provided_fields = set(getattr(profile, "model_fields_set", set()))
        # Important: update only fields explicitly sent by the client.
        # This prevents omitted fields from being reset to model defaults (e.g., 0 values).
        doc = {k: v for k, v in full_doc.items() if k in provided_fields}
        email = (doc.get("email") or "").strip().lower()
        if email:
            doc["email"] = email

            # Reuse canonical user_id for this email to avoid multiple profile docs per user.
            existing_for_email = await db["profiles"].find_one(
                {"email": email},
                {"_id": 0, "user_id": 1},
                sort=[("updated_at", -1)],
            )
            if existing_for_email and existing_for_email.get("user_id"):
                user_id = str(existing_for_email["user_id"])

        doc["user_id"] = user_id
        doc["updated_at"] = now

        await db["profiles"].update_one(
            {"user_id": user_id},
            {
                "$set": doc,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        saved = await db["profiles"].find_one({"user_id": user_id}, {"_id": 0}) or doc
        return enrich_profile(saved)
    except RuntimeError as e:
        if "not connected" in str(e):
            raise HTTPException(status_code=503, detail="Database unavailable. MongoDB not configured.")
        raise HTTPException(status_code=500, detail=str(e))
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
            {"email": normalized},
            {"_id": 0},
            sort=[("updated_at", -1)],
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Profile not found")
        return enrich_profile(doc)
    except RuntimeError as e:
        if "not connected" in str(e):
            raise HTTPException(status_code=503, detail="Database unavailable. MongoDB not configured.")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{user_id}", summary="Retrieve a saved user profile")
async def get_profile(user_id: str):
    try:
        db = get_db()
        doc = await db["profiles"].find_one({"user_id": user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Profile not found")
        return enrich_profile(doc)
    except RuntimeError as e:
        if "not connected" in str(e):
            raise HTTPException(status_code=503, detail="Database unavailable. MongoDB not configured.")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
