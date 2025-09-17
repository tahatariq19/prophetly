"""Tests for Prophet forecasting service functionality."""

import pandas as pd
from prophet import Prophet
import pytest

from src.models.prophet_config import CustomSeasonality, ForecastConfig, Regressor
from src.services.prophet_service import ProphetConfigurationError, prophet_service


@pytest.fixture
def sample_data():
    """Create sample time series data for testing."""
    import numpy as np

    dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
    values = 100 + 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25) + np.random.normal(0, 5, len(dates))

    return pd.DataFrame({
        'ds': dates,
        'y': values
    })


@pytest.fixture
def sample_data_with_regressors(sample_data):
    """Create sample data with external regressors."""
    import numpy as np

    data = sample_data.copy()
    data['temperature'] = 20 + 10 * np.sin(2 * np.pi * np.arange(len(data)) / 365.25) + np.random.normal(0, 2, len(data))
    data['promotion'] = np.random.choice([0, 1], size=len(data), p=[0.9, 0.1])
    return data


@pytest.fixture
def basic_config():
    """Create a basic forecast configuration."""
    return ForecastConfig(
        name="Test Forecast",
        horizon=30,
        growth="linear",
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False
    )


@pytest.fixture
def advanced_config():
    """Create an advanced forecast configuration with custom components."""
    custom_seasonality = CustomSeasonality(
        name="monthly",
        period=30.5,
        fourier_order=5,
        prior_scale=1.0
    )

    regressor = Regressor(
        name="temperature",
        prior_scale=0.5,
        standardize=True,
        mode="additive"
    )

    return ForecastConfig(
        name="Advanced Test Forecast",
        horizon=60,
        growth="logistic",
        cap=200.0,
        floor=50.0,
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.1,
        seasonality_prior_scale=1.0,
        custom_seasonalities=[custom_seasonality],
        regressors=[regressor],
        mcmc_samples=100
    )


class TestProphetModelCreation:
    """Test Prophet model creation and configuration."""

    def test_create_basic_model(self, basic_config):
        """Test creating a basic Prophet model."""
        model = prophet_service.create_model(basic_config)

        assert isinstance(model, Prophet)
        assert model.growth == "linear"
        assert model.yearly_seasonality == True
        assert model.weekly_seasonality == True
        assert model.daily_seasonality == False

    def test_create_logistic_model(self):
        """Test creating a logistic growth model."""
        config = ForecastConfig(
            horizon=30,
            growth="logistic",
            cap=150.0,
            floor=50.0
        )

        model = prophet_service.create_model(config)

        assert model.growth == "logistic"

    def test_create_model_with_custom_seasonality(self, advanced_config):
        """Test creating a model with custom seasonality."""
        model = prophet_service.create_model(advanced_config)

        assert isinstance(model, Prophet)
        # Check that custom seasonality was added
        assert "monthly" in [s['name'] for s in model.seasonalities.values()]

    def test_create_model_with_regressors(self, advanced_config):
        """Test creating a model with external regressors."""
        model = prophet_service.create_model(advanced_config)

        assert isinstance(model, Prophet)
        # Check that regressor was added
        assert "temperature" in model.extra_regressors

    def test_create_model_invalid_config(self):
        """Test creating a model with invalid configuration."""
        # Logistic growth without cap should fail
        config = ForecastConfig(
            horizon=30,
            growth="logistic"
            # Missing cap
        )

        with pytest.raises(ProphetConfigurationError):
            prophet_service.create_model(config)


