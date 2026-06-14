from __future__ import annotations

import json
from typing import Optional, Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_key, require_call_center_key
from app.schemas.tracking import (
    PLATFORMS,
    SCOPE_TYPES,
    SUPPORTED_EVENTS,
    TrackingAnalytics,
    TrackingLogsResponse,
    TrackingPinBody,
    TrackingPixelCreate,
    TrackingPixelOut,
    TrackingPixelUpdate,
    TrackingSpendUpsert,
    TrackingTestResult,
)
from app.services.tracking_center import (
    TrackingPinError,
    create_pixel,
    delete_pixel,
    get_analytics,
    list_logs,
    list_pixels,
    send_test_event,
    update_pixel,
    upsert_spend,
)

router = APIRouter(prefix="/admin/tracking", tags=["tracking"])

ModelT = TypeVar("ModelT", bound=BaseModel)


async def _parse_body(request: Request, model: Type[ModelT]) -> ModelT:
    try:
        if "application/json" in request.headers.get("content-type", ""):
            body = await request.json()
        else:
            raw = (await request.body()).decode("utf-8")
            body = json.loads(raw) if raw else {}
        return model.model_validate(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")
    except ValidationError as exc:
        errors = [{"loc": e.get("loc", ()), "msg": e.get("msg", "Invalid value")} for e in exc.errors()]
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)


@router.get("/meta", dependencies=[Depends(require_call_center_key)])
def tracking_meta() -> dict:
    return {
        "platforms": sorted(PLATFORMS),
        "events": SUPPORTED_EVENTS,
        "scope_types": sorted(SCOPE_TYPES),
    }


@router.get("/pixels", response_model=list[TrackingPixelOut], dependencies=[Depends(require_admin_key)])
def tracking_list_pixels(
    platform: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[TrackingPixelOut]:
    return list_pixels(db, platform=platform, status=status_filter)


@router.post("/pixels", response_model=TrackingPixelOut, dependencies=[Depends(require_admin_key)])
async def tracking_create_pixel(request: Request, db: Session = Depends(get_db)) -> TrackingPixelOut:
    payload = await _parse_body(request, TrackingPixelCreate)
    try:
        return create_pixel(db, payload)
    except TrackingPinError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.patch("/pixels/{pixel_id}", response_model=TrackingPixelOut, dependencies=[Depends(require_admin_key)])
async def tracking_update_pixel(pixel_id: str, request: Request, db: Session = Depends(get_db)) -> TrackingPixelOut:
    payload = await _parse_body(request, TrackingPixelUpdate)
    try:
        result = update_pixel(db, pixel_id, payload)
    except TrackingPinError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pixel not found")
    return result


@router.post("/pixels/{pixel_id}/delete", dependencies=[Depends(require_admin_key)])
async def tracking_delete_pixel(pixel_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await _parse_body(request, TrackingPinBody)
    try:
        ok = delete_pixel(db, pixel_id, pin=payload.pin)
    except TrackingPinError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pixel not found")
    return {"ok": True}


@router.post("/pixels/{pixel_id}/test", response_model=TrackingTestResult, dependencies=[Depends(require_admin_key)])
def tracking_test_pixel(pixel_id: str, db: Session = Depends(get_db)) -> TrackingTestResult:
    return send_test_event(db, pixel_id)


@router.get("/analytics", response_model=TrackingAnalytics, dependencies=[Depends(require_admin_key)])
def tracking_analytics(
    days: int = Query(default=7, ge=1, le=365),
    db: Session = Depends(get_db),
) -> TrackingAnalytics:
    return get_analytics(db, days=days)


@router.get("/logs", response_model=TrackingLogsResponse, dependencies=[Depends(require_admin_key)])
def tracking_logs(
    platform: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> TrackingLogsResponse:
    return list_logs(db, platform=platform, status=status_filter, limit=limit, offset=offset)


@router.post("/spend", dependencies=[Depends(require_admin_key)])
async def tracking_spend(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await _parse_body(request, TrackingSpendUpsert)
    upsert_spend(db, platform=payload.platform, day=payload.day, amount_mad=payload.amount_mad)
    return {"ok": True}
