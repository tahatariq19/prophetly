"""Cross-validation models for Prophet forecasting validation."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class CrossValidationConfig(BaseModel):
    """Configuration for Prophet cross-validation."""
    
    initial: str = Field(
        default="730 days",
        description="Initial training period (e.g., '730 days', '2 years')"
    )
    period: str = Field(
        default="180 days", 
        description="Period between cutoff dates (e.g., '180 days', '6 months')"
    )
    horizon: str = Field(
        default="365 days",
        description="Forecast horizon for each cutoff (e.g., '365 days', '1 year')"
    )
    cutoffs: Optional[List[str]] = Field(
        default=None,
        description="Custom cutoff dates in YYYY-MM-DD format (overrides period)"
    )
    parallel: Optional[str] = Field(
        default=None,
        description="Parallelization method: 'processes' or 'threads'"
    )
    
    @field_validator('cutoffs')
    @classmethod
    def validate_cutoffs(cls, v):
        if v is not None:
            for date_str in v:
                try:
                    datetime.strptime(date_str, '%Y-%m-%d')
                except ValueError:
                    raise ValueError(f'Invalid date format: {date_str}. Use YYYY-MM-DD format.')
        return v


class CrossValidationMetrics(BaseModel):
    """Performance metrics from cross-validation."""
    
    rmse: float = Field(description="Root Mean Square Error")
    mae: float = Field(description="Mean Absolute Error") 
    mape: float = Field(description="Mean Absolute Percentage Error")
    mdape: float = Field(description="Median Absolute Percentage Error")
    smape: float = Field(description="Symmetric Mean Absolute Percentage Error")
    coverage: float = Field(description="Coverage of prediction intervals")
    
    
class CrossValidationPoint(BaseModel):
    """Single cross-validation result point."""
    
    ds: str = Field(description="Date/timestamp")
    cutoff: str = Field(description="Cutoff date for this prediction")
    y: float = Field(description="Actual value")
    yhat: float = Field(description="Predicted value")
    yhat_lower: float = Field(description="Lower confidence bound")
    yhat_upper: float = Field(description="Upper confidence bound")
    horizon_days: int = Field(description="Days ahead from cutoff")
    error: float = Field(description="Prediction error (y - yhat)")
    abs_error: float = Field(description="Absolute prediction error")
    pct_error: Optional[float] = Field(default=None, description="Percentage error")


class CrossValidationResult(BaseModel):
    """Complete cross-validation results."""
    
    success: bool
    message: str
    config: CrossValidationConfig
    metrics: Optional[CrossValidationMetrics] = None
    results: List[CrossValidationPoint] = Field(default_factory=list)
    cutoff_count: int = Field(default=0, description="Number of cutoffs used")
    total_predictions: int = Field(default=0, description="Total number of predictions")
    processing_time_seconds: float = Field(default=0.0, description="Processing time")
    
    
class CrossValidationRequest(BaseModel):
    """Request for cross-validation."""
    
    session_id: str = Field(description="Session ID containing the data")
    config: CrossValidationConfig = Field(description="Cross-validation configuration")
    forecast_config: Dict[str, Any] = Field(description="Prophet model configuration")
    dataset_name: Optional[str] = Field(default=None, description="Name of dataset in session")