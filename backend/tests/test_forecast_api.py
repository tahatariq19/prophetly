"""Tests for Prophet forecasting API endpoints."""

import json
from unittest.mock import patch

from fastapi.testclient import TestClient
import pandas as pd
import pytest

from src.main import app
from src.models.prophet_config import ForecastConfig
from src.services.session_manager import session_manager

client = TestClient(app)


@pytest.fixture
def sample_data():
    """Create sample time series data for testing."""
    import numpy as np

    dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
    values = 100 + 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25) + np.random.normal(0, 5, len(dates))

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
def basic_config():
    """Create a basic forecast configuration."""
    return ForecastConfig(
        name="Test Forecast",
        horizon=30,
        growth="linear",
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False
    )


@pytest.fixture
def advanced_config():
    """Create an advanced forecast configuration."""
    return ForecastConfig(
        name="Advanced Test Forecast",
        horizon=60,
        growth="logistic",
        cap=200.0,
        floor=50.0,
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.1,
        seasonality_prior_scale=1.0,
        mcmc_samples=100
    )


class TestForecastGeneration:
    """Test forecast generation endpoint."""

    def test_generate_basic_forecast(self, session_with_data, basic_config):
        """Test basic forecast generation."""
        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "message" in data
        assert len(data["forecast_data"]) > 0
        assert len(data["components"]) > 0

        # Check forecast data structure
        forecast_point = data["forecast_data"][0]
        assert "ds" in forecast_point
        assert "yhat" in forecast_point
        assert "yhat_lower" in forecast_point
        assert "yhat_upper" in forecast_point
        assert "is_historical" in forecast_point

        # Check component data structure
        component_point = data["components"][0]
        assert "ds" in component_point
        assert "trend" in component_point

        # Check model summary
        assert "model_summary" in data
        assert data["model_summary"]["horizon"] == 30
        assert data["model_summary"]["growth"] == "linear"

        # Check performance metrics
        assert "performance_metrics" in data
        assert "mae" in data["performance_metrics"]
        assert "rmse" in data["performance_metrics"]

    def test_generate_advanced_forecast(self, session_with_data, advanced_config):
        """Test advanced forecast generation with logistic growth."""
        request_data = {
            "session_id": session_with_data,
            "config": json.loads(advanced_config.to_json())
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["model_summary"]["growth"] == "logistic"
        assert data["model_summary"]["horizon"] == 60
        assert data["model_summary"]["mcmc_samples"] == 100

    def test_generate_forecast_invalid_session(self, basic_config):
        """Test forecast generation with invalid session."""
        request_data = {
            "session_id": "invalid_session",
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

    def test_generate_forecast_invalid_config(self, session_with_data):
        """Test forecast generation with invalid configuration."""
        invalid_config = {
            "horizon": -10,  # Invalid negative horizon
            "growth": "invalid_growth"  # Invalid growth mode
        }

        request_data = {
            "session_id": session_with_data,
            "config": invalid_config
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 422  # Validation error

    def test_generate_forecast_logistic_without_cap(self, session_with_data):
        """Test forecast generation with logistic growth but no cap."""
        # Create invalid config directly as dict to bypass Pydantic validation
        invalid_config = {
            "horizon": 30,
            "growth": "logistic",
            "interval_width": 0.8,
            "yearly_seasonality": "auto",
            "weekly_seasonality": "auto",
            "daily_seasonality": "auto",
            "seasonality_mode": "additive",
            "seasonality_prior_scale": 10.0,
            "changepoint_prior_scale": 0.05,
            "n_changepoints": 25,
            "changepoint_range": 0.8,
            "holidays_prior_scale": 10.0,
            "mcmc_samples": 0,
            "uncertainty_samples": 1000,
            "custom_seasonalities": [],
            "regressors": [],
            "created_at": "2023-01-01T00:00:00",
            "name": "Test Config"
            # Missing cap parameter for logistic growth
        }

        request_data = {
            "session_id": session_with_data,
            "config": invalid_config
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 422  # Pydantic validation error
        # The error should be about missing cap for logistic growth

    def test_generate_forecast_with_dataset_name(self, session_with_data, basic_config, sample_data):
        """Test forecast generation with specific dataset name."""
        # Add another dataset to the session
        session_data = session_manager.get_session(session_with_data)
        session_data.store_dataframe("second_dataset", sample_data)

        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json()),
            "dataset_name": "second_dataset"
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_generate_forecast_nonexistent_dataset(self, session_with_data, basic_config):
        """Test forecast generation with nonexistent dataset name."""
        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json()),
            "dataset_name": "nonexistent_dataset"
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 404
        assert "Dataset" in response.json()["detail"]


class TestForecastValidation:
    """Test forecast validation endpoint."""

    def test_validate_forecast_request(self, session_with_data, basic_config):
        """Test forecast request validation."""
        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/validate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert "is_valid" in data
        assert "errors" in data
        assert "warnings" in data
        assert "recommendations" in data
        assert "data_points" in data
        assert "estimated_processing_time_seconds" in data
        assert "estimated_memory_mb" in data

    def test_validate_forecast_invalid_session(self, basic_config):
        """Test validation with invalid session."""
        request_data = {
            "session_id": "invalid_session",
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/validate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is False
        assert "Session not found" in data["errors"][0]

    def test_validate_forecast_insufficient_data(self, basic_config):
        """Test validation with insufficient data."""
        # Create session with minimal data
        session_id = session_manager.create_session()
        minimal_data = pd.DataFrame({
            'ds': pd.date_range(start='2023-01-01', periods=5, freq='D'),
            'y': [1, 2, 3, 4, 5]
        })
        session_data = session_manager.get_session(session_id)
        session_data.store_dataframe("uploaded_data", minimal_data)

        # Request forecast with large horizon
        config = ForecastConfig(horizon=100)  # Much larger than data

        request_data = {
            "session_id": session_id,
            "config": json.loads(config.to_json())
        }

        response = client.post("/api/forecast/validate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        # Should have warnings about limited data
        assert len(data["warnings"]) > 0
        assert any("Limited historical data" in warning for warning in data["warnings"])


class TestForecastComponents:
    """Test forecast component extraction."""

    def test_forecast_includes_components(self, session_with_data, basic_config):
        """Test that forecast includes component decomposition."""
        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert len(data["components"]) > 0

        # Check that components have expected fields
        component = data["components"][0]
        assert "ds" in component
        assert "trend" in component

        # Should have seasonal components for yearly/weekly seasonality
        components_with_seasonal = [c for c in data["components"] if c.get("yearly") is not None]
        assert len(components_with_seasonal) > 0

    def test_forecast_confidence_intervals(self, session_with_data, basic_config):
        """Test that forecast includes proper confidence intervals."""
        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        # Check confidence intervals
        for point in data["forecast_data"]:
            assert point["yhat_lower"] <= point["yhat"]
            assert point["yhat"] <= point["yhat_upper"]

    def test_forecast_historical_vs_future(self, session_with_data, basic_config):
        """Test that forecast correctly identifies historical vs future points."""
        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()

        historical_points = [p for p in data["forecast_data"] if p["is_historical"]]
        future_points = [p for p in data["forecast_data"] if not p["is_historical"]]

        # Should have both historical and future points
        assert len(historical_points) > 0
        assert len(future_points) > 0
        assert len(future_points) == basic_config.horizon

        # Historical points should have actual values
        for point in historical_points:
            assert point["y"] is not None

        # Future points should not have actual values
        for point in future_points:
            assert point["y"] is None


class TestForecastPerformance:
    """Test forecast performance and memory management."""

    def test_forecast_memory_cleanup(self, session_with_data, basic_config):
        """Test that forecast generation cleans up memory properly."""
        import os

        import psutil

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json())
        }

        # Generate multiple forecasts
        for _ in range(3):
            response = client.post("/api/forecast/generate", json=request_data)
            assert response.status_code == 200

        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100 * 1024 * 1024

    @patch('src.services.prophet_service.Prophet')
    def test_forecast_error_handling(self, mock_prophet, session_with_data, basic_config):
        """Test error handling during forecast generation."""
        # Mock Prophet to raise an exception
        mock_prophet.side_effect = Exception("Prophet fitting failed")

        request_data = {
            "session_id": session_with_data,
            "config": json.loads(basic_config.to_json())
        }

        response = client.post("/api/forecast/generate", json=request_data)

        assert response.status_code == 500
        assert "failed" in response.json()["detail"].lower()


class TestForecastEstimation:
    """Test forecast time and memory estimation."""

    def test_processing_time_estimation(self, session_with_data, basic_config):
        """Test processing time estimation."""
        from src.api.forecast import _estimate_processing_time

        # Test with different configurations
        basic_time = _estimate_processing_time(1000, basic_config)
        assert basic_time > 0

        # MCMC should increase time
        mcmc_config = ForecastConfig(horizon=30, mcmc_samples=500)
        mcmc_time = _estimate_processing_time(1000, mcmc_config)
        assert mcmc_time > basic_time

    def test_memory_usage_estimation(self, session_with_data, basic_config):
        """Test memory usage estimation."""
        from src.api.forecast import _estimate_memory_usage

        # Test with different configurations
        basic_memory = _estimate_memory_usage(1000, basic_config)
        assert basic_memory > 0

        # MCMC should increase memory
        mcmc_config = ForecastConfig(horizon=30, mcmc_samples=500)
        mcmc_memory = _estimate_memory_usage(1000, mcmc_config)
        assert mcmc_memory > basic_memory


@pytest.fixture(autouse=True)
def cleanup_sessions():
    """Clean up sessions after each test."""
    yield
    # Clean up all sessions
    session_manager.sessions.clear()
