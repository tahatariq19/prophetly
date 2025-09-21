"""In-memory session management service with automatic cleanup."""

import asyncio
from datetime import datetime, timedelta
import gc
import logging
from typing import Dict, Optional
from uuid import uuid4

from ..config import settings
from ..models.session import SessionData, SessionStats

logger = logging.getLogger(__name__)


class SessionManager:
    """Session manager that stores data only in memory.

    Features:
    - Automatic session cleanup and expiration
    - Memory usage monitoring and limits
    - Data cleanup
    - No persistent storage
    """

    def __init__(
        self,
        max_session_age: Optional[timedelta] = None,
        cleanup_interval: Optional[int] = None,
        max_memory_mb: Optional[int] = None,
        auto_start_cleanup: bool = True,
    ):
        self.sessions: Dict[str, SessionData] = {}
        self.max_session_age = max_session_age or timedelta(seconds=settings.MAX_SESSION_AGE)
        self.cleanup_interval = cleanup_interval or settings.AUTO_CLEANUP_INTERVAL
        self.max_memory_mb = max_memory_mb or settings.MAX_MEMORY_MB

        # Cleanup task management
        self._cleanup_task = None
        self._auto_start_cleanup = auto_start_cleanup

        logger.info(
            f"SessionManager initialized: max_age={self.max_session_age}, "
            f"cleanup_interval={self.cleanup_interval}s, max_memory={self.max_memory_mb}MB"
        )

    def create_session(self, session_id: Optional[str] = None) -> str:
        """Create a new session and return its ID."""
        # Start cleanup task on first session creation if auto-start is enabled
        if self._auto_start_cleanup and self._cleanup_task is None:
            try:
                self._start_cleanup_task()
            except RuntimeError:
                # No event loop running, cleanup task will be started later
                logger.debug("No event loop running, cleanup task will be started later")

        if session_id is None:
            session_id = str(uuid4())

        # Check if session already exists
        if session_id in self.sessions:
            logger.warning(f"Session {session_id} already exists, cleaning up old session")
            self.cleanup_session(session_id)

        # Create new session
        expires_at = datetime.now() + self.max_session_age
        session = SessionData(id=session_id, expires_at=expires_at)

        self.sessions[session_id] = session
        logger.info(f"Created session {session_id}, expires at {expires_at}")

        return session_id

    def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session by ID, return None if not found or expired."""
        if session_id not in self.sessions:
            return None

        session = self.sessions[session_id]

        # Check if session is expired
        if session.is_expired():
            logger.info(f"Session {session_id} has expired, cleaning up")
            self.cleanup_session(session_id)
            return None

        return session

    def extend_session(self, session_id: str, hours: int = 2) -> bool:
        """Extend session expiration time."""
        session = self.get_session(session_id)
        if session is None:
            return False

        session.extend_session(hours)
        logger.info(f"Extended session {session_id} by {hours} hours")
        return True

    def cleanup_session(self, session_id: str) -> bool:
        """Clean up a specific session and free its memory."""
        if session_id not in self.sessions:
            return False

        session = self.sessions[session_id]

        # Get memory info before cleanup for logging
        memory_info = session.get_memory_usage()

        # Secure cleanup of session data
        session.cleanup()

        # Remove from sessions dict
        del self.sessions[session_id]

        # Force garbage collection
        gc.collect()

        logger.info(
            f"Cleaned up session {session_id}: "
            f"{memory_info['data_items']} data items, "
            f"{memory_info['dataframes']} dataframes, "
            f"~{memory_info['estimated_bytes'] / 1024 / 1024:.2f}MB freed"
        )

        return True

    def cleanup_expired_sessions(self) -> int:
        """Clean up all expired sessions and return count of cleaned sessions."""
        now = datetime.now()
        expired_sessions = []

        # Find expired sessions
        for session_id, session in self.sessions.items():
            if session.expires_at < now:
                expired_sessions.append(session_id)

        # Clean up expired sessions
        for session_id in expired_sessions:
            self.cleanup_session(session_id)

        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")

        return len(expired_sessions)

    def cleanup_all_sessions(self) -> int:
        """Clean up all sessions (for shutdown or emergency cleanup)."""
        session_count = len(self.sessions)
        session_ids = list(self.sessions.keys())

        for session_id in session_ids:
            self.cleanup_session(session_id)

        logger.info(f"Cleaned up all {session_count} sessions")
        return session_count

    def get_session_stats(self) -> SessionStats:
        """Get current session statistics."""
        now = datetime.now()
        active_sessions = 0
        expired_sessions = 0
        total_memory_bytes = 0
        session_ages = []

        for session in self.sessions.values():
            if session.is_expired():
                expired_sessions += 1
            else:
                active_sessions += 1

            # Calculate memory usage
            memory_info = session.get_memory_usage()
            total_memory_bytes += memory_info["estimated_bytes"]

            # Calculate session age
            age_minutes = int((now - session.created_at).total_seconds() / 60)
            session_ages.append(age_minutes)

        return SessionStats(
            total_sessions=len(self.sessions),
            active_sessions=active_sessions,
            expired_sessions=expired_sessions,
            total_memory_mb=total_memory_bytes / 1024 / 1024,
            oldest_session_age_minutes=max(session_ages) if session_ages else None,
            newest_session_age_minutes=min(session_ages) if session_ages else None,
        )

    def check_memory_limits(self) -> bool:
        """Check if session memory usage is within limits."""
        stats = self.get_session_stats()
        return stats.total_memory_mb <= self.max_memory_mb

    def enforce_memory_limits(self) -> int:
        """Enforce memory limits by cleaning up oldest sessions."""
        if self.check_memory_limits():
            return 0

        # Sort sessions by last accessed time (oldest first)
        sessions_by_age = sorted(self.sessions.items(), key=lambda x: x[1].last_accessed)

        cleaned_count = 0
        while not self.check_memory_limits() and sessions_by_age:
            session_id, _ = sessions_by_age.pop(0)
            if session_id in self.sessions:  # Session might have been cleaned already
                self.cleanup_session(session_id)
                cleaned_count += 1

        if cleaned_count > 0:
            logger.warning(f"Enforced memory limits by cleaning {cleaned_count} sessions")

        return cleaned_count

    def _start_cleanup_task(self) -> None:
        """Start the automatic cleanup background task."""
        if self._cleanup_task is not None:
            return

        async def cleanup_loop():
            while True:
                try:
                    # Clean up expired sessions
                    expired_count = self.cleanup_expired_sessions()

                    # Enforce memory limits
                    memory_cleaned = self.enforce_memory_limits()

                    # Log stats periodically
                    stats = self.get_session_stats()
                    if stats.total_sessions > 0:
                        logger.debug(
                            f"Session stats: {stats.active_sessions} active, "
                            f"{stats.expired_sessions} expired, "
                            f"{stats.total_memory_mb:.2f}MB used"
                        )

                    await asyncio.sleep(self.cleanup_interval)

                except Exception:
                    logger.error(
                        "Error in cleanup task. See details in next log entry if available."
                    )
                    await asyncio.sleep(self.cleanup_interval)

        # Create and start the cleanup task
        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info("Started automatic session cleanup task")

    def stop_cleanup_task(self) -> None:
        """Stop the automatic cleanup task."""
        if self._cleanup_task is not None:
            self._cleanup_task.cancel()
            self._cleanup_task = None
            logger.info("Stopped automatic session cleanup task")

    def __del__(self):
        """Cleanup when SessionManager is destroyed."""
        self.stop_cleanup_task()
        self.cleanup_all_sessions()


# Global session manager instance (without auto-start for testing)
session_manager = SessionManager(auto_start_cleanup=False)


def get_session_manager() -> SessionManager:
    """Dependency injection function for FastAPI to get the global session manager."""
    return session_manager
