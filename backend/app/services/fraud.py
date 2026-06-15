from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import distinct, func, or_
from sqlalchemy.orm import Session

from app.models.fraud import FraudEvent, FraudSettings
from app.models.order import Order

DUPLICATE_MESSAGE = "Your order has already been received. Please wait for confirmation."
CANCELLED_STATUSES = {"cancelled", "refused", "no_answer"}


@dataclass
class FraudDecision:
    blocked: bool
    risk_score: int
    risk_level: str
    flags: list[str]
    block_reason: Optional[str] = None


class DuplicateOrderError(Exception):
    def __init__(self, message: str = DUPLICATE_MESSAGE) -> None:
        super().__init__(message)
        self.message = message


def get_fraud_settings(db: Session) -> FraudSettings:
    settings = db.get(FraudSettings, 1)
    if settings:
        return settings
    settings = FraudSettings(id=1)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def update_fraud_settings(
    db: Session,
    *,
    enabled: Optional[bool] = None,
    lock_period_minutes: Optional[int] = None,
    medium_risk_threshold: Optional[int] = None,
    high_risk_threshold: Optional[int] = None,
    ip_window_minutes: Optional[int] = None,
    ip_order_limit: Optional[int] = None,
    device_phone_limit: Optional[int] = None,
    rapid_submit_seconds: Optional[int] = None,
) -> FraudSettings:
    settings = get_fraud_settings(db)
    updates = {
        "enabled": enabled,
        "lock_period_minutes": lock_period_minutes,
        "medium_risk_threshold": medium_risk_threshold,
        "high_risk_threshold": high_risk_threshold,
        "ip_window_minutes": ip_window_minutes,
        "ip_order_limit": ip_order_limit,
        "device_phone_limit": device_phone_limit,
        "rapid_submit_seconds": rapid_submit_seconds,
    }
    for key, value in updates.items():
        if value is not None:
            setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


def evaluate_order_risk(
    db: Session,
    *,
    phone_e164: str,
    whatsapp_e164: Optional[str],
    client_ip: Optional[str],
    browser_fingerprint: Optional[str],
    device_id: Optional[str],
    user_agent: Optional[str],
) -> FraudDecision:
    settings = get_fraud_settings(db)
    if not settings.enabled:
        return FraudDecision(blocked=False, risk_score=0, risk_level="low", flags=["fraud_checks_disabled"])

    now = datetime.now(timezone.utc)
    lock_start = now - timedelta(minutes=settings.lock_period_minutes)
    ip_start = now - timedelta(minutes=settings.ip_window_minutes)
    rapid_start = now - timedelta(seconds=settings.rapid_submit_seconds)
    flags: list[str] = []
    score = 0
    block_reason: Optional[str] = None

    phone_values = {phone_e164}
    if whatsapp_e164:
        phone_values.add(whatsapp_e164)

    duplicate_phone = (
        db.query(func.count(Order.id))
        .filter(Order.created_at >= lock_start, Order.phone_e164.in_(phone_values))
        .scalar()
        or 0
    )
    if duplicate_phone:
        score += 100
        flags.append("duplicate_phone_2h")
        block_reason = DUPLICATE_MESSAGE

    duplicate_device = _recent_identifier_count(db, Order.device_id, device_id, lock_start)
    if duplicate_device:
        score += 80
        flags.append("duplicate_device_2h")
        block_reason = block_reason or DUPLICATE_MESSAGE

    duplicate_fingerprint = _recent_identifier_count(db, Order.browser_fingerprint, browser_fingerprint, lock_start)
    if duplicate_fingerprint:
        score += 80
        flags.append("duplicate_browser_2h")
        block_reason = block_reason or DUPLICATE_MESSAGE

    ip_orders = _recent_identifier_count(db, Order.client_ip, client_ip, ip_start)
    if ip_orders >= settings.ip_order_limit:
        score += 25
        flags.append("many_orders_same_ip")

    distinct_phones_same_ip = _distinct_phones_for_identifier(db, Order.client_ip, client_ip, ip_start)
    if distinct_phones_same_ip >= settings.device_phone_limit:
        score += 25
        flags.append("multiple_phones_same_ip")

    distinct_phones_same_device = _distinct_phones_for_identifier(db, Order.device_id, device_id, lock_start)
    if distinct_phones_same_device >= settings.device_phone_limit:
        score += 30
        flags.append("multiple_phones_same_device")

    recent_same_source = _recent_source_count(db, client_ip, browser_fingerprint, device_id, rapid_start)
    if recent_same_source:
        score += 20
        flags.append("rapid_form_submission")

    phone_history = db.query(Order.status).filter(Order.phone_e164.in_(phone_values)).all()
    total_history = len(phone_history)
    bad_history = sum(1 for (status,) in phone_history if status in CANCELLED_STATUSES)
    if bad_history >= 2 or (total_history >= 3 and bad_history / total_history >= 0.6):
        score += 25
        flags.append("high_cancellation_history")

    if _looks_like_proxy(user_agent):
        score += 10
        flags.append("proxy_or_bot_user_agent")

    risk_level = _risk_level(score, settings.medium_risk_threshold, settings.high_risk_threshold)
    blocked = block_reason is not None

    if blocked:
        record_fraud_event(
            db,
            event_type="blocked_duplicate",
            phone_e164=phone_e164,
            client_ip=client_ip,
            browser_fingerprint=browser_fingerprint,
            device_id=device_id,
            risk_score=score,
            risk_level=risk_level,
            reason=block_reason,
            flags=flags,
        )
        raise DuplicateOrderError(block_reason)

    if risk_level in {"medium", "high"} or flags:
        record_fraud_event(
            db,
            event_type="suspicious",
            phone_e164=phone_e164,
            client_ip=client_ip,
            browser_fingerprint=browser_fingerprint,
            device_id=device_id,
            risk_score=score,
            risk_level=risk_level,
            reason=", ".join(flags),
            flags=flags,
        )

    return FraudDecision(blocked=False, risk_score=min(score, 100), risk_level=risk_level, flags=flags)


