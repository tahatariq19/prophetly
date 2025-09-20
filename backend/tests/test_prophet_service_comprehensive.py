"""Comprehensive unit tests for Prophet service functions.

Tests all Prophet service functionality including:
- Model creation and configuration
- Template management
- Configuration validation
- Model fitting and prediction
- Component extraction
- Cross-validation
- Memory management
- Error handling
"""

import gc
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import numpy as np
import pandas as pd
import pytest
from prophet import Prophet

from src.models.prophet_config import (
    ConfigTemplate,
    CustomSeasonality,
    ForecastConfig,
    Regressor
)
from src.services.prophet_service import (
    ProphetConfigurationError,
    ProphetService,
    prophet_service
)
from src.utils.memory import MemoryTracker


@pytest.fixture
def sample_time_series():
    """Create sample time series data for testing."""
    dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
    # Create realistic time series with trend, seasonality, and noise
    trend = np.linspace(100, 200, len(dates))
    seasonal = 20 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)
    weekly = 5 * np.sin(2 * np.pi * np.arange(len(dates)) / 7)
    noise = np.random.normal(0, 5, len(dates))
    values = trend + seasonal + weekly + noise
    
    return pd.DataFrame({
        'ds': dates,
        'y': values
    })


@pytest.fixture
def sample_data_with_regressors(sample_time_series):
    """Create sample data with external regressors."""
    data = sample_time_series.copy()
    
    # Add temperature regressor (seasonal pattern)
    data['temperature'] = 20 + 15 * np.sin(2 * np.pi * np.arange(len(data)) / 365.25) + np.random.normal(0, 3, len(data))
    
    # Add promotion regressor (binary)
    data['promotion'] = np.random.choice([0, 1], size=len(data), p=[0.9, 0.1])
    
    # Add economic indicator (trending)
    data['economic_index'] = np.linspace(1000, 1200, len(data)) + np.random.normal(0, 10, len(data))
    
    return data


@pytest.fixture
def basic_config():
    """Create basic forecast configuration."""
    return ForecastConfig(
        name="Basic Test Config",
        horizon=30,
        growth="linear",
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        interval_width=0.8
    )


@pytest.fixture
def logistic_config():
    """Create logistic growth configuration."""
    return ForecastConfig(
        name="Logistic Growth Config",
        horizon=60,
        growth="logistic",
        cap=300.0,
        floor=50.0,
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False
    )


@pytest.fixture
def advanced_config():
    """Create advanced configuration with custom components."""
    custom_seasonality = CustomSeasonality(
        name="monthly",
        period=30.5,
        fourier_order=5,
        prior_scale=1.0,
        mode="additive"
    )
    
    temperature_regressor = Regressor(
        name="temperature",
        prior_scale=0.5,
        standardize=True,
        mode="additive"
    )
    
    promotion_regressor = Regressor(
        name="promotion",
        prior_scale=0.1,
        standardize=False,
        mode="multiplicative"
    )
    
    return ForecastConfig(
        name="Advanced Test Config",
        horizon=90,
        growth="logistic",
        cap=400.0,
        floor=30.0,
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
        holidays_prior_scale=10.0,
        seasonality_mode="multiplicative",
        custom_seasonalities=[custom_seasonality],
        regressors=[temperature_regressor, promotion_regressor],
        mcmc_samples=200
    )


class TestProphetServiceInitialization:
    """Test Prophet service initialization and setup."""
    
    def test_service_initialization(self):
        """Test that Prophet service initializes correctly."""
        service = ProphetService()
        
        assert service is not None
        assert hasattr(service, 'logger')
        assert hasattr(service, '_templates')
        assert len(service._templates) > 0
    
    def test_global_service_instance(self):
        """Test that global service instance is available."""
        assert prophet_service is not None
        assert isinstance(prophet_service, ProphetService)


