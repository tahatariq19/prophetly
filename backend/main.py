from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import forecast

app = FastAPI(
    title="Prophetly API",
    description="Facebook Prophet forecasting API",
    version="1.0.0"
)

# CORS configuration
import os
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

# Add custom origins from env
if os.getenv("ALLOWED_ORIGINS"):
    origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, prefix="/api", tags=["forecast"])


@app.get("/")
async def root():
    return {"message": "Prophetly API", "status": "healthy"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
