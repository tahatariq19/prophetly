"""Model comparison models for Prophet forecasting."""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import pandas as pd
from pydantic import BaseModel, Field

from .prophet_config import ForecastConfig
from .cross_validation import CrossValidationMetrics


class ModelResult(BaseModel):
    """Individual model result for comparison."""
    
    model_id: str = Field(description="Unique identifier for the model")
    name: Optional[str] = Field(default=None, description="Human-readable model name")
    config: ForecastConfig = Field(description="Prophet configuration used")
    
    # Forecast results
    forecast_data: Optional[Dict[str, Any]] = Field(default=None, description="Forecast results as dict")
    components: Optional[Dict[str, Any]] = Field(default=None, description="Component decomposition")
    
    # Performance metrics
    cv_metrics: Optional[CrossValidationMetrics] = Field(default=None, description="Cross-validation metrics")
    training_metrics: Optional[Dict[str, float]] = Field(default=None, description="Training performance metrics")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="Model creation timestamp")
    processing_time_seconds: Optional[float] = Field(default=None, description="Total processing time")
    data_points: Optional[int] = Field(default=None, description="Number of training data points")
    
    model_config = {"arbitrary_types_allowed": True}


class ParameterComparison(BaseModel):
    """Comparison of parameters between models."""
    
    parameter_name: str = Field(description="Name of the parameter")
    model_values: Dict[str, Any] = Field(description="Parameter values by model ID")
    is_different: bool = Field(description="Whether models have different values")
    parameter_type: str = Field(description="Type of parameter (basic, seasonality, trend, etc.)")


class PerformanceComparison(BaseModel):
    """Performance metrics comparison between models."""
    
    metric_name: str = Field(description="Name of the performance metric")
    model_values: Dict[str, float] = Field(description="Metric values by model ID")
    best_model_id: str = Field(description="Model ID with best performance for this metric")
    worst_model_id: str = Field(description="Model ID with worst performance for this metric")
    improvement_pct: Optional[float] = Field(default=None, description="Percentage improvement from worst to best")


class ModelComparisonRequest(BaseModel):
    """Request for model comparison."""
    
    session_id: str = Field(description="Session ID containing the models")
    model_ids: List[str] = Field(min_length=2, description="List of model IDs to compare")
    include_parameters: bool = Field(default=True, description="Include parameter comparison")
    include_performance: bool = Field(default=True, description="Include performance comparison")
    include_forecasts: bool = Field(default=False, description="Include forecast data comparison")


class ModelComparisonResult(BaseModel):
    """Result of model comparison analysis."""
    
    success: bool = Field(description="Whether comparison was successful")
    message: str = Field(description="Status message")
    
    # Model information
    models: List[ModelResult] = Field(description="Models being compared")
    comparison_count: int = Field(description="Number of models compared")
    
    # Parameter comparison
    parameter_differences: List[ParameterComparison] = Field(
        default_factory=list, 
        description="Parameter differences between models"
    )
    parameters_identical: bool = Field(default=False, description="Whether all parameters are identical")
    
    # Performance comparison
    performance_comparison: List[PerformanceComparison] = Field(
        default_factory=list,
        description="Performance metrics comparison"
    )
    best_overall_model_id: Optional[str] = Field(default=None, description="Best performing model overall")
    
    # Forecast comparison (if requested)
    forecast_comparison: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="Forecast data comparison statistics"
    )
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="Comparison timestamp")
    processing_time_seconds: float = Field(description="Time taken to perform comparison")


class ModelComparisonSummary(BaseModel):
    """Summary of model comparison for quick overview."""
    
    total_models: int = Field(description="Total number of models compared")
    key_differences: List[str] = Field(description="Key parameter differences")
    performance_winner: Optional[str] = Field(default=None, description="Best performing model name")
    recommendation: str = Field(description="Recommendation based on comparison")
    
    # Quick stats
    parameter_differences_count: int = Field(description="Number of different parameters")
    performance_metrics_count: int = Field(description="Number of performance metrics compared")
    
    created_at: datetime = Field(default_factory=datetime.now, description="Summary timestamp")


class SessionModelStorage(BaseModel):
    """Storage container for models within a session."""
    
    session_id: str = Field(description="Session identifier")
    models: Dict[str, ModelResult] = Field(default_factory=dict, description="Models by ID")
    created_at: datetime = Field(default_factory=datetime.now, description="Storage creation time")
    last_accessed: datetime = Field(default_factory=datetime.now, description="Last access time")
    
    def add_model(self, model: ModelResult) -> None:
        """Add a model to the session storage."""
        self.models[model.model_id] = model
        self.last_accessed = datetime.now()
    
    def get_model(self, model_id: str) -> Optional[ModelResult]:
        """Get a model by ID."""
        self.last_accessed = datetime.now()
        return self.models.get(model_id)
    
    def remove_model(self, model_id: str) -> bool:
        """Remove a model from storage."""
        if model_id in self.models:
            del self.models[model_id]
            self.last_accessed = datetime.now()
            return True
        return False
    
    def get_model_ids(self) -> List[str]:
        """Get list of all model IDs."""
        self.last_accessed = datetime.now()
        return list(self.models.keys())
    
    def get_model_count(self) -> int:
        """Get number of stored models."""
        return len(self.models)
    
    def cleanup(self) -> None:
        """Clean up all models in storage."""
        for model in self.models.values():
            # Clear large data structures
            if model.forecast_data:
                model.forecast_data.clear()
            if model.components:
                model.components.clear()
        
        self.models.clear()