from __future__ import annotations

from hmac import compare_digest
from typing import Optional

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def require_admin_key(
    x_admin_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
) -> None:
    settings = get_settings()
    expected_key = settings.admin_api_key.strip()
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin dashboard is not configured",
        )

    provided_key = _extract_admin_key(x_admin_key, authorization)
    if not provided_key or not compare_digest(provided_key, expected_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")


def _extract_admin_key(x_admin_key: Optional[str], authorization: Optional[str]) -> Optional[str]:
    if x_admin_key:
        return x_admin_key.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None
