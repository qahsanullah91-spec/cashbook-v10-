"""
Neon Auth bridge endpoint.

Accepts a Neon Auth JWT (issued by Better Auth via Neon), verifies it using the
Neon Auth JWKS endpoint, then creates or retrieves a local app session token.

This allows users who authenticated through the Neon Auth flow (e.g. email/password
or OAuth via Better Auth) to seamlessly obtain a standard cashbook session token
without needing a separate username/password.

Environment variables required:
    NEON_AUTH_BASE_URL  – e.g. https://ep-xxx.neonauth.us-east-2.aws.neon.build/neondb/auth
                          Set this in Vercel env vars and locally in .env.local
"""
import logging
import os
from datetime import datetime, timedelta
from secrets import token_urlsafe

import jwt
from fastapi import APIRouter, Header, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from .. import models
from ..routes.auth import (
    generated_password,
    hash_password,
    public_user,
    audit,
)

router = APIRouter(prefix="/api/auth", tags=["neon-auth"])
logger = logging.getLogger("cashbook")

# ---------------------------------------------------------------------------
# JWKS cache – fetched once per process start to avoid per-request latency.
# In a serverless environment (Vercel) this resets between cold starts, which
# is acceptable because Neon rotates JWKS keys infrequently.
# ---------------------------------------------------------------------------
_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        base_url = os.getenv("NEON_AUTH_BASE_URL", "").rstrip("/")
        if not base_url or base_url == "provisioning":
            raise HTTPException(
                status_code=503,
                detail=(
                    "Neon Auth is not yet provisioned. "
                    "Enable Auth in the Neon Console and set NEON_AUTH_BASE_URL."
                ),
            )
        jwks_url = f"{base_url}/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


# ---------------------------------------------------------------------------
# Helper – decode and verify the Neon Auth JWT
# ---------------------------------------------------------------------------
def _verify_neon_jwt(bearer: str) -> dict:
    """Return the decoded JWT claims or raise HTTPException 401."""
    token = bearer.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing Neon Auth token")
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Better Auth does not set aud by default
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Neon Auth token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Neon Auth token: {exc}")


# ---------------------------------------------------------------------------
# Helper – get or create a local user record from Neon Auth JWT claims
# ---------------------------------------------------------------------------
def _get_or_create_local_user(db: Session, claims: dict) -> models.User:
    """
    Map a Neon Auth identity to a local cashbook User.

    Strategy:
    1. Try to find an existing user by email (from JWT 'email' claim).
    2. If not found, create a new Viewer account so they can access the app.
       The account is flagged must_change_password=False because the password
       is managed by Neon Auth – the local record is just a bridge.
    """
    email: str = claims.get("email", "").strip().lower()
    name: str = claims.get("name", "") or claims.get("preferred_username", "") or email.split("@")[0]
    sub: str = claims.get("sub", "")  # Neon Auth user ID

    if not email:
        raise HTTPException(status_code=401, detail="Neon Auth token missing email claim")

    # Try email match first
    user = db.query(models.User).filter(
        models.User.username == email
    ).first()

    if not user:
        # Try matching by neon_auth_sub if we stored it (future-proofing).
        # For now, fall through to creating a new user.
        pass

    if not user:
        now = datetime.utcnow()
        # Generate a random strong password – the user will never type it;
        # they always log in through the Neon Auth flow.
        random_pw = generated_password(20)
        user = models.User(
            full_name=name or email,
            username=email,  # use email as username for Neon Auth users
            password_hash=hash_password(random_pw),
            role="Viewer",
            avatar_path="",
            is_active=True,
            must_change_password=False,
            password_changed_at=now,
            last_login=now,
        )
        db.add(user)
        db.flush()
        audit(
            db,
            "neon_auth_signup",
            "success",
            email,
            user.id,
            f"New user created via Neon Auth (sub={sub})",
        )
        logger.info("Created new local user %s via Neon Auth (sub=%s)", email, sub)

    return user


# ---------------------------------------------------------------------------
# POST /api/auth/neon-login
# ---------------------------------------------------------------------------
@router.post("/neon-login")
def neon_login(authorization: str | None = Header(default=None)):
    """
    Exchange a verified Neon Auth JWT for a standard cashbook session token.

    Request:
        Authorization: Bearer <neon_auth_jwt>

    Response (same shape as /api/auth/login):
        { token, expires_at, user, must_change_password }
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    claims = _verify_neon_jwt(authorization)

    db: Session = SessionLocal()
    try:
        user = _get_or_create_local_user(db, claims)

        if not user.is_active:
            raise HTTPException(status_code=403, detail="This account is inactive")

        now = datetime.utcnow()
        user.last_login = now
        session = models.UserSession(
            token=token_urlsafe(32),
            user_id=user.id,
            expires_at=now + timedelta(days=1),
        )
        db.add(session)
        audit(db, "neon_auth_login", "success", user.username, user.id, "Login via Neon Auth")
        db.commit()
        db.refresh(user)

        return {
            "token": session.token,
            "expires_at": session.expires_at,
            "user": public_user(user).model_dump(),
            "must_change_password": False,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("neon_login error: %s", exc)
        raise HTTPException(status_code=500, detail="Internal auth error")
    finally:
        db.close()
