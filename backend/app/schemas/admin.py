from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


ORDER_STATUSES = {
    "new",
    "awaiting_confirmation",
    "confirmed",
    "packed",
    "no_answer",
    "cancelled",
    "shipped",
    "delivered",
    "returned",
    "refused",
}

CALL_STATUSES = {
    "confirmed",
    "no_answer",
    "voicemail",
    "cancelled",
    "wrong_number",
    "busy",
    "duplicate",
}

CALL_STATUS_TO_ORDER_STATUS = {
    "confirmed": "confirmed",
    "cancelled": "cancelled",
    "wrong_number": "cancelled",
    "duplicate": "cancelled",
    "no_answer": "no_answer",
    "voicemail": "no_answer",
    "busy": "no_answer",
}

RETRY_CALL_STATUSES = {"no_answer", "voicemail", "busy"}


class AdminOrderItem(BaseModel):
    sku: str
    name_ar: str
    qty: int
    unit_price_mad: int
    total_price_mad: int
    item_type: str


class AdminOrderListItem(BaseModel):
    id: UUID
    public_order_number: str
    status: str
    customer_name: str
    phone_local: str
    phone_e164: str
    city: Optional[str] = None
    address: Optional[str] = None
    call_status: Optional[str] = None
    call_note: Optional[str] = None
    call_attempts: int = 0
    delivery_company: Optional[str] = None
    delivery_city: Optional[str] = None
    hero_sku: str
    hero_qty: int
    total_mad: int
    currency: str
    sheet_sync_status: str
    sheet_last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    utm: Optional[dict] = None
    items: list[AdminOrderItem] = Field(default_factory=list)


class AdminOrdersResponse(BaseModel):
    total: int
    limit: int
    offset: int
    orders: list[AdminOrderListItem]


class AdminStatusCount(BaseModel):
    status: str
    count: int
    total_mad: int


class AdminDailyRevenue(BaseModel):
    date: date
    orders: int
    total_mad: int


class AdminCityCount(BaseModel):
    city: str
    orders: int
    total_mad: int


class AdminSheetSyncCount(BaseModel):
    status: str
    count: int


class AdminPeriodMetric(BaseModel):
    key: str
    label: str
    orders: int
    revenue_mad: int


class AdminRateMetric(BaseModel):
    key: str
    label: str
    value: float


class AdminFunnelStep(BaseModel):
    key: str
    label: str
    count: int
    rate: float


class AdminAnalyticsResponse(BaseModel):
    days: int
    total_orders: int
    total_revenue_mad: int
    average_order_value_mad: int
    today_orders: int
    today_revenue_mad: int
    pending_sheet_sync: int
    failed_sheet_sync: int
    status_breakdown: list[AdminStatusCount]
    sheet_sync_breakdown: list[AdminSheetSyncCount]
    daily_revenue: list[AdminDailyRevenue]
    top_cities: list[AdminCityCount]
    recent_orders: list[AdminOrderListItem]
    period_metrics: list[AdminPeriodMetric]
    delivery_metrics: list[AdminRateMetric]
    order_funnel: list[AdminFunnelStep]


class AdminOrderStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ORDER_STATUSES:
            allowed = ", ".join(sorted(ORDER_STATUSES))
            raise ValueError(f"Status must be one of: {allowed}")
        return normalized


class AdminOrderCallUpdate(BaseModel):
    call_status: str
    call_note: Optional[str] = Field(default=None, max_length=2000)
    delivery_company: Optional[str] = Field(default=None, max_length=64)
    delivery_city: Optional[str] = Field(default=None, max_length=120)

    @field_validator("call_status")
    @classmethod
    def validate_call_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in CALL_STATUSES:
            allowed = ", ".join(sorted(CALL_STATUSES))
            raise ValueError(f"Call status must be one of: {allowed}")
        return normalized


class AdminOrderEditUpdate(BaseModel):
    customer_name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    address: Optional[str] = Field(default=None, max_length=2000)
    city: Optional[str] = Field(default=None, max_length=120)
    delivery_city: Optional[str] = Field(default=None, max_length=120)
    qty: Optional[int] = Field(default=None, ge=1, le=99)
    total_mad: Optional[int] = Field(default=None, ge=0, le=1000000)


class AdminDispatchRequest(BaseModel):
    order_ids: list[str] = Field(min_length=1)
    delivery_company: Optional[str] = Field(default=None, max_length=64)
    status: str = Field(default="shipped")

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ORDER_STATUSES:
            allowed = ", ".join(sorted(ORDER_STATUSES))
            raise ValueError(f"Status must be one of: {allowed}")
        return normalized


class AdminDispatchResponse(BaseModel):
    updated: int
    orders: list[AdminOrderListItem]


class AdminRatePeriod(BaseModel):
    key: str
    label: str
    total: int
    confirmed: int
    rate: float


class AdminRateByOffer(BaseModel):
    offer_id: str
    qty: int
    total: int
    confirmed: int
    rate: float


class AdminCallCenterStats(BaseModel):
    by_period: list[AdminRatePeriod]
    by_offer: list[AdminRateByOffer]