class TestProphetModelFitting:
    """Test Prophet model fitting functionality."""

    def test_fit_basic_model(self, basic_config, sample_data):
        """Test fitting a basic Prophet model."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_data)

        assert fitted_model is not None
        assert hasattr(fitted_model, 'history')
        assert len(fitted_model.history) == len(sample_data)

    def test_fit_model_with_regressors(self, advanced_config, sample_data_with_regressors):
        """Test fitting a model with external regressors."""
        model = prophet_service.create_model(advanced_config)
        fitted_model = prophet_service.fit_model(model, sample_data_with_regressors)

        assert fitted_model is not None
        assert hasattr(fitted_model, 'history')

    def test_fit_model_invalid_data(self, basic_config):
        """Test fitting with invalid data format."""
        invalid_data = pd.DataFrame({
            'date': pd.date_range(start='2020-01-01', periods=100, freq='D'),
            'value': range(100)
        })

        model = prophet_service.create_model(basic_config)

        with pytest.raises(ProphetConfigurationError):
            prophet_service.fit_model(model, invalid_data)

    def test_fit_model_empty_data(self, basic_config):
        """Test fitting with empty data."""
        empty_data = pd.DataFrame(columns=['ds', 'y'])

        model = prophet_service.create_model(basic_config)

        with pytest.raises(ProphetConfigurationError):
            prophet_service.fit_model(model, empty_data)


class TestProphetPrediction:
    """Test Prophet prediction functionality."""

    def test_basic_prediction(self, basic_config, sample_data):
        """Test basic prediction generation."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_data)

        # Create future dataframe
        future = fitted_model.make_future_dataframe(periods=basic_config.horizon)

        forecast = prophet_service.predict(fitted_model, future)

        assert isinstance(forecast, pd.DataFrame)
        assert len(forecast) == len(sample_data) + basic_config.horizon
        assert 'yhat' in forecast.columns
        assert 'yhat_lower' in forecast.columns
        assert 'yhat_upper' in forecast.columns

    def test_prediction_with_logistic_growth(self, sample_data):
        """Test prediction with logistic growth."""
        config = ForecastConfig(
            horizon=30,
            growth="logistic",
            cap=200.0,
            floor=50.0
        )

        # Add cap and floor to data
        data_with_cap = sample_data.copy()
        data_with_cap['cap'] = config.cap
        data_with_cap['floor'] = config.floor

        model = prophet_service.create_model(config)
        fitted_model = prophet_service.fit_model(model, data_with_cap)

        # Create future with cap and floor
        future = fitted_model.make_future_dataframe(periods=config.horizon)
        future['cap'] = config.cap
        future['floor'] = config.floor

        forecast = prophet_service.predict(fitted_model, future)

        assert isinstance(forecast, pd.DataFrame)
        # Check that predictions respect bounds
        assert forecast['yhat'].max() <= config.cap * 1.1  # Allow some tolerance
        assert forecast['yhat'].min() >= config.floor * 0.9

    def test_prediction_with_regressors(self, advanced_config, sample_data_with_regressors):
        """Test prediction with external regressors."""
        model = prophet_service.create_model(advanced_config)

        # Add cap and floor for logistic growth
        data = sample_data_with_regressors.copy()
        data['cap'] = advanced_config.cap
        data['floor'] = advanced_config.floor

        fitted_model = prophet_service.fit_model(model, data)

        # Create future with regressors
        future = fitted_model.make_future_dataframe(periods=advanced_config.horizon)
        future['cap'] = advanced_config.cap
        future['floor'] = advanced_config.floor
        # Extend regressor values (simple approach for testing)
        future['temperature'] = data['temperature'].iloc[-1]

        forecast = prophet_service.predict(fitted_model, future)

        assert isinstance(forecast, pd.DataFrame)
        assert len(forecast) == len(data) + advanced_config.horizon