class TestModelCreation:
    """Test Prophet model creation functionality."""
    
    def test_create_basic_model(self, basic_config):
        """Test creating a basic Prophet model."""
        model = prophet_service.create_model(basic_config)
        
        assert isinstance(model, Prophet)
        assert model.growth == "linear"
        assert model.yearly_seasonality == True
        assert model.weekly_seasonality == True
        assert model.daily_seasonality == False
        assert model.interval_width == 0.8
    
    def test_create_logistic_model(self, logistic_config):
        """Test creating a logistic growth model."""
        model = prophet_service.create_model(logistic_config)
        
        assert isinstance(model, Prophet)
        assert model.growth == "logistic"
    
    def test_create_model_with_custom_seasonality(self, advanced_config):
        """Test creating model with custom seasonality."""
        model = prophet_service.create_model(advanced_config)
        
        assert isinstance(model, Prophet)
        assert "monthly" in model.seasonalities
        
        # Check seasonality parameters
        monthly_seasonality = model.seasonalities["monthly"]
        assert monthly_seasonality["period"] == 30.5
        assert monthly_seasonality["fourier_order"] == 5
    
    def test_create_model_with_regressors(self, advanced_config):
        """Test creating model with external regressors."""
        model = prophet_service.create_model(advanced_config)
        
        assert isinstance(model, Prophet)
        assert "temperature" in model.extra_regressors
        assert "promotion" in model.extra_regressors
        
        # Check regressor parameters
        temp_regressor = model.extra_regressors["temperature"]
        assert temp_regressor["prior_scale"] == 0.5
        assert temp_regressor["standardize"] == True
        assert temp_regressor["mode"] == "additive"
    
    def test_create_model_with_mcmc(self, advanced_config):
        """Test creating model with MCMC sampling."""
        model = prophet_service.create_model(advanced_config)
        
        assert isinstance(model, Prophet)
        assert model.mcmc_samples == 200
    
    def test_create_model_memory_tracking(self, basic_config):
        """Test that model creation is memory tracked."""
        with MemoryTracker("test_model_creation") as tracker:
            model = prophet_service.create_model(basic_config)
            assert isinstance(model, Prophet)
        
        # Should have memory tracking data
        delta = tracker.get_memory_delta()
        assert delta is not None
    
    def test_create_model_error_handling(self):
        """Test error handling in model creation."""
        # Invalid configuration should raise error
        invalid_config = Mock()
        invalid_config.to_prophet_params.side_effect = Exception("Invalid config")
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.create_model(invalid_config)


class TestConfigurationValidation:
    """Test configuration validation functionality."""
    
    def test_validate_basic_config(self, basic_config):
        """Test validation of basic configuration."""
        result = prophet_service.validate_config(basic_config)
        
        assert result['is_valid'] is True
        assert len(result['errors']) == 0
    
    def test_validate_logistic_config_valid(self, logistic_config):
        """Test validation of valid logistic configuration."""
        result = prophet_service.validate_config(logistic_config)
        
        assert result['is_valid'] is True
        assert len(result['errors']) == 0
    
    def test_validate_logistic_config_missing_cap(self):
        """Test validation fails for logistic growth without cap."""
        # This should fail at the ForecastConfig level
        with pytest.raises(ValueError, match="Cap must be specified"):
            ForecastConfig(
                horizon=30,
                growth="logistic"
                # Missing cap
            )
    
    def test_validate_config_invalid_cap_floor(self):
        """Test validation fails when floor >= cap."""
        with pytest.raises(ValueError, match="Floor must be less than cap"):
            ForecastConfig(
                horizon=30,
                growth="logistic",
                cap=100.0,
                floor=150.0  # Floor > cap
            )
    
    def test_validate_config_duplicate_seasonalities(self):
        """Test validation fails with duplicate seasonality names."""
        duplicate_seasonality = CustomSeasonality(
            name="yearly",  # Conflicts with built-in yearly
            period=365.25,
            fourier_order=10
        )
        
        config = ForecastConfig(
            horizon=30,
            yearly_seasonality=True,
            custom_seasonalities=[duplicate_seasonality]
        )
        
        result = prophet_service.validate_config(config)
        # Should have warnings about potential conflicts
        assert len(result['warnings']) > 0 or len(result['errors']) > 0
    
    def test_validate_config_with_data(self, basic_config, sample_time_series):
        """Test configuration validation against actual data."""
        result = prophet_service.validate_config(basic_config, sample_time_series)
        
        assert result['is_valid'] is True
        # Should have recommendations based on data
        assert 'recommendations' in result
    
    def test_validate_config_missing_regressors(self, sample_time_series):
        """Test validation fails when regressors missing from data."""
        regressor = Regressor(name="missing_column")
        config = ForecastConfig(
            horizon=30,
            regressors=[regressor]
        )
        
        result = prophet_service.validate_config(config, sample_time_series)
        
        assert result['is_valid'] is False
        assert any("missing_column" in error for error in result['errors'])
    
    def test_validate_config_performance_warnings(self):
        """Test performance warnings in validation."""
        config = ForecastConfig(
            horizon=30,
            mcmc_samples=5000,  # High MCMC samples
            custom_seasonalities=[
                CustomSeasonality(name=f"custom_{i}", period=i+10, fourier_order=5)
                for i in range(10)  # Many seasonalities
            ]
        )
        
        result = prophet_service.validate_config(config)
        
        # Should have performance warnings
        assert len(result['warnings']) > 0
        assert any("MCMC" in warning for warning in result['warnings'])
        assert any("seasonalities" in warning for warning in result['warnings'])


