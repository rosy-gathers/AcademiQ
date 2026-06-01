from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import UserResponse
from app.utils.user_helpers import get_or_create_user

router = APIRouter()


class UserSyncRequest(BaseModel):
    user_id: UUID
    user_email: str = ""


@router.get("/health")
async def auth_health():
    """Auth routes placeholder — Supabase handles sign-in on the frontend."""
    return {"status": "ok"}


@router.post("/sync-user", response_model=UserResponse)
async def sync_user(body: UserSyncRequest, db: Session = Depends(get_db)):
    """Create the app users row for a Supabase Auth user (idempotent)."""
    user = get_or_create_user(db, str(body.user_id), body.user_email)
    return user
