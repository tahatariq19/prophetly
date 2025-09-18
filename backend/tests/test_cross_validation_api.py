"""Tests for cross-validation API endpoints."""

import json
from unittest.mock import patch

from fastapi.testclient import TestClient
import pandas as pd
import pytest
import numpy as np

from src.main import app
from src.models.prophet_config import ForecastConfig
from src.models.cross_validation import CrossValidationConfig
from src.services.session_manager import session_manager

client = TestClient(app)


@pytest.fixture
def sample_data():
    """Create sample time series data for testing."""
    dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
    # Create synthetic data with trend and seasonality
    trend = np.linspace(100, 200, len(dates))
    seasonal = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)
    noise = np.random.normal(0, 5, len(dates))
    values = trend + seasonal + noise

    return pd.DataFrame({
        'ds': dates,
        'y': values
    })


@pytest.fixture
def session_with_data(sample_data):
    """Create a session with sample data."""
    session_id = session_manager.create_session()
    session_data = session_manager.get_session(session_id)
    session_data.store_dataframe("uploaded_data", sample_data)
    return session_id


@pytest.fixture
def basic_forecast_config():
    """Create a basic forecast configuration."""
    return {
        "name": "Test Cross-Validation",
        "horizon": 30,
        "growth": "linear",
        "yearly_seasonality": True,
        "weekly_seasonality": False,
        "daily_seasonality": False,
        "seasonality_mode": "additive",
        "changepoint_prior_scale": 0.05
    }


@pytest.fixture
def basic_cv_config():
    """Create a basic cross-validation configuration."""
    return {
        "initial": "365 days",
        "period": "90 days",
        "horizon": "30 days"
    }


