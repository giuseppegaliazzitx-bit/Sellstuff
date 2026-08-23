from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str = "") -> None:
        self.status_code = status_code
        self.code = code
        self.message = message or code
        super().__init__(self.message)


def error_body(code: str, message: str = "") -> dict[str, str]:
    return {"code": code, "message": message or code}


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))
