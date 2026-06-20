from __future__ import annotations

import json
from datetime import date
from typing import Optional, Type, TypeVar

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_agent_session,
    invalidate_agent_session,
    require_admin_key,
    verify_agent_session,
)
from app.schemas.agent import (
    AgentCreate,
    AgentLoginRequest,
    AgentLoginResponse,
    AgentResponse,
    AgentStatsResponse,
    AgentUpdate,
)
from app.services.agents import (
    authenticate_agent,
    create_agent,
    delete_agent,
    get_agent_stats,
    get_all_agents_stats,
    list_agents,
    update_agent,
)
from app.services.admin import dispatch_orders, get_agent_call_center_stats, list_admin_orders, update_admin_order_call, update_admin_order_details, update_admin_order_status
from app.schemas.admin import AdminCallCenterStats, AdminDispatchRequest, AdminDispatchResponse, AdminOrderEditUpdate, AdminOrderListItem, AdminOrdersResponse, AdminOrderCallUpdate, AdminOrderStatusUpdate

router = APIRouter(prefix="/agents", tags=["agents"])

ModelT = TypeVar("ModelT", bound=BaseModel)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_agent_session(authorization: Optional[str] = Header(default=None)) -> str:
    """Dependency – returns agent_id for valid session tokens."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing agent token")
    token = authorization[7:].strip()
    agent_id = verify_agent_session(token)
    if not agent_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    return agent_id


async def _parse_body(request: Request, model: Type[ModelT]) -> ModelT:
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
        errors = [{"loc": e.get("loc", ()), "msg": e.get("msg", "Invalid value")} for e in exc.errors()]
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)


# ---------------------------------------------------------------------------
# Auth (no admin key required)
# ---------------------------------------------------------------------------

@router.post("/login", response_model=AgentLoginResponse)
async def agent_login(request: Request, db: Session = Depends(get_db)) -> AgentLoginResponse:
    payload = await _parse_body(request, AgentLoginRequest)
    agent = authenticate_agent(db, payload.username, payload.password)
    if not agent:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    token = create_agent_session(str(agent.id))
    return AgentLoginResponse(
        token=token,
        agent_id=str(agent.id),
        display_name=agent.display_name,
        allowed_skus=agent.allowed_skus,
    )


@router.post("/logout")
def agent_logout(authorization: Optional[str] = Header(default=None)) -> dict:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        invalidate_agent_session(token)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin CRUD (admin key required)
# ---------------------------------------------------------------------------

@router.get("", response_model=list[AgentResponse], dependencies=[Depends(require_admin_key)])
def admin_list_agents(db: Session = Depends(get_db)) -> list[AgentResponse]:
    agents = list_agents(db)
    return [
        AgentResponse(
            id=str(a.id),
            username=a.username,
            display_name=a.display_name,
            status=a.status,
            allowed_skus=a.allowed_skus,
            created_at=a.created_at,
        )
        for a in agents
    ]


@router.post("", response_model=AgentResponse, dependencies=[Depends(require_admin_key)])
async def admin_create_agent(request: Request, db: Session = Depends(get_db)) -> AgentResponse:
    payload = await _parse_body(request, AgentCreate)
    try:
        agent = create_agent(
            db,
            username=payload.username,
            password=payload.password,
            display_name=payload.display_name,
            allowed_skus=payload.allowed_skus,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return AgentResponse(
        id=str(agent.id),
        username=agent.username,
        display_name=agent.display_name,
        status=agent.status,
        allowed_skus=agent.allowed_skus,
        created_at=agent.created_at,
    )


@router.patch("/{agent_id}", response_model=AgentResponse, dependencies=[Depends(require_admin_key)])
async def admin_update_agent(agent_id: str, request: Request, db: Session = Depends(get_db)) -> AgentResponse:
    payload = await _parse_body(request, AgentUpdate)
    agent = update_agent(
        db,
        agent_id,
        display_name=payload.display_name,
        password=payload.password,
        status=payload.status,
        allowed_skus=payload.allowed_skus,
        clear_skus=payload.clear_skus,
    )
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return AgentResponse(
        id=str(agent.id),
        username=agent.username,
        display_name=agent.display_name,
        status=agent.status,
        allowed_skus=agent.allowed_skus,
        created_at=agent.created_at,
    )


@router.delete("/{agent_id}", dependencies=[Depends(require_admin_key)])
def admin_delete_agent(agent_id: str, db: Session = Depends(get_db)) -> dict:
    ok = delete_agent(db, agent_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return {"ok": True}


@router.get("/stats", response_model=list[AgentStatsResponse], dependencies=[Depends(require_admin_key)])
def admin_all_agent_stats(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> list[AgentStatsResponse]:
    return [AgentStatsResponse(**s) for s in get_all_agents_stats(db, days=days)]


@router.get("/{agent_id}/stats", response_model=AgentStatsResponse, dependencies=[Depends(require_admin_key)])
def admin_agent_stats(
    agent_id: str,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> AgentStatsResponse:
    stats = get_agent_stats(db, agent_id, days=days)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return AgentStatsResponse(**stats)


# ---------------------------------------------------------------------------
# Agent self-service (session token required)
# ---------------------------------------------------------------------------

@router.get("/me", response_model=AgentStatsResponse)
def agent_me(
    days: int = Query(default=30, ge=1, le=365),
    agent_id: str = Depends(_require_agent_session),
    db: Session = Depends(get_db),
) -> AgentStatsResponse:
    stats = get_agent_stats(db, agent_id, days=days)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return AgentStatsResponse(**stats)


@router.get("/me/call-center-stats", response_model=AdminCallCenterStats)
def agent_call_center_stats(
    product_sku: Optional[str] = Query(default=None),
    agent_id: str = Depends(_require_agent_session),
    db: Session = Depends(get_db),
) -> AdminCallCenterStats:
    return get_agent_call_center_stats(db, agent_id=agent_id, product_sku=product_sku)


@router.get("/me/orders", response_model=AdminOrdersResponse)
def agent_my_orders(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    call_status: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=160),
    bucket: Optional[str] = Query(default=None),
    product_sku: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    agent_id: str = Depends(_require_agent_session),
    db: Session = Depends(get_db),
) -> AdminOrdersResponse:
    return list_admin_orders(
        db,
        limit=limit,
        offset=offset,
        status=status_filter,
        call_status=call_status,
        q=q,
        bucket=bucket,
        product_sku=product_sku,
        date_from=date_from,
        date_to=date_to,
        assigned_agent_id=agent_id,
    )


@router.patch("/me/orders/{order_id}/call", response_model=AdminOrderListItem)
async def agent_update_call(
    order_id: str,
    request: Request,
    agent_id: str = Depends(_require_agent_session),
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    payload = await _parse_body(request, AdminOrderCallUpdate)
    order = update_admin_order_call(db, order_id, payload, agent_id=agent_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found or not assigned to you")
    return order


@router.patch("/me/orders/{order_id}/status", response_model=AdminOrderListItem)
async def agent_update_status(
    order_id: str,
    request: Request,
    agent_id: str = Depends(_require_agent_session),
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    payload = await _parse_body(request, AdminOrderStatusUpdate)
    order = update_admin_order_status(db, order_id, payload, agent_id=agent_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found or not assigned to you")
    return order


@router.post("/me/orders/dispatch", response_model=AdminDispatchResponse)
async def agent_dispatch_orders(
    request: Request,
    agent_id: str = Depends(_require_agent_session),
    db: Session = Depends(get_db),
) -> AdminDispatchResponse:
    payload = await _parse_body(request, AdminDispatchRequest)
    # Filter to only orders assigned to this agent
    from uuid import UUID as _UUID
    from app.models.order import Order as _Order
    valid_ids = [
        oid for oid in payload.order_ids
        if _is_agent_order(db, oid, agent_id)
    ]
    if not valid_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No orders assigned to you in this list")
    return dispatch_orders(db, order_ids=valid_ids, delivery_company=payload.delivery_company, new_status=payload.status)


def _is_agent_order(db, order_id: str, agent_id: str) -> bool:
    from uuid import UUID as _UUID
    from app.models.order import Order as _Order
    try:
        order = db.get(_Order, _UUID(order_id))
        return order is not None and str(order.assigned_agent_id) == agent_id
    except Exception:
        return False


@router.patch("/me/orders/{order_id}/details", response_model=AdminOrderListItem)
async def agent_update_details(
    order_id: str,
    request: Request,
    agent_id: str = Depends(_require_agent_session),
    db: Session = Depends(get_db),
) -> AdminOrderListItem:
    payload = await _parse_body(request, AdminOrderEditUpdate)
    order = update_admin_order_details(
        db,
        order_id,
        agent_id=agent_id,
        customer_name=payload.customer_name,
        phone_raw=payload.phone_raw,
        phone_e164=payload.phone_e164,
        address=payload.address,
        city=payload.city,
        delivery_city=payload.delivery_city,
        qty=payload.qty,
        total_mad=payload.total_mad,
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found or not assigned to you")
    return order