class TestModelFitting:
    """Test Prophet model fitting functionality."""
    
    def test_fit_basic_model(self, basic_config, sample_time_series):
        """Test fitting a basic Prophet model."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        assert fitted_model is not None
        assert hasattr(fitted_model, 'history')
        assert len(fitted_model.history) == len(sample_time_series)
        assert 'ds' in fitted_model.history.columns
        assert 'y' in fitted_model.history.columns
    
    def test_fit_logistic_model(self, logistic_config, sample_time_series):
        """Test fitting a logistic growth model."""
        # Add cap and floor to data
        data_with_cap = sample_time_series.copy()
        data_with_cap['cap'] = logistic_config.cap
        data_with_cap['floor'] = logistic_config.floor
        
        model = prophet_service.create_model(logistic_config)
        fitted_model = prophet_service.fit_model(model, data_with_cap, logistic_config)
        
        assert fitted_model is not None
        assert hasattr(fitted_model, 'history')
        assert 'cap' in fitted_model.history.columns
        assert 'floor' in fitted_model.history.columns
    
    def test_fit_model_with_regressors(self, advanced_config, sample_data_with_regressors):
        """Test fitting model with external regressors."""
        # Add cap and floor for logistic growth
        data = sample_data_with_regressors.copy()
        data['cap'] = advanced_config.cap
        data['floor'] = advanced_config.floor
        
        model = prophet_service.create_model(advanced_config)
        fitted_model = prophet_service.fit_model(model, data, advanced_config)
        
        assert fitted_model is not None
        assert hasattr(fitted_model, 'history')
        assert 'temperature' in fitted_model.history.columns
        assert 'promotion' in fitted_model.history.columns
    
    def test_fit_model_invalid_data_format(self, basic_config):
        """Test fitting with invalid data format."""
        invalid_data = pd.DataFrame({
            'date': pd.date_range('2023-01-01', periods=100),
            'value': range(100)
        })
        
        model = prophet_service.create_model(basic_config)
        
        with pytest.raises(ProphetConfigurationError, match="'ds' and 'y' columns"):
            prophet_service.fit_model(model, invalid_data)
    
    def test_fit_model_empty_data(self, basic_config):
        """Test fitting with empty data."""
        empty_data = pd.DataFrame(columns=['ds', 'y'])
        
        model = prophet_service.create_model(basic_config)
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.fit_model(model, empty_data)
    
    def test_fit_model_datetime_conversion(self, basic_config):
        """Test automatic datetime conversion."""
        # Data with string dates
        string_date_data = pd.DataFrame({
            'ds': ['2023-01-01', '2023-01-02', '2023-01-03'],
            'y': [100, 200, 300]
        })
        
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, string_date_data)
        
        assert fitted_model is not None
        assert pd.api.types.is_datetime64_any_dtype(fitted_model.history['ds'])
    
    def test_fit_model_memory_tracking(self, basic_config, sample_time_series):
        """Test memory tracking during model fitting."""
        model = prophet_service.create_model(basic_config)
        
        with MemoryTracker("test_model_fitting") as tracker:
            fitted_model = prophet_service.fit_model(model, sample_time_series)
            assert fitted_model is not None
        
        delta = tracker.get_memory_delta()
        assert delta is not None


class TestPrediction:
    """Test Prophet prediction functionality."""
    
    def test_basic_prediction(self, basic_config, sample_time_series):
        """Test basic prediction generation."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        # Create future dataframe
        future = fitted_model.make_future_dataframe(periods=basic_config.horizon)
        forecast = prophet_service.predict(fitted_model, future)
        
        assert isinstance(forecast, pd.DataFrame)
        assert len(forecast) == len(sample_time_series) + basic_config.horizon
        
        # Check required columns
        required_cols = ['ds', 'yhat', 'yhat_lower', 'yhat_upper']
        for col in required_cols:
            assert col in forecast.columns
        
        # Check forecast values are reasonable
        assert not forecast['yhat'].isna().any()
        assert (forecast['yhat_lower'] <= forecast['yhat']).all()
        assert (forecast['yhat'] <= forecast['yhat_upper']).all()
    
    def test_prediction_with_logistic_growth(self, logistic_config, sample_time_series):
        """Test prediction with logistic growth constraints."""
        # Prepare data with cap and floor
        data = sample_time_series.copy()
        data['cap'] = logistic_config.cap
        data['floor'] = logistic_config.floor
        
        model = prophet_service.create_model(logistic_config)
        fitted_model = prophet_service.fit_model(model, data, logistic_config)
        
        # Create future with cap and floor
        future = fitted_model.make_future_dataframe(periods=logistic_config.horizon)
        future['cap'] = logistic_config.cap
        future['floor'] = logistic_config.floor
        
        forecast = prophet_service.predict(fitted_model, future)
        
        assert isinstance(forecast, pd.DataFrame)
        
        # Check that predictions respect bounds (with some tolerance)
        assert forecast['yhat'].max() <= logistic_config.cap * 1.05
        assert forecast['yhat'].min() >= logistic_config.floor * 0.95
    
    def test_prediction_with_regressors(self, advanced_config, sample_data_with_regressors):
        """Test prediction with external regressors."""
        # Prepare data
        data = sample_data_with_regressors.copy()
        data['cap'] = advanced_config.cap
        data['floor'] = advanced_config.floor
        
        model = prophet_service.create_model(advanced_config)
        fitted_model = prophet_service.fit_model(model, data, advanced_config)
        
        # Create future with regressors
        future = fitted_model.make_future_dataframe(periods=advanced_config.horizon)
        future['cap'] = advanced_config.cap
        future['floor'] = advanced_config.floor
        
        # Extend regressor values (simple approach for testing)
        future['temperature'] = data['temperature'].iloc[-1]
        future['promotion'] = 0  # No promotions in future
        
        forecast = prophet_service.predict(fitted_model, future)
        
        assert isinstance(forecast, pd.DataFrame)
        assert len(forecast) == len(data) + advanced_config.horizon
        
        # Should have regressor effects in forecast
        regressor_cols = [col for col in forecast.columns if 'extra_regressors' in col]
        assert len(regressor_cols) > 0
    
    def test_prediction_memory_tracking(self, basic_config, sample_time_series):
        """Test memory tracking during prediction."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        future = fitted_model.make_future_dataframe(periods=basic_config.horizon)
        
        with MemoryTracker("test_prediction") as tracker:
            forecast = prophet_service.predict(fitted_model, future)
            assert isinstance(forecast, pd.DataFrame)
        
        delta = tracker.get_memory_delta()
        assert delta is not None
    
    def test_prediction_error_handling(self, basic_config, sample_time_series):
        """Test error handling during prediction."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        # Invalid future dataframe
        invalid_future = pd.DataFrame({'wrong_column': [1, 2, 3]})
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.predict(fitted_model, invalid_future)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


