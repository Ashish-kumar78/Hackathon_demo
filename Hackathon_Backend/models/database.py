"""
models/database.py - SQLAlchemy / Supabase Setup (lazy & safe)
"""

from core.config import settings

# --- SQLAlchemy (optional; only initialised if DATABASE_URL is set) ---
engine = None
SessionLocal = None
Base = None

if settings.DATABASE_URL:
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.ext.declarative import declarative_base
        from sqlalchemy.orm import sessionmaker

        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base = declarative_base()
    except Exception as e:
        print(f"[DB] SQLAlchemy init skipped: {e}")


def get_db():
    """Dependency: yields a DB session (no-op if DB not configured)."""
    if SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Supabase Client (optional) ---
supabase = None

if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    except Exception as e:
        print(f"[Supabase] Init skipped: {e}")


def get_supabase():
    """Returns Supabase client or None if not configured."""
    return supabase
