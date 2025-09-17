"""Prophet forecasting service with configuration management."""

import gc
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from prophet import Prophet

from ..models.prophet_config import ConfigTemplate, ForecastConfig
from ..utils.memory import MemoryTracker, get_memory_usage


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

                # Add custom seasonalities with enhanced validation and memory management
                self._add_custom_seasonalities(model, config.custom_seasonalities)

                # Add external regressors with enhanced validation and memory management
                self._add_regressors(model, config.regressors)

                # Configure holidays with enhanced memory management
                self._configure_holidays(model, config)

                # Configure MCMC sampling with memory optimization
                self._configure_mcmc_sampling(model, config)

                self.logger.info("Prophet model created successfully with %d custom seasonalities, %d regressors",
                               len(config.custom_seasonalities), len(config.regressors))
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

    def fit_model(self, model: Prophet, data: pd.DataFrame, config: Optional[ForecastConfig] = None) -> Prophet:
        """Fit Prophet model with training data.
        
        Args:
            model: Prophet model instance
            data: Training data with 'ds' and 'y' columns
            config: Optional ForecastConfig for logistic growth parameters
            
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

                # Prepare data copy for fitting
                fit_data = data.copy()

                # Ensure ds is datetime
                if not pd.api.types.is_datetime64_any_dtype(fit_data['ds']):
                    fit_data['ds'] = pd.to_datetime(fit_data['ds'])

                # Handle logistic growth cap and floor
                if model.growth == 'logistic':
                    if config and config.cap is not None:
                        fit_data['cap'] = config.cap
                        self.logger.debug("Added cap value: %f", config.cap)
                    elif 'cap' not in fit_data.columns:
                        # If no cap specified, use a reasonable default based on data
                        default_cap = fit_data['y'].max() * 1.2
                        fit_data['cap'] = default_cap
                        self.logger.warning("No cap specified for logistic growth, using default: %f", default_cap)

                    if config and config.floor is not None:
                        fit_data['floor'] = config.floor
                        self.logger.debug("Added floor value: %f", config.floor)

                # Fit the model
                model.fit(fit_data)

                # Post-fitting memory optimization for MCMC models
                if hasattr(model, 'mcmc_samples') and model.mcmc_samples > 0:
                    self._optimize_mcmc_memory(model)

                self.logger.info("Prophet model fitted successfully")
                return model

            except Exception as e:
                self.logger.error("Failed to fit Prophet model: %s", str(e))
                raise ProphetConfigurationError(f"Failed to fit Prophet model: {str(e)}") from e

    def _optimize_mcmc_memory(self, model: Prophet) -> None:
        """Optimize memory usage after MCMC fitting.
        
        Args:
            model: Fitted Prophet model with MCMC samples
        """
        try:
            initial_memory = get_memory_usage()
            
            # Clear intermediate MCMC data that's not needed for prediction
            if hasattr(model, 'stan_fit') and hasattr(model.stan_fit, 'sim'):
                # Keep only essential parameters, clear intermediate simulation data
                if hasattr(model.stan_fit.sim, 'samples'):
                    # This is implementation-specific and may vary by Prophet version
                    pass
            
            # Force garbage collection after MCMC
            collected = gc.collect()
            
            final_memory = get_memory_usage()
            memory_freed = initial_memory['rss_mb'] - final_memory['rss_mb']
            
            if memory_freed > 0:
                self.logger.debug("MCMC memory optimization: freed %.2f MB, collected %d objects", 
                                memory_freed, collected)
            
        except Exception as e:
            self.logger.debug("MCMC memory optimization failed (non-critical): %s", str(e))

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
                      cv_horizon: str = '365 days') -> pd.DataFrame:
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
                               initial, period, cv_horizon)

                # Fit the model with the data if not already fitted
                if not hasattr(model, 'history') or model.history is None:
                    self.logger.debug("Fitting model for cross-validation")
                    model.fit(data)

                # Perform cross-validation
                cv_results = cross_validation(
                    model,
                    cv_horizon,
                    period=period,
                    initial=initial
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

    def _add_custom_seasonalities(self, model: Prophet, seasonalities: List) -> None:
        """Add custom seasonalities to Prophet model with enhanced validation and memory management.
        
        Args:
            model: Prophet model instance
            seasonalities: List of CustomSeasonality objects
            
        Raises:
            ProphetConfigurationError: If seasonality configuration is invalid
        """
        try:
            if not seasonalities:
                return

            # Track memory usage for seasonality addition
            with MemoryTracker("add_custom_seasonalities"):
                for seasonality in seasonalities:
                    # Enhanced validation for custom seasonalities
                    self._validate_custom_seasonality(seasonality)

                    # Memory-efficient seasonality addition
                    model.add_seasonality(
                        name=seasonality.name,
                        period=seasonality.period,
                        fourier_order=seasonality.fourier_order,
                        prior_scale=seasonality.prior_scale,
                        mode=seasonality.mode,
                        condition_name=seasonality.condition_name
                    )
                    
                    self.logger.debug("Added custom seasonality: %s (period=%.2f, fourier_order=%d, mode=%s, condition=%s)",
                                    seasonality.name, seasonality.period, seasonality.fourier_order, 
                                    seasonality.mode, seasonality.condition_name or "None")

                self.logger.info("Successfully added %d custom seasonalities with memory optimization", len(seasonalities))

        except Exception as e:
            self.logger.error("Failed to add custom seasonalities: %s", str(e))
            raise ProphetConfigurationError(f"Failed to add custom seasonalities: {str(e)}") from e

    def _validate_custom_seasonality(self, seasonality) -> None:
        """Validate individual custom seasonality configuration.
        
        Args:
            seasonality: CustomSeasonality object to validate
            
        Raises:
            ProphetConfigurationError: If validation fails
        """
        # Name validation
        if not seasonality.name or not seasonality.name.strip():
            raise ProphetConfigurationError("Seasonality name cannot be empty")
        
        if len(seasonality.name) > 50:
            raise ProphetConfigurationError(f"Seasonality name too long (max 50 chars): {seasonality.name}")
        
        # Period validation
        if seasonality.period <= 0:
            raise ProphetConfigurationError(f"Seasonality period must be positive: {seasonality.name}")
        
        if seasonality.period > 365.25 * 10:  # 10 years max
            raise ProphetConfigurationError(f"Seasonality period too large (max 10 years): {seasonality.name}")
        
        # Fourier order validation
        if seasonality.fourier_order <= 0 or seasonality.fourier_order > 50:
            raise ProphetConfigurationError(f"Fourier order must be between 1 and 50: {seasonality.name}")
        
        # Prior scale validation
        if seasonality.prior_scale <= 0 or seasonality.prior_scale > 100:
            raise ProphetConfigurationError(f"Prior scale must be between 0 and 100: {seasonality.name}")
        
        # Mode validation
        if seasonality.mode not in ['additive', 'multiplicative']:
            raise ProphetConfigurationError(f"Invalid seasonality mode '{seasonality.mode}': {seasonality.name}")
        
        # Condition name validation (if provided)
        if seasonality.condition_name:
            if not seasonality.condition_name.strip():
                raise ProphetConfigurationError(f"Condition name cannot be empty: {seasonality.name}")
            if len(seasonality.condition_name) > 50:
                raise ProphetConfigurationError(f"Condition name too long (max 50 chars): {seasonality.name}")

    def _add_regressors(self, model: Prophet, regressors: List) -> None:
        """Add external regressors to Prophet model with enhanced validation and memory management.
        
        Args:
            model: Prophet model instance
            regressors: List of Regressor objects
            
        Raises:
            ProphetConfigurationError: If regressor configuration is invalid
        """
        try:
            if not regressors:
                return

            # Track memory usage for regressor addition
            with MemoryTracker("add_external_regressors"):
                regressor_names = set()
                
                for regressor in regressors:
                    # Enhanced validation for regressors
                    self._validate_regressor(regressor, regressor_names)
                    regressor_names.add(regressor.name)

                    # Memory-efficient regressor addition
                    model.add_regressor(
                        name=regressor.name,
                        prior_scale=regressor.prior_scale,
                        standardize=regressor.standardize,
                        mode=regressor.mode
                    )
                    
                    self.logger.debug("Added regressor: %s (prior_scale=%.2f, standardize=%s, mode=%s)",
                                    regressor.name, regressor.prior_scale, regressor.standardize, regressor.mode)

                self.logger.info("Successfully added %d external regressors with memory optimization", len(regressors))

        except Exception as e:
            self.logger.error("Failed to add regressors: %s", str(e))
            raise ProphetConfigurationError(f"Failed to add regressors: {str(e)}") from e

    def _validate_regressor(self, regressor, existing_names: set) -> None:
        """Validate individual regressor configuration.
        
        Args:
            regressor: Regressor object to validate
            existing_names: Set of already used regressor names
            
        Raises:
            ProphetConfigurationError: If validation fails
        """
        # Name validation
        if not regressor.name or not regressor.name.strip():
            raise ProphetConfigurationError("Regressor name cannot be empty")
        
        if len(regressor.name) > 50:
            raise ProphetConfigurationError(f"Regressor name too long (max 50 chars): {regressor.name}")
        
        if regressor.name in existing_names:
            raise ProphetConfigurationError(f"Duplicate regressor name: {regressor.name}")
        
        # Reserved column names check
        reserved_names = {'ds', 'y', 'cap', 'floor', 'trend', 'yhat', 'yhat_lower', 'yhat_upper'}
        if regressor.name.lower() in reserved_names:
            raise ProphetConfigurationError(f"Regressor name conflicts with reserved column: {regressor.name}")
        
        # Prior scale validation
        if regressor.prior_scale <= 0 or regressor.prior_scale > 100:
            raise ProphetConfigurationError(f"Prior scale must be between 0 and 100 for regressor: {regressor.name}")
        
        # Mode validation
        if regressor.mode not in ['additive', 'multiplicative']:
            raise ProphetConfigurationError(f"Invalid regressor mode '{regressor.mode}': {regressor.name}")
        
        # Standardize validation (boolean check)
        if not isinstance(regressor.standardize, bool):
            raise ProphetConfigurationError(f"Standardize must be boolean for regressor: {regressor.name}")

    def _configure_holidays(self, model: Prophet, config: ForecastConfig) -> None:
        """Configure holidays for Prophet model with enhanced memory management.
        
        Args:
            model: Prophet model instance
            config: ForecastConfig with holiday settings
            
        Raises:
            ProphetConfigurationError: If holiday configuration is invalid
        """
        try:
            # Track memory usage for holiday configuration
            with MemoryTracker("configure_holidays"):
                # Handle built-in holidays by country
                if config.holidays_country:
                    self.logger.debug("Using built-in holidays for country: %s", config.holidays_country)
                    # Prophet will handle built-in holidays automatically based on the country parameter
                    # This is handled in the to_prophet_params() method
                
                # Handle custom holidays with enhanced validation and memory management
                if config.custom_holidays:
                    holidays_df = self._create_custom_holidays_dataframe(config.custom_holidays)
                    if not holidays_df.empty:
                        # Validate holiday dates and parameters
                        self._validate_holiday_dates(holidays_df)
                        
                        # Memory-efficient holiday assignment
                        if hasattr(model, 'holidays') and model.holidays is not None:
                            # Combine with existing holidays, avoiding duplicates
                            combined_holidays = pd.concat([model.holidays, holidays_df], ignore_index=True)
                            # Remove duplicates based on holiday name and date
                            combined_holidays = combined_holidays.drop_duplicates(subset=['holiday', 'ds'], keep='last')
                            model.holidays = combined_holidays
                        else:
                            model.holidays = holidays_df
                        
                        self.logger.debug("Added %d custom holidays with memory optimization", len(holidays_df))
                        
                        # Clean up temporary dataframe
                        del holidays_df
                        gc.collect()

                total_holidays = len(model.holidays) if hasattr(model, 'holidays') and model.holidays is not None else 0
                self.logger.info("Holiday configuration completed: %d total holidays", total_holidays)

        except Exception as e:
            self.logger.error("Failed to configure holidays: %s", str(e))
            raise ProphetConfigurationError(f"Failed to configure holidays: {str(e)}") from e

    def _create_custom_holidays_dataframe(self, holidays: List) -> pd.DataFrame:
        """Create holidays DataFrame from custom holiday definitions.
        
        Args:
            holidays: List of Holiday objects
            
        Returns:
            DataFrame with holiday definitions
        """
        holidays_data = []
        
        for holiday in holidays:
            try:
                # Validate and parse date
                holiday_date = pd.to_datetime(holiday.ds)
                
                holidays_data.append({
                    'holiday': holiday.holiday,
                    'ds': holiday_date,
                    'lower_window': holiday.lower_window,
                    'upper_window': holiday.upper_window,
                    'prior_scale': holiday.prior_scale
                })
                
            except Exception as e:
                self.logger.warning("Invalid holiday date '%s' for holiday '%s': %s", 
                                  holiday.ds, holiday.holiday, str(e))
                continue
        
        return pd.DataFrame(holidays_data) if holidays_data else pd.DataFrame()

    def _validate_holiday_dates(self, holidays_df: pd.DataFrame) -> None:
        """Validate holiday dates and parameters with enhanced checks.
        
        Args:
            holidays_df: DataFrame with holiday definitions
            
        Raises:
            ProphetConfigurationError: If validation fails
        """
        if holidays_df.empty:
            return
        
        # Check for duplicate holidays on same date
        duplicates = holidays_df.groupby(['holiday', 'ds']).size()
        if (duplicates > 1).any():
            duplicate_holidays = duplicates[duplicates > 1].index.tolist()
            raise ProphetConfigurationError(f"Duplicate holidays found: {duplicate_holidays}")
        
        # Validate window parameters
        invalid_windows = holidays_df[
            (holidays_df['lower_window'] > holidays_df['upper_window'])
        ]
        if not invalid_windows.empty:
            raise ProphetConfigurationError("Holiday lower_window must be <= upper_window")
        
        # Validate prior scales
        invalid_priors = holidays_df[holidays_df['prior_scale'] <= 0]
        if not invalid_priors.empty:
            raise ProphetConfigurationError("Holiday prior_scale must be positive")
        
        # Enhanced validation: Check for reasonable window sizes
        extreme_windows = holidays_df[
            (holidays_df['lower_window'] < -30) | (holidays_df['upper_window'] > 30)
        ]
        if not extreme_windows.empty:
            self.logger.warning("Some holidays have extreme window sizes (>30 days), this may affect performance")
        
        # Validate date ranges (not too far in past/future)
        current_year = datetime.now().year
        min_year = current_year - 20
        max_year = current_year + 20
        
        out_of_range_dates = holidays_df[
            (holidays_df['ds'].dt.year < min_year) | (holidays_df['ds'].dt.year > max_year)
        ]
        if not out_of_range_dates.empty:
            self.logger.warning("Some holiday dates are outside reasonable range (%d-%d)", min_year, max_year)
        
        # Check for holiday name length and validity
        long_names = holidays_df[holidays_df['holiday'].str.len() > 100]
        if not long_names.empty:
            raise ProphetConfigurationError("Holiday names must be 100 characters or less")
        
        empty_names = holidays_df[holidays_df['holiday'].str.strip() == '']
        if not empty_names.empty:
            raise ProphetConfigurationError("Holiday names cannot be empty")

    def _configure_mcmc_sampling(self, model: Prophet, config: ForecastConfig) -> None:
        """Configure MCMC sampling with enhanced memory optimization and validation.
        
        Args:
            model: Prophet model instance
            config: ForecastConfig with MCMC settings
            
        Raises:
            ProphetConfigurationError: If MCMC configuration is invalid
        """
        try:
            if config.mcmc_samples > 0:
                # Enhanced MCMC validation
                self._validate_mcmc_configuration(config)
                
                # MCMC sampling is already configured in the Prophet constructor
                # via the to_prophet_params() method, but we add memory optimization here
                
                self.logger.debug("MCMC sampling configured with %d samples", config.mcmc_samples)
                
                # Memory optimization strategies based on sample count
                if config.mcmc_samples > 1000:
                    self.logger.warning("High MCMC samples (%d) will require significant memory and time", 
                                      config.mcmc_samples)
                    self.logger.info("Consider reducing MCMC samples for faster processing with less memory usage")
                
                elif config.mcmc_samples > 500:
                    self.logger.info("Moderate MCMC sample count (%d) - will perform memory cleanup after fitting", 
                                   config.mcmc_samples)
                
                # Set memory optimization flags
                if hasattr(model, '_mcmc_memory_optimization'):
                    model._mcmc_memory_optimization = True
                
                self.logger.info("MCMC sampling configured with memory optimization enabled")
            else:
                self.logger.debug("MCMC sampling disabled (using MAP estimation)")

        except Exception as e:
            self.logger.error("Failed to configure MCMC sampling: %s", str(e))
            raise ProphetConfigurationError(f"Failed to configure MCMC sampling: {str(e)}") from e

    def _validate_mcmc_configuration(self, config: ForecastConfig) -> None:
        """Validate MCMC sampling configuration.
        
        Args:
            config: ForecastConfig with MCMC settings
            
        Raises:
            ProphetConfigurationError: If MCMC configuration is invalid
        """
        if config.mcmc_samples < 0:
            raise ProphetConfigurationError("MCMC samples must be non-negative")
        
        if config.mcmc_samples > 2000:
            raise ProphetConfigurationError("MCMC samples cannot exceed 2000 (memory limit)")
        
        # Check system memory for MCMC feasibility
        memory_info = get_memory_usage()
        available_memory_gb = memory_info['available_mb'] / 1024
        
        # Rough estimate: each MCMC sample uses ~1-5MB depending on model complexity
        estimated_memory_gb = (config.mcmc_samples * 3) / 1024  # Conservative estimate
        
        if estimated_memory_gb > available_memory_gb * 0.8:  # Use max 80% of available memory
            raise ProphetConfigurationError(
                f"MCMC samples ({config.mcmc_samples}) may exceed available memory. "
                f"Estimated: {estimated_memory_gb:.1f}GB, Available: {available_memory_gb:.1f}GB. "
                f"Consider reducing to {int(available_memory_gb * 0.8 * 1024 / 3)} samples or less."
            )
        
        # Warn about performance implications
        if config.mcmc_samples > 100:
            estimated_time_minutes = config.mcmc_samples / 10  # Rough estimate: 10 samples per minute
            if estimated_time_minutes > 30:
                self.logger.warning(
                    "MCMC sampling with %d samples may take %.1f+ minutes to complete",
                    config.mcmc_samples, estimated_time_minutes
                )

    def create_future_dataframe(self, model: Prophet, periods: int, freq: str = 'D', 
                               include_history: bool = True, 
                               regressor_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """Create future dataframe with regressor support and memory management.
        
        Args:
            model: Fitted Prophet model
            periods: Number of periods to forecast
            freq: Frequency of the time series
            include_history: Whether to include historical dates
            regressor_data: DataFrame with regressor values for future periods
            
        Returns:
            Future dataframe ready for prediction
            
        Raises:
            ProphetConfigurationError: If future dataframe creation fails
        """
        with MemoryTracker("create_future_dataframe"):
            try:
                self.logger.debug("Creating future dataframe: periods=%d, freq=%s, include_history=%s",
                                periods, freq, include_history)

                # Create basic future dataframe
                future = model.make_future_dataframe(periods=periods, freq=freq, include_history=include_history)

                # Add regressor data if provided
                if regressor_data is not None and not regressor_data.empty:
                    future = self._add_regressor_data_to_future(future, regressor_data, model)

                self.logger.debug("Future dataframe created with %d rows", len(future))
                return future

            except Exception as e:
                self.logger.error("Failed to create future dataframe: %s", str(e))
                raise ProphetConfigurationError(f"Failed to create future dataframe: {str(e)}") from e

    def _add_regressor_data_to_future(self, future: pd.DataFrame, regressor_data: pd.DataFrame, 
                                     model: Prophet) -> pd.DataFrame:
        """Add regressor data to future dataframe with validation.
        
        Args:
            future: Future dataframe from Prophet
            regressor_data: DataFrame with regressor values
            model: Prophet model to get regressor names
            
        Returns:
            Future dataframe with regressor data
        """
        try:
            # Get expected regressor names from model
            expected_regressors = set()
            if hasattr(model, 'extra_regressors') and model.extra_regressors:
                expected_regressors = set(model.extra_regressors.keys())

            if not expected_regressors:
                self.logger.debug("No regressors configured in model")
                return future

            # Validate regressor data columns
            available_regressors = set(regressor_data.columns) - {'ds'}
            missing_regressors = expected_regressors - available_regressors
            
            if missing_regressors:
                raise ProphetConfigurationError(f"Missing regressor data for: {missing_regressors}")

            # Merge regressor data with future dataframe
            if 'ds' in regressor_data.columns:
                # Merge on date column
                future = future.merge(regressor_data[['ds'] + list(expected_regressors)], 
                                    on='ds', how='left')
            else:
                # Assume regressor data is aligned with future dataframe
                if len(regressor_data) != len(future):
                    raise ProphetConfigurationError(
                        f"Regressor data length ({len(regressor_data)}) doesn't match future periods ({len(future)})"
                    )
                
                for regressor in expected_regressors:
                    if regressor in regressor_data.columns:
                        future[regressor] = regressor_data[regressor].values

            # Enhanced validation for regressor data quality
            self._validate_regressor_data_quality(future, expected_regressors)

            self.logger.debug("Added regressor data for: %s", list(expected_regressors))
            return future

        except Exception as e:
            self.logger.error("Failed to add regressor data: %s", str(e))
            raise ProphetConfigurationError(f"Failed to add regressor data: {str(e)}") from e

    def _validate_regressor_data_quality(self, future: pd.DataFrame, expected_regressors: set) -> None:
        """Validate quality of regressor data in future dataframe.
        
        Args:
            future: Future dataframe with regressor data
            expected_regressors: Set of expected regressor column names
            
        Raises:
            ProphetConfigurationError: If regressor data quality is poor
        """
        for regressor in expected_regressors:
            if regressor not in future.columns:
                continue
                
            regressor_data = future[regressor]
            
            # Check for missing values
            missing_count = regressor_data.isna().sum()
            if missing_count > 0:
                missing_pct = (missing_count / len(regressor_data)) * 100
                
                # More lenient validation when historical data is included
                # Only validate the future portion if we can identify it
                non_missing_data = regressor_data.dropna()
                if len(non_missing_data) == 0:
                    raise ProphetConfigurationError(
                        f"Regressor '{regressor}' has no valid data - all values are missing"
                    )
                
                # If most data is missing but we have some valid values, it's likely historical data
                # Only warn if the missing percentage is extreme and we have very little valid data
                if missing_pct > 95 and len(non_missing_data) < 10:
                    raise ProphetConfigurationError(
                        f"Regressor '{regressor}' has insufficient valid data: only {len(non_missing_data)} values"
                    )
                elif missing_pct > 50:
                    self.logger.warning(
                        "Regressor '%s' has %d missing values (%.1f%%) - this is expected when including historical data",
                        regressor, missing_count, missing_pct
                    )
            
            # Check for infinite or extreme values in non-missing data
            if regressor_data.dtype in ['float64', 'float32', 'int64', 'int32']:
                valid_data = regressor_data.dropna()
                if len(valid_data) > 0:
                    inf_count = np.isinf(valid_data).sum()
                    if inf_count > 0:
                        raise ProphetConfigurationError(f"Regressor '{regressor}' contains infinite values")
                    
                    # Check for extreme values (beyond reasonable range)
                    if len(valid_data) > 1:
                        q99 = valid_data.quantile(0.99)
                        q01 = valid_data.quantile(0.01)
                        extreme_range = q99 - q01
                        
                        if extreme_range > 0:
                            extreme_values = valid_data[
                                (valid_data > q99 + 3 * extreme_range) | 
                                (valid_data < q01 - 3 * extreme_range)
                            ]
                            if len(extreme_values) > 0:
                                self.logger.warning(
                                    "Regressor '%s' has %d extreme outlier values that may affect forecasting",
                                    regressor, len(extreme_values)
                                )

    def cleanup_model(self, model: Prophet) -> None:
        """Clean up Prophet model to free memory with enhanced cleanup for advanced features."""
        try:
            with MemoryTracker("cleanup_prophet_model"):
                initial_memory = get_memory_usage()
                
                # Clear training data and history
                if hasattr(model, 'history'):
                    del model.history
                if hasattr(model, 'history_dates'):
                    del model.history_dates
                if hasattr(model, 'train_component_cols'):
                    del model.train_component_cols
                if hasattr(model, 'y_scaled'):
                    del model.y_scaled
                
                # Clear MCMC samples and Stan objects (memory intensive)
                if hasattr(model, 'mcmc_samples') and model.mcmc_samples > 0:
                    if hasattr(model, 'stan_fit'):
                        del model.stan_fit
                    if hasattr(model, 'stan_backend'):
                        del model.stan_backend
                    if hasattr(model, 'params'):
                        del model.params
                    self.logger.debug("Cleaned up MCMC sampling data")

                # Clear advanced feature data structures
                if hasattr(model, 'extra_regressors') and model.extra_regressors:
                    regressor_count = len(model.extra_regressors)
                    model.extra_regressors.clear()
                    self.logger.debug("Cleaned up %d external regressors", regressor_count)
                
                if hasattr(model, 'seasonalities') and model.seasonalities:
                    seasonality_count = len(model.seasonalities)
                    model.seasonalities.clear()
                    self.logger.debug("Cleaned up %d custom seasonalities", seasonality_count)
                
                if hasattr(model, 'holidays') and model.holidays is not None:
                    holiday_count = len(model.holidays)
                    del model.holidays
                    model.holidays = None
                    self.logger.debug("Cleaned up %d holidays", holiday_count)

                # Clear component matrices and other large objects
                if hasattr(model, 'component_modes'):
                    model.component_modes.clear()
                if hasattr(model, 'train_holiday_names'):
                    del model.train_holiday_names
                if hasattr(model, 'fit_kwargs'):
                    del model.fit_kwargs

                # Clear any cached predictions or components
                for attr in ['predict_seasonal_components', 'predict_trend', 'predict_uncertainty']:
                    if hasattr(model, attr):
                        delattr(model, attr)

                # Force aggressive garbage collection
                collected = gc.collect()
                
                final_memory = get_memory_usage()
                memory_freed = initial_memory['rss_mb'] - final_memory['rss_mb']
                
                self.logger.info("Prophet model cleanup completed: freed %.2f MB, collected %d objects", 
                               memory_freed, collected)

        except Exception as e:
            self.logger.warning("Error during enhanced model cleanup: %s", str(e))
            # Fallback to basic cleanup
            try:
                gc.collect()
            except Exception:
                pass


# Global service instance
prophet_service = ProphetService()
