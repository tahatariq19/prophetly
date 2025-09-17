"""Integration tests for complete forecasting workflow."""

import json

from fastapi.testclient import TestClient
import numpy as np
import pandas as pd
import pytest

from src.main import app
from src.models.prophet_config import ForecastConfig
from src.services.session_manager import session_manager

client = TestClient(app)


@pytest.fixture
def sample_time_series():
    """Create realistic time series data for integration testing."""
    # Create 2 years of daily data with trend, seasonality, and noise
    dates = pd.date_range(start='2022-01-01', end='2023-12-31', freq='D')

    # Base trend
    trend = 100 + 0.1 * np.arange(len(dates))

    # Yearly seasonality
    yearly = 20 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)

    # Weekly seasonality (stronger on weekends)
    weekly = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 7)

    # Random noise
    noise = np.random.normal(0, 5, len(dates))

    # Combine components
    values = trend + yearly + weekly + noise

    return pd.DataFrame({
        'ds': dates,
        'y': values
    })


class TestForecastingWorkflow:
    """Test complete forecasting workflow from data upload to results."""

    def test_complete_forecasting_workflow(self, sample_time_series):
        """Test the complete workflow: session -> data -> config -> forecast -> results."""
        # Step 1: Create session
        session_id = session_manager.create_session()
        assert session_id is not None

        # Step 2: Store data in session
        session_data = session_manager.get_session(session_id)
        session_data.store_dataframe("uploaded_data", sample_time_series)

        # Verify data was stored
        stored_data = session_data.get_dataframe("uploaded_data")
        assert stored_data is not None
        assert len(stored_data) == len(sample_time_series)

        # Step 3: Create forecast configuration
        config = ForecastConfig(
            name="Integration Test Forecast",
            horizon=30,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.8
        )

        # Step 4: Validate forecast request
        validate_request = {
            "session_id": session_id,
            "config": json.loads(config.to_json())
        }

        validate_response = client.post("/api/forecast/validate", json=validate_request)
        assert validate_response.status_code == 200

        validation_data = validate_response.json()
        assert validation_data["is_valid"] is True
        assert validation_data["data_points"] == len(sample_time_series)
        assert "estimated_processing_time_seconds" in validation_data
        assert "estimated_memory_mb" in validation_data

        # Step 5: Generate forecast
        forecast_request = {
            "session_id": session_id,
            "config": json.loads(config.to_json())
        }

        forecast_response = client.post("/api/forecast/generate", json=forecast_request)
        assert forecast_response.status_code == 200

        forecast_data = forecast_response.json()
        assert forecast_data["success"] is True
        assert "forecast_data" in forecast_data
        assert "components" in forecast_data
        assert "model_summary" in forecast_data
        assert "performance_metrics" in forecast_data

        # Step 6: Verify forecast results
        forecast_points = forecast_data["forecast_data"]
        assert len(forecast_points) == len(sample_time_series) + config.horizon

        # Check historical vs future points
        historical_points = [p for p in forecast_points if p["is_historical"]]
        future_points = [p for p in forecast_points if not p["is_historical"]]

        assert len(historical_points) == len(sample_time_series)
        assert len(future_points) == config.horizon

        # Verify confidence intervals
        for point in forecast_points:
            assert point["yhat_lower"] <= point["yhat"] <= point["yhat_upper"]

        # Step 7: Verify component decomposition
        components = forecast_data["components"]
        assert len(components) > 0

        # Should have trend component
        trend_components = [c for c in components if c.get("trend") is not None]
        assert len(trend_components) > 0

        # Should have seasonal components
        seasonal_components = [c for c in components if c.get("yearly") is not None or c.get("weekly") is not None]
        assert len(seasonal_components) > 0

        # Step 8: Verify model summary
        model_summary = forecast_data["model_summary"]
        assert model_summary["config_name"] == "Integration Test Forecast"
        assert model_summary["horizon"] == 30
        assert model_summary["growth"] == "linear"
        assert model_summary["data_points"] == len(sample_time_series)
        assert model_summary["forecast_points"] == len(forecast_points)

        # Step 9: Verify performance metrics
        performance_metrics = forecast_data["performance_metrics"]
        assert "mae" in performance_metrics
        assert "rmse" in performance_metrics
        assert "r2" in performance_metrics

        # Metrics should be reasonable (not NaN or infinite)
        for metric_name, metric_value in performance_metrics.items():
            if metric_value is not None:
                assert not np.isnan(metric_value)
                assert not np.isinf(metric_value)

        # Step 10: Verify session cleanup
        # The session should still exist but can be cleaned up
        assert session_manager.get_session(session_id) is not None

        # Clean up session
        session_manager.cleanup_session(session_id)
        assert session_manager.get_session(session_id) is None

    def test_logistic_growth_workflow(self, sample_time_series):
        """Test workflow with logistic growth configuration."""
        # Create session and store data
        session_id = session_manager.create_session()
        session_data = session_manager.get_session(session_id)
        session_data.store_dataframe("uploaded_data", sample_time_series)

        # Create logistic growth configuration
        config = ForecastConfig(
            name="Logistic Growth Test",
            horizon=60,
            growth="logistic",
            cap=200.0,  # Set carrying capacity
            floor=50.0,  # Set floor
            yearly_seasonality=True,
            weekly_seasonality=True,
            changepoint_prior_scale=0.1
        )

        # Generate forecast
        forecast_request = {
            "session_id": session_id,
            "config": json.loads(config.to_json())
        }

        forecast_response = client.post("/api/forecast/generate", json=forecast_request)
        assert forecast_response.status_code == 200

        forecast_data = forecast_response.json()
        assert forecast_data["success"] is True
        assert forecast_data["model_summary"]["growth"] == "logistic"

        # Verify predictions respect bounds (with some tolerance)
        forecast_points = forecast_data["forecast_data"]
        for point in forecast_points:
            assert point["yhat"] <= config.cap * 1.1  # Allow 10% tolerance
            assert point["yhat"] >= config.floor * 0.9

        # Clean up
        session_manager.cleanup_session(session_id)

    def test_advanced_configuration_workflow(self, sample_time_series):
        """Test workflow with advanced Prophet configuration."""
        # Create session and store data
        session_id = session_manager.create_session()
        session_data = session_manager.get_session(session_id)
        session_data.store_dataframe("uploaded_data", sample_time_series)

        # Create advanced configuration
        config = ForecastConfig(
            name="Advanced Configuration Test",
            horizon=45,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="multiplicative",
            changepoint_prior_scale=0.01,  # More conservative
            seasonality_prior_scale=1.0,
            mcmc_samples=200,  # Enable uncertainty sampling
            interval_width=0.9  # Wider confidence intervals
        )

        # Generate forecast
        forecast_request = {
            "session_id": session_id,
            "config": json.loads(config.to_json())
        }

        forecast_response = client.post("/api/forecast/generate", json=forecast_request)
        assert forecast_response.status_code == 200

        forecast_data = forecast_response.json()
        assert forecast_data["success"] is True
        assert forecast_data["model_summary"]["mcmc_samples"] == 200

        # With MCMC sampling, should have good uncertainty estimates
        forecast_points = forecast_data["forecast_data"]
        future_points = [p for p in forecast_points if not p["is_historical"]]

        # Check that confidence intervals are reasonable
        for point in future_points:
            interval_width = point["yhat_upper"] - point["yhat_lower"]
            assert interval_width > 0  # Should have non-zero uncertainty

        # Clean up
        session_manager.cleanup_session(session_id)

    def test_error_handling_workflow(self):
        """Test error handling in the forecasting workflow."""
        # Test with invalid session
        invalid_request = {
            "session_id": "nonexistent_session",
            "config": {
                "horizon": 30,
                "growth": "linear",
                "yearly_seasonality": True,
                "weekly_seasonality": True,
                "daily_seasonality": False,
                "interval_width": 0.8,
                "seasonality_mode": "additive",
                "changepoint_prior_scale": 0.05,
                "seasonality_prior_scale": 10.0,
                "n_changepoints": 25,
                "changepoint_range": 0.8,
                "holidays_prior_scale": 10.0,
                "mcmc_samples": 0,
                "uncertainty_samples": 1000,
                "custom_seasonalities": [],
                "regressors": [],
                "created_at": "2023-01-01T00:00:00",
                "name": "Test Config"
            }
        }

        response = client.post("/api/forecast/generate", json=invalid_request)
        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

        # Test validation with invalid session
        validate_response = client.post("/api/forecast/validate", json=invalid_request)
        assert validate_response.status_code == 200
        validation_data = validate_response.json()
        assert validation_data["is_valid"] is False
        assert "Session not found" in validation_data["errors"][0]

    def test_memory_management_workflow(self, sample_time_series):
        """Test that memory is properly managed during forecasting."""
        import os

        import psutil

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        # Create multiple sessions and forecasts
        session_ids = []
        for i in range(3):
            session_id = session_manager.create_session()
            session_ids.append(session_id)

            session_data = session_manager.get_session(session_id)
            session_data.store_dataframe("uploaded_data", sample_time_series)

            config = ForecastConfig(
                name=f"Memory Test {i}",
                horizon=30,
                growth="linear",
                yearly_seasonality=True,
                weekly_seasonality=True
            )

            forecast_request = {
                "session_id": session_id,
                "config": json.loads(config.to_json())
            }

            response = client.post("/api/forecast/generate", json=forecast_request)
            assert response.status_code == 200

        # Clean up all sessions
        for session_id in session_ids:
            session_manager.cleanup_session(session_id)

        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (less than 200MB for 3 forecasts)
        assert memory_increase < 200 * 1024 * 1024


@pytest.fixture(autouse=True)
def cleanup_sessions():
    """Clean up sessions after each test."""
    yield
    # Clean up all sessions
    session_manager.sessions.clear()
