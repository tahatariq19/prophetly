"""Integration tests for memory-only API endpoints.

Tests the complete API workflow while ensuring stateless operation:
- File upload and processing
- Session management
- Prophet forecasting
- Cross-validation
- Export functionality
- Memory cleanup
"""

import asyncio
import gc
import json
import tempfile
from datetime import datetime, timedelta
from io import BytesIO
from unittest.mock import Mock

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.main import app
from src.services.session_manager import session_manager
from src.utils.memory import get_memory_usage


@pytest.fixture
def client():
    """Create test client for API testing."""
    return TestClient(app)


@pytest.fixture
def sample_csv_data():
    """Create sample CSV data for testing."""
    dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
    values = [100 + i * 0.1 + (i % 365) * 0.5 for i in range(len(dates))]
    
    csv_content = "date,value\n"
    for date, value in zip(dates, values):
        csv_content += f"{date.strftime('%Y-%m-%d')},{value:.2f}\n"
    
    return csv_content


@pytest.fixture
def sample_csv_with_regressors():
    """Create sample CSV data with regressors for testing."""
    dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
    values = [100 + i * 0.1 for i in range(len(dates))]
    temperatures = [20 + 10 * ((i % 365) / 365) for i in range(len(dates))]
    promotions = [1 if i % 50 == 0 else 0 for i in range(len(dates))]
    
    csv_content = "date,value,temperature,promotion\n"
    for date, value, temp, promo in zip(dates, values, temperatures, promotions):
        csv_content += f"{date.strftime('%Y-%m-%d')},{value:.2f},{temp:.1f},{promo}\n"
    
    return csv_content


class TestFileUploadAPI:
    """Test file upload API endpoints."""
    
    def test_upload_valid_csv(self, client, sample_csv_data):
        """Test uploading a valid CSV file."""
        # Create file-like object
        file_data = BytesIO(sample_csv_data.encode())
        
        response = client.post(
            "/api/upload",
            files={"file": ("test_data.csv", file_data, "text/csv")}
        )
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "session_id" in result
        assert "data" in result
        assert "metadata" in result
        assert "column_info" in result
        
        # Check data structure
        assert result["data"]["columns"] == ["date", "value"]
        assert len(result["data"]["data"]) > 0
        
        # Check metadata
        metadata = result["metadata"]
        assert metadata["filename"] == "test_data.csv"
        assert metadata["rows"] > 0
        assert metadata["columns"] == 2
        assert "privacy_notice" in metadata
        
        # Check column detection
        column_info = result["column_info"]
        assert column_info["date"]["is_potential_date"] is True
        assert column_info["value"]["is_potential_value"] is True
        
        return result["session_id"]
    
    def test_upload_invalid_file_format(self, client):
        """Test uploading invalid file format."""
        # Create invalid file
        invalid_data = BytesIO(b"This is not a CSV file")
        
        response = client.post(
            "/api/upload",
            files={"file": ("test.txt", invalid_data, "text/plain")}
        )
        
        assert response.status_code == 400
        assert "error" in response.json()
    
    def test_upload_oversized_file(self, client):
        """Test uploading oversized file."""
        # Create large CSV content
        large_content = "date,value\n" + "\n".join([
            f"2023-01-{(i % 31) + 1:02d},{i}" for i in range(100000)
        ])
        
        file_data = BytesIO(large_content.encode())
        
        response = client.post(
            "/api/upload",
            files={"file": ("large_file.csv", file_data, "text/csv")}
        )
        
        # Should handle large files or reject appropriately
        assert response.status_code in [200, 400, 413]
    
    def test_upload_empty_file(self, client):
        """Test uploading empty file."""
        empty_data = BytesIO(b"")
        
        response = client.post(
            "/api/upload",
            files={"file": ("empty.csv", empty_data, "text/csv")}
        )
        
        assert response.status_code == 400
        assert "error" in response.json()
    
    def test_upload_malicious_content(self, client):
        """Test uploading file with potentially malicious content."""
        malicious_content = "date,value\n2023-01-01,<script>alert('xss')</script>"
        file_data = BytesIO(malicious_content.encode())
        
        response = client.post(
            "/api/upload",
            files={"file": ("malicious.csv", file_data, "text/csv")}
        )
        
        assert response.status_code == 400
        assert "malicious" in response.json()["error"].lower()