class TestCrossValidationAPI:
    """Test cross-validation API endpoints."""

    def test_execute_cross_validation_success(self, session_with_data, basic_forecast_config, basic_cv_config):
        """Test successful cross-validation execution."""
        request_data = {
            "session_id": session_with_data,
            "config": basic_cv_config,
            "forecast_config": basic_forecast_config
        }

        response = client.post("/api/cross-validation/execute", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify response structure
        assert result["success"] is True
        assert "message" in result
        assert "metrics" in result
        assert "results" in result
        assert "cutoff_count" in result
        assert "total_predictions" in result
        assert "processing_time_seconds" in result

        # Verify metrics structure
        metrics = result["metrics"]
        assert "rmse" in metrics
        assert "mae" in metrics
        assert "mape" in metrics
        assert "coverage" in metrics

        # Verify we have results
        assert result["cutoff_count"] > 0
        assert result["total_predictions"] > 0
        assert len(result["results"]) > 0

        # Verify result point structure
        first_result = result["results"][0]
        assert "ds" in first_result
        assert "cutoff" in first_result
        assert "y" in first_result
        assert "yhat" in first_result
        assert "yhat_lower" in first_result
        assert "yhat_upper" in first_result
        assert "error" in first_result

    def test_execute_cross_validation_custom_cutoffs(self, session_with_data, basic_forecast_config):
        """Test cross-validation with custom cutoffs."""
        cv_config = {
            "initial": "365 days",
            "horizon": "30 days",
            "cutoffs": ["2022-01-01", "2022-07-01", "2023-01-01"]
        }

        request_data = {
            "session_id": session_with_data,
            "config": cv_config,
            "forecast_config": basic_forecast_config
        }

        response = client.post("/api/cross-validation/execute", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["success"] is True
        assert result["cutoff_count"] == 3  # Should match number of custom cutoffs

    def test_execute_cross_validation_session_not_found(self, basic_forecast_config, basic_cv_config):
        """Test cross-validation with non-existent session."""
        request_data = {
            "session_id": "non-existent-session",
            "config": basic_cv_config,
            "forecast_config": basic_forecast_config
        }

        response = client.post("/api/cross-validation/execute", json=request_data)
        
        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

    def test_execute_cross_validation_invalid_config(self, session_with_data, basic_cv_config):
        """Test cross-validation with invalid forecast configuration."""
        invalid_forecast_config = {
            "horizon": -10,  # Invalid negative horizon
            "growth": "invalid_growth_mode"
        }

        request_data = {
            "session_id": session_with_data,
            "config": basic_cv_config,
            "forecast_config": invalid_forecast_config
        }

        response = client.post("/api/cross-validation/execute", json=request_data)
        
        assert response.status_code == 400
        assert "Invalid forecast configuration" in response.json()["detail"]

    def test_validate_cross_validation_config_success(self, session_with_data, basic_forecast_config, basic_cv_config):
        """Test successful cross-validation configuration validation."""
        request_data = {
            "session_id": session_with_data,
            "config": basic_cv_config,
            "forecast_config": basic_forecast_config
        }

        response = client.post("/api/cross-validation/validate-config", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify validation response structure
        assert "is_valid" in result
        assert "errors" in result
        assert "warnings" in result
        assert "recommendations" in result
        assert "data_points" in result
        assert "estimated_processing_time_seconds" in result
        assert "estimated_memory_mb" in result

        # Should be valid for good configuration
        assert result["is_valid"] is True

    def test_validate_cross_validation_config_session_not_found(self, basic_forecast_config, basic_cv_config):
        """Test validation with non-existent session."""
        request_data = {
            "session_id": "non-existent-session",
            "config": basic_cv_config,
            "forecast_config": basic_forecast_config
        }

        response = client.post("/api/cross-validation/validate-config", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["is_valid"] is False
        assert "Session not found" in result["errors"][0]

    def test_validate_cross_validation_config_insufficient_data(self, basic_forecast_config):
        """Test validation with insufficient data."""
        # Create session with minimal data
        session_id = session_manager.create_session()
        session_data = session_manager.get_session(session_id)
        
        # Very small dataset
        small_data = pd.DataFrame({
            'ds': pd.date_range('2023-01-01', periods=10, freq='D'),
            'y': [100, 105, 110, 95, 120, 115, 108, 102, 118, 125]
        })
        session_data.store_dataframe("uploaded_data", small_data)

        cv_config = {
            "initial": "365 days",  # Longer than available data
            "period": "90 days",
            "horizon": "30 days"
        }

        request_data = {
            "session_id": session_id,
            "config": cv_config,
            "forecast_config": basic_forecast_config
        }

        response = client.post("/api/cross-validation/validate-config", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        
        # Should have validation errors due to insufficient data
        assert result["is_valid"] is False
        assert len(result["errors"]) > 0

    def test_cross_validation_with_logistic_growth(self, session_with_data, basic_cv_config):
        """Test cross-validation with logistic growth configuration."""
        logistic_config = {
            "name": "Logistic Growth Test",
            "horizon": 30,
            "growth": "logistic",
            "cap": 300.0,  # Set carrying capacity
            "yearly_seasonality": True,
            "weekly_seasonality": False,
            "daily_seasonality": False
        }

        request_data = {
            "session_id": session_with_data,
            "config": basic_cv_config,
            "forecast_config": logistic_config
        }

        response = client.post("/api/cross-validation/execute", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

    def test_cross_validation_performance_metrics_calculation(self, session_with_data, basic_forecast_config, basic_cv_config):
        """Test that performance metrics are calculated correctly."""
        request_data = {
            "session_id": session_with_data,
            "config": basic_cv_config,
            "forecast_config": basic_forecast_config
        }

        response = client.post("/api/cross-validation/execute", json=request_data)
        
        assert response.status_code == 200
        result = response.json()
        
        metrics = result["metrics"]
        
        # Verify all required metrics are present and reasonable
        assert metrics["rmse"] > 0
        assert metrics["mae"] > 0
        assert 0 <= metrics["mape"] <= 100
        assert 0 <= metrics["coverage"] <= 100
        
        # RMSE should be >= MAE (mathematical property)
        assert metrics["rmse"] >= metrics["mae"]


if __name__ == "__main__":
    pytest.main([__file__])