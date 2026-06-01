import subprocess
from collections.abc import Generator
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base for all ORM models."""


def _resolve_supabase_ipv6(hostname: str) -> str | None:
    """Windows Python often fails getaddrinfo for IPv6-only Supabase hosts."""
    try:
        output = subprocess.check_output(
            ["nslookup", hostname],
            stderr=subprocess.STDOUT,
            text=True,
            timeout=10,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return None

    candidates: list[str] = []
    for line in output.splitlines():
        if not line.strip().lower().startswith("address"):
            continue
        addr = line.split(":", 1)[-1].strip()
        if ":" in addr and not addr.startswith("10."):
            candidates.append(addr)
    return candidates[-1] if candidates else None


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

    connect_args: dict = {"sslmode": "require"}
    parsed = urlparse(settings.DATABASE_URL)
    hostname = parsed.hostname or ""
    if hostname.startswith("db.") and hostname.endswith(".supabase.co"):
        hostaddr = _resolve_supabase_ipv6(hostname)
        if hostaddr:
            connect_args["hostaddr"] = hostaddr
    return connect_args


engine = create_engine(
    _database_url(),
    pool_pre_ping=not settings.USE_LOCAL_DB,
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