class TestSessionAPI:
    """Test session management API endpoints."""
    
    def test_create_session(self, client):
        """Test creating a new session."""
        response = client.post("/api/session/create")
        
        assert response.status_code == 200
        
        result = response.json()
        assert "session_id" in result
        assert len(result["session_id"]) == 36  # UUID length
        assert "expires_at" in result
    
    def test_get_session_info(self, client, sample_csv_data):
        """Test getting session information."""
        # First upload data to create session
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Get session info
        response = client.get(f"/api/session/{session_id}")
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["session_id"] == session_id
        assert "created_at" in result
        assert "expires_at" in result
        assert "data_items" in result
        assert result["data_items"] > 0  # Should have uploaded data
    
    def test_get_nonexistent_session(self, client):
        """Test getting information for non-existent session."""
        fake_session_id = "00000000-0000-0000-0000-000000000000"
        
        response = client.get(f"/api/session/{fake_session_id}")
        
        assert response.status_code == 404
    
    def test_extend_session(self, client, sample_csv_data):
        """Test extending session expiration."""
        # Create session with data
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Extend session
        response = client.post(f"/api/session/{session_id}/extend", json={"hours": 4})
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "new_expires_at" in result
    
    def test_cleanup_session(self, client, sample_csv_data):
        """Test manual session cleanup."""
        # Create session with data
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Cleanup session
        response = client.delete(f"/api/session/{session_id}")
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        
        # Session should no longer exist
        get_response = client.get(f"/api/session/{session_id}")
        assert get_response.status_code == 404


class TestForecastAPI:
    """Test forecasting API endpoints."""
    
    def test_create_forecast_basic(self, client, sample_csv_data):
        """Test creating a basic forecast."""
        # Upload data first
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Create forecast configuration
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Test Forecast",
                "horizon": 30,
                "growth": "linear",
                "yearly_seasonality": True,
                "weekly_seasonality": True,
                "daily_seasonality": False,
                "interval_width": 0.8
            },
            "data_key": "uploaded_data"
        }
        
        response = client.post("/api/forecast/create", json=forecast_config)
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "forecast_id" in result
        assert "forecast" in result
        assert "components" in result
        
        # Check forecast structure
        forecast = result["forecast"]
        assert "columns" in forecast
        assert "data" in forecast
        assert len(forecast["data"]) > 0
        
        # Should have Prophet forecast columns
        expected_cols = ["ds", "yhat", "yhat_lower", "yhat_upper"]
        for col in expected_cols:
            assert col in forecast["columns"]
    
    def test_create_forecast_logistic_growth(self, client, sample_csv_data):
        """Test creating forecast with logistic growth."""
        # Upload data
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Create logistic growth configuration
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Logistic Forecast",
                "horizon": 60,
                "growth": "logistic",
                "cap": 500.0,
                "floor": 50.0,
                "yearly_seasonality": True,
                "weekly_seasonality": False
            },
            "data_key": "uploaded_data"
        }
        
        response = client.post("/api/forecast/create", json=forecast_config)
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "forecast" in result
    
    def test_create_forecast_with_regressors(self, client, sample_csv_with_regressors):
        """Test creating forecast with external regressors."""
        # Upload data with regressors
        file_data = BytesIO(sample_csv_with_regressors.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test_with_regressors.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Create configuration with regressors
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Forecast with Regressors",
                "horizon": 30,
                "growth": "linear",
                "yearly_seasonality": True,
                "regressors": [
                    {
                        "name": "temperature",
                        "prior_scale": 0.5,
                        "standardize": True,
                        "mode": "additive"
                    },
                    {
                        "name": "promotion",
                        "prior_scale": 0.1,
                        "standardize": False,
                        "mode": "multiplicative"
                    }
                ]
            },
            "data_key": "uploaded_data"
        }
        
        response = client.post("/api/forecast/create", json=forecast_config)
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "forecast" in result
        assert "components" in result
    
    def test_create_forecast_invalid_session(self, client):
        """Test creating forecast with invalid session."""
        forecast_config = {
            "session_id": "invalid-session-id",
            "config": {
                "name": "Test Forecast",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "uploaded_data"
        }
        
        response = client.post("/api/forecast/create", json=forecast_config)
        
        assert response.status_code == 404
    
    def test_create_forecast_missing_data(self, client, sample_csv_data):
        """Test creating forecast with missing data key."""
        # Upload data
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Try to forecast with non-existent data key
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Test Forecast",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "nonexistent_data"
        }
        
        response = client.post("/api/forecast/create", json=forecast_config)
        
        assert response.status_code == 400
    
    def test_get_forecast_results(self, client, sample_csv_data):
        """Test retrieving forecast results."""
        # Create forecast first
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Test Forecast",
                "horizon": 30,
                "growth": "linear",
                "yearly_seasonality": True
            },
            "data_key": "uploaded_data"
        }
        
        create_response = client.post("/api/forecast/create", json=forecast_config)
        forecast_id = create_response.json()["forecast_id"]
        
        # Get forecast results
        response = client.get(f"/api/forecast/{session_id}/{forecast_id}")
        
        assert response.status_code == 200
        
        result = response.json()
        assert "forecast" in result
        assert "components" in result
        assert "metadata" in result


