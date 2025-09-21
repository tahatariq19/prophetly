"""Model comparison service for Prophet forecasting results."""

import gc
import logging
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4

import numpy as np
import pandas as pd

from ..models.model_comparison import (
    ModelComparisonRequest,
    ModelComparisonResult,
    ModelComparisonSummary,
    ModelResult,
    ParameterComparison,
    PerformanceComparison,
    SessionModelStorage,
)
from ..models.prophet_config import ForecastConfig
from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)


class ModelComparisonService:
    """Service for comparing Prophet models within a session.

    Features:
    - Parameter comparison between models
    - Performance metrics comparison
    - Forecast data comparison
    - Session-based temporary storage
    - Automatic cleanup and memory management
    """

    def __init__(self):
        self.session_storage: Dict[str, SessionModelStorage] = {}
        self.logger = logging.getLogger(__name__)

    def store_model_result(
        self,
        session_id: str,
        model_id: Optional[str] = None,
        name: Optional[str] = None,
        config: Optional[ForecastConfig] = None,
        forecast_data: Optional[pd.DataFrame] = None,
        components: Optional[Dict[str, pd.DataFrame]] = None,
        cv_metrics: Optional[Any] = None,
        training_metrics: Optional[Dict[str, float]] = None,
        processing_time_seconds: Optional[float] = None,
        data_points: Optional[int] = None,
    ) -> str:
        """Store a model result in session for comparison.

        Args:
            session_id: Session identifier
            model_id: Optional model ID (generated if not provided)
            name: Human-readable model name
            config: Prophet configuration used
            forecast_data: Forecast results DataFrame
            components: Component decomposition DataFrames
            cv_metrics: Cross-validation metrics
            training_metrics: Training performance metrics
            processing_time_seconds: Processing time
            data_points: Number of training data points

        Returns:
            Model ID for the stored model
        """
        with MemoryTracker("store_model_result"):
            try:
                if model_id is None:
                    model_id = str(uuid4())

                # Convert DataFrames to dictionaries for storage
                forecast_dict = None
                if forecast_data is not None:
                    forecast_dict = self._dataframe_to_dict(forecast_data)

                components_dict = None
                if components is not None:
                    components_dict = {}
                    for comp_name, comp_df in components.items():
                        components_dict[comp_name] = self._dataframe_to_dict(comp_df)

                # Create model result
                model_result = ModelResult(
                    model_id=model_id,
                    name=name,
                    config=config,
                    forecast_data=forecast_dict,
                    components=components_dict,
                    cv_metrics=cv_metrics,
                    training_metrics=training_metrics,
                    processing_time_seconds=processing_time_seconds,
                    data_points=data_points,
                )

                # Get or create session storage
                if session_id not in self.session_storage:
                    self.session_storage[session_id] = SessionModelStorage(session_id=session_id)

                # Store the model
                self.session_storage[session_id].add_model(model_result)

                self.logger.info(f"Stored model result {model_id} in session {session_id}")
                return model_id

            except Exception:
                self.logger.error(
                    "Failed to store model result. See details in next log entry if available."
                )
                raise

    def get_session_models(self, session_id: str) -> List[ModelResult]:
        """Get all models stored in a session.

        Args:
            session_id: Session identifier

        Returns:
            List of ModelResult objects
        """
        if session_id not in self.session_storage:
            return []

        storage = self.session_storage[session_id]
        return list(storage.models.values())

    def get_model_by_id(self, session_id: str, model_id: str) -> Optional[ModelResult]:
        """Get a specific model by ID.

        Args:
            session_id: Session identifier
            model_id: Model identifier

        Returns:
            ModelResult if found, None otherwise
        """
        if session_id not in self.session_storage:
            return None

        return self.session_storage[session_id].get_model(model_id)

    def compare_models(self, request: ModelComparisonRequest) -> ModelComparisonResult:
        """Compare multiple models within a session.

        Args:
            request: Model comparison request

        Returns:
            ModelComparisonResult with detailed comparison
        """
        with MemoryTracker("compare_models"):
            start_time = time.time()

            try:
                self.logger.info(f"Starting model comparison for session {request.session_id}")

                # Validate session and models exist
                if request.session_id not in self.session_storage:
                    return ModelComparisonResult(
                        success=False,
                        message="Session not found",
                        models=[],
                        comparison_count=0,
                        processing_time_seconds=time.time() - start_time,
                    )

                storage = self.session_storage[request.session_id]

                # Get models to compare
                models = []
                for model_id in request.model_ids:
                    model = storage.get_model(model_id)
                    if model is None:
                        return ModelComparisonResult(
                            success=False,
                            message=f"Model {model_id} not found in session",
                            models=[],
                            comparison_count=0,
                            processing_time_seconds=time.time() - start_time,
                        )
                    models.append(model)

                # Perform comparisons
                parameter_differences = []
                performance_comparison = []
                forecast_comparison = None
                best_overall_model_id = None

                if request.include_parameters:
                    parameter_differences = self._compare_parameters(models)

                if request.include_performance:
                    performance_comparison = self._compare_performance(models)
                    best_overall_model_id = self._determine_best_model(performance_comparison)

                if request.include_forecasts:
                    forecast_comparison = self._compare_forecasts(models)

                # Check if parameters are identical
                parameters_identical = len(parameter_differences) == 0 or all(
                    not diff.is_different for diff in parameter_differences
                )

                processing_time = time.time() - start_time

                result = ModelComparisonResult(
                    success=True,
                    message="Model comparison completed successfully",
                    models=models,
                    comparison_count=len(models),
                    parameter_differences=parameter_differences,
                    parameters_identical=parameters_identical,
                    performance_comparison=performance_comparison,
                    best_overall_model_id=best_overall_model_id,
                    forecast_comparison=forecast_comparison,
                    processing_time_seconds=processing_time,
                )

                self.logger.info(f"Model comparison completed in {processing_time:.2f} seconds")
                return result

            except Exception as e:
                self.logger.error(
                    "Model comparison failed. See details in next log entry if available."
                )
                return ModelComparisonResult(
                    success=False,
                    message=f"Model comparison failed: {str(e)}",
                    models=[],
                    comparison_count=0,
                    processing_time_seconds=time.time() - start_time,
                )

    def get_comparison_summary(
        self, comparison_result: ModelComparisonResult
    ) -> ModelComparisonSummary:
        """Generate a summary of model comparison results.

        Args:
            comparison_result: Detailed comparison result

        Returns:
            ModelComparisonSummary with key insights
        """
        try:
            # Extract key differences
            key_differences = []
            for param_diff in comparison_result.parameter_differences:
                if param_diff.is_different:
                    key_differences.append(f"{param_diff.parameter_name} varies across models")

            # Determine performance winner
            performance_winner = None
            if comparison_result.best_overall_model_id:
                best_model = next(
                    (
                        m
                        for m in comparison_result.models
                        if m.model_id == comparison_result.best_overall_model_id
                    ),
                    None,
                )
                if best_model:
                    performance_winner = best_model.name or best_model.model_id

            # Generate recommendation
            recommendation = self._generate_recommendation(comparison_result)

            return ModelComparisonSummary(
                total_models=comparison_result.comparison_count,
                key_differences=key_differences[:5],  # Limit to top 5
                performance_winner=performance_winner,
                recommendation=recommendation,
                parameter_differences_count=len(
                    [d for d in comparison_result.parameter_differences if d.is_different]
                ),
                performance_metrics_count=len(comparison_result.performance_comparison),
            )

        except Exception:
            self.logger.error(
                "Failed to generate comparison summary. See details in next log entry if available."
            )
            return ModelComparisonSummary(
                total_models=0,
                key_differences=[],
                recommendation="Unable to generate recommendation due to error",
                parameter_differences_count=0,
                performance_metrics_count=0,
            )

    def cleanup_session_models(self, session_id: str) -> bool:
        """Clean up all models for a session.

        Args:
            session_id: Session identifier

        Returns:
            True if cleanup successful, False otherwise
        """
        try:
            if session_id in self.session_storage:
                storage = self.session_storage[session_id]
                model_count = storage.get_model_count()

                # Clean up the storage
                storage.cleanup()
                del self.session_storage[session_id]

                # Force garbage collection
                gc.collect()

                self.logger.info(f"Cleaned up {model_count} models for session {session_id}")
                return True

            return False

        except Exception:
            self.logger.error(
                "Failed to cleanup session models. See details in next log entry if available."
            )
            return False

    def _compare_parameters(self, models: List[ModelResult]) -> List[ParameterComparison]:
        """Compare parameters across models."""
        try:
            parameter_comparisons = []

            if not models:
                return parameter_comparisons

            # Get all parameter names from all models
            all_params = set()
            for model in models:
                if model.config:
                    config_dict = model.config.model_dump()
                    all_params.update(config_dict.keys())

            # Compare each parameter
            for param_name in sorted(all_params):
                model_values = {}
                param_type = self._get_parameter_type(param_name)

                for model in models:
                    if model.config:
                        config_dict = model.config.model_dump()
                        value = config_dict.get(param_name)
                        # Convert complex objects to string representation
                        if isinstance(value, (list, dict)):
                            value = str(value)
                        model_values[model.model_id] = value
                    else:
                        model_values[model.model_id] = None

                # Check if values are different
                unique_values = set(model_values.values())
                is_different = len(unique_values) > 1

                parameter_comparisons.append(
                    ParameterComparison(
                        parameter_name=param_name,
                        model_values=model_values,
                        is_different=is_different,
                        parameter_type=param_type,
                    )
                )

            return parameter_comparisons

        except Exception:
            self.logger.error(
                "Parameter comparison failed. See details in next log entry if available."
            )
            return []

    def _compare_performance(self, models: List[ModelResult]) -> List[PerformanceComparison]:
        """Compare performance metrics across models."""
        try:
            performance_comparisons = []

            # Collect all available metrics
            all_metrics = set()
            for model in models:
                if model.cv_metrics:
                    cv_dict = model.cv_metrics.model_dump()
                    all_metrics.update(cv_dict.keys())
                if model.training_metrics:
                    all_metrics.update(model.training_metrics.keys())

            # Compare each metric
            for metric_name in sorted(all_metrics):
                model_values = {}

                for model in models:
                    value = None

                    # Try to get from CV metrics first
                    if model.cv_metrics:
                        cv_dict = model.cv_metrics.model_dump()
                        value = cv_dict.get(metric_name)

                    # Fall back to training metrics
                    if value is None and model.training_metrics:
                        value = model.training_metrics.get(metric_name)

                    if value is not None and isinstance(value, (int, float)):
                        model_values[model.model_id] = float(value)

                # Only compare if we have values for multiple models
                if len(model_values) >= 2:
                    values = list(model_values.values())

                    # Determine best/worst (lower is better for error metrics)
                    is_error_metric = any(
                        term in metric_name.lower() for term in ["error", "rmse", "mae", "mape"]
                    )

                    if is_error_metric:
                        best_value = min(values)
                        worst_value = max(values)
                    else:
                        best_value = max(values)
                        worst_value = min(values)

                    # Find model IDs for best/worst
                    best_model_id = next(
                        mid for mid, val in model_values.items() if val == best_value
                    )
                    worst_model_id = next(
                        mid for mid, val in model_values.items() if val == worst_value
                    )

                    # Calculate improvement percentage
                    improvement_pct = None
                    if worst_value != 0:
                        if is_error_metric:
                            improvement_pct = ((worst_value - best_value) / worst_value) * 100
                        else:
                            improvement_pct = ((best_value - worst_value) / worst_value) * 100

                    performance_comparisons.append(
                        PerformanceComparison(
                            metric_name=metric_name,
                            model_values=model_values,
                            best_model_id=best_model_id,
                            worst_model_id=worst_model_id,
                            improvement_pct=improvement_pct,
                        )
                    )

            return performance_comparisons

        except Exception:
            self.logger.error(
                "Performance comparison failed. See details in next log entry if available."
            )
            return []

    def _compare_forecasts(self, models: List[ModelResult]) -> Optional[Dict[str, Any]]:
        """Compare forecast data across models."""
        try:
            if not all(model.forecast_data for model in models):
                return None

            comparison_stats = {
                "models_with_forecasts": len([m for m in models if m.forecast_data]),
                "forecast_periods": {},
                "prediction_ranges": {},
                "correlation_matrix": {},
            }

            # Compare forecast periods and ranges
            for model in models:
                if model.forecast_data and "yhat" in model.forecast_data:
                    predictions = model.forecast_data["yhat"]
                    comparison_stats["forecast_periods"][model.model_id] = len(predictions)
                    comparison_stats["prediction_ranges"][model.model_id] = {
                        "min": min(predictions),
                        "max": max(predictions),
                        "mean": sum(predictions) / len(predictions),
                    }

            # Calculate correlation between predictions if possible
            prediction_series = {}
            for model in models:
                if model.forecast_data and "yhat" in model.forecast_data:
                    prediction_series[model.model_id] = model.forecast_data["yhat"]

            if len(prediction_series) >= 2:
                # Calculate pairwise correlations
                model_ids = list(prediction_series.keys())
                for i, model_id1 in enumerate(model_ids):
                    for model_id2 in model_ids[i + 1 :]:
                        series1 = prediction_series[model_id1]
                        series2 = prediction_series[model_id2]

                        # Ensure same length
                        min_len = min(len(series1), len(series2))
                        if min_len > 1:
                            corr = np.corrcoef(series1[:min_len], series2[:min_len])[0, 1]
                            comparison_stats["correlation_matrix"][
                                f"{model_id1}_vs_{model_id2}"
                            ] = float(corr)

            return comparison_stats

        except Exception:
            self.logger.error(
                "Forecast comparison failed. See details in next log entry if available."
            )
            return None

    def _determine_best_model(
        self, performance_comparisons: List[PerformanceComparison]
    ) -> Optional[str]:
        """Determine the best overall model based on performance metrics."""
        try:
            if not performance_comparisons:
                return None

            # Score models based on how often they're the best
            model_scores = {}

            for comparison in performance_comparisons:
                best_model_id = comparison.best_model_id
                if best_model_id not in model_scores:
                    model_scores[best_model_id] = 0
                model_scores[best_model_id] += 1

            # Return model with highest score
            if model_scores:
                return max(model_scores.items(), key=lambda x: x[1])[0]

            return None

        except Exception:
            self.logger.error(
                "Failed to determine best model. See details in next log entry if available."
            )
            return None

    def _generate_recommendation(self, comparison_result: ModelComparisonResult) -> str:
        """Generate a recommendation based on comparison results."""
        try:
            if not comparison_result.success:
                return "Unable to generate recommendation due to comparison failure"

            if comparison_result.comparison_count < 2:
                return "Need at least 2 models for meaningful comparison"

            recommendations = []

            # Performance-based recommendation
            if comparison_result.best_overall_model_id:
                best_model = next(
                    (
                        m
                        for m in comparison_result.models
                        if m.model_id == comparison_result.best_overall_model_id
                    ),
                    None,
                )
                if best_model:
                    model_name = best_model.name or f"Model {best_model.model_id[:8]}"
                    recommendations.append(f"Best performing model: {model_name}")

            # Parameter differences
            if comparison_result.parameters_identical:
                recommendations.append(
                    "Models have identical parameters - performance differences may be due to randomness"
                )
            else:
                diff_count = len(
                    [d for d in comparison_result.parameter_differences if d.is_different]
                )
                recommendations.append(
                    f"{diff_count} parameter differences found - review key differences"
                )

            # Performance insights
            if comparison_result.performance_comparison:
                significant_improvements = [
                    p
                    for p in comparison_result.performance_comparison
                    if p.improvement_pct and p.improvement_pct > 10
                ]
                if significant_improvements:
                    recommendations.append(
                        f"{len(significant_improvements)} metrics show >10% improvement"
                    )

            return (
                "; ".join(recommendations)
                if recommendations
                else "No specific recommendations available"
            )

        except Exception:
            self.logger.error(
                "Failed to generate recommendation. See details in next log entry if available."
            )
            return "Unable to generate recommendation due to error"

    def _get_parameter_type(self, param_name: str) -> str:
        """Categorize parameter by type."""
        seasonality_params = [
            "yearly_seasonality",
            "weekly_seasonality",
            "daily_seasonality",
            "seasonality_mode",
            "seasonality_prior_scale",
            "custom_seasonalities",
        ]
        trend_params = [
            "growth",
            "changepoint_prior_scale",
            "n_changepoints",
            "changepoint_range",
            "changepoints",
        ]
        holiday_params = ["holidays_prior_scale", "holidays_country", "custom_holidays"]
        uncertainty_params = ["mcmc_samples", "uncertainty_samples", "interval_width"]
        regressor_params = ["regressors"]

        if param_name in seasonality_params:
            return "seasonality"
        elif param_name in trend_params:
            return "trend"
        elif param_name in holiday_params:
            return "holidays"
        elif param_name in uncertainty_params:
            return "uncertainty"
        elif param_name in regressor_params:
            return "regressors"
        else:
            return "basic"

    def _dataframe_to_dict(self, df: pd.DataFrame) -> Dict[str, List]:
        """Convert DataFrame to dictionary for JSON serialization."""
        try:
            result = {}
            for column in df.columns:
                # Handle datetime columns
                if pd.api.types.is_datetime64_any_dtype(df[column]):
                    result[column] = df[column].dt.strftime("%Y-%m-%d %H:%M:%S").tolist()
                else:
                    # Convert to native Python types
                    result[column] = (
                        df[column].astype(object).where(pd.notnull(df[column]), None).tolist()
                    )
            return result
        except Exception:
            self.logger.error(
                "Failed to convert DataFrame to dict. See details in next log entry if available."
            )
            return {}


# Global service instance
model_comparison_service = ModelComparisonService()
