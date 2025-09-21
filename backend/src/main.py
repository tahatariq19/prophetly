# Prophet Web Interface Backend
# Privacy-first FastAPI application

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles

from .api.cross_validation import router as cross_validation_router
from .api.export import router as export_router
from .api.forecast import router as forecast_router
from .api.model_comparison import router as model_comparison_router
from .api.preprocessing import router as preprocessing_router
from .api.prophet_config import router as prophet_config_router
from .api.session import router as session_router
from .api.upload import router as upload_router
from .config import settings
from .middleware.error_middleware import (
    MemoryMonitoringMiddleware,
    RateLimitMiddleware,
    RequestValidationMiddleware,
)
from .services.session_manager import session_manager
from .utils.error_handler import create_general_exception_handler, create_http_exception_handler
from .utils.memory import get_memory_usage

app = FastAPI(
    title="Prophet Web Interface API",
    description="Time series forecasting API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add error handling middleware (order matters)
app.add_middleware(RequestValidationMiddleware, max_request_size=10 * 1024 * 1024)  # 10MB
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
app.add_middleware(MemoryMonitoringMiddleware, max_memory_mb=512)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.render.com", "testserver"]
    if settings.DEBUG
    else ["*.render.com"],
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Add exception handlers
app.add_exception_handler(HTTPException, create_http_exception_handler())
app.add_exception_handler(Exception, create_general_exception_handler())

# Include API routers
app.include_router(session_router)
app.include_router(upload_router)
app.include_router(preprocessing_router)
app.include_router(prophet_config_router)
app.include_router(forecast_router)
app.include_router(cross_validation_router)
app.include_router(model_comparison_router)
app.include_router(export_router)

# Serve static files for the frontend
app.mount("/", StaticFiles(directory="src/static", html=True), name="static")

@app.get("/")
async def root():
    return {
        "message": "Prophet Web Interface API",
        "version": "1.0.0",
        "architecture": "Memory-based processing",
    }


@app.get("/health")
async def health_check():
    memory_usage = get_memory_usage()
    session_stats = session_manager.get_session_stats()

    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "memory_limit_mb": settings.MAX_MEMORY_MB,
        "current_memory_mb": memory_usage["rss_mb"],
        "active_sessions": session_stats.active_sessions,
        "total_sessions": session_stats.total_sessions,
    }