class TestProphetComponents:
    """Test Prophet component extraction."""

    def test_extract_basic_components(self, basic_config, sample_data):
        """Test extracting basic forecast components."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_data)

        future = fitted_model.make_future_dataframe(periods=basic_config.horizon)
        forecast = prophet_service.predict(fitted_model, future)

        components = prophet_service.get_components(fitted_model, forecast)

        assert isinstance(components, dict)
        assert 'trend' in components

        # Should have seasonal components
        seasonal_components = ['yearly', 'weekly']
        for comp in seasonal_components:
            if comp in forecast.columns:
                assert comp in components

    def test_extract_components_with_custom_seasonality(self, advanced_config, sample_data_with_regressors):
        """Test extracting components with custom seasonality."""
        model = prophet_service.create_model(advanced_config)

        # Add cap and floor for logistic growth
        data = sample_data_with_regressors.copy()
        data['cap'] = advanced_config.cap
        data['floor'] = advanced_config.floor

        fitted_model = prophet_service.fit_model(model, data)

        future = fitted_model.make_future_dataframe(periods=advanced_config.horizon)
        future['cap'] = advanced_config.cap
        future['floor'] = advanced_config.floor
        future['temperature'] = data['temperature'].iloc[-1]

        forecast = prophet_service.predict(fitted_model, future)
        components = prophet_service.get_components(fitted_model, forecast)

        assert isinstance(components, dict)
        assert 'trend' in components

        # Check for custom seasonality and regressors in components
        component_names = list(components.keys())
        assert len(component_names) > 1  # Should have more than just trend


class TestProphetCrossValidation:
    """Test Prophet cross-validation functionality."""

    def test_cross_validation_basic(self, basic_config, sample_data):
        """Test basic cross-validation."""
        model = prophet_service.create_model(basic_config)

        # Use shorter periods for faster testing
        cv_results = prophet_service.cross_validate(
            model,
            sample_data,
            initial='365 days',
            period='90 days',
            horizon='30 days'
        )

        assert isinstance(cv_results, pd.DataFrame)
        assert 'cutoff' in cv_results.columns
        assert 'y' in cv_results.columns
        assert 'yhat' in cv_results.columns
        assert len(cv_results) > 0

    def test_performance_metrics_calculation(self, basic_config, sample_data):
        """Test performance metrics calculation."""
        model = prophet_service.create_model(basic_config)

        cv_results = prophet_service.cross_validate(
            model,
            sample_data,
            initial='365 days',
            period='90 days',
            horizon='30 days'
        )

        metrics = prophet_service.calculate_performance_metrics(cv_results)

        assert isinstance(metrics, dict)
        expected_metrics = ['mse', 'rmse', 'mae', 'mape', 'coverage']
        for metric in expected_metrics:
            if metric in metrics:
                assert isinstance(metrics[metric], float)
                assert not pd.isna(metrics[metric])


class TestProphetMemoryManagement:
    """Test Prophet memory management and cleanup."""

    def test_model_cleanup(self, basic_config, sample_data):
        """Test Prophet model cleanup."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_data)

        # Verify model has data
        assert hasattr(fitted_model, 'history')

        # Clean up model
        prophet_service.cleanup_model(fitted_model)

        # Model should still exist but with cleaned data
        assert fitted_model is not None

    def test_memory_tracking(self, basic_config, sample_data):
        """Test memory tracking during Prophet operations."""
        import os

        import psutil

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        # Perform multiple Prophet operations
        for _ in range(3):
            model = prophet_service.create_model(basic_config)
            fitted_model = prophet_service.fit_model(model, sample_data)

            future = fitted_model.make_future_dataframe(periods=basic_config.horizon)
            forecast = prophet_service.predict(fitted_model, future)

            # Clean up
            prophet_service.cleanup_model(fitted_model)
            del model, fitted_model, future, forecast

        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable
        assert memory_increase < 50 * 1024 * 1024  # Less than 50MB


class TestProphetErrorHandling:
    """Test Prophet error handling."""

    def test_invalid_configuration_error(self):
        """Test error handling for invalid configurations."""
        # Test missing cap for logistic growth
        config = ForecastConfig(growth="logistic")  # Missing cap

        with pytest.raises(ProphetConfigurationError):
            prophet_service.create_model(config)

    def test_fitting_error_handling(self, basic_config):
        """Test error handling during model fitting."""
        model = prophet_service.create_model(basic_config)

        # Invalid data should raise error
        invalid_data = pd.DataFrame({'x': [1, 2, 3], 'z': [4, 5, 6]})

        with pytest.raises(ProphetConfigurationError):
            prophet_service.fit_model(model, invalid_data)

    def test_prediction_error_handling(self, basic_config, sample_data):
        """Test error handling during prediction."""
        model = prophet_service.create_model(basic_config)
        fitted_model = prophet_service.fit_model(model, sample_data)

        # Invalid future dataframe should raise error
        invalid_future = pd.DataFrame({'wrong_column': [1, 2, 3]})

        with pytest.raises(ProphetConfigurationError):
            prophet_service.predict(fitted_model, invalid_future)
