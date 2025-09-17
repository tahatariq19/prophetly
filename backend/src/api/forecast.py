"""Prophet forecasting API endpoints with stateless processing."""

import gc
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
import pandas as pd
from pydantic import BaseModel, Field

from ..models.prophet_config import ForecastConfig
from ..services.prophet_service import ProphetConfigurationError, prophet_service
from ..services.session_manager import session_manager
from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/forecast", tags=["forecasting"])


class ForecastRequest(BaseModel):
    """Request for Prophet forecasting."""

    session_id: str = Field(description="Session ID containing the data")
    config: ForecastConfig = Field(description="Prophet configuration")
    dataset_name: Optional[str] = Field(default=None, description="Name of dataset in session")


class ForecastPoint(BaseModel):
    """Single forecast data point."""

    ds: str = Field(description="Date/timestamp")
    yhat: float = Field(description="Forecasted value")
    yhat_lower: float = Field(description="Lower confidence bound")
    yhat_upper: float = Field(description="Upper confidence bound")
    is_historical: bool = Field(description="Whether this is historical data")
    y: Optional[float] = Field(default=None, description="Actual value if historical")


class ComponentData(BaseModel):
    """Component decomposition data."""

    ds: str = Field(description="Date/timestamp")
    trend: float = Field(description="Trend component")
    seasonal: Optional[float] = Field(default=None, description="Combined seasonal component")
    yearly: Optional[float] = Field(default=None, description="Yearly seasonal component")
    weekly: Optional[float] = Field(default=None, description="Weekly seasonal component")
    daily: Optional[float] = Field(default=None, description="Daily seasonal component")
    holidays: Optional[float] = Field(default=None, description="Holiday effects")
    additive_terms: Optional[float] = Field(default=None, description="Additive terms")
    multiplicative_terms: Optional[float] = Field(default=None, description="Multiplicative terms")


class ForecastResponse(BaseModel):
    """Response containing forecast results."""

    success: bool
    message: str
    forecast_data: List[ForecastPoint] = Field(default_factory=list)
    components: List[ComponentData] = Field(default_factory=list)
    model_summary: Dict[str, Any] = Field(default_factory=dict)
    performance_metrics: Dict[str, float] = Field(default_factory=dict)


class ForecastError(BaseModel):
    """Error response for forecasting failures."""

    success: bool = False
    error_type: str
    message: str
    details: Optional[Dict[str, Any]] = None


