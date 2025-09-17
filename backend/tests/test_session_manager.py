"""Tests for session management functionality."""

import asyncio
from datetime import datetime, timedelta

import pandas as pd
import pytest

from src.models.session import SessionData
from src.services.session_manager import SessionManager
from src.utils.memory import MemoryTracker, get_memory_usage


class TestSessionData:
    """Test SessionData model functionality."""

    def test_session_creation(self):
        """Test basic session creation."""
        session = SessionData()

        assert session.id is not None
        assert len(session.id) == 36  # UUID4 length
        assert session.created_at is not None
        assert session.expires_at > session.created_at
        assert not session.is_expired()

    def test_data_storage_and_retrieval(self):
        """Test storing and retrieving data."""
        session = SessionData()

        # Store data
        session.store_data("test_key", "test_value")
        session.store_data("number", 42)
        session.store_data("dict", {"nested": "value"})

        # Retrieve data
        assert session.get_data("test_key") == "test_value"
        assert session.get_data("number") == 42
        assert session.get_data("dict") == {"nested": "value"}
        assert session.get_data("nonexistent") is None
        assert session.get_data("nonexistent", "default") == "default"

    def test_dataframe_storage(self):
        """Test DataFrame storage and retrieval."""
        session = SessionData()

        # Create test DataFrame
        df = pd.DataFrame({
            "date": pd.date_range("2023-01-01", periods=10),
            "value": range(10)
        })

        # Store DataFrame
        session.store_dataframe("test_df", df)

        # Retrieve DataFrame
        retrieved_df = session.get_dataframe("test_df")
        assert retrieved_df is not None
        assert len(retrieved_df) == 10
        assert list(retrieved_df.columns) == ["date", "value"]

    def test_data_removal(self):
        """Test data removal functionality."""
        session = SessionData()

        # Store data
        session.store_data("temp_data", "to_be_removed")
        df = pd.DataFrame({"col": [1, 2, 3]})
        session.store_dataframe("temp_df", df)

        # Verify data exists
        assert session.get_data("temp_data") == "to_be_removed"
        assert session.get_dataframe("temp_df") is not None

        # Remove data
        assert session.remove_data("temp_data") is True
        assert session.remove_data("temp_df") is True
        assert session.remove_data("nonexistent") is False

        # Verify data is gone
        assert session.get_data("temp_data") is None
        assert session.get_dataframe("temp_df") is None

    def test_session_expiration(self):
        """Test session expiration functionality."""
        # Create session with short expiration
        session = SessionData(expires_at=datetime.now() - timedelta(seconds=1))
        assert session.is_expired()

        # Test extension
        session.extend_session(hours=1)
        assert not session.is_expired()

    def test_memory_usage_tracking(self):
        """Test memory usage tracking."""
        session = SessionData()

        # Initial memory usage
        initial_usage = session.get_memory_usage()
        assert initial_usage["data_items"] == 0
        assert initial_usage["dataframes"] == 0

        # Add data and check usage
        session.store_data("test", "value")
        df = pd.DataFrame({"col": range(1000)})  # Larger DataFrame
        session.store_dataframe("large_df", df)

        usage = session.get_memory_usage()
        assert usage["data_items"] == 1
        assert usage["dataframes"] == 1
        assert usage["estimated_bytes"] > 0

    def test_session_cleanup(self):
        """Test secure session cleanup."""
        session = SessionData()

        # Add data
        session.store_data("test", "value")
        session.store_dataframe("df", pd.DataFrame({"col": [1, 2, 3]}))

        # Verify data exists
        assert session.get_data("test") == "value"
        assert session.get_dataframe("df") is not None

        # Cleanup
        session.cleanup()

        # Verify data is gone
        assert session.get_data("test") is None
        assert session.get_dataframe("df") is None
        assert len(session._data) == 0
        assert len(session._dataframes) == 0


