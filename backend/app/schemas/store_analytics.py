from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class StoreComparison(BaseModel):
    yesterday_pct: float
    last_7_days_pct: float
    last_30_days_pct: float


class StoreKpi(BaseModel):
    key: str
    label: str
    value: float
    unit: str = ""
    comparison: StoreComparison


class StoreTrafficSource(BaseModel):
    source: str
    visitors: int
    orders: int
    revenue_mad: int
    conversion_rate: float


class StoreFunnelStep(BaseModel):
    key: str
    label: str
    count: int
    step_rate: float
    dropoff_rate: float


class StoreTrendPoint(BaseModel):
    date: date
    visitors: int
    orders: int
    revenue_mad: int


class StoreProductMetric(BaseModel):
    product_name: str
    views: int
    orders: int
    revenue_mad: int
    conversion_rate: float
    delivery_rate: float
    cancelled_orders: int
    returned_orders: int


class StoreLandingPageMetric(BaseModel):
    page: str
    visitors: int
    orders: int
    confirmed_orders: int
    delivered_orders: int
    revenue_mad: int
    conversion_rate: float
    bounce_rate: float


class StoreGeoMetric(BaseModel):
    city: str
    orders: int
    revenue_mad: int
    delivery_rate: float


class StoreCustomerAnalytics(BaseModel):
    total_customers: int
    new_customers: int
    returning_customers: int
    repeat_purchase_rate: float
    customer_lifetime_value_mad: float
    average_orders_per_customer: float


class StoreCodAnalytics(BaseModel):
    cod_orders: int
    confirmation_rate: float
    shipping_rate: float
    delivery_rate: float
    cancellation_rate: float
    return_rate: float
    fake_order_rate: float
    confirmed_over_total: float
    delivered_over_confirmed: float
    delivered_over_total: float


class StoreRealtimeAnalytics(BaseModel):
    active_visitors: int
    orders_today: int
    orders_this_hour: int
    revenue_today_mad: int
    revenue_this_hour_mad: int


class StoreAnalyticsResponse(BaseModel):
    days: int
    executive_kpis: list[StoreKpi]
    traffic_sources: list[StoreTrafficSource]
    funnel: list[StoreFunnelStep]
    trends: list[StoreTrendPoint]
    products: list[StoreProductMetric]
    landing_pages: list[StoreLandingPageMetric]
    geo: list[StoreGeoMetric]
    customer: StoreCustomerAnalytics
    cod: StoreCodAnalytics
    realtime: StoreRealtimeAnalytics
    notes: Optional[list[str]] = None
