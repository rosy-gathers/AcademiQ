from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, StudyPlanItem
from app.schemas import (
    StudyPlanItemCreate,
    StudyPlanItemResponse,
    StudyPlanItemUpdate,
    StudyPlanListResponse,
)

router = APIRouter()


def _error(message: str, code: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": True, "message": message, "code": code},
    )


def _to_response(item: StudyPlanItem, document_filename: str | None = None) -> StudyPlanItemResponse:
    return StudyPlanItemResponse(
        id=item.id,
        user_id=item.user_id,
        document_id=item.document_id,
        document_filename=document_filename,
        title=item.title,
        due_at=item.due_at,
        remind_days_before=item.remind_days_before,
        completed=bool(item.completed),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _serialize_items(db: Session, items: list[StudyPlanItem]) -> list[StudyPlanItemResponse]:
    doc_ids = {i.document_id for i in items if i.document_id}
    filenames: dict[UUID, str] = {}
    if doc_ids:
        docs = db.query(Document).filter(Document.id.in_(doc_ids)).all()
        filenames = {d.id: d.filename for d in docs}

    return [
        _to_response(
            item,
            filenames.get(item.document_id) if item.document_id else None,
        )
        for item in items
    ]


@router.get("/user/{user_id}", response_model=StudyPlanListResponse)
def list_study_plan_items(
    user_id: UUID,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    include_completed: bool = Query(True),
    db: Session = Depends(get_db),
):
    q = db.query(StudyPlanItem).filter(StudyPlanItem.user_id == user_id)
    if from_date is not None:
        q = q.filter(StudyPlanItem.due_at >= from_date)
    if to_date is not None:
        q = q.filter(StudyPlanItem.due_at <= to_date)
    if not include_completed:
        q = q.filter(StudyPlanItem.completed.is_(False))
    items = q.order_by(StudyPlanItem.due_at.asc()).all()
    return StudyPlanListResponse(items=_serialize_items(db, items))


@router.get("/reminders/{user_id}", response_model=StudyPlanListResponse)
def list_upcoming_reminders(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    """Items whose reminder window has started and that are not yet completed."""
    now = datetime.utcnow()
    items = (
        db.query(StudyPlanItem)
        .filter(
            StudyPlanItem.user_id == user_id,
            StudyPlanItem.completed.is_(False),
        )
        .order_by(StudyPlanItem.due_at.asc())
        .all()
    )
    reminded: list[StudyPlanItem] = []
    for item in items:
        days_until = (item.due_at - now).total_seconds() / 86400
        if days_until <= item.remind_days_before:
            reminded.append(item)
    return StudyPlanListResponse(items=_serialize_items(db, reminded))


@router.post("", response_model=StudyPlanItemResponse, status_code=201)
def create_study_plan_item(
    body: StudyPlanItemCreate,
    db: Session = Depends(get_db),
):
    if body.document_id is not None:
        doc = (
            db.query(Document)
            .filter(
                Document.id == body.document_id,
                Document.user_id == body.user_id,
            )
            .first()
        )
        if not doc:
            return _error("Document not found for this user", "DOCUMENT_NOT_FOUND", 404)

    item = StudyPlanItem(
        user_id=body.user_id,
        document_id=body.document_id,
        title=body.title.strip(),
        due_at=body.due_at,
        remind_days_before=body.remind_days_before,
        completed=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    filename = None
    if item.document_id:
        doc = db.query(Document).filter(Document.id == item.document_id).first()
        filename = doc.filename if doc else None
    return _to_response(item, filename)


@router.patch("/{item_id}", response_model=StudyPlanItemResponse)
def update_study_plan_item(
    item_id: UUID,
    body: StudyPlanItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(StudyPlanItem).filter(StudyPlanItem.id == item_id).first()
    if not item:
        return _error("Study plan item not found", "NOT_FOUND", 404)

    if body.document_id is not None:
        doc = (
            db.query(Document)
            .filter(
                Document.id == body.document_id,
                Document.user_id == item.user_id,
            )
            .first()
        )
        if not doc:
            return _error("Document not found for this user", "DOCUMENT_NOT_FOUND", 404)
        item.document_id = body.document_id

    if body.title is not None:
        item.title = body.title.strip()
    if body.due_at is not None:
        item.due_at = body.due_at
    if body.remind_days_before is not None:
        item.remind_days_before = body.remind_days_before
    if body.completed is not None:
        item.completed = body.completed

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    filename = None
    if item.document_id:
        doc = db.query(Document).filter(Document.id == item.document_id).first()
        filename = doc.filename if doc else None
    return _to_response(item, filename)


@router.delete("/{item_id}", status_code=204)
def delete_study_plan_item(item_id: UUID, db: Session = Depends(get_db)):
    item = db.query(StudyPlanItem).filter(StudyPlanItem.id == item_id).first()
    if not item:
        return _error("Study plan item not found", "NOT_FOUND", 404)
    db.delete(item)
    db.commit()
    return Response(status_code=204)
