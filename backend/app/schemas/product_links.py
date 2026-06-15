from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

PLATFORMS = {"tiktok", "meta", "google", "youtube", "other"}
STATUSES = {"active", "disabled", "archived"}


class ProductLinkBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    full_url: str = Field(min_length=1, max_length=2000)
    product_name: str = Field(min_length=1, max_length=160)
    platform: str = "tiktok"
    campaign_name: Optional[str] = Field(default=None, max_length=160)
    ad_account_name: Optional[str] = Field(default=None, max_length=160)
    notes: Optional[str] = Field(default=None, max_length=2000)
    status: str = "active"

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in PLATFORMS:
            raise ValueError(f"platform must be one of: {', '.join(sorted(PLATFORMS))}")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(STATUSES))}")
        return normalized


class ProductLinkCreate(ProductLinkBase):
    slug: Optional[str] = Field(default=None, max_length=80)


class ProductLinkUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    full_url: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    product_name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    platform: Optional[str] = None
    campaign_name: Optional[str] = Field(default=None, max_length=160)
    ad_account_name: Optional[str] = Field(default=None, max_length=160)
    notes: Optional[str] = Field(default=None, max_length=2000)
    status: Optional[str] = None

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().lower()
        if normalized not in PLATFORMS:
            raise ValueError(f"platform must be one of: {', '.join(sorted(PLATFORMS))}")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().lower()
        if normalized not in STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(STATUSES))}")
        return normalized


class ProductLinkBulkUpdate(BaseModel):
    ids: list[UUID] = Field(min_length=1)
    action: str
    pin: Optional[str] = Field(default=None, max_length=64)


class ProductLinkDelete(BaseModel):
    pin: str = Field(min_length=1, max_length=64)


class ProductLinkStats(BaseModel):
    total_clicks: int = 0
    total_visitors: int = 0
    total_orders: int = 0
    confirmed_orders: int = 0
    delivered_orders: int = 0
    conversion_rate: float = 0


class ProductLinkOut(BaseModel):
    id: UUID
    slug: str
    public_url: str
    name: str
    full_url: str
    product_name: str
    platform: str
    campaign_name: Optional[str] = None
    ad_account_name: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
    stats: ProductLinkStats


class ProductLinksResponse(BaseModel):
    total: int
    links: list[ProductLinkOut]
