"""Cross-validation API endpoints for Prophet model validation."""

import gc
import logging
import time
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, status
import numpy as np
import pandas as pd

from ..models.cross_validation import (
    CrossValidationConfig,
    CrossValidationMetrics,
    CrossValidationPoint,
    CrossValidationRequest,
    CrossValidationResult,
)
from ..models.prophet_config import ForecastConfig
from ..services.prophet_service import ProphetConfigurationError, prophet_service
from ..services.session_manager import session_manager
from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cross-validation", tags=["validation"])


@router.post("/execute", response_model=CrossValidationResult)
async def execute_cross_validation(request: CrossValidationRequest) -> CrossValidationResult:
    """Execute Prophet cross-validation with performance metrics calculation.

    This endpoint performs stateless cross-validation:
    1. Retrieves data from session memory
    2. Creates Prophet model from configuration
    3. Performs cross-validation with specified parameters
    4. Calculates comprehensive performance metrics
    5. Cleans up all model data from memory

    Args:
        request: Cross-validation request with session ID and configuration

    Returns:
        CrossValidationResult with metrics and detailed results

    Raises:
        HTTPException: If session not found, data invalid, or validation fails
    """
    with MemoryTracker("execute_cross_validation"):
        start_time = time.time()

        try:
            logger.info(f"Starting cross-validation for session {request.session_id}")

            # Retrieve session data
            session_data = session_manager.get_session(request.session_id)
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Session not found or expired"
                )

            # Get the dataset
            dataset_name = request.dataset_name or "uploaded_data"
            data = session_data.get_dataframe(dataset_name)

            if data is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Dataset '{dataset_name}' not found in session",
                )

            data = data.copy()  # Work with a copy

            # Convert forecast config dict to ForecastConfig object
            try:
                forecast_config = ForecastConfig(**request.forecast_config)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid forecast configuration: {str(e)}",
                )

            # Validate configuration against data
            validation_result = prophet_service.validate_config(forecast_config, data)
            if not validation_result["is_valid"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Configuration validation failed: {'; '.join(validation_result['errors'])}",
                )

            # Prepare data for Prophet
            data = _prepare_data_for_prophet(data, forecast_config)

            # Validate cross-validation parameters
            _validate_cv_config(request.config, data)

            # Create Prophet model
            logger.info("Creating Prophet model for cross-validation")
            model = prophet_service.create_model(forecast_config)

            # Perform cross-validation
            logger.info("Executing cross-validation")
            cv_results_df = _execute_prophet_cross_validation(
                model, data, request.config, forecast_config
            )

            # Calculate performance metrics
            logger.info("Calculating performance metrics")
            metrics = _calculate_performance_metrics(cv_results_df)

            # Convert results to response format
            cv_points = _convert_cv_results_to_points(cv_results_df)

            processing_time = time.time() - start_time

            logger.info(f"Cross-validation completed successfully in {processing_time:.2f} seconds")

            # Clean up model from memory
            prophet_service.cleanup_model(model)
            del model, cv_results_df, data
            gc.collect()

            return CrossValidationResult(
                success=True,
                message="Cross-validation completed successfully",
                config=request.config,
                metrics=metrics,
                results=cv_points,
                cutoff_count=len(cv_results_df["cutoff"].unique())
                if cv_results_df is not None
                else 0,
                total_predictions=len(cv_points),
                processing_time_seconds=processing_time,
            )

        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except ProphetConfigurationError as e:
            logger.error("Prophet configuration error. See details in next log entry if available.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prophet configuration error: {str(e)}",
            )
        except Exception as e:
            logger.error(
                "Cross-validation failed. See details in next log entry if available.",
                exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Cross-validation failed: {str(e)}",
            )