class TestCrossValidationAPI:
    """Test cross-validation API endpoints."""
    
    def test_run_cross_validation(self, client, sample_csv_data):
        """Test running cross-validation."""
        # Upload data and create forecast first
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Cross-validation configuration
        cv_config = {
            "session_id": session_id,
            "config": {
                "name": "CV Test",
                "horizon": 30,
                "growth": "linear",
                "yearly_seasonality": True
            },
            "data_key": "uploaded_data",
            "cv_params": {
                "initial": "730 days",
                "period": "180 days",
                "horizon": "90 days"
            }
        }
        
        response = client.post("/api/cross-validate", json=cv_config)
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "cv_results" in result
        assert "metrics" in result
        
        # Check CV results structure
        cv_results = result["cv_results"]
        assert "columns" in cv_results
        assert "data" in cv_results
        assert len(cv_results["data"]) > 0
        
        # Check metrics
        metrics = result["metrics"]
        assert isinstance(metrics, dict)
        expected_metrics = ["mse", "rmse", "mae", "mape"]
        for metric in expected_metrics:
            if metric in metrics:
                assert isinstance(metrics[metric], (int, float))
    
    def test_cross_validation_custom_cutoffs(self, client, sample_csv_data):
        """Test cross-validation with custom cutoffs."""
        # Upload data
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # CV with custom cutoffs
        cv_config = {
            "session_id": session_id,
            "config": {
                "name": "CV Custom Cutoffs",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "uploaded_data",
            "cv_params": {
                "horizon": "30 days",
                "cutoffs": [
                    "2022-01-01",
                    "2022-06-01",
                    "2023-01-01"
                ]
            }
        }
        
        response = client.post("/api/cross-validate", json=cv_config)
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "cv_results" in result
    
    def test_cross_validation_insufficient_data(self, client):
        """Test cross-validation with insufficient data."""
        # Create small dataset
        small_data = "date,value\n2023-01-01,100\n2023-01-02,200\n2023-01-03,300"
        file_data = BytesIO(small_data.encode())
        
        upload_response = client.post(
            "/api/upload",
            files={"file": ("small.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        cv_config = {
            "session_id": session_id,
            "config": {
                "name": "CV Insufficient Data",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "uploaded_data",
            "cv_params": {
                "initial": "365 days",  # More than available data
                "period": "30 days",
                "horizon": "30 days"
            }
        }
        
        response = client.post("/api/cross-validate", json=cv_config)
        
        assert response.status_code == 400


class TestExportAPI:
    """Test export functionality API endpoints."""
    
    def test_export_forecast_csv(self, client, sample_csv_data):
        """Test exporting forecast results as CSV."""
        # Create forecast first
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Export Test Forecast",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "uploaded_data"
        }
        
        create_response = client.post("/api/forecast/create", json=forecast_config)
        forecast_id = create_response.json()["forecast_id"]
        
        # Export forecast
        export_config = {
            "session_id": session_id,
            "forecast_id": forecast_id,
            "format": "csv",
            "include_components": True
        }
        
        response = client.post("/api/export/forecast", json=export_config)
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "download_data" in result
        assert "filename" in result
        assert result["filename"].endswith(".csv")
    
    def test_export_forecast_json(self, client, sample_csv_data):
        """Test exporting forecast results as JSON."""
        # Create forecast
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "JSON Export Test",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "uploaded_data"
        }
        
        create_response = client.post("/api/forecast/create", json=forecast_config)
        forecast_id = create_response.json()["forecast_id"]
        
        # Export as JSON
        export_config = {
            "session_id": session_id,
            "forecast_id": forecast_id,
            "format": "json",
            "include_metadata": True
        }
        
        response = client.post("/api/export/forecast", json=export_config)
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "download_data" in result
        
        # Should be valid JSON
        json_data = json.loads(result["download_data"])
        assert isinstance(json_data, dict)
    
    def test_export_configuration(self, client, sample_csv_data):
        """Test exporting forecast configuration."""
        # Create forecast
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Config Export Test",
                "horizon": 60,
                "growth": "logistic",
                "cap": 500.0,
                "yearly_seasonality": True,
                "weekly_seasonality": False
            },
            "data_key": "uploaded_data"
        }
        
        create_response = client.post("/api/forecast/create", json=forecast_config)
        forecast_id = create_response.json()["forecast_id"]
        
        # Export configuration
        response = client.get(f"/api/export/config/{session_id}/{forecast_id}")
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "config_json" in result
        
        # Should be valid configuration JSON
        config_data = json.loads(result["config_json"])
        assert config_data["name"] == "Config Export Test"
        assert config_data["horizon"] == 60
        assert config_data["growth"] == "logistic"


