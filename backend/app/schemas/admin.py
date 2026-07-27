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
    "dispatched",
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
    browser_fingerprint: Optional[str] = None
    device_id: Optional[str] = None
    risk_score: int = 0
    risk_level: str = "low"
    fraud_flags: Optional[dict] = None
    block_reason: Optional[str] = None
    fraud_checked_at: Optional[datetime] = None
    call_status: Optional[str] = None
    call_note: Optional[str] = None
    call_attempts: int = 0
    delivery_company: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_tracking: Optional[str] = None
    delivery_error: Optional[str] = None
    hero_sku: str
    hero_qty: int
    total_mad: int
    currency: str
    sheet_sync_status: str
    sheet_last_error: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    assigned_agent_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
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
    phone_raw: Optional[str] = Field(default=None, min_length=8, max_length=64)
    phone_e164: Optional[str] = Field(default=None, max_length=16)
    address: Optional[str] = Field(default=None, max_length=2000)
    city: Optional[str] = Field(default=None, max_length=120)
    delivery_city: Optional[str] = Field(default=None, max_length=120)
    qty: Optional[int] = Field(default=None, ge=1, le=99)
    total_mad: Optional[int] = Field(default=None, ge=0, le=1000000)


class AdminOrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=160)
    phone_raw: str = Field(min_length=8, max_length=64)
    city: Optional[str] = Field(default=None, max_length=120)
    address: Optional[str] = Field(default=None, max_length=2000)
    product_sku: str = Field(max_length=120)
    qty: int = Field(default=1, ge=1)
    price_mad: int = Field(ge=0)
    shipping_cost_mad: Optional[int] = Field(default=0, ge=0)
    payment_method: Optional[str] = Field(default="cod", max_length=32)
    notes: Optional[str] = Field(default=None, max_length=2000)
    status: str = Field(default="new", max_length=32)
    assigned_agent_id: Optional[str] = None
    force_duplicate: bool = False

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ORDER_STATUSES:
            allowed = ", ".join(sorted(ORDER_STATUSES))
            raise ValueError(f"Status must be one of: {allowed}")
        return normalized


class AdminDispatchRequest(BaseModel):
    order_ids: list[str] = Field(min_length=1)
    delivery_company: Optional[str] = Field(default=None, max_length=64)
    status: str = Field(default="dispatched")

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


class ConfirmationPayoutDetailItem(BaseModel):
    order_id: UUID
    public_order_number: str
    customer_name: str
    total_mad: int
    commission_mad: int
    dispatched_at: Optional[datetime] = None


class ConfirmationPayoutResponse(BaseModel):
    orders_count: int
    commission_per_order: int
    base_amount_mad: int
    manual_adjustment_mad: int
    total_due_mad: int
    last_reset_at: Optional[datetime] = None
    status: str
    details: Optional[list[ConfirmationPayoutDetailItem]] = None


class ConfirmationPayoutUpdate(BaseModel):
    commission_per_order: Optional[int] = Field(default=None, ge=0, le=100000)
    manual_adjustment_mad: Optional[int] = Field(default=None, ge=-100000000, le=100000000)


class ConfirmationPayoutReset(BaseModel):
    pin: str = Field(min_length=1, max_length=64)


class CleanupSheetImportsRequest(BaseModel):
    pin: str = Field(min_length=1, max_length=64)
    dry_run: bool = False


class CleanupSheetImportsResponse(BaseModel):
    matched: int
    deleted: int
    dry_run: bool


class FraudSettingsResponse(BaseModel):
    enabled: bool
    lock_period_minutes: int
    medium_risk_threshold: int
    high_risk_threshold: int
    ip_window_minutes: int
    ip_order_limit: int
    device_phone_limit: int
    rapid_submit_seconds: int
    updated_at: datetime


class FraudSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    lock_period_minutes: Optional[int] = Field(default=None, ge=5, le=1440)
    medium_risk_threshold: Optional[int] = Field(default=None, ge=1, le=100)
    high_risk_threshold: Optional[int] = Field(default=None, ge=1, le=100)
    ip_window_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    ip_order_limit: Optional[int] = Field(default=None, ge=1, le=100)
    device_phone_limit: Optional[int] = Field(default=None, ge=1, le=50)
    rapid_submit_seconds: Optional[int] = Field(default=None, ge=5, le=3600)


class FraudOrderScore(BaseModel):
    id: UUID
    public_order_number: str
    customer_name: str
    phone_e164: str
    risk_score: int
    risk_level: str
    fraud_flags: Optional[dict] = None
    created_at: datetime


class FraudStatsResponse(BaseModel):
    days: int
    blocked_duplicate_orders: int
    suspicious_orders: int
    high_risk_orders: int
    latest: list[FraudOrderScore]