class TestSessionManager:
    """Test SessionManager functionality."""

    def setup_method(self):
        """Set up test session manager."""
        self.manager = SessionManager(
            max_session_age=timedelta(minutes=30),
            cleanup_interval=1,  # 1 second for testing
            max_memory_mb=100,
            auto_start_cleanup=False  # Don't auto-start for tests
        )

    def teardown_method(self):
        """Clean up after tests."""
        self.manager.cleanup_all_sessions()
        self.manager.stop_cleanup_task()

    def test_session_creation(self):
        """Test session creation."""
        session_id = self.manager.create_session()

        assert session_id is not None
        assert len(session_id) == 36  # UUID4 length
        assert session_id in self.manager.sessions

        # Test custom session ID
        custom_id = "custom-session-123"
        session_id2 = self.manager.create_session(custom_id)
        assert session_id2 == custom_id
        assert custom_id in self.manager.sessions

    def test_session_retrieval(self):
        """Test session retrieval."""
        session_id = self.manager.create_session()

        # Get existing session
        session = self.manager.get_session(session_id)
        assert session is not None
        assert session.id == session_id

        # Get non-existent session
        assert self.manager.get_session("nonexistent") is None

    def test_session_expiration_handling(self):
        """Test handling of expired sessions."""
        # Create session with short expiration
        session_id = self.manager.create_session()
        session = self.manager.sessions[session_id]
        session.expires_at = datetime.now() - timedelta(seconds=1)

        # Try to get expired session
        retrieved_session = self.manager.get_session(session_id)
        assert retrieved_session is None
        assert session_id not in self.manager.sessions  # Should be cleaned up

    def test_session_extension(self):
        """Test session extension."""
        session_id = self.manager.create_session()
        original_expiry = self.manager.sessions[session_id].expires_at

        # Extend session
        success = self.manager.extend_session(session_id, hours=1)
        assert success is True

        new_expiry = self.manager.sessions[session_id].expires_at
        assert new_expiry > original_expiry

        # Try to extend non-existent session
        assert self.manager.extend_session("nonexistent") is False

    def test_session_cleanup(self):
        """Test individual session cleanup."""
        session_id = self.manager.create_session()
        session = self.manager.get_session(session_id)

        # Add some data
        session.store_data("test", "value")

        # Cleanup session
        success = self.manager.cleanup_session(session_id)
        assert success is True
        assert session_id not in self.manager.sessions

        # Try to cleanup non-existent session
        assert self.manager.cleanup_session("nonexistent") is False

    def test_expired_sessions_cleanup(self):
        """Test cleanup of expired sessions."""
        # Create multiple sessions
        session_ids = []
        for i in range(3):
            session_id = self.manager.create_session()
            session_ids.append(session_id)

        # Expire some sessions
        self.manager.sessions[session_ids[0]].expires_at = datetime.now() - timedelta(seconds=1)
        self.manager.sessions[session_ids[1]].expires_at = datetime.now() - timedelta(seconds=1)

        # Cleanup expired sessions
        cleaned_count = self.manager.cleanup_expired_sessions()
        assert cleaned_count == 2

        # Verify only non-expired session remains
        assert session_ids[0] not in self.manager.sessions
        assert session_ids[1] not in self.manager.sessions
        assert session_ids[2] in self.manager.sessions

    def test_all_sessions_cleanup(self):
        """Test cleanup of all sessions."""
        # Create multiple sessions
        for i in range(5):
            self.manager.create_session()

        assert len(self.manager.sessions) == 5

        # Cleanup all sessions
        cleaned_count = self.manager.cleanup_all_sessions()
        assert cleaned_count == 5
        assert len(self.manager.sessions) == 0

    def test_session_statistics(self):
        """Test session statistics."""
        # Initial stats
        stats = self.manager.get_session_stats()
        assert stats.total_sessions == 0
        assert stats.active_sessions == 0
        assert stats.expired_sessions == 0

        # Create sessions
        session_ids = []
        for i in range(3):
            session_id = self.manager.create_session()
            session_ids.append(session_id)

        # Expire one session
        self.manager.sessions[session_ids[0]].expires_at = datetime.now() - timedelta(seconds=1)

        # Check stats
        stats = self.manager.get_session_stats()
        assert stats.total_sessions == 3
        assert stats.active_sessions == 2
        assert stats.expired_sessions == 1
        assert stats.oldest_session_age_minutes is not None
        assert stats.newest_session_age_minutes is not None

    def test_memory_limits_checking(self):
        """Test memory limits checking."""
        # Should be within limits initially
        assert self.manager.check_memory_limits() is True

        # Create session with data to exceed limits
        session_id = self.manager.create_session()
        session = self.manager.get_session(session_id)
        # Create a large DataFrame to exceed memory limits
        large_df = pd.DataFrame({"col": range(10000)})
        session.store_dataframe("large_df", large_df)

        # Set low limit to trigger failure
        self.manager.max_memory_mb = 0.01  # Very low limit
        assert self.manager.check_memory_limits() is False

    def test_memory_limits_enforcement(self):
        """Test memory limits enforcement."""
        # Create sessions with data
        session_ids = []
        for i in range(3):
            session_id = self.manager.create_session()
            session = self.manager.get_session(session_id)
            # Create larger DataFrames to ensure memory usage
            session.store_dataframe(f"df_{i}", pd.DataFrame({"col": range(1000)}))
            session_ids.append(session_id)

        # Set very low memory limit to trigger cleanup
        self.manager.max_memory_mb = 0.01  # Very low limit

        # Enforce limits
        cleaned_count = self.manager.enforce_memory_limits()

        # Should have cleaned some sessions
        assert cleaned_count > 0
        assert len(self.manager.sessions) < 3


class TestMemoryUtilities:
    """Test memory management utilities."""

    def test_memory_usage_tracking(self):
        """Test memory usage tracking."""
        usage = get_memory_usage()

        assert "rss_mb" in usage
        assert "vms_mb" in usage
        assert "percent" in usage
        assert "available_mb" in usage
        assert "total_mb" in usage

        assert usage["rss_mb"] > 0
        assert usage["total_mb"] > 0

    def test_memory_tracker_context_manager(self):
        """Test MemoryTracker context manager."""
        with MemoryTracker("test_operation") as tracker:
            # Do some memory allocation
            data = [i for i in range(1000)]

        # Should have tracked memory usage
        delta = tracker.get_memory_delta()
        assert delta is not None

    def test_memory_tracker_with_limits(self):
        """Test MemoryTracker with memory limits."""
        with MemoryTracker("test_operation", max_memory_mb=1000) as tracker:
            # Should not exceed reasonable limits
            data = [i for i in range(100)]

        delta = tracker.get_memory_delta()
        assert delta is not None


@pytest.mark.asyncio
class TestSessionAPI:
    """Test session API endpoints (integration tests)."""

    async def test_automatic_cleanup_task(self):
        """Test that automatic cleanup task works."""
        manager = SessionManager(
            max_session_age=timedelta(seconds=2),
            cleanup_interval=1,
            max_memory_mb=100,
            auto_start_cleanup=False
        )

        try:
            # Start cleanup task manually for this test
            manager._start_cleanup_task()

            # Create session
            session_id = manager.create_session()
            assert len(manager.sessions) == 1

            # Wait for session to expire and be cleaned up
            await asyncio.sleep(3)

            # Session should be cleaned up automatically
            assert len(manager.sessions) == 0

        finally:
            manager.stop_cleanup_task()
            manager.cleanup_all_sessions()


if __name__ == "__main__":
    pytest.main([__file__])
