from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

PLATFORMS = {"meta", "tiktok", "google_ads", "youtube", "ga4"}

SUPPORTED_EVENTS = [
    "PageView",
    "ViewContent",
    "AddToCart",
    "InitiateCheckout",
    "Lead",
    "Purchase",
    "WhatsAppClick",
    "PhoneClick",
    "FormSubmission",
    "CODOrderCreated",
    "OrderConfirmed",
    "OrderShipped",
    "OrderDelivered",
    "OrderReturned",
    "OrderCancelled",
]

SCOPE_TYPES = {"store", "product", "landing", "campaign"}
STATUSES = {"active", "disabled"}


class TrackingPixelBase(BaseModel):
    platform: str
    name: str = Field(min_length=1, max_length=160)
    pixel_id: str = Field(min_length=1, max_length=160)
    test_event_code: Optional[str] = Field(default=None, max_length=120)
    capi_enabled: bool = False
    status: str = "active"
    scope_type: str = "store"
    scope_value: Optional[str] = Field(default=None, max_length=200)
    events_enabled: Optional[list[str]] = None
    extra: Optional[dict] = None

    @field_validator("platform")
    @classmethod
    def _platform(cls, v: str) -> str:
        n = v.strip().lower()
        if n not in PLATFORMS:
            raise ValueError(f"platform must be one of: {', '.join(sorted(PLATFORMS))}")
        return n

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        n = v.strip().lower()
        if n not in STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(STATUSES))}")
        return n

    @field_validator("scope_type")
    @classmethod
    def _scope(cls, v: str) -> str:
        n = v.strip().lower()
        if n not in SCOPE_TYPES:
            raise ValueError(f"scope_type must be one of: {', '.join(sorted(SCOPE_TYPES))}")
        return n


class TrackingPixelCreate(TrackingPixelBase):
    access_token: Optional[str] = None
    # PIN required when an access token is provided on create.
    pin: Optional[str] = Field(default=None, max_length=64)


class TrackingPixelUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    pixel_id: Optional[str] = Field(default=None, min_length=1, max_length=160)
    test_event_code: Optional[str] = Field(default=None, max_length=120)
    capi_enabled: Optional[bool] = None
    status: Optional[str] = None
    scope_type: Optional[str] = None
    scope_value: Optional[str] = Field(default=None, max_length=200)
    events_enabled: Optional[list[str]] = None
    extra: Optional[dict] = None
    # Sensitive: changing the access token requires a PIN.
    access_token: Optional[str] = None
    pin: Optional[str] = Field(default=None, max_length=64)

    @field_validator("status")
    @classmethod
    def _status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        n = v.strip().lower()
        if n not in STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(STATUSES))}")
        return n

    @field_validator("scope_type")
    @classmethod
    def _scope(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        n = v.strip().lower()
        if n not in SCOPE_TYPES:
            raise ValueError(f"scope_type must be one of: {', '.join(sorted(SCOPE_TYPES))}")
        return n


class TrackingPinBody(BaseModel):
    pin: str = Field(min_length=1, max_length=64)


class TrackingPixelOut(BaseModel):
    id: UUID
    platform: str
    name: str
    pixel_id: str
    has_token: bool
    token_masked: Optional[str] = None
    test_event_code: Optional[str] = None
    capi_enabled: bool
    status: str
    scope_type: str
    scope_value: Optional[str] = None
    events_enabled: Optional[list[str]] = None
    extra: Optional[dict] = None
    health: str = "warning"  # excellent|warning|critical
    created_at: datetime
    updated_at: datetime


class TrackingPlatformStat(BaseModel):
    platform: str
    pixels: int
    active: int
    total_events: int
    purchases: int
    leads: int
    browser_events: int
    server_events: int
    errors: int
    spend_mad: int
    revenue_mad: int
    roas: Optional[float] = None
    cost_per_lead: Optional[float] = None
    cost_per_purchase: Optional[float] = None
    health: str = "warning"


class TrackingAnalytics(BaseModel):
    range_days: int
    total_events: int
    total_purchases: int
    total_leads: int
    conversion_rate: float
    browser_events: int
    server_events: int
    deduplication_rate: float
    event_match_quality: float
    health_score: int
    spend_mad: int
    revenue_mad: int
    roas: Optional[float] = None
    cost_per_lead: Optional[float] = None
    cost_per_purchase: Optional[float] = None
    by_platform: list[TrackingPlatformStat]


class TrackingLogOut(BaseModel):
    id: UUID
    pixel_id: Optional[UUID] = None
    platform: str
    event_name: str
    source: str
    status: str
    message: Optional[str] = None
    created_at: datetime


class TrackingLogsResponse(BaseModel):
    total: int
    logs: list[TrackingLogOut]


class TrackingSpendUpsert(BaseModel):
    platform: str
    day: date
    amount_mad: int = Field(ge=0, le=100000000)

    @field_validator("platform")
    @classmethod
    def _platform(cls, v: str) -> str:
        n = v.strip().lower()
        if n not in PLATFORMS:
            raise ValueError(f"platform must be one of: {', '.join(sorted(PLATFORMS))}")
        return n


class TrackingTestResult(BaseModel):
    ok: bool
    platform: str
    message: str
