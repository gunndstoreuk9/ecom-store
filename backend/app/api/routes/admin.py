from __future__ import annotations

import json
from datetime import date
from typing import Optional, Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_key, require_call_center_key, resolve_role
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminCallCenterStats,
    AdminDispatchRequest,
    AdminDispatchResponse,
    AdminOrderCallUpdate,
    AdminOrderEditUpdate,
    AdminOrderListItem,
    AdminOrdersResponse,
    AdminOrderStatusUpdate,
    ConfirmationPayoutResponse,
    ConfirmationPayoutReset,
    ConfirmationPayoutUpdate,
)
from app.services.admin import (
    dispatch_orders,
    get_admin_analytics,
    get_call_center_stats,
    list_admin_orders,
    update_admin_order_call,
    update_admin_order_details,
    update_admin_order_status,
)
from app.services.payouts import PayoutPinError, get_payout, reset_payout, update_payout

router = APIRouter(prefix="/admin", tags=["admin"])

ModelT = TypeVar("ModelT", bound=BaseModel)


@router.get("/me")
def admin_me(role: str = Depends(resolve_role)) -> dict:
    return {"role": role}


async def _parse_body(request: Request, model: Type[ModelT]) -> ModelT:
    """Parse and validate the request body regardless of Content-Type.

    The hosting proxy can drop/alter the JSON content-type on write requests,
    so we read the raw body and decode it ourselves (same approach as orders).
    """
    try:
        if "application/json" in request.headers.get("content-type", ""):
            body = await request.json()
        else:
            raw_body = (await request.body()).decode("utf-8")
            body = json.loads(raw_body) if raw_body else {}
        return model.model_validate(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")
    except ValidationError as exc:
        errors = [{"loc": error.get("loc", ()), "msg": error.get("msg", "Invalid value")} for error in exc.errors()]
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)


@router.get("/analytics", response_model=AdminAnalyticsResponse, dependencies=[Depends(require_admin_key)])
def admin_analytics(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> AdminAnalyticsResponse:
    return get_admin_analytics(db, days=days)


@router.get("/orders", response_model=AdminOrdersResponse, dependencies=[Depends(require_call_center_key)])
def admin_orders(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    call_status: Optional[str] = Query(default=None),
    bucket: Optional[str] = Query(default=None),
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
        bucket=bucket,
        sheet_sync_status=sheet_sync_status,
        q=q,
        date_from=date_from,
        date_to=date_to,
    )


@router.patch("/orders/{order_id}/status", response_model=AdminOrderListItem, dependencies=[Depends(require_call_center_key)])
async def admin_update_order_status(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    payload = await _parse_body(request, AdminOrderStatusUpdate)
    order = update_admin_order_status(db, order_id, payload.status)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.patch("/orders/{order_id}/call", response_model=AdminOrderListItem, dependencies=[Depends(require_call_center_key)])
async def admin_update_order_call(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    payload = await _parse_body(request, AdminOrderCallUpdate)
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


@router.patch("/orders/{order_id}/details", response_model=AdminOrderListItem, dependencies=[Depends(require_call_center_key)])
async def admin_update_order_details(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    payload = await _parse_body(request, AdminOrderEditUpdate)
    order = update_admin_order_details(
        db,
        order_id,
        customer_name=payload.customer_name,
        address=payload.address,
        city=payload.city,
        delivery_city=payload.delivery_city,
        qty=payload.qty,
        total_mad=payload.total_mad,
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.get("/call-center/stats", response_model=AdminCallCenterStats, dependencies=[Depends(require_call_center_key)])
def admin_call_center_stats(db: Session = Depends(get_db)) -> AdminCallCenterStats:
    return get_call_center_stats(db)


@router.post("/dispatch", response_model=AdminDispatchResponse, dependencies=[Depends(require_call_center_key)])
async def admin_dispatch_orders(
    request: Request,
    db: Session = Depends(get_db),
) -> AdminDispatchResponse:
    payload = await _parse_body(request, AdminDispatchRequest)
    return dispatch_orders(
        db,
        order_ids=payload.order_ids,
        delivery_company=payload.delivery_company,
        new_status=payload.status,
    )


@router.get("/confirmation-payouts", response_model=ConfirmationPayoutResponse, dependencies=[Depends(require_call_center_key)])
def admin_confirmation_payouts(
    details: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> ConfirmationPayoutResponse:
    return get_payout(db, include_details=details)


@router.patch("/confirmation-payouts", response_model=ConfirmationPayoutResponse, dependencies=[Depends(require_admin_key)])
async def admin_update_confirmation_payouts(
    request: Request,
    db: Session = Depends(get_db),
) -> ConfirmationPayoutResponse:
    payload = await _parse_body(request, ConfirmationPayoutUpdate)
    return update_payout(
        db,
        commission_per_order=payload.commission_per_order,
        manual_adjustment_mad=payload.manual_adjustment_mad,
    )


@router.post("/confirmation-payouts/reset", response_model=ConfirmationPayoutResponse, dependencies=[Depends(require_admin_key)])
async def admin_reset_confirmation_payouts(
    request: Request,
    db: Session = Depends(get_db),
) -> ConfirmationPayoutResponse:
    payload = await _parse_body(request, ConfirmationPayoutReset)
    try:
        return reset_payout(db, pin=payload.pin)
    except PayoutPinError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
