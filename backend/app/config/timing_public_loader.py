"""
Optionaler Loader für öffentliche (nicht‑sicherheitsrelevante) Timings.

Quelle: config/timing.public.json

Diese Werte dürfen KEINEN Einfluss auf sicherheitsrelevante Serverlogik haben.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import TypedDict

from pydantic import BaseModel, Field, PositiveInt, ValidationError, field_validator


class QueryTimings(BaseModel):
    staleTimeMs: int = Field(ge=0)
    gcTimeMs: int = Field(ge=0)


class NetworkTimings(BaseModel):
    requestTimeoutMs: PositiveInt


class RetryTimings(BaseModel):
    baseDelayMs: int = Field(ge=0)
    maxDelayMs: int = Field(ge=0)
    maxRetries: int = Field(ge=0)


class OfflineTimings(BaseModel):
    staleBannerAfterMs: int = Field(ge=0)


class PrefetchTimings(BaseModel):
    visiblePlusN: int = Field(ge=0)


class PublicTimings(BaseModel):
    query: QueryTimings
    network: NetworkTimings
    retry: RetryTimings
    offline: OfflineTimings
    prefetch: PrefetchTimings


class ProfileEnvelope(BaseModel):
    public: PublicTimings


class TimingPublicFile(BaseModel):
    version: str
    profiles: dict[str, ProfileEnvelope]

    @field_validator("version")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("version must be non‑empty")
        return v


class PublicTimingsView(TypedDict):
    query_stale_ms: int
    query_gc_ms: int
    request_timeout_ms: int
    retry_base_ms: int
    retry_max_ms: int
    retry_max: int
    offline_stale_banner_ms: int
    prefetch_visible_plus_n: int


CONFIG_PATH = Path(__file__).resolve().parents[3] / "config" / "timing.public.json"


def _active_profile() -> str:
    return os.getenv("HW_PROFILE") or "dev"


@lru_cache(maxsize=1)
def _load_raw() -> PublicTimings:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"timing.public.json not found at {CONFIG_PATH}")

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    try:
        parsed = TimingPublicFile.model_validate(data)
    except ValidationError as exc:  # pragma: no cover
        raise ValueError(f"Invalid timing.public.json: {exc}") from exc

    profile = _active_profile()
    if profile not in parsed.profiles:
        raise KeyError(f"Profile '{profile}' not found in timing.public.json")

    return parsed.profiles[profile].public


def get_active_public_timings() -> PublicTimingsView:
    p = _load_raw()
    return {
        "query_stale_ms": int(p.query.staleTimeMs),
        "query_gc_ms": int(p.query.gcTimeMs),
        "request_timeout_ms": int(p.network.requestTimeoutMs),
        "retry_base_ms": int(p.retry.baseDelayMs),
        "retry_max_ms": int(p.retry.maxDelayMs),
        "retry_max": int(p.retry.maxRetries),
        "offline_stale_banner_ms": int(p.offline.staleBannerAfterMs),
        "prefetch_visible_plus_n": int(p.prefetch.visiblePlusN),
    }