@router.post("/generate", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest) -> ForecastResponse:
    """Generate Prophet forecast with confidence intervals and component decomposition.
    
    This endpoint performs stateless forecasting:
    1. Retrieves data from session memory
    2. Creates and fits Prophet model
    3. Generates forecast with confidence intervals
    4. Extracts component decomposition
    5. Cleans up all model data from memory
    
    Args:
        request: Forecast request with session ID and configuration
        
    Returns:
        ForecastResponse with forecast data and components
        
    Raises:
        HTTPException: If session not found, data invalid, or forecasting fails

    """
    with MemoryTracker("generate_forecast"):
        try:
            logger.info(f"Starting forecast generation for session {request.session_id}")

            # Retrieve session data
            session_data = session_manager.get_session(request.session_id)
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found or expired"
                )

            # Get the dataset (use specified name or first available)
            dataset_name = request.dataset_name or "uploaded_data"  # Default dataset name
            data = session_data.get_dataframe(dataset_name)

            if data is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Dataset '{dataset_name}' not found in session"
                )

            data = data.copy()  # Work with a copy to avoid modifying session data

            # Validate configuration against data
            validation_result = prophet_service.validate_config(request.config, data)
            if not validation_result['is_valid']:
                error_details = {
                    'validation_errors': validation_result['errors'],
                    'warnings': validation_result['warnings']
                }
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Configuration validation failed: {'; '.join(validation_result['errors'])}",
                    headers={"X-Validation-Details": str(error_details)}
                )

            # Prepare data for Prophet (ensure correct column names)
            if 'ds' not in data.columns or 'y' not in data.columns:
                # Assume first column is date, second is value
                data_cols = list(data.columns)
                if len(data_cols) < 2:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Data must have at least 2 columns (date and value)"
                    )

                data = data.rename(columns={
                    data_cols[0]: 'ds',
                    data_cols[1]: 'y'
                })

            # Ensure ds column is datetime
            data['ds'] = pd.to_datetime(data['ds'])

            # Add cap and floor for logistic growth
            if request.config.growth == 'logistic':
                if request.config.cap is not None:
                    data['cap'] = request.config.cap
                if request.config.floor is not None:
                    data['floor'] = request.config.floor

            # Create and fit Prophet model
            logger.info("Creating Prophet model")
            model = prophet_service.create_model(request.config)

            logger.info("Fitting Prophet model")
            model.fit(data)

            # Create future dataframe
            logger.info(f"Creating future dataframe with horizon {request.config.horizon}")
            future = model.make_future_dataframe(periods=request.config.horizon)

            # Add cap and floor to future dataframe for logistic growth
            if request.config.growth == 'logistic':
                if request.config.cap is not None:
                    future['cap'] = request.config.cap
                if request.config.floor is not None:
                    future['floor'] = request.config.floor

            # Add regressor values to future dataframe
            for regressor in request.config.regressors:
                if regressor.name in data.columns:
                    # For simplicity, extend last known values for regressors
                    # In production, this should be handled more sophisticatedly
                    last_value = data[regressor.name].iloc[-1]
                    future[regressor.name] = last_value

            # Generate forecast
            logger.info("Generating forecast")
            forecast = model.predict(future)

            # Extract components
            logger.info("Extracting component decomposition")
            components_df = None
            try:
                components_df = model.predict(future, decompose=True)
            except Exception as e:
                logger.warning(f"Component decomposition failed: {e}")
                # Fallback to basic components
                components_df = forecast.copy()

            # Prepare forecast response data
            forecast_points = []
            historical_cutoff = len(data)

            for i, row in forecast.iterrows():
                is_historical = i < historical_cutoff
                actual_value = data.iloc[i]['y'] if is_historical and i < len(data) else None

                forecast_points.append(ForecastPoint(
                    ds=row['ds'].isoformat(),
                    yhat=float(row['yhat']),
                    yhat_lower=float(row['yhat_lower']),
                    yhat_upper=float(row['yhat_upper']),
                    is_historical=is_historical,
                    y=float(actual_value) if actual_value is not None else None
                ))

            # Prepare component data
            component_points = []
            if components_df is not None:
                for i, row in components_df.iterrows():
                    component_data = ComponentData(
                        ds=row['ds'].isoformat(),
                        trend=float(row.get('trend', 0))
                    )

                    # Add seasonal components if available
                    if 'seasonal' in row:
                        component_data.seasonal = float(row['seasonal'])
                    if 'yearly' in row:
                        component_data.yearly = float(row['yearly'])
                    if 'weekly' in row:
                        component_data.weekly = float(row['weekly'])
                    if 'daily' in row:
                        component_data.daily = float(row['daily'])
                    if 'holidays' in row:
                        component_data.holidays = float(row['holidays'])
                    if 'additive_terms' in row:
                        component_data.additive_terms = float(row['additive_terms'])
                    if 'multiplicative_terms' in row:
                        component_data.multiplicative_terms = float(row['multiplicative_terms'])

                    component_points.append(component_data)

            # Calculate basic performance metrics on historical data
            performance_metrics = {}
            if len(data) > 0:
                historical_forecast = forecast.iloc[:len(data)]
                actual_values = data['y'].values
                predicted_values = historical_forecast['yhat'].values

                # Calculate metrics
                residuals = actual_values - predicted_values
                performance_metrics = {
                    'mae': float(abs(residuals).mean()),
                    'rmse': float((residuals ** 2).mean() ** 0.5),
                    'mape': float(abs(residuals / actual_values).mean() * 100) if (actual_values != 0).all() else None,
                    'r2': float(1 - (residuals ** 2).sum() / ((actual_values - actual_values.mean()) ** 2).sum())
                }

            # Model summary
            model_summary = {
                'config_name': request.config.name or 'Unnamed Configuration',
                'horizon': request.config.horizon,
                'growth': request.config.growth,
                'seasonality_mode': request.config.seasonality_mode,
                'data_points': len(data),
                'forecast_points': len(forecast_points),
                'has_custom_seasonalities': len(request.config.custom_seasonalities) > 0,
                'has_regressors': len(request.config.regressors) > 0,
                'mcmc_samples': request.config.mcmc_samples
            }

            logger.info("Forecast generation completed successfully")

            # Clean up model from memory
            prophet_service.cleanup_model(model)
            del model, forecast, components_df, data, future
            gc.collect()

            return ForecastResponse(
                success=True,
                message="Forecast generated successfully",
                forecast_data=forecast_points,
                components=component_points,
                model_summary=model_summary,
                performance_metrics=performance_metrics
            )

        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except ProphetConfigurationError as e:
            logger.error(f"Prophet configuration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prophet configuration error: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Forecast generation failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Forecast generation failed: {str(e)}"
            )


