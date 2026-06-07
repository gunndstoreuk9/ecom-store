from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.schemas.order import CreateOrderRequest, OrderDetailResponse, OrderResponse
from app.services.orders import create_order, get_order, to_order_detail_response, to_order_response
from app.services.sheets import sync_order_to_sheet
from app.services.tracking import create_noop_conversion_events

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order_endpoint(
    payload: CreateOrderRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> OrderResponse:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    order = create_order(db, payload, client_ip=client_ip, user_agent=user_agent)
    create_noop_conversion_events(db, order)
    background_tasks.add_task(sync_order_to_sheet, str(order.id), SessionLocal)
    return to_order_response(order)


@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order_endpoint(order_id: str, db: Session = Depends(get_db)) -> OrderDetailResponse:
    order = get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return to_order_detail_response(order)
