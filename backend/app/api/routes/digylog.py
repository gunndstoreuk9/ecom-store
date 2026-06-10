import json

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.services.digylog import apply_webhook_event
from fastapi import Depends

router = APIRouter(prefix="/digylog", tags=["digylog"])


def _check_secret(request: Request) -> None:
    secret = get_settings().digylog_webhook_secret
    if not secret:
        return
    provided = (
        request.query_params.get("token")
        or request.headers.get("x-webhook-token")
        or request.headers.get("x-digylog-token")
    )
    if provided != secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook token")


async def _read_body(request: Request) -> dict:
    if "application/json" in request.headers.get("content-type", ""):
        try:
            return await request.json()
        except json.JSONDecodeError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")
    raw = (await request.body()).decode("utf-8")
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")


@router.api_route("/webhook", methods=["POST", "PUT"])
async def digylog_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    _check_secret(request)
    body = await _read_body(request)
    return apply_webhook_event(db, body)


@router.get("/webhook")
def digylog_webhook_probe() -> dict:
    return {"ok": True, "service": "digylog-webhook"}
