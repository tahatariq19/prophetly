"""Prophet forecasting service with configuration management."""

import gc
import logging
from typing import Any, Dict, List, Optional

import pandas as pd
from prophet import Prophet

from ..models.prophet_config import ConfigTemplate, ForecastConfig
from ..utils.memory import MemoryTracker


class ProphetConfigurationError(Exception):
    """Exception raised for Prophet configuration errors."""

    pass


class ProphetService:
    """Service for Prophet model configuration, instantiation, and management.
    
    This service provides:
    - Prophet model creation from ForecastConfig
    - Configuration validation and parameter conversion
    - Template management for common use cases
    - Memory-efficient model handling
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._templates = ConfigTemplate.get_default_templates()

    def create_model(self, config: ForecastConfig) -> Prophet:
        """Create and configure a Prophet model from ForecastConfig.
        
        Args:
            config: ForecastConfig instance with all parameters
            
        Returns:
            Configured Prophet model instance
            
        Raises:
            ProphetConfigurationError: If configuration is invalid

        """
        with MemoryTracker("create_prophet_model"):
            try:
                self.logger.info("Creating Prophet model with config: %s", config.name or "unnamed")

                # Convert config to Prophet parameters
                prophet_params = config.to_prophet_params()

                # Create Prophet model
                model = Prophet(**prophet_params)

                # Add custom seasonalities
                for seasonality in config.custom_seasonalities:
                    model.add_seasonality(
                        name=seasonality.name,
                        period=seasonality.period,
                        fourier_order=seasonality.fourier_order,
                        prior_scale=seasonality.prior_scale,
                        mode=seasonality.mode,
                        condition_name=seasonality.condition_name
                    )
                    self.logger.debug("Added custom seasonality: %s", seasonality.name)

                # Add regressors
                for regressor in config.regressors:
                    model.add_regressor(
                        name=regressor.name,
                        prior_scale=regressor.prior_scale,
                        standardize=regressor.standardize,
                        mode=regressor.mode
                    )
                    self.logger.debug("Added regressor: %s", regressor.name)

                self.logger.info("Prophet model created successfully")
                return model

            except Exception as e:
                self.logger.error("Failed to create Prophet model: %s", str(e))
                raise ProphetConfigurationError(f"Failed to create Prophet model: {str(e)}") from e

    def validate_config(self, config: ForecastConfig, data: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        """Validate Prophet configuration against data requirements.
        
        Args:
            config: ForecastConfig to validate
            data: Optional DataFrame to validate against
            
        Returns:
            Dictionary with validation results

        """
        with MemoryTracker("validate_prophet_config"):
            validation_result = {
                'is_valid': True,
                'errors': [],
                'warnings': [],
                'recommendations': []
            }

            try:
                # Basic configuration validation
                if config.growth == 'logistic' and config.cap is None:
                    validation_result['errors'].append("Logistic growth requires a cap value")
                    validation_result['is_valid'] = False

                if config.cap is not None and config.floor is not None:
                    if config.floor >= config.cap:
                        validation_result['errors'].append("Floor must be less than cap")
                        validation_result['is_valid'] = False

                # Validate custom seasonalities
                seasonality_names = set()
                for seasonality in config.custom_seasonalities:
                    if seasonality.name in seasonality_names:
                        validation_result['errors'].append(f"Duplicate seasonality name: {seasonality.name}")
                        validation_result['is_valid'] = False
                    seasonality_names.add(seasonality.name)

                    if seasonality.period <= 0:
                        validation_result['errors'].append(f"Seasonality period must be positive: {seasonality.name}")
                        validation_result['is_valid'] = False

                # Validate regressors
                regressor_names = set()
                for regressor in config.regressors:
                    if regressor.name in regressor_names:
                        validation_result['errors'].append(f"Duplicate regressor name: {regressor.name}")
                        validation_result['is_valid'] = False
                    regressor_names.add(regressor.name)

                # Data-specific validation
                if data is not None:
                    data_validation = self._validate_config_against_data(config, data)
                    validation_result['errors'].extend(data_validation['errors'])
                    validation_result['warnings'].extend(data_validation['warnings'])
                    validation_result['recommendations'].extend(data_validation['recommendations'])
                    if not data_validation['is_valid']:
                        validation_result['is_valid'] = False

                # Performance warnings
                if config.mcmc_samples > 1000:
                    validation_result['warnings'].append(
                        f"High MCMC samples ({config.mcmc_samples}) may result in slow fitting"
                    )

                if len(config.custom_seasonalities) > 5:
                    validation_result['warnings'].append(
                        "Many custom seasonalities may lead to overfitting"
                    )

                self.logger.info("Configuration validation completed: valid=%s", validation_result['is_valid'])
                return validation_result

            except Exception as e:
                self.logger.error("Configuration validation failed: %s", str(e))
                validation_result['errors'].append(f"Validation error: {str(e)}")
                validation_result['is_valid'] = False
                return validation_result

    def _validate_config_against_data(self, config: ForecastConfig, data: pd.DataFrame) -> Dict[str, Any]:
        """Validate configuration against actual data."""
        validation_updates = {
            'errors': [],
            'warnings': [],
            'recommendations': [],
            'is_valid': True
        }

        try:
            # Check if data has required columns for regressors
            data_columns = set(data.columns)
            for regressor in config.regressors:
                if regressor.name not in data_columns:
                    validation_updates['errors'].append(
                        f"Regressor column '{regressor.name}' not found in data"
                    )
                    validation_updates['is_valid'] = False

            # Check data length vs horizon
            if len(data) < config.horizon * 2:
                validation_updates['warnings'].append(
                    f"Data length ({len(data)}) is less than 2x forecast horizon ({config.horizon})"
                )
                validation_updates['recommendations'].append(
                    "Consider reducing forecast horizon or providing more historical data"
                )

            # Check for logistic growth cap/floor vs data range
            if config.growth == 'logistic' and 'y' in data.columns:
                data_max = data['y'].max()
                data_min = data['y'].min()

                if config.cap is not None and config.cap < data_max:
                    validation_updates['warnings'].append(
                        f"Cap value ({config.cap}) is below maximum data value ({data_max})"
                    )

                if config.floor is not None and config.floor > data_min:
                    validation_updates['warnings'].append(
                        f"Floor value ({config.floor}) is above minimum data value ({data_min})"
                    )

        except Exception as e:
            validation_updates['warnings'].append(f"Data validation warning: {str(e)}")

        return validation_updates

    def get_templates(self) -> List[ConfigTemplate]:
        """Get available configuration templates."""
        return self._templates.copy()

    def get_template_by_name(self, name: str) -> Optional[ConfigTemplate]:
        """Get a specific template by name."""
        for template in self._templates:
            if template.name == name:
                return template
        return None

    def create_config_from_template(self, template_name: str, **overrides) -> ForecastConfig:
        """Create a configuration from a template with optional parameter overrides.
        
        Args:
            template_name: Name of the template to use
            **overrides: Parameters to override in the template
            
        Returns:
            ForecastConfig instance based on template
            
        Raises:
            ProphetConfigurationError: If template not found

        """
        template = self.get_template_by_name(template_name)
        if template is None:
            raise ProphetConfigurationError(f"Template '{template_name}' not found")

        # Create config from template
        config_dict = template.config.model_dump()

        # Apply overrides
        config_dict.update(overrides)

        # Create new config
        return ForecastConfig(**config_dict)

    def export_config_json(self, config: ForecastConfig) -> str:
        """Export configuration as JSON string for client download."""
        return config.to_json()

    def import_config_json(self, json_str: str) -> ForecastConfig:
        """Import configuration from JSON string (client upload)."""
        try:
            config = ForecastConfig.from_json(json_str)

            # Validate imported configuration
            validation_result = self.validate_config(config)
            if not validation_result['is_valid']:
                error_msg = "; ".join(validation_result['errors'])
                raise ProphetConfigurationError(f"Invalid imported configuration: {error_msg}")

            self.logger.info("Configuration imported successfully: %s", config.name or "unnamed")
            return config

        except Exception as e:
            self.logger.error("Failed to import configuration: %s", str(e))
            raise ProphetConfigurationError(f"Failed to import configuration: {str(e)}") from e

    def get_config_summary(self, config: ForecastConfig) -> Dict[str, Any]:
        """Get a human-readable summary of the configuration."""
        return config.get_summary()

    def fit_model(self, model: Prophet, data: pd.DataFrame) -> Prophet:
        """Fit Prophet model with training data.
        
        Args:
            model: Prophet model instance
            data: Training data with 'ds' and 'y' columns
            
        Returns:
            Fitted Prophet model
            
        Raises:
            ProphetConfigurationError: If fitting fails

        """
        with MemoryTracker("fit_prophet_model"):
            try:
                self.logger.info("Fitting Prophet model with %d data points", len(data))

                # Validate data format
                if 'ds' not in data.columns or 'y' not in data.columns:
                    raise ProphetConfigurationError("Data must have 'ds' and 'y' columns")

                # Ensure ds is datetime
                if not pd.api.types.is_datetime64_any_dtype(data['ds']):
                    data = data.copy()
                    data['ds'] = pd.to_datetime(data['ds'])

                # Fit the model
                model.fit(data)

                self.logger.info("Prophet model fitted successfully")
                return model

            except Exception as e:
                self.logger.error("Failed to fit Prophet model: %s", str(e))
                raise ProphetConfigurationError(f"Failed to fit Prophet model: {str(e)}") from e

    def predict(self, model: Prophet, future: pd.DataFrame) -> pd.DataFrame:
        """Generate predictions using fitted Prophet model.
        
        Args:
            model: Fitted Prophet model
            future: Future dataframe with dates and regressors
            
        Returns:
            DataFrame with predictions and confidence intervals
            
        Raises:
            ProphetConfigurationError: If prediction fails

        """
        with MemoryTracker("prophet_predict"):
            try:
                self.logger.info("Generating predictions for %d periods", len(future))

                # Generate forecast
                forecast = model.predict(future)

                self.logger.info("Predictions generated successfully")
                return forecast

            except Exception as e:
                self.logger.error("Failed to generate predictions: %s", str(e))
                raise ProphetConfigurationError(f"Failed to generate predictions: {str(e)}") from e

    def get_components(self, model: Prophet, forecast: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """Extract component decomposition from Prophet forecast.
        
        Args:
            model: Fitted Prophet model
            forecast: Forecast dataframe from model.predict()
            
        Returns:
            Dictionary with component dataframes
            
        Raises:
            ProphetConfigurationError: If component extraction fails

        """
        with MemoryTracker("extract_components"):
            try:
                self.logger.info("Extracting forecast components")

                components = {}

                # Main components that are always available
                if 'trend' in forecast.columns:
                    components['trend'] = forecast[['ds', 'trend']].copy()

                # Seasonal components
                seasonal_cols = ['yearly', 'weekly', 'daily']
                for col in seasonal_cols:
                    if col in forecast.columns:
                        components[col] = forecast[['ds', col]].copy()

                # Holiday effects
                if 'holidays' in forecast.columns:
                    components['holidays'] = forecast[['ds', 'holidays']].copy()

                # Additional terms
                if 'additive_terms' in forecast.columns:
                    components['additive_terms'] = forecast[['ds', 'additive_terms']].copy()

                if 'multiplicative_terms' in forecast.columns:
                    components['multiplicative_terms'] = forecast[['ds', 'multiplicative_terms']].copy()

                # Custom seasonalities and regressors
                for col in forecast.columns:
                    if col.startswith('extra_regressors_') or col.endswith('_seasonal'):
                        if col not in ['additive_terms', 'multiplicative_terms']:
                            components[col] = forecast[['ds', col]].copy()

                self.logger.info("Extracted %d components", len(components))
                return components

            except Exception as e:
                self.logger.error("Failed to extract components: %s", str(e))
                raise ProphetConfigurationError(f"Failed to extract components: {str(e)}") from e

    def cross_validate(self, model: Prophet, data: pd.DataFrame,
                      initial: str = '730 days', period: str = '180 days',
                      horizon: str = '365 days') -> pd.DataFrame:
        """Perform cross-validation on Prophet model.
        
        Args:
            model: Prophet model instance (will be fitted multiple times)
            data: Historical data for cross-validation
            initial: Initial training period
            period: Period between cutoff dates
            horizon: Forecast horizon for each cutoff
            
        Returns:
            DataFrame with cross-validation results
            
        Raises:
            ProphetConfigurationError: If cross-validation fails

        """
        with MemoryTracker("prophet_cross_validate"):
            try:
                from prophet.diagnostics import cross_validation

                self.logger.info("Starting cross-validation with initial=%s, period=%s, horizon=%s",
                               initial, period, horizon)

                # Perform cross-validation
                cv_results = cross_validation(
                    model,
                    data,
                    initial=initial,
                    period=period,
                    horizon=horizon
                )

                self.logger.info("Cross-validation completed with %d cutoffs",
                               len(cv_results['cutoff'].unique()))
                return cv_results

            except Exception as e:
                self.logger.error("Cross-validation failed: %s", str(e))
                raise ProphetConfigurationError(f"Cross-validation failed: {str(e)}") from e

    def calculate_performance_metrics(self, cv_results: pd.DataFrame) -> Dict[str, float]:
        """Calculate performance metrics from cross-validation results.
        
        Args:
            cv_results: Cross-validation results from cross_validate()
            
        Returns:
            Dictionary with performance metrics

        """
        with MemoryTracker("calculate_metrics"):
            try:
                from prophet.diagnostics import performance_metrics

                self.logger.info("Calculating performance metrics")

                # Calculate standard metrics
                metrics = performance_metrics(cv_results)

                # Convert to dictionary with float values
                metrics_dict = {}
                for col in metrics.columns:
                    if col != 'horizon':
                        metrics_dict[col] = float(metrics[col].mean())

                self.logger.info("Performance metrics calculated: %s", list(metrics_dict.keys()))
                return metrics_dict

            except Exception as e:
                self.logger.error("Failed to calculate metrics: %s", str(e))
                return {}

    def cleanup_model(self, model: Prophet) -> None:
        """Clean up Prophet model to free memory."""
        try:
            # Clear model data
            if hasattr(model, 'history'):
                del model.history
            if hasattr(model, 'history_dates'):
                del model.history_dates
            if hasattr(model, 'train_component_cols'):
                del model.train_component_cols

            # Force garbage collection
            gc.collect()

            self.logger.debug("Prophet model cleaned up")

        except Exception as e:
            self.logger.warning("Error during model cleanup: %s", str(e))


# Global service instance
prophet_service = ProphetService()
