from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def auth_health():
    """Auth routes placeholder — Supabase handles sign-in on the frontend."""
    return {"status": "ok"}
