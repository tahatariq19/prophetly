"""Session management API endpoints."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.session_manager import session_manager
from ..utils.memory import MemoryTracker, get_memory_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/session", tags=["session"])


class SessionCreateResponse(BaseModel):
    """Response for session creation."""

    session_id: str
    expires_at: str
    message: str


class SessionDataRequest(BaseModel):
    """Request to store data in session."""

    key: str
    value: Any


class SessionDataResponse(BaseModel):
    """Response for session data operations."""

    success: bool
    message: str
    data: Any = None


@router.post("/create", response_model=SessionCreateResponse)
async def create_session():
    """Create a new session."""
    with MemoryTracker("create_session"):
        session_id = session_manager.create_session()
        session = session_manager.get_session(session_id)

        if session is None:
            raise HTTPException(status_code=500, detail="Failed to create session")

        return SessionCreateResponse(
            session_id=session_id,
            expires_at=session.expires_at.isoformat(),
            message="Session created successfully"
        )


@router.get("/stats")
async def get_session_stats():
    """Get session statistics and memory usage."""
    with MemoryTracker("get_session_stats"):
        stats = session_manager.get_session_stats()
        memory_usage = get_memory_usage()

        return {
            "session_stats": stats.model_dump(),
            "memory_usage": memory_usage,
            "privacy_notice": "All data is stored in memory only and automatically cleaned up"
        }


@router.post("/{session_id}/data", response_model=SessionDataResponse)
async def store_session_data(
    session_id: str,
    request: SessionDataRequest
):
    """Store data in a session."""
    with MemoryTracker("store_session_data"):
        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        try:
            session.store_data(request.key, request.value)
            return SessionDataResponse(
                success=True,
                message=f"Data stored successfully for key '{request.key}'"
            )
        except Exception as e:
            logger.error(f"Error storing session data: {e}")
            raise HTTPException(status_code=500, detail="Failed to store data")


@router.get("/{session_id}/data/{key}", response_model=SessionDataResponse)
async def get_session_data(session_id: str, key: str):
    """Retrieve data from a session."""
    with MemoryTracker("get_session_data"):
        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        data = session.get_data(key)
        if data is None:
            raise HTTPException(status_code=404, detail=f"Data not found for key '{key}'")

        return SessionDataResponse(
            success=True,
            message=f"Data retrieved successfully for key '{key}'",
            data=data
        )


@router.delete("/{session_id}/data/{key}", response_model=SessionDataResponse)
async def delete_session_data(session_id: str, key: str):
    """Delete specific data from a session."""
    with MemoryTracker("delete_session_data"):
        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        removed = session.remove_data(key)
        if not removed:
            raise HTTPException(status_code=404, detail=f"Data not found for key '{key}'")

        return SessionDataResponse(
            success=True,
            message=f"Data deleted successfully for key '{key}'"
        )


@router.post("/{session_id}/extend", response_model=SessionDataResponse)
async def extend_session(session_id: str, hours: int = 2):
    """Extend session expiration time."""
    with MemoryTracker("extend_session"):
        success = session_manager.extend_session(session_id, hours)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        return SessionDataResponse(
            success=True,
            message=f"Session extended by {hours} hours"
        )


@router.delete("/{session_id}", response_model=SessionDataResponse)
async def cleanup_session(session_id: str):
    """Manually clean up a session."""
    with MemoryTracker("cleanup_session"):
        success = session_manager.cleanup_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")

        return SessionDataResponse(
            success=True,
            message="Session cleaned up successfully"
        )


@router.get("/{session_id}/info")
async def get_session_info(session_id: str):
    """Get information about a specific session."""
    with MemoryTracker("get_session_info"):
        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        memory_usage = session.get_memory_usage()

        return {
            "session_id": session.id,
            "created_at": session.created_at.isoformat(),
            "expires_at": session.expires_at.isoformat(),
            "last_accessed": session.last_accessed.isoformat(),
            "is_expired": session.is_expired(),
            "memory_usage": memory_usage,
            "privacy_notice": "This session data exists only in memory and will be automatically cleaned up"
        }
