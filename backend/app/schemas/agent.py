from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=160)
    allowed_skus: Optional[list[str]] = None


class AgentUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)
    status: Optional[str] = None
    allowed_skus: Optional[list[str]] = None
    clear_skus: bool = False


class AgentResponse(BaseModel):
    id: str
    username: str
    display_name: str
    status: str
    allowed_skus: Optional[list[str]]
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentLoginRequest(BaseModel):
    username: str
    password: str


class AgentLoginResponse(BaseModel):
    token: str
    agent_id: str
    display_name: str
    allowed_skus: Optional[list[str]]


class AgentStatsResponse(BaseModel):
    agent_id: str
    display_name: str
    username: str
    status: str
    allowed_skus: Optional[list[str]]
    days: int
    total_assigned: int
    confirmed: int
    cancelled: int
    pending_open: int
    confirmation_rate: float
    avg_response_minutes: Optional[float]
