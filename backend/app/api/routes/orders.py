import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal, get_db
from app.schemas.order import CreateOrderRequest, OrderDetailResponse, OrderResponse
from app.services.fraud import DuplicateOrderError
from app.services.orders import create_order, get_order, import_sheet_lead, to_order_detail_response, to_order_response
from app.services.sheets import sync_order_to_sheet
from app.services.tracking import send_order_tracking_events

router = APIRouter(prefix="/orders", tags=["orders"])


@router.options("")
def orders_preflight() -> dict:
    return {"ok": True}


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order_endpoint(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> OrderResponse:
    payload = await _parse_create_order_request(request)
    client_ip = _client_ip(request)
    user_agent = request.headers.get("user-agent")
    try:
        order = create_order(db, payload, client_ip=client_ip, user_agent=user_agent)
    except DuplicateOrderError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)
    background_tasks.add_task(send_order_tracking_events, str(order.id), SessionLocal)
    background_tasks.add_task(sync_order_to_sheet, str(order.id), SessionLocal)
    return to_order_response(order)


@router.post("/sheet-import", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def import_sheet_lead_endpoint(
    request: Request,
    db: Session = Depends(get_db),
) -> OrderResponse:
    settings = get_settings()
    token = request.query_params.get("token") or request.headers.get("x-sheet-webhook-token")
    if not settings.shopify_sheet_webhook_token or token != settings.shopify_sheet_webhook_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid sheet webhook token")

    try:
        body = await _parse_raw_json(request)
        order, created = import_sheet_lead(db, body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    response = to_order_response(order)
    if not created:
        return response
    return response


@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order_endpoint(order_id: str, db: Session = Depends(get_db)) -> OrderDetailResponse:
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return to_order_detail_response(order)


async def _parse_create_order_request(request: Request) -> CreateOrderRequest:
    try:
        body = await _parse_raw_json(request)
        return CreateOrderRequest.model_validate(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")
    except ValidationError as exc:
        errors = [{"loc": error.get("loc", ()), "msg": error.get("msg", "Invalid value")} for error in exc.errors()]
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)


async def _parse_raw_json(request: Request) -> dict:
    if "application/json" in request.headers.get("content-type", ""):
        body = await request.json()
    else:
        raw_body = (await request.body()).decode("utf-8")
        body = json.loads(raw_body) if raw_body else {}
    if not isinstance(body, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="JSON body must be an object")
    return body


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or None
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip() or None
    return request.client.host if request.client else None
