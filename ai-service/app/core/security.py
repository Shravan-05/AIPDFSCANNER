from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from typing import Optional

security = HTTPBearer(auto_error=False)


API_TOKEN = os.getenv("AI_SERVICE_API_TOKEN", "")


async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> bool:
    if not API_TOKEN:
        return True

    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    if credentials.credentials != API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")

    return True