@router.post("/validate", response_model=Dict[str, Any])
async def validate_forecast_request(request: ForecastRequest) -> Dict[str, Any]:
    """Validate a forecast request without generating the actual forecast.
    
    This endpoint checks:
    1. Session and data availability
    2. Configuration validity
    3. Data compatibility with configuration
    4. Estimated processing time and memory usage
    
    Args:
        request: Forecast request to validate
        
    Returns:
        Validation results with recommendations

    """
    try:
        logger.info(f"Validating forecast request for session {request.session_id}")

        # Check session and data
        session_data = session_manager.get_session(request.session_id)
        if not session_data:
            return {
                'is_valid': False,
                'errors': ['Session not found or expired'],
                'warnings': [],
                'recommendations': ['Create a new session and upload data']
            }

        dataset_name = request.dataset_name or "uploaded_data"  # Default dataset name
        data = session_data.get_dataframe(dataset_name)

        if data is None:
            return {
                'is_valid': False,
                'errors': [f"Dataset '{dataset_name}' not found in session"],
                'warnings': [],
                'recommendations': ['Upload data before generating forecast']
            }

        # Validate configuration
        validation_result = prophet_service.validate_config(request.config, data)

        # Add data-specific recommendations
        if len(data) < request.config.horizon * 2:
            validation_result['warnings'].append(
                f"Limited historical data ({len(data)} points) for forecast horizon ({request.config.horizon})"
            )
            validation_result['recommendations'].append(
                "Consider reducing forecast horizon or providing more historical data"
            )

        # Estimate processing requirements
        estimated_time_seconds = _estimate_processing_time(len(data), request.config)
        estimated_memory_mb = _estimate_memory_usage(len(data), request.config)

        validation_result.update({
            'data_points': len(data),
            'estimated_processing_time_seconds': estimated_time_seconds,
            'estimated_memory_mb': estimated_memory_mb,
            'dataset_name': dataset_name
        })

        logger.info(f"Forecast validation completed: valid={validation_result['is_valid']}")
        return validation_result

    except Exception as e:
        logger.error(f"Forecast validation failed: {e}", exc_info=True)
        return {
            'is_valid': False,
            'errors': [f"Validation error: {str(e)}"],
            'warnings': [],
            'recommendations': ['Check request format and try again']
        }


def _estimate_processing_time(data_points: int, config: ForecastConfig) -> float:
    """Estimate processing time based on data size and configuration."""
    base_time = 2.0  # Base time in seconds

    # Scale with data points
    data_factor = max(1.0, data_points / 1000)

    # MCMC sampling adds significant time
    mcmc_factor = 1.0 + (config.mcmc_samples / 1000) * 5

    # Custom seasonalities and regressors add complexity
    complexity_factor = 1.0 + len(config.custom_seasonalities) * 0.2 + len(config.regressors) * 0.1

    return base_time * data_factor * mcmc_factor * complexity_factor


def _estimate_memory_usage(data_points: int, config: ForecastConfig) -> float:
    """Estimate memory usage in MB based on data size and configuration."""
    base_memory = 50.0  # Base memory in MB

    # Scale with data points and forecast horizon
    data_memory = (data_points + config.horizon) * 0.001  # ~1KB per point

    # MCMC sampling requires more memory
    mcmc_memory = config.mcmc_samples * 0.01 if config.mcmc_samples > 0 else 0

    # Components and regressors
    component_memory = len(config.custom_seasonalities) * 5 + len(config.regressors) * 10

    return base_memory + data_memory + mcmc_memory + component_memory
