# Prophet Web Interface Backend
# Privacy-first FastAPI application

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .config import settings

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
    allowed_hosts=["localhost", "127.0.0.1", "*.render.com"] if settings.DEBUG else ["*.render.com"]
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Prophet Web Interface API - Privacy First",
        "version": "1.0.0",
        "privacy": "All data processing happens in memory only"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "privacy": "stateless",
        "environment": settings.ENVIRONMENT,
        "memory_limit_mb": settings.MAX_MEMORY_MB
    }