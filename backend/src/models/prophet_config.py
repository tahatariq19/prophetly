"""Prophet configuration models for forecasting parameters."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import pandas as pd
from pydantic import BaseModel, Field, field_validator, model_validator


class CustomSeasonality(BaseModel):
    """Custom seasonality configuration for Prophet."""
    
    name: str = Field(description="Name of the seasonality component")
    period: float = Field(description="Period of the seasonality in days")
    fourier_order: int = Field(ge=1, le=50, description="Number of Fourier terms")
    prior_scale: float = Field(ge=0.01, le=10.0, default=10.0, description="Prior scale for seasonality")
    mode: str = Field(default="additive", description="Seasonality mode: additive or multiplicative")
    condition_name: Optional[str] = Field(default=None, description="Column name for conditional seasonality")
    
    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v):
        if v not in ['additive', 'multiplicative']:
            raise ValueError('Mode must be either "additive" or "multiplicative"')
        return v


class Holiday(BaseModel):
    """Holiday configuration for Prophet."""
    
    holiday: str = Field(description="Holiday name")
    ds: str = Field(description="Date in YYYY-MM-DD format")
    lower_window: int = Field(default=0, description="Days before holiday to include")
    upper_window: int = Field(default=0, description="Days after holiday to include")
    prior_scale: float = Field(default=10.0, ge=0.01, le=100.0, description="Prior scale for holiday effect")


class Regressor(BaseModel):
    """External regressor configuration for Prophet."""
    
    name: str = Field(description="Name of the regressor column")
    prior_scale: float = Field(default=10.0, ge=0.01, le=100.0, description="Prior scale for regressor")
    standardize: bool = Field(default=True, description="Whether to standardize the regressor")
    mode: str = Field(default="additive", description="Regressor mode: additive or multiplicative")
    
    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v):
        if v not in ['additive', 'multiplicative']:
            raise ValueError('Mode must be either "additive" or "multiplicative"')
        return v


class ForecastConfig(BaseModel):
    """Comprehensive Prophet forecasting configuration with JSON export/import."""
    
    # Basic forecasting parameters
    horizon: int = Field(ge=1, le=3650, default=30, description="Forecast horizon in days")
    interval_width: float = Field(ge=0.01, le=0.99, default=0.8, description="Confidence interval width")
    
    # Growth parameters
    growth: str = Field(default="linear", description="Growth mode: linear, logistic, or flat")
    cap: Optional[float] = Field(default=None, description="Carrying capacity for logistic growth")
    floor: Optional[float] = Field(default=None, description="Floor value for logistic growth")
    
    # Seasonality parameters
    yearly_seasonality: Union[bool, int, str] = Field(default="auto", description="Yearly seasonality: auto, True, False, or Fourier order")
    weekly_seasonality: Union[bool, int, str] = Field(default="auto", description="Weekly seasonality: auto, True, False, or Fourier order")
    daily_seasonality: Union[bool, int, str] = Field(default="auto", description="Daily seasonality: auto, True, False, or Fourier order")
    seasonality_mode: str = Field(default="additive", description="Seasonality mode: additive or multiplicative")
    seasonality_prior_scale: float = Field(default=10.0, ge=0.01, le=100.0, description="Prior scale for seasonality")
    
    # Trend parameters
    changepoint_prior_scale: float = Field(default=0.05, ge=0.001, le=0.5, description="Trend flexibility parameter")
    n_changepoints: int = Field(default=25, ge=0, le=100, description="Number of potential changepoints")
    changepoint_range: float = Field(default=0.8, ge=0.1, le=1.0, description="Proportion of history for changepoints")
    changepoints: Optional[List[str]] = Field(default=None, description="Custom changepoint dates (YYYY-MM-DD format)")
    
    # Holiday parameters
    holidays_prior_scale: float = Field(default=10.0, ge=0.01, le=100.0, description="Prior scale for holidays")
    holidays_country: Optional[str] = Field(default=None, description="Country code for built-in holidays")
    custom_holidays: List[Holiday] = Field(default_factory=list, description="Custom holiday definitions")
    
    # Uncertainty parameters
    mcmc_samples: int = Field(default=0, ge=0, le=2000, description="Number of MCMC samples for uncertainty")
    uncertainty_samples: Union[bool, int] = Field(default=1000, description="Number of uncertainty samples")
    
    # Advanced parameters
    custom_seasonalities: List[CustomSeasonality] = Field(default_factory=list, description="Custom seasonality components")
    regressors: List[Regressor] = Field(default_factory=list, description="External regressors")
    
    # Data frequency and processing
    freq: Optional[str] = Field(default=None, description="Data frequency (D, H, M, etc.)")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now, description="Configuration creation timestamp")
    name: Optional[str] = Field(default=None, description="Configuration name/description")
    template: Optional[str] = Field(default=None, description="Template used to create this configuration")
    
    @field_validator('growth')
    @classmethod
    def validate_growth(cls, v):
        if v not in ['linear', 'logistic', 'flat']:
            raise ValueError('Growth must be one of: linear, logistic, flat')
        return v
    
    @field_validator('seasonality_mode')
    @classmethod
    def validate_seasonality_mode(cls, v):
        if v not in ['additive', 'multiplicative']:
            raise ValueError('Seasonality mode must be either "additive" or "multiplicative"')
        return v
    
    @field_validator('changepoints')
    @classmethod
    def validate_changepoints(cls, v):
        if v is not None:
            for date_str in v:
                try:
                    datetime.strptime(date_str, '%Y-%m-%d')
                except ValueError:
                    raise ValueError(f'Invalid date format: {date_str}. Use YYYY-MM-DD format.')
        return v
    
    @model_validator(mode='after')
    def validate_logistic_growth(self):
        if self.growth == 'logistic' and self.cap is None:
            raise ValueError('Cap must be specified for logistic growth')
        return self
    
    def to_json(self, indent: int = 2) -> str:
        """Export configuration as JSON string for client-side download."""
        # Convert to dict and handle datetime serialization
        config_dict = self.model_dump()
        config_dict['created_at'] = self.created_at.isoformat()
        
        return json.dumps(config_dict, indent=indent, ensure_ascii=False)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'ForecastConfig':
        """Import configuration from JSON string (client upload)."""
        try:
            config_dict = json.loads(json_str)
            
            # Handle datetime parsing
            if 'created_at' in config_dict:
                config_dict['created_at'] = datetime.fromisoformat(config_dict['created_at'])
            
            return cls(**config_dict)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise ValueError(f"Invalid configuration format: {str(e)}")
    
    def to_prophet_params(self) -> Dict[str, Any]:
        """Convert configuration to Prophet model parameters."""
        params = {
            'growth': self.growth,
            'changepoint_prior_scale': self.changepoint_prior_scale,
            'seasonality_prior_scale': self.seasonality_prior_scale,
            'holidays_prior_scale': self.holidays_prior_scale,
            'seasonality_mode': self.seasonality_mode,
            'n_changepoints': self.n_changepoints,
            'changepoint_range': self.changepoint_range,
            'yearly_seasonality': self.yearly_seasonality,
            'weekly_seasonality': self.weekly_seasonality,
            'daily_seasonality': self.daily_seasonality,
            'mcmc_samples': self.mcmc_samples,
            'interval_width': self.interval_width,
            'uncertainty_samples': self.uncertainty_samples
        }
        
        # Handle optional parameters
        if self.changepoints:
            # Convert string dates to pandas datetime
            params['changepoints'] = pd.to_datetime(self.changepoints)
        
        # Handle holidays
        if self.custom_holidays or self.holidays_country:
            holidays_df = self._create_holidays_dataframe()
            if not holidays_df.empty:
                params['holidays'] = holidays_df
        
        return params
    
    def _create_holidays_dataframe(self) -> pd.DataFrame:
        """Create holidays DataFrame for Prophet."""
        holidays_data = []
        
        # Add custom holidays
        for holiday in self.custom_holidays:
            holidays_data.append({
                'holiday': holiday.holiday,
                'ds': pd.to_datetime(holiday.ds),
                'lower_window': holiday.lower_window,
                'upper_window': holiday.upper_window,
                'prior_scale': holiday.prior_scale
            })
        
        # Built-in holidays would be handled by Prophet's built-in functionality
        # This is a placeholder for custom holiday handling
        
        return pd.DataFrame(holidays_data) if holidays_data else pd.DataFrame()
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the configuration for display purposes."""
        return {
            'name': self.name or 'Unnamed Configuration',
            'template': self.template,
            'horizon': self.horizon,
            'growth': self.growth,
            'seasonality_mode': self.seasonality_mode,
            'has_custom_seasonalities': len(self.custom_seasonalities) > 0,
            'has_regressors': len(self.regressors) > 0,
            'has_custom_holidays': len(self.custom_holidays) > 0,
            'mcmc_enabled': self.mcmc_samples > 0,
            'created_at': self.created_at.isoformat()
        }