@router.post("/validate-config", response_model=Dict[str, Any])
async def validate_cross_validation_config(request: CrossValidationRequest) -> Dict[str, Any]:
    """Validate cross-validation configuration without executing.

    This endpoint checks:
    1. Session and data availability
    2. Cross-validation parameter validity
    3. Data compatibility with CV configuration
    4. Estimated processing time and resource usage

    Args:
        request: Cross-validation request to validate

    Returns:
        Validation results with recommendations
    """
    try:
        logger.info(f"Validating cross-validation config for session {request.session_id}")

        # Check session and data
        session_data = session_manager.get_session(request.session_id)
        if not session_data:
            return {
                "is_valid": False,
                "errors": ["Session not found or expired"],
                "warnings": [],
                "recommendations": ["Create a new session and upload data"],
            }

        dataset_name = request.dataset_name or "uploaded_data"
        data = session_data.get_dataframe(dataset_name)

        if data is None:
            return {
                "is_valid": False,
                "errors": [f"Dataset '{dataset_name}' not found in session"],
                "warnings": [],
                "recommendations": ["Upload data before running cross-validation"],
            }

        # Validate forecast configuration
        try:
            forecast_config = ForecastConfig(**request.forecast_config)
            config_validation = prophet_service.validate_config(forecast_config, data)
            if not config_validation["is_valid"]:
                return {
                    "is_valid": False,
                    "errors": config_validation["errors"],
                    "warnings": config_validation["warnings"],
                    "recommendations": config_validation["recommendations"],
                }
        except Exception as e:
            return {
                "is_valid": False,
                "errors": [f"Invalid forecast configuration: {str(e)}"],
                "warnings": [],
                "recommendations": ["Check forecast configuration parameters"],
            }

        # Validate cross-validation configuration
        cv_validation = _validate_cv_config_detailed(request.config, data)

        # Estimate processing requirements
        estimated_time = _estimate_cv_processing_time(data, request.config, forecast_config)
        estimated_memory = _estimate_cv_memory_usage(data, request.config, forecast_config)

        cv_validation.update(
            {
                "data_points": len(data),
                "estimated_processing_time_seconds": estimated_time,
                "estimated_memory_mb": estimated_memory,
                "dataset_name": dataset_name,
            }
        )

        logger.info(
            f"Cross-validation config validation completed: valid={cv_validation['is_valid']}"
        )
        return cv_validation

    except Exception as e:
        logger.error(
            "Cross-validation config validation failed. See details in next log entry if available.",
            exc_info=True,
        )
        return {
            "is_valid": False,
            "errors": [f"Validation error: {str(e)}"],
            "warnings": [],
            "recommendations": ["Check request format and try again"],
        }


def _prepare_data_for_prophet(data: pd.DataFrame, config: ForecastConfig) -> pd.DataFrame:
    """Prepare data for Prophet model fitting."""
    # Ensure correct column names
    if "ds" not in data.columns or "y" not in data.columns:
        data_cols = list(data.columns)
        if len(data_cols) < 2:
            raise ValueError("Data must have at least 2 columns (date and value)")

        data = data.rename(columns={data_cols[0]: "ds", data_cols[1]: "y"})

    # Ensure ds column is datetime
    data["ds"] = pd.to_datetime(data["ds"])

    # Add cap and floor for logistic growth
    if config.growth == "logistic":
        if config.cap is not None:
            data["cap"] = config.cap
        if config.floor is not None:
            data["floor"] = config.floor

    # Add regressor columns if they exist in the data
    for regressor in config.regressors:
        if regressor.name not in data.columns:
            logger.warning(f"Regressor '{regressor.name}' not found in data")

    return data


def _validate_cv_config(config: CrossValidationConfig, data: pd.DataFrame) -> None:
    """Validate cross-validation configuration against data."""
    # Check minimum data requirements
    if len(data) < 30:
        raise ValueError("Insufficient data for cross-validation (minimum 30 points required)")

    # Parse time periods to validate them
    try:
        initial_days = _parse_time_period(config.initial)
        period_days = _parse_time_period(config.period)
        horizon_days = _parse_time_period(config.horizon)
    except Exception as e:
        raise ValueError(f"Invalid time period format: {str(e)}")

    # Validate that initial period is reasonable
    data_span_days = (data["ds"].max() - data["ds"].min()).days
    if initial_days > data_span_days * 0.8:
        raise ValueError(
            f"Initial period ({initial_days} days) too large for data span ({data_span_days} days)"
        )

    # Validate custom cutoffs if provided
    if config.cutoffs:
        cutoff_dates = [pd.to_datetime(cutoff) for cutoff in config.cutoffs]
        data_start = data["ds"].min()
        data_end = data["ds"].max()

        for cutoff in cutoff_dates:
            if cutoff < data_start or cutoff > data_end:
                raise ValueError(f"Cutoff date {cutoff.date()} outside data range")


