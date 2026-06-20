from __future__ import annotations

from datetime import datetime, timezone
from hmac import compare_digest
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.order import Order
from app.models.payout import ConfirmationPayout, ConfirmationPayoutState
from app.schemas.admin import (
    ConfirmationPayoutDetailItem,
    ConfirmationPayoutResponse,
)


class PayoutPinError(Exception):
    pass


def _get_or_create_state(db: Session) -> ConfirmationPayoutState:
    state = db.get(ConfirmationPayoutState, 1)
    if state is None:
        state = ConfirmationPayoutState(id=1, commission_per_order=5, manual_adjustment_mad=0)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def _eligible_query(db: Session, state: ConfirmationPayoutState):
    """Orders confirmed and successfully sent to delivery since the last reset."""
    query = db.query(Order).filter(
        Order.dispatched_at.isnot(None),
        Order.delivery_tracking.isnot(None),
        Order.delivery_error.is_(None),
    )
    if state.last_reset_at is not None:
        query = query.filter(Order.dispatched_at > state.last_reset_at)
    return query


def get_payout(db: Session, *, include_details: bool = False) -> ConfirmationPayoutResponse:
    state = _get_or_create_state(db)
    base_query = _eligible_query(db, state)

    orders_count = base_query.with_entities(func.count(Order.id)).scalar() or 0
    base_amount = orders_count * state.commission_per_order
    total_due = base_amount + state.manual_adjustment_mad

    details: Optional[list[ConfirmationPayoutDetailItem]] = None
    if include_details:
        rows = (
            base_query.order_by(Order.dispatched_at.desc())
            .limit(500)
            .all()
        )
        details = [
            ConfirmationPayoutDetailItem(
                order_id=o.id,
                public_order_number=o.public_order_number,
                customer_name=o.customer_name,
                total_mad=o.total_mad,
                commission_mad=state.commission_per_order,
                dispatched_at=o.dispatched_at,
            )
            for o in rows
        ]

    return ConfirmationPayoutResponse(
        orders_count=orders_count,
        commission_per_order=state.commission_per_order,
        base_amount_mad=base_amount,
        manual_adjustment_mad=state.manual_adjustment_mad,
        total_due_mad=total_due,
        last_reset_at=state.last_reset_at,
        status="unpaid" if total_due > 0 else "paid",
        details=details,
    )


def _get_agent_obj(db: Session, agent_id: str):
    from uuid import UUID as _UUID
    from app.models.agent import Agent as _Agent
    try:
        return db.get(_Agent, _UUID(agent_id))
    except ValueError:
        return None


