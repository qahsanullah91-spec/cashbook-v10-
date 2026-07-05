from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import SessionLocal
from .routes.auth import current_user


def get_auth_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_authenticated_request(
    x_session_token: str | None = Header(default=None),
    db: Session = Depends(get_auth_db),
):
    user = current_user(db, x_session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    return user


def require_administrator_request(user=Depends(require_authenticated_request)):
    if user.role != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user
