import uuid

from sqlalchemy.orm import Session

from app.models import User


def get_or_create_user(db: Session, user_id: str, user_email: str = "") -> User:
    uid = uuid.UUID(str(user_id))
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        user = User(
            id=uid,
            email=user_email or f"{user_id}@unknown.com",
            name=user_email.split("@")[0] if user_email else "Student",
            language_pref="en",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
