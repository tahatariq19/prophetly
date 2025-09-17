"""Integration tests for session API endpoints."""

from fastapi.testclient import TestClient
import pytest

from src.main import app

client = TestClient(app)


class TestSessionAPI:
    """Test session API endpoints."""

    def test_health_endpoint(self):
        """Test health check endpoint includes session info."""
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert "privacy" in data
        assert "active_sessions" in data
        assert "total_sessions" in data
        assert "current_memory_mb" in data
        assert data["status"] == "healthy"
        assert data["privacy"] == "stateless"

    def test_create_session(self):
        """Test session creation endpoint."""
        response = client.post("/api/session/create")
        assert response.status_code == 200

        data = response.json()
        assert "session_id" in data
        assert "expires_at" in data
        assert "message" in data
        assert len(data["session_id"]) == 36  # UUID4 length

    def test_session_stats(self):
        """Test session statistics endpoint."""
        response = client.get("/api/session/stats")
        assert response.status_code == 200

        data = response.json()
        assert "session_stats" in data
        assert "memory_usage" in data
        assert "privacy_notice" in data

        # Check session stats structure
        stats = data["session_stats"]
        assert "total_sessions" in stats
        assert "active_sessions" in stats
        assert "expired_sessions" in stats
        assert "total_memory_mb" in stats

        # Check memory usage structure
        memory = data["memory_usage"]
        assert "rss_mb" in memory
        assert "percent" in memory

    def test_session_data_operations(self):
        """Test storing and retrieving session data."""
        # Create session
        create_response = client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Store data
        store_response = client.post(
            f"/api/session/{session_id}/data",
            json={"key": "test_key", "value": "test_value"},
        )
        assert store_response.status_code == 200
        assert store_response.json()["success"] is True

        # Retrieve data
        get_response = client.get(f"/api/session/{session_id}/data/test_key")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["success"] is True
        assert data["data"] == "test_value"

        # Delete data
        delete_response = client.delete(f"/api/session/{session_id}/data/test_key")
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] is True

        # Try to get deleted data
        get_deleted_response = client.get(f"/api/session/{session_id}/data/test_key")
        assert get_deleted_response.status_code == 404

    def test_session_info(self):
        """Test session info endpoint."""
        # Create session
        create_response = client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Get session info
        info_response = client.get(f"/api/session/{session_id}/info")
        assert info_response.status_code == 200

        data = info_response.json()
        assert "session_id" in data
        assert "created_at" in data
        assert "expires_at" in data
        assert "last_accessed" in data
        assert "is_expired" in data
        assert "memory_usage" in data
        assert "privacy_notice" in data
        assert data["session_id"] == session_id
        assert data["is_expired"] is False

    def test_session_extension(self):
        """Test session extension."""
        # Create session
        create_response = client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Extend session
        extend_response = client.post(f"/api/session/{session_id}/extend?hours=3")
        assert extend_response.status_code == 200
        assert extend_response.json()["success"] is True

    def test_session_cleanup(self):
        """Test manual session cleanup."""
        # Create session
        create_response = client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Cleanup session
        cleanup_response = client.delete(f"/api/session/{session_id}")
        assert cleanup_response.status_code == 200
        assert cleanup_response.json()["success"] is True

        # Try to get cleaned up session
        info_response = client.get(f"/api/session/{session_id}/info")
        assert info_response.status_code == 404

    def test_nonexistent_session_operations(self):
        """Test operations on non-existent sessions."""
        fake_session_id = "00000000-0000-0000-0000-000000000000"

        # Try to get info
        info_response = client.get(f"/api/session/{fake_session_id}/info")
        assert info_response.status_code == 404

        # Try to store data
        store_response = client.post(
            f"/api/session/{fake_session_id}/data",
            json={"key": "test", "value": "test"},
        )
        assert store_response.status_code == 404

        # Try to get data
        get_response = client.get(f"/api/session/{fake_session_id}/data/test")
        assert get_response.status_code == 404

        # Try to extend
        extend_response = client.post(f"/api/session/{fake_session_id}/extend")
        assert extend_response.status_code == 404

    def test_complex_data_storage(self):
        """Test storing complex data structures."""
        # Create session
        create_response = client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Store complex data
        complex_data = {
            "nested": {"key": "value"},
            "list": [1, 2, 3],
            "number": 42,
            "boolean": True,
        }

        store_response = client.post(
            f"/api/session/{session_id}/data",
            json={"key": "complex", "value": complex_data},
        )
        assert store_response.status_code == 200

        # Retrieve complex data
        get_response = client.get(f"/api/session/{session_id}/data/complex")
        assert get_response.status_code == 200

        retrieved_data = get_response.json()["data"]
        assert retrieved_data == complex_data


if __name__ == "__main__":
    pytest.main([__file__])
