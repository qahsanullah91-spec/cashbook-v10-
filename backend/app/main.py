from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi import Header
from fastapi import Request
from fastapi import status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .database import Base, engine, SessionLocal, ensure_payroll_schema, ensure_sqlite_schema, ensure_user_schema
from . import models
from .config import APP_NAME, FRONTEND_ORIGINS, FRONTEND_ORIGIN_REGEX
from .routes import accounts, auth, backup, employees, neon_auth, reports, settings, transactions

app = FastAPI(title=APP_NAME)
logger = logging.getLogger("cashbook")

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=FRONTEND_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
ensure_sqlite_schema()
ensure_user_schema()
ensure_payroll_schema()


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Unhandled request error",
            extra={"request_id": request_id, "method": request.method, "path": request.url.path},
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
        )
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/", include_in_schema=False)
def root():
    """Serve the built frontend if available; never return a raw 404 at root.

    In development the Vite dev server (port 5173) serves the UI and proxies
    /api requests here, so this route is only hit when the backend is accessed
    directly. In production, Vercel routes non-/api paths to the static build.
    """
    from pathlib import Path
    from fastapi.responses import FileResponse

    dist_index = Path(__file__).resolve().parents[2] / "frontend" / "dist" / "index.html"
    if dist_index.is_file():
        return FileResponse(dist_index)
    return JSONResponse(
        {
            "service": APP_NAME,
            "status": "online",
            "message": "API backend. The web UI is served by the frontend dev server (Vite) or the static production build.",
            "health": "/api/health",
        }
    )


@app.on_event("startup")
def seed_settings():
    db = SessionLocal()
    try:
        if not db.query(models.Setting).first():
            db.add(models.Setting())
            db.commit()
    finally:
        db.close()


@app.get("/health")
@app.get("/api/health")
@app.get("/api/status")
def health(request: Request = None, x_session_token: str | None = Header(default=None)):
    payload = {
        "backend": "online",
        "database": "unknown",
        "api": "ok",
        "auth": "unknown",
        "status": "ok",
        "version": "1.0.0",
        "port": request.url.port or "N/A" if request else "N/A",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "currentUser": None,
    }
    db = SessionLocal()
    try:
        db.execute(text("select 1"))
        payload["database"] = "connected"
        payload["auth"] = "ready"
        if x_session_token:
            session = db.query(models.UserSession).filter(
                models.UserSession.token == x_session_token,
                models.UserSession.is_active == True,
            ).first()
            if session:
                user = db.query(models.User).filter(models.User.id == session.user_id).first()
                if user:
                    payload["currentUser"] = {
                        "id": user.id,
                        "full_name": user.full_name,
                        "username": user.username,
                        "role": user.role,
                    }
    except Exception as exc:
        logger.exception("Health check failed")
        payload.update(
            {
                "database": "disconnected",
                "auth": "unavailable",
                "status": "error",
                "error": f"Database not connected: {exc}",
            }
        )
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)
    finally:
        db.close()
    return payload


@app.get("/health/database")
def health_database():
    with engine.connect() as conn:
        conn.execute(text("select 1"))
    return {"status": "healthy", "database": "connected"}


@app.get("/health/auth")
def health_auth():
    db = SessionLocal()
    try:
        users = db.query(models.User).count()
        return {"status": "healthy", "auth": "ready", "users": users}
    finally:
        db.close()


# Register all routers
app.include_router(transactions.router)
app.include_router(accounts.router)
app.include_router(employees.router)
app.include_router(settings.router)
app.include_router(backup.router)
app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(neon_auth.router)
