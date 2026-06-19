from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.order import Order

SUPPORTED_SKUS = ["american-sugar-balance-complex", "miracle-men-oil"]


# ---------------------------------------------------------------------------
# Password helpers (simple SHA-256 + salt — no bcrypt dependency needed)
# ---------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{digest}"


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, digest = password_hash.split(":", 1)
        expected = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
        return secrets.compare_digest(expected, digest)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def create_agent(
    db: Session,
    *,
    username: str,
    password: str,
    display_name: str,
    allowed_skus: Optional[list[str]] = None,
) -> Agent:
    if db.query(Agent).filter(Agent.username == username.strip().lower()).first():
        raise ValueError(f"Username already exists: {username}")
    agent = Agent(
        username=username.strip().lower(),
        password_hash=_hash_password(password),
        display_name=display_name.strip(),
        status="active",
        allowed_skus=allowed_skus or None,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


def update_agent(
    db: Session,
    agent_id: str,
    *,
    display_name: Optional[str] = None,
    password: Optional[str] = None,
    status: Optional[str] = None,
    allowed_skus: Optional[list[str]] = None,
    clear_skus: bool = False,
) -> Optional[Agent]:
    agent = _get_agent(db, agent_id)
    if not agent:
        return None
    if display_name is not None:
        agent.display_name = display_name.strip()
    if password is not None:
        agent.password_hash = _hash_password(password)
    if status is not None and status in ("active", "inactive"):
        agent.status = status
    if clear_skus:
        agent.allowed_skus = None
    elif allowed_skus is not None:
        agent.allowed_skus = allowed_skus or None
    db.commit()
    db.refresh(agent)
    return agent


def delete_agent(db: Session, agent_id: str) -> bool:
    agent = _get_agent(db, agent_id)
    if not agent:
        return False
    db.query(Order).filter(Order.assigned_agent_id == agent.id).update(
        {"assigned_agent_id": None, "assigned_at": None},
        synchronize_session=False,
    )
    db.delete(agent)
    db.commit()
    return True


def list_agents(db: Session) -> list[Agent]:
    return db.query(Agent).order_by(Agent.created_at.asc()).all()


def authenticate_agent(db: Session, username: str, password: str) -> Optional[Agent]:
    agent = db.query(Agent).filter(
        Agent.username == username.strip().lower(),
        Agent.status == "active",
    ).first()
    if not agent:
        return None
    if not _verify_password(password, agent.password_hash):
        return None
    return agent


def _get_agent(db: Session, agent_id: str) -> Optional[Agent]:
    try:
        return db.get(Agent, UUID(agent_id))
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Auto-assignment
# ---------------------------------------------------------------------------

def assign_order_to_agent(db: Session, order: Order) -> Optional[Agent]:
    """Pick the best available agent for this order and assign it."""
    sku = order.hero_sku

    active_agents = db.query(Agent).filter(Agent.status == "active").all()
    eligible = [
        a for a in active_agents
        if not a.allowed_skus or sku in a.allowed_skus
    ]
    if not eligible:
        return None

    now = datetime.now(timezone.utc)
    window = now - timedelta(days=30)

    best_agent: Optional[Agent] = None
    best_score = -1.0

    for agent in eligible:
        score = _agent_score(db, agent, window, now)
        if score > best_score:
            best_score = score
            best_agent = agent

    if best_agent:
        order.assigned_agent_id = best_agent.id
        order.assigned_at = now
        db.commit()

    return best_agent


def _agent_score(db: Session, agent: Agent, window: datetime, now: datetime) -> float:
    """Score = 0.4 * confirmation_rate + 0.3 * speed_score + 0.3 * load_score"""
    # Confirmation rate (last 30 days)
    total = db.query(func.count(Order.id)).filter(
        Order.assigned_agent_id == agent.id,
        Order.assigned_at >= window,
    ).scalar() or 0
    confirmed = db.query(func.count(Order.id)).filter(
        Order.assigned_agent_id == agent.id,
        Order.assigned_at >= window,
        Order.status.in_({"confirmed", "packed", "shipped", "delivered"}),
    ).scalar() or 0
    confirmation_rate = confirmed / total if total > 0 else 0.5

    # Speed score (lower avg minutes = higher score)
    responded_orders = db.query(Order).filter(
        Order.assigned_agent_id == agent.id,
        Order.first_response_at.isnot(None),
        Order.assigned_at >= window,
    ).all()
    if responded_orders:
        durations = []
        for o in responded_orders:
            if o.assigned_at and o.first_response_at:
                diff = (o.first_response_at - o.assigned_at).total_seconds() / 60
                durations.append(max(diff, 1))
        avg_minutes = sum(durations) / len(durations) if durations else 60
        speed_score = 1 / avg_minutes
        speed_score = min(speed_score, 1.0)
    else:
        speed_score = 0.5

    # Load score (fewer open orders = higher score)
    open_count = db.query(func.count(Order.id)).filter(
        Order.assigned_agent_id == agent.id,
        Order.status == "new",
        Order.call_status.is_(None),
    ).scalar() or 0
    load_score = 1 / (open_count + 1)

    return 0.4 * confirmation_rate + 0.3 * speed_score + 0.3 * load_score


# ---------------------------------------------------------------------------
# Performance stats
# ---------------------------------------------------------------------------

def get_agent_stats(db: Session, agent_id: str, *, days: int = 30) -> Optional[dict]:
    agent = _get_agent(db, agent_id)
    if not agent:
        return None

    now = datetime.now(timezone.utc)
    window = now - timedelta(days=days)

    total = db.query(func.count(Order.id)).filter(
        Order.assigned_agent_id == agent.id,
        Order.assigned_at >= window,
    ).scalar() or 0

    confirmed = db.query(func.count(Order.id)).filter(
        Order.assigned_agent_id == agent.id,
        Order.assigned_at >= window,
        Order.status.in_({"confirmed", "packed", "shipped", "delivered"}),
    ).scalar() or 0

    cancelled = db.query(func.count(Order.id)).filter(
        Order.assigned_agent_id == agent.id,
        Order.assigned_at >= window,
        Order.status.in_({"cancelled", "no_answer"}),
    ).scalar() or 0

    pending = db.query(func.count(Order.id)).filter(
        Order.assigned_agent_id == agent.id,
        Order.status == "new",
        Order.call_status.is_(None),
    ).scalar() or 0

    responded = db.query(Order).filter(
        Order.assigned_agent_id == agent.id,
        Order.first_response_at.isnot(None),
        Order.assigned_at >= window,
    ).all()

    avg_response_minutes: Optional[float] = None
    if responded:
        durations = []
        for o in responded:
            if o.assigned_at and o.first_response_at:
                diff = (o.first_response_at - o.assigned_at).total_seconds() / 60
                durations.append(max(diff, 0))
        if durations:
            avg_response_minutes = round(sum(durations) / len(durations), 1)

    return {
        "agent_id": str(agent.id),
        "display_name": agent.display_name,
        "username": agent.username,
        "status": agent.status,
        "allowed_skus": agent.allowed_skus,
        "days": days,
        "total_assigned": total,
        "confirmed": confirmed,
        "cancelled": cancelled,
        "pending_open": pending,
        "confirmation_rate": round(confirmed / total * 100, 1) if total > 0 else 0.0,
        "avg_response_minutes": avg_response_minutes,
    }


def get_all_agents_stats(db: Session, *, days: int = 30) -> list[dict]:
    agents = list_agents(db)
    return [s for a in agents if (s := get_agent_stats(db, str(a.id), days=days))]


def reassign_stale_orders(db: Session, *, stale_minutes: int = 60) -> int:
    """Reassign orders that have been in new/uncontacted state for too long."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    stale = db.query(Order).filter(
        Order.assigned_agent_id.isnot(None),
        Order.status == "new",
        Order.call_status.is_(None),
        Order.assigned_at <= cutoff,
    ).all()
    count = 0
    for order in stale:
        best = assign_order_to_agent(db, order)
        if best:
            count += 1
    return count