class TestComponentExtraction:
    """Test Prophet component extraction functionality."""
    
    def test_extract_basic_components(self, basic_config, sample_time_series):
        """Test extracting basic forecast components."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        future = fitted_model.make_future_dataframe(periods=basic_config.horizon)
        forecast = prophet_service.predict(fitted_model, future)
        
        components = prophet_service.get_components(fitted_model, forecast)
        
        assert isinstance(components, dict)
        assert 'trend' in components
        
        # Check trend component
        trend_df = components['trend']
        assert isinstance(trend_df, pd.DataFrame)
        assert 'ds' in trend_df.columns
        assert 'trend' in trend_df.columns
        assert len(trend_df) == len(forecast)
        
        # Should have seasonal components
        seasonal_components = ['yearly', 'weekly']
        for comp in seasonal_components:
            if comp in forecast.columns:
                assert comp in components
                comp_df = components[comp]
                assert isinstance(comp_df, pd.DataFrame)
                assert 'ds' in comp_df.columns
                assert comp in comp_df.columns
    
    def test_extract_components_with_custom_seasonality(self, advanced_config, sample_data_with_regressors):
        """Test extracting components with custom seasonality."""
        # Prepare data
        data = sample_data_with_regressors.copy()
        data['cap'] = advanced_config.cap
        data['floor'] = advanced_config.floor
        
        model = prophet_service.create_model(advanced_config)
        fitted_model = prophet_service.fit_model(model, data, advanced_config)
        
        future = fitted_model.make_future_dataframe(periods=30)
        future['cap'] = advanced_config.cap
        future['floor'] = advanced_config.floor
        future['temperature'] = data['temperature'].iloc[-1]
        future['promotion'] = 0
        
        forecast = prophet_service.predict(fitted_model, future)
        components = prophet_service.get_components(fitted_model, forecast)
        
        assert isinstance(components, dict)
        assert 'trend' in components
        
        # Should have more components than basic model
        assert len(components) > 1
        
        # Check for custom seasonality and regressors
        component_names = list(components.keys())
        
        # Should have some seasonal or regressor components
        seasonal_or_regressor_components = [
            name for name in component_names 
            if name != 'trend' and ('seasonal' in name or 'regressor' in name or name in ['yearly', 'weekly', 'monthly'])
        ]
        assert len(seasonal_or_regressor_components) > 0
    
    def test_extract_components_with_holidays(self, basic_config, sample_time_series):
        """Test extracting components with holiday effects."""
        # Add holidays to config
        config_with_holidays = ForecastConfig(
            name="Config with Holidays",
            horizon=30,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=True,
            holidays_prior_scale=10.0
        )
        
        model = prophet_service.create_model(config_with_holidays)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        future = fitted_model.make_future_dataframe(periods=30)
        forecast = prophet_service.predict(fitted_model, future)
        
        components = prophet_service.get_components(fitted_model, forecast)
        
        assert isinstance(components, dict)
        
        # May or may not have holidays depending on data range
        if 'holidays' in forecast.columns:
            assert 'holidays' in components
    
    def test_extract_components_error_handling(self, basic_config, sample_time_series):
        """Test error handling in component extraction."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        # Invalid forecast dataframe
        invalid_forecast = pd.DataFrame({'wrong_columns': [1, 2, 3]})
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.get_components(fitted_model, invalid_forecast)


