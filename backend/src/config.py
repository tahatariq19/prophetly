"""Configuration settings for Prophet Web Interface."""

import os
from typing import List


class Settings:
    """Application settings."""

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"

    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Session settings
    MAX_SESSION_AGE: int = int(os.getenv("MAX_SESSION_AGE", "7200"))  # 2 hours
    MAX_MEMORY_MB: int = int(os.getenv("MAX_MEMORY_MB", "512"))
    AUTO_CLEANUP_INTERVAL: int = int(os.getenv("AUTO_CLEANUP_INTERVAL", "300"))  # 5 minutes

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALLOWED_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,https://localhost:3000,https://*.app.github.dev",
        ).split(",")
        if origin.strip()
    ]

    # Host validation
    ALLOWED_HOSTS: List[str] = [
        host.strip()
        for host in os.getenv(
            "ALLOWED_HOSTS",
            "localhost,127.0.0.1,backend,frontend,0.0.0.0,*.github.dev,*.app.github.dev,*.render.com,testserver",
        ).split(",")
        if host.strip()
    ]

    # File upload limits
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    ALLOWED_FILE_TYPES: list = [".csv", ".txt"]

    # Logging (no user data)
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


settings = Settings()
