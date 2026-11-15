from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from app.core.logging import logger


class AppException(Exception):
    """Base application exception."""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.error_code = error_code or "INTERNAL_SERVER_ERROR"
        super().__init__(self.message)


class NotFoundException(AppException):
    def __init__(self, resource: str, resource_id: Any = None):
        msg = f"{resource} not found" if not resource_id else f"{resource} with id '{resource_id}' not found"
        super().__init__(
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND"
        )


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Invalid authentication credentials"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED"
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN"
        )


class BadRequestException(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None, error_code: str = "BAD_REQUEST"):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
            error_code=error_code
        )


class ValidationException(BadRequestException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, details=details, error_code="VALIDATION_ERROR")


class ConflictException(AppException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT"
        )


class FinancialPrecisionError(AppException):
    def __init__(self, message: str = "Financial calculation error or invalid precision"):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="FINANCIAL_CALCULATION_ERROR"
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.warning(f"AppException: [{exc.error_code}] {exc.message} on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    logger.warning(f"HTTPException: status={exc.status_code} detail={exc.detail} on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": {}
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "details": {}
            }
        }
    )