class TestCrossValidation:
    """Test Prophet cross-validation functionality."""
    
    def test_cross_validation_basic(self, basic_config, sample_time_series):
        """Test basic cross-validation."""
        model = prophet_service.create_model(basic_config)
        
        # Use shorter periods for faster testing
        cv_results = prophet_service.cross_validate(
            model,
            sample_time_series,
            initial='730 days',
            period='180 days',
            cv_horizon='90 days'
        )
        
        assert isinstance(cv_results, pd.DataFrame)
        
        # Check required columns
        required_cols = ['cutoff', 'ds', 'y', 'yhat']
        for col in required_cols:
            assert col in cv_results.columns
        
        assert len(cv_results) > 0
        
        # Check that cutoffs are reasonable
        assert cv_results['cutoff'].nunique() > 1
        
        # Check that predictions exist
        assert not cv_results['yhat'].isna().any()
    
    def test_cross_validation_with_custom_cutoffs(self, basic_config, sample_time_series):
        """Test cross-validation with custom cutoff dates."""
        model = prophet_service.create_model(basic_config)
        
        # Create custom cutoffs
        start_date = sample_time_series['ds'].min() + pd.Timedelta(days=365)
        end_date = sample_time_series['ds'].max() - pd.Timedelta(days=90)
        cutoffs = pd.date_range(start=start_date, end=end_date, freq='90D')
        
        cv_results = prophet_service.cross_validate(
            model,
            sample_time_series,
            cv_horizon='30 days',
            cutoffs=cutoffs
        )
        
        assert isinstance(cv_results, pd.DataFrame)
        assert len(cv_results) > 0
        
        # Should use the custom cutoffs
        unique_cutoffs = cv_results['cutoff'].unique()
        assert len(unique_cutoffs) == len(cutoffs)
    
    def test_cross_validation_with_regressors(self, advanced_config, sample_data_with_regressors):
        """Test cross-validation with external regressors."""
        # Prepare data
        data = sample_data_with_regressors.copy()
        data['cap'] = advanced_config.cap
        data['floor'] = advanced_config.floor
        
        model = prophet_service.create_model(advanced_config)
        
        cv_results = prophet_service.cross_validate(
            model,
            data,
            initial='365 days',
            period='90 days',
            cv_horizon='30 days'
        )
        
        assert isinstance(cv_results, pd.DataFrame)
        assert len(cv_results) > 0
        
        # Should have regressor columns in results
        assert 'temperature' in cv_results.columns
        assert 'promotion' in cv_results.columns
    
    def test_cross_validation_parallel_processing(self, basic_config, sample_time_series):
        """Test cross-validation with parallel processing."""
        model = prophet_service.create_model(basic_config)
        
        # Test with threads (safer for testing)
        cv_results = prophet_service.cross_validate(
            model,
            sample_time_series,
            initial='365 days',
            period='90 days',
            cv_horizon='30 days',
            parallel='threads'
        )
        
        assert isinstance(cv_results, pd.DataFrame)
        assert len(cv_results) > 0
    
    def test_cross_validation_memory_tracking(self, basic_config, sample_time_series):
        """Test memory tracking during cross-validation."""
        model = prophet_service.create_model(basic_config)
        
        with MemoryTracker("test_cross_validation") as tracker:
            cv_results = prophet_service.cross_validate(
                model,
                sample_time_series,
                initial='365 days',
                period='180 days',
                cv_horizon='30 days'
            )
            assert isinstance(cv_results, pd.DataFrame)
        
        delta = tracker.get_memory_delta()
        assert delta is not None
    
    def test_cross_validation_error_handling(self, basic_config):
        """Test error handling in cross-validation."""
        model = prophet_service.create_model(basic_config)
        
        # Insufficient data for cross-validation
        small_data = pd.DataFrame({
            'ds': pd.date_range('2023-01-01', periods=10),
            'y': range(10)
        })
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.cross_validate(
                model,
                small_data,
                initial='365 days',  # More than available data
                period='30 days',
                cv_horizon='30 days'
            )


