"""Integration tests for model comparison functionality."""

import pytest
from datetime import datetime

from src.models.model_comparison import ModelComparisonRequest
from src.models.prophet_config import ForecastConfig
from src.models.cross_validation import CrossValidationMetrics
from src.services.model_comparison_service import ModelComparisonService


class TestModelComparisonIntegration:
    """Integration tests for complete model comparison workflow."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = ModelComparisonService()
        self.session_id = "integration_test_session"

    def test_complete_model_comparison_workflow(self):
        """Test the complete workflow from storing models to comparison."""
        
        # Step 1: Store multiple models with different configurations
        config1 = ForecastConfig(
            name="Linear Growth Model",
            horizon=30,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=True,
            changepoint_prior_scale=0.05
        )
        
        config2 = ForecastConfig(
            name="Logistic Growth Model", 
            horizon=30,
            growth="logistic",
            cap=1000.0,
            yearly_seasonality=True,
            weekly_seasonality=True,
            changepoint_prior_scale=0.1
        )
        
        config3 = ForecastConfig(
            name="Conservative Model",
            horizon=30,
            growth="linear",
            yearly_seasonality=False,
            weekly_seasonality=True,
            changepoint_prior_scale=0.01
        )

        # Create performance metrics for each model
        cv_metrics1 = CrossValidationMetrics(
            rmse=10.5, mae=8.2, mape=5.1, mdape=4.8, smape=5.3, coverage=85.0
        )
        cv_metrics2 = CrossValidationMetrics(
            rmse=12.3, mae=9.1, mape=6.2, mdape=5.9, smape=6.5, coverage=82.0
        )
        cv_metrics3 = CrossValidationMetrics(
            rmse=9.8, mae=7.9, mape=4.9, mdape=4.6, smape=5.1, coverage=87.0
        )

        # Store models
        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            name="Linear Growth Model",
            config=config1,
            cv_metrics=cv_metrics1,
            processing_time_seconds=15.2,
            data_points=365
        )
        
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            name="Logistic Growth Model",
            config=config2,
            cv_metrics=cv_metrics2,
            processing_time_seconds=18.7,
            data_points=365
        )
        
        model_id3 = self.service.store_model_result(
            session_id=self.session_id,
            name="Conservative Model",
            config=config3,
            cv_metrics=cv_metrics3,
            processing_time_seconds=12.1,
            data_points=365
        )

        # Step 2: Verify models are stored
        stored_models = self.service.get_session_models(self.session_id)
        assert len(stored_models) == 3
        
        stored_ids = [model.model_id for model in stored_models]
        assert model_id1 in stored_ids
        assert model_id2 in stored_ids
        assert model_id3 in stored_ids

        # Step 3: Compare all models
        comparison_request = ModelComparisonRequest(
            session_id=self.session_id,
            model_ids=[model_id1, model_id2, model_id3],
            include_parameters=True,
            include_performance=True,
            include_forecasts=False
        )

        comparison_result = self.service.compare_models(comparison_request)

        # Step 4: Verify comparison results
        assert comparison_result.success is True
        assert comparison_result.comparison_count == 3
        assert len(comparison_result.models) == 3

        # Verify parameter differences are detected
        assert comparison_result.parameters_identical is False
        assert len(comparison_result.parameter_differences) > 0
        
        # Check specific parameter differences
        param_names = [diff.parameter_name for diff in comparison_result.parameter_differences]
        assert "growth" in param_names
        assert "changepoint_prior_scale" in param_names
        assert "yearly_seasonality" in param_names

        # Verify performance comparison
        assert len(comparison_result.performance_comparison) > 0
        
        # Check that best model is identified (model3 has lowest RMSE)
        rmse_comparison = next(
            (comp for comp in comparison_result.performance_comparison if comp.metric_name == "rmse"),
            None
        )
        assert rmse_comparison is not None
        assert rmse_comparison.best_model_id == model_id3  # Conservative model has best RMSE
        
        # Verify overall best model
        assert comparison_result.best_overall_model_id is not None

        # Step 5: Generate comparison summary
        summary = self.service.get_comparison_summary(comparison_result)
        
        assert summary.total_models == 3
        assert len(summary.key_differences) > 0
        assert summary.performance_winner is not None
        assert summary.parameter_differences_count > 0
        assert summary.performance_metrics_count > 0
        assert "Conservative Model" in summary.performance_winner

        # Step 6: Test individual model retrieval
        retrieved_model = self.service.get_model_by_id(self.session_id, model_id1)
        assert retrieved_model is not None
        assert retrieved_model.name == "Linear Growth Model"
        assert retrieved_model.config.growth == "linear"

        # Step 7: Test cleanup
        cleanup_success = self.service.cleanup_session_models(self.session_id)
        assert cleanup_success is True
        
        # Verify cleanup worked
        models_after_cleanup = self.service.get_session_models(self.session_id)
        assert len(models_after_cleanup) == 0

    def test_parameter_comparison_accuracy(self):
        """Test that parameter comparison accurately identifies differences."""
        
        # Create two models with specific parameter differences
        config1 = ForecastConfig(
            name="Model A",
            horizon=30,
            growth="linear",
            yearly_seasonality=True,
            changepoint_prior_scale=0.05,
            seasonality_mode="additive"
        )
        
        config2 = ForecastConfig(
            name="Model B", 
            horizon=30,
            growth="logistic",  # Different
            cap=1000.0,
            yearly_seasonality=True,  # Same
            changepoint_prior_scale=0.1,  # Different
            seasonality_mode="multiplicative"  # Different
        )

        # Store models
        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            config=config1
        )
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            config=config2
        )

        # Compare parameters only
        request = ModelComparisonRequest(
            session_id=self.session_id,
            model_ids=[model_id1, model_id2],
            include_parameters=True,
            include_performance=False
        )

        result = self.service.compare_models(request)
        
        # Create lookup for parameter differences
        param_diffs = {diff.parameter_name: diff for diff in result.parameter_differences}
        
        # Verify specific differences are detected
        assert "growth" in param_diffs
        assert param_diffs["growth"].is_different is True
        assert param_diffs["growth"].model_values[model_id1] == "linear"
        assert param_diffs["growth"].model_values[model_id2] == "logistic"
        
        assert "changepoint_prior_scale" in param_diffs
        assert param_diffs["changepoint_prior_scale"].is_different is True
        
        assert "seasonality_mode" in param_diffs
        assert param_diffs["seasonality_mode"].is_different is True
        
        # Verify same parameters are not marked as different
        assert "yearly_seasonality" in param_diffs
        assert param_diffs["yearly_seasonality"].is_different is False
        
        assert "horizon" in param_diffs
        assert param_diffs["horizon"].is_different is False

    def test_performance_comparison_ranking(self):
        """Test that performance comparison correctly ranks models."""
        
        config = ForecastConfig(name="Test Model", horizon=30)
        
        # Create models with different performance levels
        # Model 1: Good performance
        cv_metrics1 = CrossValidationMetrics(
            rmse=8.0, mae=6.5, mape=4.2, mdape=3.9, smape=4.5, coverage=88.0
        )
        
        # Model 2: Poor performance  
        cv_metrics2 = CrossValidationMetrics(
            rmse=15.0, mae=12.0, mape=8.5, mdape=8.1, smape=9.2, coverage=75.0
        )
        
        # Model 3: Medium performance
        cv_metrics3 = CrossValidationMetrics(
            rmse=11.0, mae=9.0, mape=6.0, mdape=5.8, smape=6.5, coverage=82.0
        )

        # Store models
        model_id1 = self.service.store_model_result(
            session_id=self.session_id,
            name="Good Model",
            config=config,
            cv_metrics=cv_metrics1
        )
        model_id2 = self.service.store_model_result(
            session_id=self.session_id,
            name="Poor Model", 
            config=config,
            cv_metrics=cv_metrics2
        )
        model_id3 = self.service.store_model_result(
            session_id=self.session_id,
            name="Medium Model",
            config=config,
            cv_metrics=cv_metrics3
        )

        # Compare performance
        request = ModelComparisonRequest(
            session_id=self.session_id,
            model_ids=[model_id1, model_id2, model_id3],
            include_parameters=False,
            include_performance=True
        )

        result = self.service.compare_models(request)
        
        # Verify performance comparisons
        perf_comparisons = {comp.metric_name: comp for comp in result.performance_comparison}
        
        # For error metrics (lower is better)
        rmse_comp = perf_comparisons["rmse"]
        assert rmse_comp.best_model_id == model_id1  # Lowest RMSE
        assert rmse_comp.worst_model_id == model_id2  # Highest RMSE
        assert rmse_comp.improvement_pct > 0  # Should show improvement
        
        mae_comp = perf_comparisons["mae"]
        assert mae_comp.best_model_id == model_id1
        assert mae_comp.worst_model_id == model_id2
        
        # For coverage (higher is better)
        coverage_comp = perf_comparisons["coverage"]
        assert coverage_comp.best_model_id == model_id1  # Highest coverage
        assert coverage_comp.worst_model_id == model_id2  # Lowest coverage
        
        # Verify overall best model selection
        assert result.best_overall_model_id == model_id1  # Should win most metrics

    def teardown_method(self):
        """Clean up after each test."""
        self.service.cleanup_session_models(self.session_id)