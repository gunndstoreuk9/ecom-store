from __future__ import annotations

import hashlib
import secrets
import time
from hmac import compare_digest
from typing import Optional

from fastapi import Header, HTTPException, status

from app.core.config import get_settings

# ---------------------------------------------------------------------------
# Agent session tokens (in-memory, simple, no JWT library needed)
# Format:  <agent_id>.<random_hex>
# ---------------------------------------------------------------------------
_agent_sessions: dict[str, dict] = {}   # token -> {"agent_id": str, "exp": float}
_SESSION_TTL = 8 * 3600  # 8 hours


def create_agent_session(agent_id: str) -> str:
    token = f"{agent_id}.{secrets.token_hex(32)}"
    _agent_sessions[token] = {"agent_id": agent_id, "exp": time.time() + _SESSION_TTL}
    _cleanup_sessions()
    return token


def verify_agent_session(token: str) -> Optional[str]:
    """Return agent_id if token valid, else None."""
    entry = _agent_sessions.get(token)
    if not entry:
        return None
    if time.time() > entry["exp"]:
        _agent_sessions.pop(token, None)
        return None
    return entry["agent_id"]


def invalidate_agent_session(token: str) -> None:
    _agent_sessions.pop(token, None)


def _cleanup_sessions() -> None:
    now = time.time()
    expired = [t for t, e in _agent_sessions.items() if now > e["exp"]]
    for t in expired:
        _agent_sessions.pop(t, None)


def resolve_role(
    x_admin_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
) -> str:
    """Return the role for the provided key: 'admin' or 'call_center'.

    The admin key grants full access; the call-center key only unlocks
    call-center endpoints. Raises 401 when the key matches neither.
    """
    settings = get_settings()
    admin_key = settings.admin_api_key.strip()
    cc_key = settings.call_center_api_key.strip()
    if not admin_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin dashboard is not configured",
        )

    provided = _extract_admin_key(x_admin_key, authorization)
    if provided and compare_digest(provided, admin_key):
        return "admin"
    if cc_key and provided and compare_digest(provided, cc_key):
        return "call_center"
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")


def require_admin_key(
    x_admin_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
) -> None:
    """Full-admin only (analytics, finance, full dashboards)."""
    if resolve_role(x_admin_key, authorization) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This key cannot access the full admin dashboard",
        )


def require_call_center_key(
    x_admin_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
) -> None:
    """Admin or call-center key (order workflow + call-center endpoints)."""
    resolve_role(x_admin_key, authorization)


def _extract_admin_key(x_admin_key: Optional[str], authorization: Optional[str]) -> Optional[str]:
    if x_admin_key:
        return x_admin_key.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None