class TestPerformanceMetrics:
    """Test performance metrics calculation."""
    
    def test_calculate_basic_metrics(self, basic_config, sample_time_series):
        """Test calculation of basic performance metrics."""
        model = prophet_service.create_model(basic_config)
        
        cv_results = prophet_service.cross_validate(
            model,
            sample_time_series,
            initial='365 days',
            period='90 days',
            cv_horizon='30 days'
        )
        
        metrics = prophet_service.calculate_performance_metrics(cv_results)
        
        assert isinstance(metrics, dict)
        
        # Check for expected metrics
        expected_metrics = ['mse', 'rmse', 'mae', 'mape']
        for metric in expected_metrics:
            if metric in metrics:
                assert isinstance(metrics[metric], float)
                assert not pd.isna(metrics[metric])
                assert metrics[metric] >= 0  # All metrics should be non-negative
        
        # RMSE should be sqrt of MSE (approximately)
        if 'mse' in metrics and 'rmse' in metrics:
            assert abs(metrics['rmse'] - np.sqrt(metrics['mse'])) < 0.01
    
    def test_calculate_metrics_with_coverage(self, basic_config, sample_time_series):
        """Test metrics calculation including coverage."""
        model = prophet_service.create_model(basic_config)
        
        cv_results = prophet_service.cross_validate(
            model,
            sample_time_series,
            initial='365 days',
            period='90 days',
            cv_horizon='30 days'
        )
        
        metrics = prophet_service.calculate_performance_metrics(cv_results)
        
        # Coverage should be between 0 and 1
        if 'coverage' in metrics:
            assert 0 <= metrics['coverage'] <= 1
    
    def test_calculate_metrics_empty_results(self):
        """Test metrics calculation with empty results."""
        empty_cv_results = pd.DataFrame(columns=['cutoff', 'ds', 'y', 'yhat'])
        
        metrics = prophet_service.calculate_performance_metrics(empty_cv_results)
        
        # Should return empty dict or handle gracefully
        assert isinstance(metrics, dict)
    
    def test_calculate_metrics_error_handling(self):
        """Test error handling in metrics calculation."""
        # Invalid CV results
        invalid_results = pd.DataFrame({'wrong': ['columns']})
        
        metrics = prophet_service.calculate_performance_metrics(invalid_results)
        
        # Should handle error gracefully
        assert isinstance(metrics, dict)


