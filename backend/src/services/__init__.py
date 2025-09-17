"""Services module for Prophet Web Interface."""

from .prophet_service import ProphetService, prophet_service
from .session_manager import SessionManager, session_manager

__all__ = ["SessionManager", "session_manager"]
