from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_key
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminOrderCallUpdate,
    AdminOrderListItem,
    AdminOrdersResponse,
    AdminOrderStatusUpdate,
)
from app.services.admin import (
    get_admin_analytics,
    list_admin_orders,
    update_admin_order_call,
    update_admin_order_status,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin_key)])


@router.get("/analytics", response_model=AdminAnalyticsResponse)
def admin_analytics(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> AdminAnalyticsResponse:
    return get_admin_analytics(db, days=days)


@router.get("/orders", response_model=AdminOrdersResponse)
def admin_orders(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    call_status: Optional[str] = Query(default=None),
    sheet_sync_status: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=160),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
) -> AdminOrdersResponse:
    return list_admin_orders(
        db,
        limit=limit,
        offset=offset,
        status=status_filter,
        call_status=call_status,
        sheet_sync_status=sheet_sync_status,
        q=q,
        date_from=date_from,
        date_to=date_to,
    )


@router.patch("/orders/{order_id}/status", response_model=AdminOrderListItem)
def admin_update_order_status(
    order_id: str,
    payload: AdminOrderStatusUpdate,
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    order = update_admin_order_status(db, order_id, payload.status)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.patch("/orders/{order_id}/call", response_model=AdminOrderListItem)
def admin_update_order_call(
    order_id: str,
    payload: AdminOrderCallUpdate,
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    order = update_admin_order_call(
        db,
        order_id,
        call_status=payload.call_status,
        call_note=payload.call_note,
        delivery_company=payload.delivery_company,
        delivery_city=payload.delivery_city,
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order