class TestTemplateManagement:
    """Test configuration template management."""
    
    def test_get_templates(self):
        """Test getting available templates."""
        templates = prophet_service.get_templates()
        
        assert isinstance(templates, list)
        assert len(templates) > 0
        
        # Check template structure
        for template in templates:
            assert isinstance(template, ConfigTemplate)
            assert hasattr(template, 'name')
            assert hasattr(template, 'description')
            assert hasattr(template, 'config')
    
    def test_get_template_by_name(self):
        """Test getting specific template by name."""
        templates = prophet_service.get_templates()
        
        if templates:
            template_name = templates[0].name
            template = prophet_service.get_template_by_name(template_name)
            
            assert template is not None
            assert template.name == template_name
        
        # Test non-existent template
        non_existent = prophet_service.get_template_by_name("non_existent_template")
        assert non_existent is None
    
    def test_create_config_from_template(self):
        """Test creating configuration from template."""
        templates = prophet_service.get_templates()
        
        if templates:
            template_name = templates[0].name
            
            # Create config from template
            config = prophet_service.create_config_from_template(template_name)
            
            assert isinstance(config, ForecastConfig)
            assert config.name is not None
            
            # Test with overrides
            config_with_overrides = prophet_service.create_config_from_template(
                template_name,
                horizon=60,
                name="Custom Name"
            )
            
            assert config_with_overrides.horizon == 60
            assert config_with_overrides.name == "Custom Name"
    
    def test_create_config_from_invalid_template(self):
        """Test error handling for invalid template."""
        with pytest.raises(ProphetConfigurationError, match="Template .* not found"):
            prophet_service.create_config_from_template("invalid_template")


class TestConfigurationImportExport:
    """Test configuration import/export functionality."""
    
    def test_export_config_json(self, basic_config):
        """Test exporting configuration to JSON."""
        json_str = prophet_service.export_config_json(basic_config)
        
        assert isinstance(json_str, str)
        
        # Should be valid JSON
        config_dict = json.loads(json_str)
        assert isinstance(config_dict, dict)
        
        # Should contain expected fields
        assert 'name' in config_dict
        assert 'horizon' in config_dict
        assert 'growth' in config_dict
    
    def test_import_config_json(self, basic_config):
        """Test importing configuration from JSON."""
        # Export first
        json_str = prophet_service.export_config_json(basic_config)
        
        # Import back
        imported_config = prophet_service.import_config_json(json_str)
        
        assert isinstance(imported_config, ForecastConfig)
        assert imported_config.name == basic_config.name
        assert imported_config.horizon == basic_config.horizon
        assert imported_config.growth == basic_config.growth
    
    def test_import_invalid_json(self):
        """Test error handling for invalid JSON."""
        invalid_json = "{ invalid json }"
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.import_config_json(invalid_json)
    
    def test_import_json_with_validation_errors(self):
        """Test import with configuration validation errors."""
        # Create JSON with invalid configuration
        invalid_config_json = json.dumps({
            "name": "Invalid Config",
            "horizon": -10,  # Invalid horizon
            "growth": "invalid_growth"  # Invalid growth type
        })
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.import_config_json(invalid_config_json)


class TestConfigurationSummary:
    """Test configuration summary functionality."""
    
    def test_get_config_summary_basic(self, basic_config):
        """Test getting summary of basic configuration."""
        summary = prophet_service.get_config_summary(basic_config)
        
        assert isinstance(summary, dict)
        
        # Should contain key information
        expected_keys = ['name', 'horizon', 'growth', 'seasonalities', 'regressors']
        for key in expected_keys:
            if hasattr(basic_config, key) and getattr(basic_config, key) is not None:
                assert key in summary
    
    def test_get_config_summary_advanced(self, advanced_config):
        """Test getting summary of advanced configuration."""
        summary = prophet_service.get_config_summary(advanced_config)
        
        assert isinstance(summary, dict)
        
        # Should include advanced features
        assert 'custom_seasonalities' in summary
        assert 'regressors' in summary
        assert 'mcmc_samples' in summary
        
        # Should show counts
        assert summary['custom_seasonalities'] > 0
        assert summary['regressors'] > 0


