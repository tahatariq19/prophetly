"""Tests for file upload API endpoints."""

import io

from fastapi.testclient import TestClient

from src.main import app
from src.services.session_manager import session_manager

client = TestClient(app)


class TestUploadAPI:
    """Test cases for upload API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        # Clean up any existing sessions
        session_manager.cleanup_all_sessions()

    def teardown_method(self):
        """Clean up after tests."""
        session_manager.cleanup_all_sessions()

    def create_test_csv_file(self, content: str, filename: str = "test.csv"):
        """Helper to create test CSV file."""
        return ("file", (filename, io.StringIO(content), "text/csv"))

    def test_upload_csv_success_new_session(self):
        """Test successful CSV upload with new session creation."""
        csv_content = "date,value\n2023-01-01,100\n2023-01-02,200\n2023-01-03,300"
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        response = client.post("/api/upload/csv", files=files)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "session_id" in data
        assert "file_info" in data
        assert "column_info" in data
        assert "data_preview" in data

        # Check file info
        file_info = data["file_info"]
        assert file_info["filename"] == "test.csv"
        assert file_info["rows"] == 3
        assert file_info["columns"] == 2
        assert "privacy_notice" in file_info

        # Check column info
        column_info = data["column_info"]
        assert "date" in column_info
        assert "value" in column_info
        assert column_info["date"]["is_potential_date"] is True
        assert column_info["value"]["is_potential_value"] is True

        # Check data preview
        preview = data["data_preview"]
        assert preview["columns"] == ["date", "value"]
        assert len(preview["rows"]) == 3
        assert preview["total_rows"] == 3

    def test_upload_csv_success_existing_session(self):
        """Test successful CSV upload with existing session."""
        # Create session first
        session_id = session_manager.create_session()

        csv_content = "date,value\n2023-01-01,100\n2023-01-02,200"
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        response = client.post(f"/api/upload/csv?session_id={session_id}", files=files)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["session_id"] == session_id

    def test_upload_csv_invalid_session(self):
        """Test CSV upload with invalid session ID."""
        csv_content = "date,value\n2023-01-01,100"
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        response = client.post("/api/upload/csv?session_id=invalid-session", files=files)

        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

    def test_upload_csv_invalid_file_extension(self):
        """Test CSV upload with invalid file extension."""
        csv_content = "date,value\n2023-01-01,100"
        files = {"file": ("test.xlsx", io.BytesIO(csv_content.encode()), "text/csv")}

        response = client.post("/api/upload/csv", files=files)

        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]

    def test_upload_csv_empty_file(self):
        """Test CSV upload with empty file."""
        files = {"file": ("test.csv", io.BytesIO(b""), "text/csv")}

        response = client.post("/api/upload/csv", files=files)

        assert response.status_code == 400
        assert "File is empty" in response.json()["detail"]

    def test_upload_csv_malicious_content(self):
        """Test CSV upload with malicious content."""
        malicious_content = "date,value\n2023-01-01,<script>alert('xss')</script>"
        files = {"file": ("test.csv", io.BytesIO(malicious_content.encode()), "text/csv")}

        response = client.post("/api/upload/csv", files=files)

        assert response.status_code == 400
        assert "malicious content" in response.json()["detail"]

    def test_upload_csv_insufficient_columns(self):
        """Test CSV upload with insufficient columns."""
        csv_content = "single_column\n100\n200"
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        response = client.post("/api/upload/csv", files=files)

        assert response.status_code == 400
        assert "at least 2 columns" in response.json()["detail"]

    def test_upload_csv_insufficient_rows(self):
        """Test CSV upload with insufficient rows."""
        csv_content = "date,value\n2023-01-01,100"
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        response = client.post("/api/upload/csv", files=files)

        assert response.status_code == 400
        assert "at least 2 rows" in response.json()["detail"]

    def test_get_file_info_success(self):
        """Test getting file info for uploaded file."""
        # First upload a file
        csv_content = "date,value\n2023-01-01,100\n2023-01-02,200\n2023-01-03,300"
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        upload_response = client.post("/api/upload/csv", files=files)
        session_id = upload_response.json()["session_id"]

        # Then get file info
        response = client.get(f"/api/upload/session/{session_id}/file-info")

        assert response.status_code == 200
        data = response.json()

        assert data["session_id"] == session_id
        assert "file_metadata" in data
        assert "column_info" in data
        assert "privacy_notice" in data

        file_metadata = data["file_metadata"]
        assert file_metadata["filename"] == "test.csv"
        assert file_metadata["rows"] == 3
        assert file_metadata["columns"] == 2

    def test_get_file_info_no_session(self):
        """Test getting file info for non-existent session."""
        response = client.get("/api/upload/session/invalid-session/file-info")

        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

    def test_get_file_info_no_file(self):
        """Test getting file info when no file uploaded."""
        session_id = session_manager.create_session()

        response = client.get(f"/api/upload/session/{session_id}/file-info")

        assert response.status_code == 404
        assert "No file uploaded" in response.json()["detail"]

    def test_get_data_preview_success(self):
        """Test getting data preview."""
        # First upload a file
        csv_content = "date,value\n" + "\n".join([f"2023-01-{i:02d},{i*100}" for i in range(1, 21)])  # 20 rows
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        upload_response = client.post("/api/upload/csv", files=files)
        session_id = upload_response.json()["session_id"]

        # Get default preview (10 rows)
        response = client.get(f"/api/upload/session/{session_id}/data-preview")

        assert response.status_code == 200
        data = response.json()

        assert data["columns"] == ["date", "value"]
        assert len(data["rows"]) == 10
        assert data["total_rows"] == 20
        assert data["showing_rows"] == 10
        assert data["offset"] == 0
        assert data["has_more"] is True

    def test_get_data_preview_with_pagination(self):
        """Test getting data preview with pagination."""
        # First upload a file
        csv_content = "date,value\n" + "\n".join([f"2023-01-{i:02d},{i*100}" for i in range(1, 21)])  # 20 rows
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        upload_response = client.post("/api/upload/csv", files=files)
        session_id = upload_response.json()["session_id"]

        # Get second page (5 rows, offset 10)
        response = client.get(f"/api/upload/session/{session_id}/data-preview?rows=5&offset=10")

        assert response.status_code == 200
        data = response.json()

        assert len(data["rows"]) == 5
        assert data["total_rows"] == 20
        assert data["showing_rows"] == 5
        assert data["offset"] == 10
        assert data["has_more"] is True

    def test_get_data_preview_invalid_parameters(self):
        """Test getting data preview with invalid parameters."""
        session_id = session_manager.create_session()

        # Test too many rows
        response = client.get(f"/api/upload/session/{session_id}/data-preview?rows=200")
        assert response.status_code == 400
        assert "Maximum 100 rows" in response.json()["detail"]

        # Test negative rows
        response = client.get(f"/api/upload/session/{session_id}/data-preview?rows=-1")
        assert response.status_code == 400
        assert "must be positive" in response.json()["detail"]

        # Test negative offset
        response = client.get(f"/api/upload/session/{session_id}/data-preview?offset=-1")
        assert response.status_code == 400
        assert "must be non-negative" in response.json()["detail"]

    def test_clear_file_data_success(self):
        """Test clearing file data from session."""
        # First upload a file
        csv_content = "date,value\n2023-01-01,100\n2023-01-02,200"
        files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}

        upload_response = client.post("/api/upload/csv", files=files)
        session_id = upload_response.json()["session_id"]

        # Clear file data
        response = client.delete(f"/api/upload/session/{session_id}/file-data")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "removed_items" in data
        assert len(data["removed_items"]) > 0
        assert "privacy_notice" in data

        # Verify data is actually cleared
        info_response = client.get(f"/api/upload/session/{session_id}/file-info")
        assert info_response.status_code == 404

    def test_clear_file_data_no_data(self):
        """Test clearing file data when no data exists."""
        session_id = session_manager.create_session()

        response = client.delete(f"/api/upload/session/{session_id}/file-data")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["removed_items"] == []
        assert "No file data found" in data["message"]

    def test_get_upload_limits(self):
        """Test getting upload limits."""
        response = client.get("/api/upload/limits")

        assert response.status_code == 200
        data = response.json()

        assert "max_file_size_mb" in data
        assert "max_rows" in data
        assert "max_columns" in data
        assert "allowed_extensions" in data
        assert "supported_encodings" in data
        assert "privacy_policy" in data

        assert isinstance(data["max_file_size_mb"], (int, float))
        assert isinstance(data["allowed_extensions"], list)
        assert ".csv" in data["allowed_extensions"]
