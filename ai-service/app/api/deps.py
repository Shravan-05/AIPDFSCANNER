from fastapi import Request, HTTPException, Depends
import time
from collections import defaultdict
from app.config import settings

_rate_limit_store: dict[str, list[float]] = defaultdict(list)


async def rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = 60.0
    max_requests = settings.rate_limit_per_minute

    timestamps = _rate_limit_store[client_ip]
    timestamps = [t for t in timestamps if now - t < window]
    _rate_limit_store[client_ip] = timestamps

    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again later.",
        )

    timestamps.append(now)