class TestMemoryManagementIntegration:
    """Test memory management in API integration."""
    
    def test_session_cleanup_after_operations(self, client, sample_csv_data):
        """Test that sessions are properly cleaned up after operations."""
        initial_sessions = len(session_manager.sessions)
        
        # Perform complete workflow
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Create forecast
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Memory Test Forecast",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "uploaded_data"
        }
        
        client.post("/api/forecast/create", json=forecast_config)
        
        # Cleanup session
        client.delete(f"/api/session/{session_id}")
        
        # Should be back to initial state
        final_sessions = len(session_manager.sessions)
        assert final_sessions == initial_sessions
    
    def test_memory_usage_during_operations(self, client, sample_csv_data):
        """Test memory usage during API operations."""
        initial_memory = get_memory_usage()
        
        # Perform multiple operations
        for i in range(3):
            file_data = BytesIO(sample_csv_data.encode())
            upload_response = client.post(
                "/api/upload",
                files={"file": (f"test_{i}.csv", file_data, "text/csv")}
            )
            
            session_id = upload_response.json()["session_id"]
            
            forecast_config = {
                "session_id": session_id,
                "config": {
                    "name": f"Memory Test {i}",
                    "horizon": 30,
                    "growth": "linear"
                },
                "data_key": "uploaded_data"
            }
            
            client.post("/api/forecast/create", json=forecast_config)
            
            # Cleanup immediately
            client.delete(f"/api/session/{session_id}")
        
        # Force garbage collection
        gc.collect()
        
        final_memory = get_memory_usage()
        memory_increase = final_memory['rss_mb'] - initial_memory['rss_mb']
        
        # Memory increase should be reasonable
        assert memory_increase < 100, f"Excessive memory usage: {memory_increase}MB"
    
    def test_concurrent_session_isolation(self, client, sample_csv_data):
        """Test that concurrent sessions are properly isolated."""
        session_ids = []
        
        # Create multiple concurrent sessions
        for i in range(3):
            file_data = BytesIO(sample_csv_data.encode())
            upload_response = client.post(
                "/api/upload",
                files={"file": (f"concurrent_{i}.csv", file_data, "text/csv")}
            )
            
            session_id = upload_response.json()["session_id"]
            session_ids.append(session_id)
        
        # Verify sessions are isolated
        for i, session_id in enumerate(session_ids):
            response = client.get(f"/api/session/{session_id}")
            assert response.status_code == 200
            
            session_info = response.json()
            assert session_info["session_id"] == session_id
        
        # Cleanup all sessions
        for session_id in session_ids:
            client.delete(f"/api/session/{session_id}")
        
        # Verify all sessions are gone
        for session_id in session_ids:
            response = client.get(f"/api/session/{session_id}")
            assert response.status_code == 404


class TestErrorHandlingIntegration:
    """Test error handling in API integration."""
    
    def test_api_error_responses_no_data_leakage(self, client):
        """Test that API error responses don't leak sensitive data."""
        # Create session with sensitive data
        sensitive_data = "ssn,income\n123-45-6789,50000\n987-65-4321,75000"
        file_data = BytesIO(sensitive_data.encode())
        
        upload_response = client.post(
            "/api/upload",
            files={"file": ("sensitive.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Cause an error in forecasting
        invalid_config = {
            "session_id": session_id,
            "config": {
                "name": "Error Test",
                "horizon": -10,  # Invalid horizon
                "growth": "invalid_growth"  # Invalid growth
            },
            "data_key": "uploaded_data"
        }
        
        response = client.post("/api/forecast/create", json=invalid_config)
        
        assert response.status_code == 400
        
        error_response = response.json()
        error_message = str(error_response)
        
        # Should not contain sensitive data
        assert "123-45-6789" not in error_message
        assert "50000" not in error_message
        
        # Cleanup
        client.delete(f"/api/session/{session_id}")
    
    def test_session_timeout_handling(self, client, sample_csv_data):
        """Test handling of session timeouts."""
        # Create session
        file_data = BytesIO(sample_csv_data.encode())
        upload_response = client.post(
            "/api/upload",
            files={"file": ("timeout_test.csv", file_data, "text/csv")}
        )
        
        session_id = upload_response.json()["session_id"]
        
        # Manually expire the session
        session = session_manager.get_session(session_id)
        if session:
            session.expires_at = datetime.now() - timedelta(seconds=1)
        
        # Try to use expired session
        forecast_config = {
            "session_id": session_id,
            "config": {
                "name": "Timeout Test",
                "horizon": 30,
                "growth": "linear"
            },
            "data_key": "uploaded_data"
        }
        
        response = client.post("/api/forecast/create", json=forecast_config)
        
        assert response.status_code == 404  # Session not found
    
    def test_invalid_json_handling(self, client):
        """Test handling of invalid JSON in requests."""
        # Send malformed JSON
        response = client.post(
            "/api/forecast/create",
            data="{ invalid json }",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable Entity


if __name__ == "__main__":
    pytest.main([__file__, "-v"])