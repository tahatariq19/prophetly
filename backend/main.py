from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from routers import forecast
from limiter import limiter
import asyncio
import os

app = FastAPI(
    title="Prophetly API",
    description="Facebook Prophet forecasting API",
    version="1.0.0"
)

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Timeout middleware removed to avoid conflict with Render load balancer 100s timeout

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

if os.getenv("ALLOWED_ORIGINS"):
    origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://prophetly[a-z0-9-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, prefix="/api", tags=["forecast"])


@app.get("/")
def root():
    return {"message": "Prophetly API", "status": "healthy"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
