from __future__ import annotations

import json
from typing import Optional, Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_key
from app.schemas.product_links import (
    ProductLinkBulkUpdate,
    ProductLinkCreate,
    ProductLinkDelete,
    ProductLinkOut,
    ProductLinkUpdate,
    ProductLinksResponse,
)
from app.services.product_links import (
    bulk_action,
    create_link,
    delete_link,
    duplicate_link,
    list_links,
    resolve_and_track,
    update_link,
)
from app.services.tracking_center import TrackingPinError

router = APIRouter(tags=["product-links"])
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


@router.get("/admin/product-links", response_model=ProductLinksResponse, dependencies=[Depends(require_admin_key)])
def admin_product_links(
    q: Optional[str] = Query(default=None, max_length=160),
    platform: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> ProductLinksResponse:
    return list_links(db, q=q, platform=platform, status=status_filter, days=days)


@router.post("/admin/product-links", response_model=ProductLinkOut, dependencies=[Depends(require_admin_key)])
async def admin_create_product_link(request: Request, db: Session = Depends(get_db)) -> ProductLinkOut:
    payload = await _parse_body(request, ProductLinkCreate)
    return create_link(db, payload)


@router.patch("/admin/product-links/{link_id}", response_model=ProductLinkOut, dependencies=[Depends(require_admin_key)])
async def admin_update_product_link(link_id: str, request: Request, db: Session = Depends(get_db)) -> ProductLinkOut:
    payload = await _parse_body(request, ProductLinkUpdate)
    result = update_link(db, link_id, payload)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product link not found")
    return result


@router.post("/admin/product-links/{link_id}/duplicate", response_model=ProductLinkOut, dependencies=[Depends(require_admin_key)])
def admin_duplicate_product_link(link_id: str, db: Session = Depends(get_db)) -> ProductLinkOut:
    result = duplicate_link(db, link_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product link not found")
    return result


@router.post("/admin/product-links/{link_id}/delete", dependencies=[Depends(require_admin_key)])
async def admin_delete_product_link(link_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await _parse_body(request, ProductLinkDelete)
    try:
        ok = delete_link(db, link_id, pin=payload.pin)
    except TrackingPinError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product link not found")
    return {"ok": True}


@router.post("/admin/product-links/bulk", dependencies=[Depends(require_admin_key)])
async def admin_bulk_product_links(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await _parse_body(request, ProductLinkBulkUpdate)
    try:
        updated = bulk_action(db, payload.ids, payload.action, payload.pin)
    except TrackingPinError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return {"updated": updated}


@router.get("/product-links/r/{slug}")
def public_product_link_redirect(slug: str, request: Request, db: Session = Depends(get_db)) -> RedirectResponse:
    target = resolve_and_track(db, slug, request)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    return RedirectResponse(target, status_code=status.HTTP_302_FOUND)
