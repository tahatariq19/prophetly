# Prophet Web Interface Backend
# Privacy-first FastAPI application

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .api.forecast import router as forecast_router
from .api.preprocessing import router as preprocessing_router
from .api.prophet_config import router as prophet_config_router
from .api.session import router as session_router
from .api.upload import router as upload_router
from .config import settings
from .services.session_manager import session_manager
from .utils.memory import get_memory_usage

app = FastAPI(
    title="Prophet Web Interface API",
    description="Privacy-first time series forecasting API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.render.com", "testserver"] if settings.DEBUG else ["*.render.com"]
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(session_router)
app.include_router(upload_router)
app.include_router(preprocessing_router)
app.include_router(prophet_config_router)
app.include_router(forecast_router)


@app.get("/")
async def root():
    return {
        "message": "Prophet Web Interface API - Privacy First",
        "version": "1.0.0",
        "privacy": "All data processing happens in memory only"
    }


@app.get("/health")
async def health_check():
    memory_usage = get_memory_usage()
    session_stats = session_manager.get_session_stats()

    return {
        "status": "healthy",
        "privacy": "stateless",
        "environment": settings.ENVIRONMENT,
        "memory_limit_mb": settings.MAX_MEMORY_MB,
        "current_memory_mb": memory_usage["rss_mb"],
        "active_sessions": session_stats.active_sessions,
        "total_sessions": session_stats.total_sessions
    }
