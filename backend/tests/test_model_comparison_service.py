"""Tests for model comparison service."""

import pytest
from datetime import datetime
from unittest.mock import Mock

from src.models.model_comparison import (
    ModelComparisonRequest,
    ModelResult,
    SessionModelStorage
)
from src.models.prophet_config import ForecastConfig
from src.models.cross_validation import CrossValidationMetrics
from src.services.model_comparison_service import ModelComparisonService


class TestModelComparisonService:
    """Test cases for ModelComparisonService."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = ModelComparisonService()
        self.session_id = "test_session_123"

    def test_store_model_result(self):
        """Test storing a model result."""
        # Create test configuration
        config = ForecastConfig(
            name="Test Model",
            horizon=30,
            growth="linear",
            yearly_seasonality=True
        )

        # Store model result
        model_id = self.service.store_model_result(
            session_id=self.session_id,
            name="Test Model 1",
            config=config,
            processing_time_seconds=10.5,
            data_points=100
        )

        # Verify storage
        assert model_id is not None
        assert self.session_id in self.service.session_storage
        
        stored_model = self.service.get_model_by_id(self.session_id, model_id)
        assert stored_model is not None
        assert stored_model.name == "Test Model 1"
        assert stored_model.config.name == "Test Model"
        assert stored_model.processing_time_seconds == 10.5
        assert stored_model.data_points == 100

    def test_get_session_models(self):
        """Test retrieving all models for a session."""
        # Store multiple models
        config1 = ForecastConfig(name="Model 1", horizon=30)
        config2 = ForecastConfig(name="Model 2", horizon=60)

        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            name="Test Model 1",
            config=config1
        )
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            name="Test Model 2",
            config=config2
        )

        # Retrieve all models
        models = self.service.get_session_models(self.session_id)
        
        assert len(models) == 2
        model_ids = [m.model_id for m in models]
        assert model_id1 in model_ids
        assert model_id2 in model_ids

    def test_compare_models_parameters(self):
        """Test parameter comparison between models."""
        # Create models with different parameters
        config1 = ForecastConfig(
            name="Linear Model",
            horizon=30,
            growth="linear",
            yearly_seasonality=True,
            changepoint_prior_scale=0.05
        )
        config2 = ForecastConfig(
            name="Logistic Model",
            horizon=30,
            growth="logistic",
            cap=1000.0,
            yearly_seasonality=True,
            changepoint_prior_scale=0.1
        )

        # Store models
        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            name="Model 1",
            config=config1
        )
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            name="Model 2",
            config=config2
        )

        # Compare models
        request = ModelComparisonRequest(
            session_id=self.session_id,
            model_ids=[model_id1, model_id2],
            include_parameters=True,
            include_performance=False
        )

        result = self.service.compare_models(request)

        # Verify comparison results
        assert result.success is True
        assert result.comparison_count == 2
        assert result.parameters_identical is False
        
        # Check specific parameter differences
        param_diffs = {diff.parameter_name: diff for diff in result.parameter_differences}
        
        # Growth should be different
        assert "growth" in param_diffs
        assert param_diffs["growth"].is_different is True
        assert param_diffs["growth"].model_values[model_id1] == "linear"
        assert param_diffs["growth"].model_values[model_id2] == "logistic"
        
        # Changepoint prior scale should be different
        assert "changepoint_prior_scale" in param_diffs
        assert param_diffs["changepoint_prior_scale"].is_different is True
        
        # Yearly seasonality should be the same
        assert "yearly_seasonality" in param_diffs
        assert param_diffs["yearly_seasonality"].is_different is False

    def test_compare_models_performance(self):
        """Test performance comparison between models."""
        # Create models with performance metrics
        cv_metrics1 = CrossValidationMetrics(
            rmse=10.5,
            mae=8.2,
            mape=5.1,
            mdape=4.8,
            smape=5.3,
            coverage=85.0
        )
        cv_metrics2 = CrossValidationMetrics(
            rmse=12.3,
            mae=9.1,
            mape=6.2,
            mdape=5.9,
            smape=6.5,
            coverage=82.0
        )

        config1 = ForecastConfig(name="Model 1", horizon=30)
        config2 = ForecastConfig(name="Model 2", horizon=30)

        # Store models with metrics
        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            name="Model 1",
            config=config1,
            cv_metrics=cv_metrics1
        )
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            name="Model 2",
            config=config2,
            cv_metrics=cv_metrics2
        )

        # Compare performance
        request = ModelComparisonRequest(
            session_id=self.session_id,
            model_ids=[model_id1, model_id2],
            include_parameters=False,
            include_performance=True
        )

        result = self.service.compare_models(request)

        # Verify performance comparison
        assert result.success is True
        assert len(result.performance_comparison) > 0
        
        # Check RMSE comparison (lower is better)
        rmse_comparison = next(
            (comp for comp in result.performance_comparison if comp.metric_name == "rmse"),
            None
        )
        assert rmse_comparison is not None
        assert rmse_comparison.best_model_id == model_id1  # Lower RMSE
        assert rmse_comparison.worst_model_id == model_id2
        assert rmse_comparison.improvement_pct > 0

    def test_get_comparison_summary(self):
        """Test generating comparison summary."""
        # Create test models
        config1 = ForecastConfig(name="Model 1", horizon=30, growth="linear")
        config2 = ForecastConfig(name="Model 2", horizon=30, growth="logistic", cap=1000.0)

        cv_metrics1 = CrossValidationMetrics(rmse=10.0, mae=8.0, mape=5.0, mdape=4.5, smape=5.2, coverage=85.0)
        cv_metrics2 = CrossValidationMetrics(rmse=12.0, mae=9.0, mape=6.0, mdape=5.8, smape=6.3, coverage=82.0)

        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            name="Linear Model",
            config=config1,
            cv_metrics=cv_metrics1
        )
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            name="Logistic Model",
            config=config2,
            cv_metrics=cv_metrics2
        )

        # Get comparison result
        request = ModelComparisonRequest(
            session_id=self.session_id,
            model_ids=[model_id1, model_id2],
            include_parameters=True,
            include_performance=True
        )

        comparison_result = self.service.compare_models(request)
        summary = self.service.get_comparison_summary(comparison_result)

        # Verify summary
        assert summary.total_models == 2
        assert len(summary.key_differences) > 0
        assert summary.performance_winner is not None
        assert summary.parameter_differences_count > 0
        assert summary.performance_metrics_count > 0
        assert "growth varies across models" in summary.key_differences

    def test_cleanup_session_models(self):
        """Test cleaning up session models."""
        # Store test models
        config = ForecastConfig(name="Test Model", horizon=30)
        
        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            config=config
        )
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            config=config
        )

        # Verify models are stored
        models = self.service.get_session_models(self.session_id)
        assert len(models) == 2

        # Cleanup session
        success = self.service.cleanup_session_models(self.session_id)
        assert success is True

        # Verify cleanup
        assert self.session_id not in self.service.session_storage
        models_after_cleanup = self.service.get_session_models(self.session_id)
        assert len(models_after_cleanup) == 0

    def test_compare_models_invalid_session(self):
        """Test comparison with invalid session."""
        request = ModelComparisonRequest(
            session_id="invalid_session",
            model_ids=["model1", "model2"]
        )

        result = self.service.compare_models(request)
        assert result.success is False
        assert "Session not found" in result.message

    def test_compare_models_invalid_model_id(self):
        """Test comparison with invalid model ID."""
        # Store one valid model
        config = ForecastConfig(name="Test Model", horizon=30)
        valid_model_id = self.service.store_model_result(
            session_id=self.session_id,
            config=config
        )

        # Try to compare with invalid model ID
        request = ModelComparisonRequest(
            session_id=self.session_id,
            model_ids=[valid_model_id, "invalid_model_id"]
        )

        result = self.service.compare_models(request)
        assert result.success is False
        assert "not found in session" in result.message

    def test_dataframe_to_dict_conversion(self):
        """Test DataFrame to dictionary conversion."""
        import pandas as pd
        
        # Create test DataFrame
        df = pd.DataFrame({
            'ds': pd.date_range('2023-01-01', periods=3),
            'yhat': [10.0, 11.0, 12.0],
            'yhat_lower': [9.0, 10.0, 11.0],
            'yhat_upper': [11.0, 12.0, 13.0]
        })

        # Convert to dict
        result_dict = self.service._dataframe_to_dict(df)

        # Verify conversion
        assert 'ds' in result_dict
        assert 'yhat' in result_dict
        assert len(result_dict['yhat']) == 3
        assert result_dict['yhat'] == [10.0, 11.0, 12.0]
        
        # Check datetime conversion
        assert isinstance(result_dict['ds'][0], str)
        assert '2023-01-01' in result_dict['ds'][0]

    def test_parameter_type_categorization(self):
        """Test parameter type categorization."""
        assert self.service._get_parameter_type('yearly_seasonality') == 'seasonality'
        assert self.service._get_parameter_type('growth') == 'trend'
        assert self.service._get_parameter_type('holidays_prior_scale') == 'holidays'
        assert self.service._get_parameter_type('mcmc_samples') == 'uncertainty'
        assert self.service._get_parameter_type('regressors') == 'regressors'
        assert self.service._get_parameter_type('horizon') == 'basic'

    def test_determine_best_model(self):
        """Test determining the best model from performance comparisons."""
        from src.models.model_comparison import PerformanceComparison
        
        # Create performance comparisons
        comparisons = [
            PerformanceComparison(
                metric_name="rmse",
                model_values={"model1": 10.0, "model2": 12.0},
                best_model_id="model1",
                worst_model_id="model2"
            ),
            PerformanceComparison(
                metric_name="mae",
                model_values={"model1": 8.0, "model2": 9.0},
                best_model_id="model1",
                worst_model_id="model2"
            ),
            PerformanceComparison(
                metric_name="coverage",
                model_values={"model1": 85.0, "model2": 90.0},
                best_model_id="model2",
                worst_model_id="model1"
            )
        ]

        best_model_id = self.service._determine_best_model(comparisons)
        
        # model1 wins 2 out of 3 metrics
        assert best_model_id == "model1"

    def test_session_model_storage(self):
        """Test SessionModelStorage functionality."""
        storage = SessionModelStorage(session_id=self.session_id)
        
        # Create test model
        config = ForecastConfig(name="Test Model", horizon=30)
        model = ModelResult(
            model_id="test_model_1",
            name="Test Model",
            config=config
        )

        # Test add model
        storage.add_model(model)
        assert storage.get_model_count() == 1
        assert "test_model_1" in storage.get_model_ids()

        # Test get model
        retrieved_model = storage.get_model("test_model_1")
        assert retrieved_model is not None
        assert retrieved_model.name == "Test Model"

        # Test remove model
        success = storage.remove_model("test_model_1")
        assert success is True
        assert storage.get_model_count() == 0

        # Test remove non-existent model
        success = storage.remove_model("non_existent")
        assert success is False

    def test_forecast_comparison(self):
        """Test forecast data comparison."""
        # Create models with forecast data
        config1 = ForecastConfig(name="Model 1", horizon=30)
        config2 = ForecastConfig(name="Model 2", horizon=30)

        # Mock forecast data
        forecast_data1 = {
            'ds': ['2023-01-01', '2023-01-02', '2023-01-03'],
            'yhat': [10.0, 11.0, 12.0],
            'yhat_lower': [9.0, 10.0, 11.0],
            'yhat_upper': [11.0, 12.0, 13.0]
        }
        forecast_data2 = {
            'ds': ['2023-01-01', '2023-01-02', '2023-01-03'],
            'yhat': [10.5, 11.5, 12.5],
            'yhat_lower': [9.5, 10.5, 11.5],
            'yhat_upper': [11.5, 12.5, 13.5]
        }

        # Create model results with forecast data
        model1 = ModelResult(
            model_id="model1",
            name="Model 1",
            config=config1,
            forecast_data=forecast_data1
        )
        model2 = ModelResult(
            model_id="model2",
            name="Model 2",
            config=config2,
            forecast_data=forecast_data2
        )

        # Test forecast comparison
        forecast_comparison = self.service._compare_forecasts([model1, model2])
        
        assert forecast_comparison is not None
        assert forecast_comparison['models_with_forecasts'] == 2
        assert 'model1' in forecast_comparison['forecast_periods']
        assert 'model2' in forecast_comparison['forecast_periods']
        assert forecast_comparison['forecast_periods']['model1'] == 3
        assert forecast_comparison['forecast_periods']['model2'] == 3