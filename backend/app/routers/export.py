import json
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.export_service import build_user_export

router = APIRouter()


def _error(message: str, code: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": True, "message": message, "code": code},
    )


@router.get("/user/{user_id}")
async def export_user_data(
    user_id: UUID,
    include_chunks: bool = Query(False),
    db: Session = Depends(get_db),
):
    payload = build_user_export(db, user_id, include_chunks=include_chunks)
    body = json.dumps(payload, indent=2, default=str)
    stamp = payload["exported_at"][:10]
    filename = f"academiq-export-{stamp}.json"
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
