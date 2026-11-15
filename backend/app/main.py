from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    generic_exception_handler,
)
from app.db.database import check_db_connected
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode...")
    db_ok = await check_db_connected()
    if db_ok:
        logger.info("Database connection successfully established.")
    else:
        logger.warning("Database connection check failed on startup.")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    description="FinAI — AI-Powered Financial Management Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Central Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


from fastapi.encoders import jsonable_encoder


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters",
                "details": jsonable_encoder(exc.errors())
            }
        }
    )


# System Health & Readiness Endpoints
@app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
async def health_check():
    """Liveness probe to check if the application is running."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "version": "1.0.0"
    }


@app.get("/ready", tags=["Health"], status_code=status.HTTP_200_OK)
async def readiness_check():
    """Readiness probe checking database connectivity."""
    db_status = await check_db_connected()
    if not db_status:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unready",
                "database": "disconnected"
            }
        )
    return {
        "status": "ready",
        "database": "connected"
    }


# Include V1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)