class ConfigTemplate(BaseModel):
    """Pre-configured templates for common use cases."""
    
    name: str = Field(description="Template name")
    description: str = Field(description="Template description")
    use_case: str = Field(description="Intended use case")
    config: ForecastConfig = Field(description="Template configuration")
    
    @classmethod
    def get_default_templates(cls) -> List['ConfigTemplate']:
        """Get default configuration templates for common use cases."""
        templates = []
        
        # E-commerce sales template
        ecommerce_config = ForecastConfig(
            name="E-commerce Sales Forecast",
            horizon=90,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="multiplicative",
            changepoint_prior_scale=0.1,
            seasonality_prior_scale=1.0,
            template="ecommerce"
        )
        
        templates.append(cls(
            name="E-commerce Sales",
            description="Optimized for daily sales data with strong weekly and yearly patterns",
            use_case="retail, e-commerce, sales forecasting",
            config=ecommerce_config
        ))
        
        # Website traffic template
        traffic_config = ForecastConfig(
            name="Website Traffic Forecast",
            horizon=30,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
            seasonality_mode="additive",
            changepoint_prior_scale=0.05,
            template="traffic"
        )
        
        templates.append(cls(
            name="Website Traffic",
            description="Designed for web analytics with daily, weekly, and yearly patterns",
            use_case="web analytics, user engagement, page views",
            config=traffic_config
        ))
        
        # Financial data template
        financial_config = ForecastConfig(
            name="Financial Time Series",
            horizon=60,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode="additive",
            changepoint_prior_scale=0.01,
            mcmc_samples=300,
            template="financial"
        )
        
        templates.append(cls(
            name="Financial Data",
            description="Conservative settings for financial time series with uncertainty quantification",
            use_case="stock prices, revenue, financial metrics",
            config=financial_config
        ))
        
        return templates