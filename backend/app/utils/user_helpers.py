import logging
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import User

logger = logging.getLogger(__name__)


def get_or_create_user(db: Session, user_id: str, user_email: str = "") -> User:
    """Ensure a Supabase Auth user has a matching row in our users table."""
    uid = uuid.UUID(str(user_id))
    user = db.query(User).filter(User.id == uid).first()
    if user:
        return user

    email = (user_email or "").strip() or f"{uid}@unknown.com"
    name = email.split("@")[0] if "@" in email else "Student"

    user = User(
        id=uid,
        email=email,
        name=name,
        language_pref="en",
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
        logger.info("Created app user row for %s (%s)", uid, email)
        return user
    except IntegrityError:
        db.rollback()
        existing = db.query(User).filter(User.id == uid).first()
        if existing:
            return existing
        logger.exception("Failed to create user %s", uid)
        raise