def _validate_cv_config_detailed(
    config: CrossValidationConfig, data: pd.DataFrame
) -> Dict[str, Any]:
    """Detailed validation of cross-validation configuration."""
    result = {"is_valid": True, "errors": [], "warnings": [], "recommendations": []}

    try:
        _validate_cv_config(config, data)
    except ValueError as e:
        result["is_valid"] = False
        result["errors"].append(str(e))
        return result

    # Additional warnings and recommendations
    data_span_days = (data["ds"].max() - data["ds"].min()).days
    initial_days = _parse_time_period(config.initial)
    horizon_days = _parse_time_period(config.horizon)

    if initial_days < horizon_days * 3:
        result["warnings"].append(
            f"Initial period ({initial_days} days) is less than 3x horizon ({horizon_days} days)"
        )
        result["recommendations"].append(
            "Consider increasing initial period for more stable validation"
        )

    if len(data) > 10000:
        result["warnings"].append(
            f"Large dataset ({len(data)} points) may result in slow cross-validation"
        )
        result["recommendations"].append("Consider using a subset of data or parallel processing")

    # Estimate number of cutoffs
    if config.cutoffs:
        cutoff_count = len(config.cutoffs)
    else:
        period_days = _parse_time_period(config.period)
        available_days = data_span_days - initial_days - horizon_days
        cutoff_count = max(1, available_days // period_days)

    if cutoff_count < 3:
        result["warnings"].append(f"Few cutoffs ({cutoff_count}) may provide limited validation")
        result["recommendations"].append(
            "Consider reducing period or increasing data span for more cutoffs"
        )

    result["estimated_cutoffs"] = cutoff_count
    return result


def _execute_prophet_cross_validation(
    model, data: pd.DataFrame, cv_config: CrossValidationConfig, forecast_config: ForecastConfig
) -> pd.DataFrame:
    """Execute Prophet cross-validation with memory optimization."""
    try:
        # Convert custom cutoffs to pandas datetime if provided
        cutoffs = None
        if cv_config.cutoffs:
            cutoffs = pd.to_datetime(cv_config.cutoffs)

        # Use Prophet's cross_validation function
        cv_results = prophet_service.cross_validate(
            model=model,
            data=data,
            initial=cv_config.initial,
            period=cv_config.period,
            cv_horizon=cv_config.horizon,
            cutoffs=cutoffs,
            parallel=cv_config.parallel,
        )

        return cv_results

    except Exception as e:
        logger.error(
            "Prophet cross-validation execution failed. See details in next log entry if available."
        )
        raise ProphetConfigurationError(f"Cross-validation execution failed: {str(e)}")


def _calculate_performance_metrics(cv_results: pd.DataFrame) -> CrossValidationMetrics:
    """Calculate comprehensive performance metrics from cross-validation results."""
    try:
        # Calculate errors
        errors = cv_results["y"] - cv_results["yhat"]
        abs_errors = np.abs(errors)

        # Basic metrics
        rmse = np.sqrt(np.mean(errors**2))
        mae = np.mean(abs_errors)

        # Percentage errors (handle division by zero)
        non_zero_mask = cv_results["y"] != 0
        pct_errors = np.where(non_zero_mask, abs_errors / np.abs(cv_results["y"]) * 100, 0)

        mape = np.mean(pct_errors[non_zero_mask]) if non_zero_mask.any() else 0.0
        mdape = np.median(pct_errors[non_zero_mask]) if non_zero_mask.any() else 0.0

        # Symmetric MAPE
        smape_denominator = (np.abs(cv_results["y"]) + np.abs(cv_results["yhat"])) / 2
        smape_errors = np.where(smape_denominator != 0, abs_errors / smape_denominator * 100, 0)
        smape = np.mean(smape_errors)

        # Coverage (percentage of actual values within prediction intervals)
        within_interval = (cv_results["y"] >= cv_results["yhat_lower"]) & (
            cv_results["y"] <= cv_results["yhat_upper"]
        )
        coverage = np.mean(within_interval) * 100

        return CrossValidationMetrics(
            rmse=float(rmse),
            mae=float(mae),
            mape=float(mape),
            mdape=float(mdape),
            smape=float(smape),
            coverage=float(coverage),
        )

    except Exception:
        logger.error(
            "Performance metrics calculation failed. See details in next log entry if available."
        )
        # Return default metrics if calculation fails
        return CrossValidationMetrics(
            rmse=0.0, mae=0.0, mape=0.0, mdape=0.0, smape=0.0, coverage=0.0
        )


def _convert_cv_results_to_points(cv_results: pd.DataFrame) -> List[CrossValidationPoint]:
    """Convert cross-validation DataFrame to list of CrossValidationPoint objects."""
    points = []

    for _, row in cv_results.iterrows():
        error = row["y"] - row["yhat"]
        abs_error = abs(error)
        pct_error = (abs_error / abs(row["y"]) * 100) if row["y"] != 0 else None

        # Calculate horizon in days
        horizon_days = (pd.to_datetime(row["ds"]) - pd.to_datetime(row["cutoff"])).days

        points.append(
            CrossValidationPoint(
                ds=row["ds"].isoformat() if hasattr(row["ds"], "isoformat") else str(row["ds"]),
                cutoff=row["cutoff"].isoformat()
                if hasattr(row["cutoff"], "isoformat")
                else str(row["cutoff"]),
                y=float(row["y"]),
                yhat=float(row["yhat"]),
                yhat_lower=float(row["yhat_lower"]),
                yhat_upper=float(row["yhat_upper"]),
                horizon_days=int(horizon_days),
                error=float(error),
                abs_error=float(abs_error),
                pct_error=float(pct_error) if pct_error is not None else None,
            )
        )

    return points


def _parse_time_period(period_str: str) -> int:
    """Parse time period string to days."""
    period_str = period_str.lower().strip()

    if "day" in period_str:
        return int(period_str.split()[0])
    elif "week" in period_str:
        return int(period_str.split()[0]) * 7
    elif "month" in period_str:
        return int(period_str.split()[0]) * 30
    elif "year" in period_str:
        return int(period_str.split()[0]) * 365
    else:
        # Try to parse as just a number (assume days)
        try:
            return int(period_str)
        except ValueError:
            raise ValueError(f"Cannot parse time period: {period_str}")


def _estimate_cv_processing_time(
    data: pd.DataFrame, cv_config: CrossValidationConfig, forecast_config: ForecastConfig
) -> float:
    """Estimate cross-validation processing time."""
    base_time = 10.0  # Base time in seconds

    # Scale with data points
    data_factor = max(1.0, len(data) / 1000)

    # Estimate number of cutoffs
    if cv_config.cutoffs:
        cutoff_count = len(cv_config.cutoffs)
    else:
        data_span_days = (data["ds"].max() - data["ds"].min()).days
        initial_days = _parse_time_period(cv_config.initial)
        period_days = _parse_time_period(cv_config.period)
        horizon_days = _parse_time_period(cv_config.horizon)
        available_days = data_span_days - initial_days - horizon_days
        cutoff_count = max(1, available_days // period_days)

    # Each cutoff requires model fitting and prediction
    cutoff_factor = cutoff_count

    # MCMC sampling adds significant time per cutoff
    mcmc_factor = 1.0 + (forecast_config.mcmc_samples / 1000) * 2

    # Complexity from seasonalities and regressors
    complexity_factor = (
        1.0
        + len(forecast_config.custom_seasonalities) * 0.1
        + len(forecast_config.regressors) * 0.05
    )

    return base_time * data_factor * cutoff_factor * mcmc_factor * complexity_factor


def _estimate_cv_memory_usage(
    data: pd.DataFrame, cv_config: CrossValidationConfig, forecast_config: ForecastConfig
) -> float:
    """Estimate cross-validation memory usage in MB."""
    base_memory = 100.0  # Base memory in MB

    # Memory scales with data size and number of cutoffs
    data_memory = len(data) * 0.002  # ~2KB per data point

    # Estimate cutoffs
    if cv_config.cutoffs:
        cutoff_count = len(cv_config.cutoffs)
    else:
        data_span_days = (data["ds"].max() - data["ds"].min()).days
        initial_days = _parse_time_period(cv_config.initial)
        period_days = _parse_time_period(cv_config.period)
        horizon_days = _parse_time_period(cv_config.horizon)
        available_days = data_span_days - initial_days - horizon_days
        cutoff_count = max(1, available_days // period_days)

    # Each cutoff creates temporary model and results
    cutoff_memory = cutoff_count * 20  # ~20MB per cutoff

    # MCMC sampling memory
    mcmc_memory = forecast_config.mcmc_samples * 0.01 if forecast_config.mcmc_samples > 0 else 0

    return base_memory + data_memory + cutoff_memory + mcmc_memory
