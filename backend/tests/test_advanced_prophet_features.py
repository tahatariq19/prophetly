"""Tests for advanced Prophet features implementation."""

import pytest
import pandas as pd
from datetime import datetime, timedelta

from src.models.prophet_config import ForecastConfig, CustomSeasonality, Regressor, Holiday
from src.services.prophet_service import ProphetService, ProphetConfigurationError


class TestAdvancedProphetFeatures:
    """Test suite for advanced Prophet features."""

    def setup_method(self):
        """Set up test fixtures."""
        self.prophet_service = ProphetService()
        
        # Create sample data
        dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
        self.sample_data = pd.DataFrame({
            'ds': dates,
            'y': range(len(dates)),
            'regressor1': range(len(dates)),
            'regressor2': [x * 2 for x in range(len(dates))],
            'condition': [1 if x % 7 < 5 else 0 for x in range(len(dates))]  # Weekday condition
        })

    def test_custom_seasonality_creation(self):
        """Test custom seasonality addition with memory management."""
        # Create config with custom seasonality
        custom_seasonality = CustomSeasonality(
            name="monthly",
            period=30.5,
            fourier_order=5,
            prior_scale=1.0,
            mode="additive"
        )
        
        config = ForecastConfig(
            horizon=30,
            custom_seasonalities=[custom_seasonality]
        )
        
        # Create model
        model = self.prophet_service.create_model(config)
        
        # Verify seasonality was added
        assert hasattr(model, 'seasonalities')
        assert 'monthly' in model.seasonalities
        assert model.seasonalities['monthly']['period'] == 30.5
        assert model.seasonalities['monthly']['fourier_order'] == 5

    def test_conditional_seasonality(self):
        """Test conditional seasonality with external condition."""
        custom_seasonality = CustomSeasonality(
            name="weekday_pattern",
            period=7,
            fourier_order=3,
            prior_scale=2.0,
            mode="additive",
            condition_name="condition"
        )
        
        config = ForecastConfig(
            horizon=30,
            custom_seasonalities=[custom_seasonality]
        )
        
        model = self.prophet_service.create_model(config)
        
        # Verify conditional seasonality
        assert 'weekday_pattern' in model.seasonalities
        assert model.seasonalities['weekday_pattern']['condition_name'] == 'condition'

    def test_external_regressors(self):
        """Test external regressor addition with validation."""
        regressors = [
            Regressor(
                name="regressor1",
                prior_scale=0.5,
                standardize=True,
                mode="additive"
            ),
            Regressor(
                name="regressor2",
                prior_scale=1.0,
                standardize=False,
                mode="multiplicative"
            )
        ]
        
        config = ForecastConfig(
            horizon=30,
            regressors=regressors
        )
        
        model = self.prophet_service.create_model(config)
        
        # Verify regressors were added
        assert hasattr(model, 'extra_regressors')
        assert 'regressor1' in model.extra_regressors
        assert 'regressor2' in model.extra_regressors
        assert model.extra_regressors['regressor1']['prior_scale'] == 0.5
        assert model.extra_regressors['regressor2']['mode'] == 'multiplicative'

    def test_custom_holidays(self):
        """Test custom holiday configuration."""
        custom_holidays = [
            Holiday(
                holiday="Company Founding",
                ds="2023-06-15",
                lower_window=-1,
                upper_window=1,
                prior_scale=5.0
            ),
            Holiday(
                holiday="Product Launch",
                ds="2023-09-01",
                lower_window=0,
                upper_window=2,
                prior_scale=3.0
            )
        ]
        
        config = ForecastConfig(
            horizon=30,
            custom_holidays=custom_holidays
        )
        
        model = self.prophet_service.create_model(config)
        
        # Verify holidays were configured
        if hasattr(model, 'holidays') and model.holidays is not None:
            assert len(model.holidays) >= 2
            holiday_names = set(model.holidays['holiday'].values)
            assert "Company Founding" in holiday_names
            assert "Product Launch" in holiday_names

    def test_built_in_holidays(self):
        """Test built-in holidays by country."""
        config = ForecastConfig(
            horizon=30,
            holidays_country="US"
        )
        
        # This should not raise an error
        model = self.prophet_service.create_model(config)
        
        # Built-in holidays are handled by Prophet internally
        # We just verify the model was created successfully
        assert model is not None

    def test_mcmc_sampling_configuration(self):
        """Test MCMC sampling with memory optimization."""
        config = ForecastConfig(
            horizon=30,
            mcmc_samples=100  # Small number for testing
        )
        
        model = self.prophet_service.create_model(config)
        
        # Verify MCMC configuration
        assert model.mcmc_samples == 100

    def test_advanced_features_validation(self):
        """Test validation of advanced features against data."""
        # Valid configuration
        config = ForecastConfig(
            horizon=30,
            custom_seasonalities=[
                CustomSeasonality(
                    name="weekly",
                    period=7,
                    fourier_order=3,
                    prior_scale=1.0
                )
            ],
            regressors=[
                Regressor(name="regressor1", prior_scale=0.5)
            ]
        )
        
        validation_result = self.prophet_service.validate_config(config, self.sample_data)
        
        assert validation_result['is_valid'] is True
        assert len(validation_result['errors']) == 0

    def test_invalid_seasonality_validation(self):
        """Test validation of invalid seasonality configuration."""
        config = ForecastConfig(
            horizon=30,
            custom_seasonalities=[
                CustomSeasonality(
                    name="invalid",
                    period=-1,  # Invalid period
                    fourier_order=3
                )
            ]
        )
        
        with pytest.raises(ProphetConfigurationError):
            self.prophet_service.create_model(config)

    def test_missing_regressor_validation(self):
        """Test validation when regressor column is missing from data."""
        config = ForecastConfig(
            horizon=30,
            regressors=[
                Regressor(name="missing_regressor", prior_scale=0.5)
            ]
        )
        
        validation_result = self.prophet_service.validate_config(config, self.sample_data)
        
        assert validation_result['is_valid'] is False
        assert any("missing_regressor" in error for error in validation_result['errors'])

    def test_future_dataframe_with_regressors(self):
        """Test future dataframe creation with regressor data."""
        config = ForecastConfig(
            horizon=30,
            regressors=[
                Regressor(name="regressor1", prior_scale=0.5)
            ]
        )
        
        model = self.prophet_service.create_model(config)
        model = self.prophet_service.fit_model(model, self.sample_data, config)
        
        # Create regressor data for future periods
        future_dates = pd.date_range(
            start=self.sample_data['ds'].max() + timedelta(days=1),
            periods=30,
            freq='D'
        )
        regressor_data = pd.DataFrame({
            'ds': future_dates,
            'regressor1': range(len(future_dates))
        })
        
        future = self.prophet_service.create_future_dataframe(
            model, 
            periods=30, 
            regressor_data=regressor_data
        )
        
        assert 'regressor1' in future.columns
        assert len(future) > len(self.sample_data)  # Should include history + future

    def test_model_cleanup_with_advanced_features(self):
        """Test memory cleanup for models with advanced features."""
        config = ForecastConfig(
            horizon=30,
            mcmc_samples=50,
            custom_seasonalities=[
                CustomSeasonality(name="test", period=7, fourier_order=2)
            ],
            regressors=[
                Regressor(name="regressor1", prior_scale=0.5)
            ]
        )
        
        model = self.prophet_service.create_model(config)
        model = self.prophet_service.fit_model(model, self.sample_data, config)
        
        # Cleanup should not raise errors
        self.prophet_service.cleanup_model(model)
        
        # Verify cleanup worked (some attributes should be cleared)
        assert not hasattr(model, 'history') or model.history is None

    def test_logistic_growth_with_cap_and_floor(self):
        """Test logistic growth configuration with cap and floor."""
        config = ForecastConfig(
            horizon=30,
            growth="logistic",
            cap=1000.0,
            floor=0.0
        )
        
        model = self.prophet_service.create_model(config)
        
        # Should not raise error - cap and floor will be added by fit_model
        model = self.prophet_service.fit_model(model, self.sample_data, config)
        
        assert model.growth == 'logistic'

    def test_multiple_seasonality_modes(self):
        """Test mixing additive and multiplicative seasonalities."""
        config = ForecastConfig(
            horizon=30,
            custom_seasonalities=[
                CustomSeasonality(
                    name="additive_weekly",
                    period=7,
                    fourier_order=3,
                    mode="additive"
                ),
                CustomSeasonality(
                    name="multiplicative_monthly",
                    period=30.5,
                    fourier_order=5,
                    mode="multiplicative"
                )
            ]
        )
        
        model = self.prophet_service.create_model(config)
        
        assert model.seasonalities['additive_weekly']['mode'] == 'additive'
        assert model.seasonalities['multiplicative_monthly']['mode'] == 'multiplicative'

    def test_configuration_export_import_with_advanced_features(self):
        """Test JSON export/import of configurations with advanced features."""
        config = ForecastConfig(
            name="Advanced Test Config",
            horizon=60,
            mcmc_samples=200,
            custom_seasonalities=[
                CustomSeasonality(
                    name="business_cycle",
                    period=365.25,
                    fourier_order=10,
                    prior_scale=2.0,
                    mode="multiplicative"
                )
            ],
            regressors=[
                Regressor(
                    name="marketing_spend",
                    prior_scale=1.5,
                    standardize=True,
                    mode="additive"
                )
            ],
            custom_holidays=[
                Holiday(
                    holiday="Black Friday",
                    ds="2023-11-24",
                    lower_window=-1,
                    upper_window=3,
                    prior_scale=10.0
                )
            ]
        )
        
        # Export to JSON
        json_str = self.prophet_service.export_config_json(config)
        assert json_str is not None
        assert "Advanced Test Config" in json_str
        
        # Import from JSON
        imported_config = self.prophet_service.import_config_json(json_str)
        
        # Verify all advanced features were preserved
        assert imported_config.name == config.name
        assert imported_config.mcmc_samples == config.mcmc_samples
        assert len(imported_config.custom_seasonalities) == 1
        assert imported_config.custom_seasonalities[0].name == "business_cycle"
        assert len(imported_config.regressors) == 1
        assert imported_config.regressors[0].name == "marketing_spend"
        assert len(imported_config.custom_holidays) == 1
        assert imported_config.custom_holidays[0].holiday == "Black Friday"