def get_agent_payout(db: Session, *, agent_id: str, include_details: bool = False) -> ConfirmationPayoutResponse:
    """Personal payout for a single agent. Falls back to global payout when no agent-specific orders exist."""
    agent = _get_agent_obj(db, agent_id)
    if agent is None:
        return ConfirmationPayoutResponse(
            orders_count=0, commission_per_order=5, base_amount_mad=0,
            manual_adjustment_mad=0, total_due_mad=0, last_reset_at=None, status="paid",
        )

    # Try agent-specific payout first; fall back to global if column missing or no orders found
    try:
        state = _get_or_create_state(db)
        aid = agent.id
        agent_reset_at = state.last_reset_at

        base_q = db.query(Order).filter(
            Order.assigned_agent_id == aid,
            Order.dispatched_at.isnot(None),
            Order.delivery_tracking.isnot(None),
            Order.delivery_error.is_(None),
        )
        if agent_reset_at is not None:
            base_q = base_q.filter(Order.dispatched_at > agent_reset_at)

        orders_count = base_q.with_entities(func.count(Order.id)).scalar() or 0

        # If no agent-specific orders, use global totals (covers pre-agent-system dispatches)
        if orders_count == 0:
            global_q = _eligible_query(db, state)
            orders_count = global_q.with_entities(func.count(Order.id)).scalar() or 0
            base_amount = orders_count * state.commission_per_order
            details = None
            if include_details:
                rows = global_q.order_by(Order.dispatched_at.desc()).limit(500).all()
                details = [
                    ConfirmationPayoutDetailItem(
                        order_id=o.id,
                        public_order_number=o.public_order_number,
                        customer_name=o.customer_name,
                        total_mad=o.total_mad,
                        commission_mad=state.commission_per_order,
                        dispatched_at=o.dispatched_at,
                    )
                    for o in rows
                ]
            return ConfirmationPayoutResponse(
                orders_count=orders_count,
                commission_per_order=state.commission_per_order,
                base_amount_mad=base_amount,
                manual_adjustment_mad=0,
                total_due_mad=base_amount,
                last_reset_at=agent_reset_at,
                status="unpaid" if base_amount > 0 else "paid",
                details=details,
            )

        base_amount = orders_count * state.commission_per_order
        details = None
        if include_details:
            rows = base_q.order_by(Order.dispatched_at.desc()).limit(500).all()
            details = [
                ConfirmationPayoutDetailItem(
                    order_id=o.id,
                    public_order_number=o.public_order_number,
                    customer_name=o.customer_name,
                    total_mad=o.total_mad,
                    commission_mad=state.commission_per_order,
                    dispatched_at=o.dispatched_at,
                )
                for o in rows
            ]
        return ConfirmationPayoutResponse(
            orders_count=orders_count,
            commission_per_order=state.commission_per_order,
            base_amount_mad=base_amount,
            manual_adjustment_mad=0,
            total_due_mad=base_amount,
            last_reset_at=agent_reset_at,
            status="unpaid" if base_amount > 0 else "paid",
            details=details,
        )
    except Exception:
        # Column missing or DB error — fall back to global payout
        db.rollback()
        return get_payout(db, include_details=include_details)


def reset_agent_payout(db: Session, *, agent_id: str, pin: str) -> ConfirmationPayoutResponse:
    """Reset payout for a single agent using admin PIN."""
    expected = get_settings().admin_reset_pin.strip()
    if not expected:
        raise PayoutPinError("Reset PIN is not configured (set ADMIN_RESET_PIN)")
    if not pin or not compare_digest(pin.strip(), expected):
        raise PayoutPinError("Invalid admin PIN")

    agent = _get_agent_obj(db, agent_id)
    if agent is None:
        raise ValueError("Agent not found")

    agent.payout_last_reset_at = datetime.now(timezone.utc)
    db.commit()
    return get_agent_payout(db, agent_id=agent_id)


def update_payout(
    db: Session,
    *,
    commission_per_order: Optional[int] = None,
    manual_adjustment_mad: Optional[int] = None,
) -> ConfirmationPayoutResponse:
    state = _get_or_create_state(db)
    if commission_per_order is not None:
        state.commission_per_order = commission_per_order
    if manual_adjustment_mad is not None:
        state.manual_adjustment_mad = manual_adjustment_mad
    db.commit()
    return get_payout(db)


def reset_payout(db: Session, *, pin: str) -> ConfirmationPayoutResponse:
    expected = get_settings().admin_reset_pin.strip()
    if not expected:
        raise PayoutPinError("Reset PIN is not configured (set ADMIN_RESET_PIN)")
    if not pin or not compare_digest(pin.strip(), expected):
        raise PayoutPinError("Invalid admin PIN")

    state = _get_or_create_state(db)
    snapshot = get_payout(db)

    db.add(
        ConfirmationPayout(
            orders_count=snapshot.orders_count,
            commission_per_order=snapshot.commission_per_order,
            base_amount_mad=snapshot.base_amount_mad,
            manual_adjustment_mad=snapshot.manual_adjustment_mad,
            total_amount_mad=snapshot.total_due_mad,
            period_start=state.last_reset_at,
        )
    )
    state.last_reset_at = datetime.now(timezone.utc)
    state.manual_adjustment_mad = 0
    db.commit()
    return get_payout(db)
