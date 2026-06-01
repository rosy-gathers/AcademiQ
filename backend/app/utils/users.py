from uuid import UUID

from sqlalchemy.orm import Session

from app.models import User


def get_or_create_user(
    db: Session,
    user_id: UUID,
    user_email: str | None = None,
) -> User:
    """Ensure a Supabase Auth user has a matching row in our users table."""
    existing = db.query(User).filter(User.id == user_id).first()
    if existing:
        return existing

    email = (user_email or "").strip()
    if not email:
        email = f"{user_id}@academiq.local"

    user = User(
        id=user_id,
        email=email,
        name=email.split("@")[0],
        language_pref="en",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
