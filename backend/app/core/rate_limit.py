from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, DefaultDict

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._storage: DefaultDict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def hit(self, key: str) -> None:
        now = time.time()

        with self._lock:
            bucket = self._storage[key]

            while bucket and bucket[0] <= now - self.window_seconds:
                bucket.popleft()

            if len(bucket) >= self.limit:
                retry_after = int(self.window_seconds - (now - bucket[0]))
                if retry_after < 1:
                    retry_after = 1

                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Prea multe încercări. Încearcă din nou în {retry_after} secunde.",
                    headers={"Retry-After": str(retry_after)},
                )

            bucket.append(now)


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def build_rate_limit_key(request: Request, identifier: str | None = None) -> str:
    client_ip = _get_client_ip(request)

    if identifier:
        return f"{client_ip}:{identifier.lower()}"

    return client_ip


login_rate_limiter = InMemoryRateLimiter(limit=5, window_seconds=60)