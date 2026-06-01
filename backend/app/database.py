from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base for all ORM models."""


def _database_url() -> str:
    if settings.USE_LOCAL_DB:
        return "sqlite:///./academiq_local.db"
    url = settings.DATABASE_URL
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _connect_args() -> dict:
    if settings.USE_LOCAL_DB:
        return {}
    return {"sslmode": "require"}


engine = create_engine(
    _database_url(),
    pool_pre_ping=True,
    connect_args=_connect_args(),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