class TestMemoryManagement:
    """Test Prophet service memory management."""
    
    def test_model_cleanup(self, basic_config, sample_time_series):
        """Test Prophet model cleanup."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        # Verify model has data
        assert hasattr(fitted_model, 'history')
        assert len(fitted_model.history) > 0
        
        # Cleanup model
        prophet_service.cleanup_model(fitted_model)
        
        # Model should still exist but be cleaned
        assert fitted_model is not None
    
    def test_memory_optimization_mcmc(self, sample_time_series):
        """Test memory optimization for MCMC models."""
        mcmc_config = ForecastConfig(
            name="MCMC Test",
            horizon=30,
            growth="linear",
            mcmc_samples=100
        )
        
        model = prophet_service.create_model(mcmc_config)
        
        initial_memory = get_memory_usage()
        
        # Fit MCMC model
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        # Should have MCMC optimization
        assert hasattr(fitted_model, 'mcmc_samples')
        
        # Memory should be managed
        final_memory = get_memory_usage()
        memory_increase = final_memory['rss_mb'] - initial_memory['rss_mb']
        
        # Should not have excessive memory usage
        assert memory_increase < 200  # Less than 200MB increase
    
    def test_concurrent_model_operations(self, basic_config, sample_time_series):
        """Test memory management with concurrent model operations."""
        models = []
        
        # Create multiple models
        for i in range(3):
            config = ForecastConfig(
                name=f"Concurrent Model {i}",
                horizon=30,
                growth="linear"
            )
            
            model = prophet_service.create_model(config)
            fitted_model = prophet_service.fit_model(model, sample_time_series)
            models.append(fitted_model)
        
        # All models should be functional
        for model in models:
            assert hasattr(model, 'history')
            
            future = model.make_future_dataframe(periods=30)
            forecast = prophet_service.predict(model, future)
            assert isinstance(forecast, pd.DataFrame)
        
        # Cleanup all models
        for model in models:
            prophet_service.cleanup_model(model)
        
        # Force garbage collection
        del models
        gc.collect()


class TestErrorHandling:
    """Test comprehensive error handling."""
    
    def test_configuration_error_propagation(self):
        """Test that configuration errors are properly propagated."""
        # Mock a configuration that raises an error
        mock_config = Mock()
        mock_config.to_prophet_params.side_effect = ValueError("Mock error")
        
        with pytest.raises(ProphetConfigurationError, match="Mock error"):
            prophet_service.create_model(mock_config)
    
    def test_fitting_error_propagation(self, basic_config):
        """Test that fitting errors are properly propagated."""
        model = prophet_service.create_model(basic_config)
        
        # Mock Prophet fit method to raise error
        with patch.object(model, 'fit', side_effect=Exception("Fit error")):
            with pytest.raises(ProphetConfigurationError, match="Fit error"):
                prophet_service.fit_model(model, pd.DataFrame({'ds': [], 'y': []}))
    
    def test_prediction_error_propagation(self, basic_config, sample_time_series):
        """Test that prediction errors are properly propagated."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        # Mock Prophet predict method to raise error
        with patch.object(fitted_model, 'predict', side_effect=Exception("Predict error")):
            future = fitted_model.make_future_dataframe(periods=30)
            
            with pytest.raises(ProphetConfigurationError, match="Predict error"):
                prophet_service.predict(fitted_model, future)
    
    def test_component_extraction_error_propagation(self, basic_config, sample_time_series):
        """Test that component extraction errors are properly propagated."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_time_series)
        
        future = fitted_model.make_future_dataframe(periods=30)
        forecast = prophet_service.predict(fitted_model, future)
        
        # Corrupt forecast data to cause error
        corrupted_forecast = forecast.drop(columns=['trend'])
        
        with pytest.raises(ProphetConfigurationError):
            prophet_service.get_components(fitted_model, corrupted_forecast)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])