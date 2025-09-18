"""Tests for model comparison API endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from src.main import app
from src.models.prophet_config import ForecastConfig
from src.models.cross_validation import CrossValidationMetrics


class TestModelComparisonAPI:
    """Test cases for model comparison API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)
        self.session_id = "test_session_123"

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_store_model_result(self, mock_service, mock_session_manager):
        """Test storing a model result via API."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service
        mock_service.store_model_result.return_value = "model_123"

        # Test data
        config = ForecastConfig(name="Test Model", horizon=30)
        
        response = self.client.post(
            "/api/model-comparison/store-result",
            params={
                "session_id": self.session_id,
                "model_name": "Test Model 1",
                "config_json": config.to_json(),
                "processing_time_seconds": 10.5,
                "data_points": 100
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "model_id" in data
        assert data["model_id"] == "model_123"

        # Verify service was called
        mock_service.store_model_result.assert_called_once()

    @patch('src.api.model_comparison.session_manager')
    def test_store_model_result_invalid_session(self, mock_session_manager):
        """Test storing model result with invalid session."""
        # Mock session not found
        mock_session_manager.get_session.return_value = None

        response = self.client.post(
            "/api/model-comparison/store-result",
            params={
                "session_id": "invalid_session",
                "model_name": "Test Model"
            }
        )

        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_get_session_models(self, mock_service, mock_session_manager):
        """Test retrieving session models via API."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service response
        from src.models.model_comparison import ModelResult
        config = ForecastConfig(name="Test Model", horizon=30)
        cv_metrics = CrossValidationMetrics(rmse=10.0, mae=8.0, mape=5.0, mdape=4.5, smape=5.2, coverage=85.0)
        
        mock_model = ModelResult(
            model_id="model_123",
            name="Test Model",
            config=config,
            cv_metrics=cv_metrics,
            processing_time_seconds=10.5,
            data_points=100
        )
        mock_service.get_session_models.return_value = [mock_model]

        response = self.client.get(f"/api/model-comparison/session/{self.session_id}/models")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        
        model_summary = data[0]
        assert model_summary["model_id"] == "model_123"
        assert model_summary["name"] == "Test Model"
        assert model_summary["processing_time_seconds"] == 10.5
        assert model_summary["data_points"] == 100
        assert model_summary["has_cv_metrics"] is True
        assert "config_summary" in model_summary

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_compare_models(self, mock_service, mock_session_manager):
        """Test model comparison via API."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service response
        from src.models.model_comparison import (
            ModelComparisonResult,
            ParameterComparison,
            PerformanceComparison
        )
        
        mock_result = ModelComparisonResult(
            success=True,
            message="Comparison completed successfully",
            models=[],
            comparison_count=2,
            parameter_differences=[
                ParameterComparison(
                    parameter_name="growth",
                    model_values={"model1": "linear", "model2": "logistic"},
                    is_different=True,
                    parameter_type="trend"
                )
            ],
            parameters_identical=False,
            performance_comparison=[
                PerformanceComparison(
                    metric_name="rmse",
                    model_values={"model1": 10.0, "model2": 12.0},
                    best_model_id="model1",
                    worst_model_id="model2",
                    improvement_pct=16.67
                )
            ],
            best_overall_model_id="model1",
            processing_time_seconds=2.5
        )
        mock_service.compare_models.return_value = mock_result

        # Test request
        request_data = {
            "session_id": self.session_id,
            "model_ids": ["model1", "model2"],
            "include_parameters": True,
            "include_performance": True,
            "include_forecasts": False
        }

        response = self.client.post("/api/model-comparison/compare", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["comparison_count"] == 2
        assert data["parameters_identical"] is False
        assert len(data["parameter_differences"]) == 1
        assert len(data["performance_comparison"]) == 1
        assert data["best_overall_model_id"] == "model1"

    @patch('src.api.model_comparison.session_manager')
    def test_compare_models_invalid_session(self, mock_session_manager):
        """Test model comparison with invalid session."""
        # Mock session not found
        mock_session_manager.get_session.return_value = None

        request_data = {
            "session_id": "invalid_session",
            "model_ids": ["model1", "model2"]
        }

        response = self.client.post("/api/model-comparison/compare", json=request_data)

        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

    def test_compare_models_insufficient_models(self):
        """Test model comparison with insufficient models."""
        request_data = {
            "session_id": self.session_id,
            "model_ids": ["model1"]  # Only one model
        }

        response = self.client.post("/api/model-comparison/compare", json=request_data)

        assert response.status_code == 422  # Pydantic validation error
        assert "at least 2 items" in response.json()["detail"][0]["msg"].lower()

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_get_comparison_summary(self, mock_service, mock_session_manager):
        """Test getting comparison summary via API."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service responses
        from src.models.model_comparison import (
            ModelComparisonResult,
            ModelComparisonSummary
        )
        
        mock_comparison_result = ModelComparisonResult(
            success=True,
            message="Comparison completed",
            models=[],
            comparison_count=2,
            processing_time_seconds=2.0
        )
        
        mock_summary = ModelComparisonSummary(
            total_models=2,
            key_differences=["growth varies across models"],
            performance_winner="Linear Model",
            recommendation="Best performing model: Linear Model",
            parameter_differences_count=3,
            performance_metrics_count=4
        )

        mock_service.compare_models.return_value = mock_comparison_result
        mock_service.get_comparison_summary.return_value = mock_summary

        # Test request
        request_data = {
            "session_id": self.session_id,
            "model_ids": ["model1", "model2"]
        }

        response = self.client.post("/api/model-comparison/compare/summary", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["total_models"] == 2
        assert "growth varies across models" in data["key_differences"]
        assert data["performance_winner"] == "Linear Model"
        assert data["parameter_differences_count"] == 3
        assert data["performance_metrics_count"] == 4

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_get_model_details(self, mock_service, mock_session_manager):
        """Test getting model details via API."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service response
        from src.models.model_comparison import ModelResult
        config = ForecastConfig(name="Test Model", horizon=30, growth="linear")
        cv_metrics = CrossValidationMetrics(rmse=10.0, mae=8.0, mape=5.0, mdape=4.5, smape=5.2, coverage=85.0)
        
        mock_model = ModelResult(
            model_id="model_123",
            name="Test Model",
            config=config,
            cv_metrics=cv_metrics,
            processing_time_seconds=10.5,
            data_points=100,
            forecast_data={
                'ds': ['2023-01-01', '2023-01-02'],
                'yhat': [10.0, 11.0]
            }
        )
        mock_service.get_model_by_id.return_value = mock_model

        response = self.client.get(f"/api/model-comparison/session/{self.session_id}/model/model_123")

        assert response.status_code == 200
        data = response.json()
        assert data["model_id"] == "model_123"
        assert data["name"] == "Test Model"
        assert data["processing_time_seconds"] == 10.5
        assert data["data_points"] == 100
        assert data["has_forecast_data"] is True
        assert "config" in data
        assert "cv_metrics" in data
        assert "forecast_summary" in data

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_get_model_details_not_found(self, mock_service, mock_session_manager):
        """Test getting details for non-existent model."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service response - model not found
        mock_service.get_model_by_id.return_value = None

        response = self.client.get(f"/api/model-comparison/session/{self.session_id}/model/invalid_model")

        assert response.status_code == 404
        assert "not found in session" in response.json()["detail"]

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_cleanup_session_models(self, mock_service, mock_session_manager):
        """Test cleaning up session models via API."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service responses
        from src.models.model_comparison import ModelResult
        config = ForecastConfig(name="Test Model", horizon=30)
        mock_models = [
            ModelResult(model_id="model1", name="Model 1", config=config),
            ModelResult(model_id="model2", name="Model 2", config=config)
        ]
        mock_service.get_session_models.return_value = mock_models
        mock_service.cleanup_session_models.return_value = True

        response = self.client.delete(f"/api/model-comparison/session/{self.session_id}/models")

        assert response.status_code == 200
        data = response.json()
        assert "Cleaned up 2 models successfully" in data["message"]

        # Verify service was called
        mock_service.cleanup_session_models.assert_called_once_with(self.session_id)

    @patch('src.api.model_comparison.session_manager')
    def test_cleanup_session_models_invalid_session(self, mock_session_manager):
        """Test cleanup with invalid session."""
        # Mock session not found
        mock_session_manager.get_session.return_value = None

        response = self.client.delete(f"/api/model-comparison/session/invalid_session/models")

        assert response.status_code == 404
        assert "Session not found" in response.json()["detail"]

    def test_store_model_result_invalid_config_json(self):
        """Test storing model result with invalid config JSON."""
        with patch('src.api.model_comparison.session_manager') as mock_session_manager:
            # Mock session manager
            mock_session_data = Mock()
            mock_session_manager.get_session.return_value = mock_session_data

            response = self.client.post(
                "/api/model-comparison/store-result",
                params={
                    "session_id": self.session_id,
                    "model_name": "Test Model",
                    "config_json": "invalid json"
                }
            )

            assert response.status_code == 400
            assert "Invalid configuration JSON" in response.json()["detail"]

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_compare_models_service_failure(self, mock_service, mock_session_manager):
        """Test model comparison when service returns failure."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service failure
        from src.models.model_comparison import ModelComparisonResult
        mock_result = ModelComparisonResult(
            success=False,
            message="Model not found in session",
            models=[],
            comparison_count=0,
            processing_time_seconds=0.1
        )
        mock_service.compare_models.return_value = mock_result

        request_data = {
            "session_id": self.session_id,
            "model_ids": ["model1", "invalid_model"]
        }

        response = self.client.post("/api/model-comparison/compare", json=request_data)

        assert response.status_code == 400
        assert "Model not found in session" in response.json()["detail"]

    @patch('src.api.model_comparison.session_manager')
    @patch('src.api.model_comparison.model_comparison_service')
    def test_api_error_handling(self, mock_service, mock_session_manager):
        """Test API error handling for service exceptions."""
        # Mock session manager
        mock_session_data = Mock()
        mock_session_manager.get_session.return_value = mock_session_data

        # Mock service exception
        mock_service.compare_models.side_effect = Exception("Service error")

        request_data = {
            "session_id": self.session_id,
            "model_ids": ["model1", "model2"]
        }

        response = self.client.post("/api/model-comparison/compare", json=request_data)

        assert response.status_code == 500
        assert "Model comparison failed" in response.json()["detail"]