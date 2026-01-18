"""Pydantic schemas for Prophet API requests and responses."""
from typing import Optional
from pydantic import BaseModel, Field


class DataPoint(BaseModel):
    """Single data point with date and value."""
    ds: str = Field(..., description="Date in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format")
    y: float = Field(..., description="Value to forecast")
    cap: Optional[float] = Field(None, description="Capacity for logistic growth")
    floor: Optional[float] = Field(None, description="Floor for logistic growth")


class Holiday(BaseModel):
    """Custom holiday definition."""
    holiday: str = Field(..., description="Holiday name")
    ds: str = Field(..., description="Holiday date")
    lower_window: int = Field(0, description="Days before holiday to include")
    upper_window: int = Field(0, description="Days after holiday to include")


class CustomSeasonality(BaseModel):
    """Custom seasonality definition."""
    name: str = Field(..., description="Seasonality name")
    period: float = Field(..., description="Period in days")
    fourier_order: int = Field(..., description="Number of Fourier terms")
    prior_scale: Optional[float] = Field(10.0, description="Prior scale for regularization")
    mode: Optional[str] = Field(None, description="'additive' or 'multiplicative'")


class Regressor(BaseModel):
    """Additional regressor definition."""
    name: str = Field(..., description="Regressor column name")
    prior_scale: Optional[float] = Field(None, description="Prior scale")
    standardize: Optional[bool] = Field(True, description="Whether to standardize")
    mode: Optional[str] = Field(None, description="'additive' or 'multiplicative'")


class RegressorData(BaseModel):
    """Regressor values for a data point."""
    ds: str
    values: dict[str, float] = Field(default_factory=dict)


class ModelConfig(BaseModel):
    """Prophet model configuration."""
    # Growth
    growth: str = Field("linear", description="'linear', 'logistic', or 'flat'")
    
    # Changepoints
    n_changepoints: int = Field(25, description="Number of potential changepoints")
    changepoint_range: float = Field(0.8, description="Proportion of history for changepoints")
    changepoint_prior_scale: float = Field(0.05, description="Flexibility of changepoints")
    changepoints: Optional[list[str]] = Field(None, description="Manual changepoint dates")
    
    # Seasonality
    yearly_seasonality: str | int | bool = Field("auto", description="Yearly seasonality")
    weekly_seasonality: str | int | bool = Field("auto", description="Weekly seasonality")
    daily_seasonality: str | int | bool = Field("auto", description="Daily seasonality")
    seasonality_mode: str = Field("additive", description="'additive' or 'multiplicative'")
    seasonality_prior_scale: float = Field(10.0, description="Seasonality prior scale")
    
    # Holidays
    holidays_prior_scale: float = Field(10.0, description="Holidays prior scale")
    country_holidays: Optional[str] = Field(None, description="Country code for built-in holidays")
    
    # Uncertainty
    interval_width: float = Field(0.8, description="Uncertainty interval width")
    mcmc_samples: int = Field(0, description="MCMC samples (0 for MAP estimation)")
    
    # Custom components
    custom_seasonalities: list[CustomSeasonality] = Field(default_factory=list)
    holidays: list[Holiday] = Field(default_factory=list)
    regressors: list[Regressor] = Field(default_factory=list)


class ForecastRequest(BaseModel):
    """Request to generate a forecast."""
    data: list[DataPoint] = Field(..., description="Historical data")
    config: ModelConfig = Field(default_factory=ModelConfig)
    periods: int = Field(30, description="Number of periods to forecast")
    freq: str = Field("D", description="Frequency: D, H, W, M, etc.")
    regressor_data: Optional[list[RegressorData]] = Field(None, description="Regressor values")
    future_regressor_data: Optional[list[RegressorData]] = Field(None, description="Future regressor values")


class ForecastPoint(BaseModel):
    """Single forecast point."""
    ds: str
    yhat: float
    yhat_lower: float
    yhat_upper: float
    trend: float
    trend_lower: Optional[float] = None
    trend_upper: Optional[float] = None


class ComponentData(BaseModel):
    """Seasonality/holiday component data."""
    ds: list[str]
    values: list[float]
    lower: Optional[list[float]] = None
    upper: Optional[list[float]] = None


class ForecastResponse(BaseModel):
    """Forecast response with predictions and components."""
    forecast: list[ForecastPoint]
    components: dict[str, ComponentData] = Field(default_factory=dict)
    changepoints: list[str] = Field(default_factory=list)


class CrossValidationRequest(BaseModel):
    """Request for cross-validation."""
    data: list[DataPoint]
    config: ModelConfig = Field(default_factory=ModelConfig)
    initial: str = Field("730 days", description="Initial training period")
    period: str = Field("180 days", description="Spacing between cutoff dates")
    horizon: str = Field("365 days", description="Forecast horizon")
    regressor_data: Optional[list[RegressorData]] = Field(None)


class PerformanceMetrics(BaseModel):
    """Performance metrics from cross-validation."""
    horizon: list[str]
    mse: list[float]
    rmse: list[float]
    mae: list[float]
    mape: list[float]
    mdape: list[float]
    coverage: list[float]


class CrossValidationResponse(BaseModel):
    """Cross-validation response."""
    cv_results: list[dict]
    metrics: PerformanceMetrics