def record_fraud_event(
    db: Session,
    *,
    event_type: str,
    phone_e164: Optional[str],
    client_ip: Optional[str],
    browser_fingerprint: Optional[str],
    device_id: Optional[str],
    risk_score: int,
    risk_level: str,
    reason: Optional[str],
    flags: list[str],
) -> FraudEvent:
    event = FraudEvent(
        event_type=event_type,
        phone_e164=phone_e164,
        client_ip=client_ip,
        browser_fingerprint=browser_fingerprint,
        device_id=device_id,
        risk_score=min(risk_score, 100),
        risk_level=risk_level,
        reason=reason,
        flags={"rules": flags},
    )
    db.add(event)
    db.commit()
    return event


def get_fraud_stats(db: Session, *, days: int) -> dict:
    safe_days = max(1, min(days, 365))
    start = datetime.now(timezone.utc) - timedelta(days=safe_days)
    blocked = int(
        db.query(func.count(FraudEvent.id))
        .filter(FraudEvent.created_at >= start, FraudEvent.event_type == "blocked_duplicate")
        .scalar()
        or 0
    )
    suspicious = int(
        db.query(func.count(Order.id))
        .filter(Order.created_at >= start, Order.risk_score > 0)
        .scalar()
        or 0
    )
    high_risk = int(
        db.query(func.count(Order.id))
        .filter(Order.created_at >= start, Order.risk_level == "high")
        .scalar()
        or 0
    )
    latest = (
        db.query(Order)
        .filter(Order.created_at >= start, Order.risk_score > 0)
        .order_by(Order.risk_score.desc(), Order.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "days": safe_days,
        "blocked_duplicate_orders": blocked,
        "suspicious_orders": suspicious,
        "high_risk_orders": high_risk,
        "latest": latest,
    }


def _recent_identifier_count(db: Session, column, value: Optional[str], start: datetime) -> int:
    if not value:
        return 0
    return int(db.query(func.count(Order.id)).filter(column == value, Order.created_at >= start).scalar() or 0)


def _distinct_phones_for_identifier(db: Session, column, value: Optional[str], start: datetime) -> int:
    if not value:
        return 0
    return int(
        db.query(func.count(distinct(Order.phone_e164)))
        .filter(column == value, Order.created_at >= start)
        .scalar()
        or 0
    )


def _recent_source_count(
    db: Session,
    client_ip: Optional[str],
    browser_fingerprint: Optional[str],
    device_id: Optional[str],
    start: datetime,
) -> int:
    clauses = []
    if client_ip:
        clauses.append(Order.client_ip == client_ip)
    if browser_fingerprint:
        clauses.append(Order.browser_fingerprint == browser_fingerprint)
    if device_id:
        clauses.append(Order.device_id == device_id)
    if not clauses:
        return 0
    return int(db.query(func.count(Order.id)).filter(Order.created_at >= start, or_(*clauses)).scalar() or 0)


def _risk_level(score: int, medium_threshold: int, high_threshold: int) -> str:
    if score >= high_threshold:
        return "high"
    if score >= medium_threshold:
        return "medium"
    return "low"


def _looks_like_proxy(user_agent: Optional[str]) -> bool:
    value = (user_agent or "").lower()
    return any(token in value for token in ["proxy", "vpn", "headless", "phantom", "selenium", "bot"])
