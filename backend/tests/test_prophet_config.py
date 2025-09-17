"""Tests for Prophet configuration models and service."""

import json

import pandas as pd
import pytest

from src.models.prophet_config import (
    ConfigTemplate,
    CustomSeasonality,
    ForecastConfig,
    Holiday,
    Regressor,
)
from src.services.prophet_service import ProphetConfigurationError, ProphetService


class TestForecastConfig:
    """Test ForecastConfig model."""

    def test_default_config_creation(self):
        """Test creating a default configuration."""
        config = ForecastConfig()

        assert config.horizon == 30
        assert config.interval_width == 0.8
        assert config.growth == "linear"
        assert config.seasonality_mode == "additive"
        assert config.changepoint_prior_scale == 0.05
        assert config.cap is None
        assert config.floor is None
        assert len(config.custom_seasonalities) == 0
        assert len(config.regressors) == 0
        assert len(config.custom_holidays) == 0

    def test_config_with_custom_parameters(self):
        """Test creating configuration with custom parameters."""
        config = ForecastConfig(
            name="Test Config",
            horizon=90,
            growth="logistic",
            cap=1000.0,
            floor=0.0,
            yearly_seasonality=True,
            weekly_seasonality=False,
            seasonality_mode="multiplicative",
            changepoint_prior_scale=0.1,
            mcmc_samples=300
        )

        assert config.name == "Test Config"
        assert config.horizon == 90
        assert config.growth == "logistic"
        assert config.cap == 1000.0
        assert config.floor == 0.0
        assert config.yearly_seasonality is True
        assert config.weekly_seasonality is False
        assert config.seasonality_mode == "multiplicative"
        assert config.changepoint_prior_scale == 0.1
        assert config.mcmc_samples == 300

    def test_config_validation_errors(self):
        """Test configuration validation errors."""
        # Test invalid growth mode
        with pytest.raises(ValueError, match="Growth must be one of"):
            ForecastConfig(growth="invalid")

        # Test invalid seasonality mode
        with pytest.raises(ValueError, match="Seasonality mode must be either"):
            ForecastConfig(seasonality_mode="invalid")

        # Test logistic growth without cap
        with pytest.raises(ValueError, match="Cap must be specified for logistic growth"):
            ForecastConfig(growth="logistic")

        # Test invalid changepoint dates
        with pytest.raises(ValueError, match="Invalid date format"):
            ForecastConfig(changepoints=["invalid-date"])

    def test_custom_seasonality(self):
        """Test custom seasonality configuration."""
        seasonality = CustomSeasonality(
            name="monthly",
            period=30.5,
            fourier_order=5,
            prior_scale=1.0,
            mode="additive"
        )

        config = ForecastConfig(custom_seasonalities=[seasonality])

        assert len(config.custom_seasonalities) == 1
        assert config.custom_seasonalities[0].name == "monthly"
        assert config.custom_seasonalities[0].period == 30.5
        assert config.custom_seasonalities[0].fourier_order == 5

    def test_custom_holidays(self):
        """Test custom holiday configuration."""
        holiday = Holiday(
            holiday="Black Friday",
            ds="2023-11-24",
            lower_window=-1,
            upper_window=1,
            prior_scale=5.0
        )

        config = ForecastConfig(custom_holidays=[holiday])

        assert len(config.custom_holidays) == 1
        assert config.custom_holidays[0].holiday == "Black Friday"
        assert config.custom_holidays[0].ds == "2023-11-24"

    def test_regressors(self):
        """Test regressor configuration."""
        regressor = Regressor(
            name="temperature",
            prior_scale=1.0,
            standardize=True,
            mode="additive"
        )

        config = ForecastConfig(regressors=[regressor])

        assert len(config.regressors) == 1
        assert config.regressors[0].name == "temperature"
        assert config.regressors[0].prior_scale == 1.0

    def test_json_export_import(self):
        """Test JSON export and import functionality."""
        # Create a complex configuration
        config = ForecastConfig(
            name="Test Export Config",
            horizon=60,
            growth="logistic",
            cap=500.0,
            custom_seasonalities=[
                CustomSeasonality(name="monthly", period=30.5, fourier_order=3)
            ],
            custom_holidays=[
                Holiday(holiday="Test Holiday", ds="2023-12-25")
            ],
            regressors=[
                Regressor(name="temperature", prior_scale=2.0)
            ]
        )

        # Export to JSON
        json_str = config.to_json()
        assert isinstance(json_str, str)

        # Verify JSON is valid
        json_data = json.loads(json_str)
        assert json_data["name"] == "Test Export Config"
        assert json_data["horizon"] == 60
        assert json_data["growth"] == "logistic"
        assert json_data["cap"] == 500.0

        # Import from JSON
        imported_config = ForecastConfig.from_json(json_str)

        # Verify imported configuration
        assert imported_config.name == config.name
        assert imported_config.horizon == config.horizon
        assert imported_config.growth == config.growth
        assert imported_config.cap == config.cap
        assert len(imported_config.custom_seasonalities) == 1
        assert len(imported_config.custom_holidays) == 1
        assert len(imported_config.regressors) == 1

    def test_to_prophet_params(self):
        """Test conversion to Prophet parameters."""
        config = ForecastConfig(
            growth="linear",
            changepoint_prior_scale=0.1,
            seasonality_prior_scale=5.0,
            yearly_seasonality=True,
            weekly_seasonality=False,
            mcmc_samples=100
        )

        params = config.to_prophet_params()

        assert params["growth"] == "linear"
        assert params["changepoint_prior_scale"] == 0.1
        assert params["seasonality_prior_scale"] == 5.0
        assert params["yearly_seasonality"] is True
        assert params["weekly_seasonality"] is False
        assert params["mcmc_samples"] == 100

    def test_get_summary(self):
        """Test configuration summary generation."""
        config = ForecastConfig(
            name="Test Summary",
            horizon=45,
            growth="logistic",
            cap=1000.0,  # Add cap for logistic growth
            custom_seasonalities=[CustomSeasonality(name="test", period=7, fourier_order=3)],
            mcmc_samples=200
        )

        summary = config.get_summary()

        assert summary["name"] == "Test Summary"
        assert summary["horizon"] == 45
        assert summary["growth"] == "logistic"
        assert summary["has_custom_seasonalities"] is True
        assert summary["mcmc_enabled"] is True


class TestConfigTemplate:
    """Test ConfigTemplate model and default templates."""

    def test_default_templates(self):
        """Test default template creation."""
        templates = ConfigTemplate.get_default_templates()

        assert len(templates) >= 3  # At least e-commerce, traffic, financial

        template_names = [t.name for t in templates]
        assert "E-commerce Sales" in template_names
        assert "Website Traffic" in template_names
        assert "Financial Data" in template_names

    def test_template_structure(self):
        """Test template structure and content."""
        templates = ConfigTemplate.get_default_templates()

        for template in templates:
            assert template.name
            assert template.description
            assert template.use_case
            assert isinstance(template.config, ForecastConfig)
            assert template.config.template is not None


class TestProphetService:
    """Test ProphetService functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = ProphetService()

    def test_create_model_basic(self):
        """Test basic Prophet model creation."""
        config = ForecastConfig(
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=False
        )

        model = self.service.create_model(config)

        assert model is not None
        assert model.growth == "linear"
        assert model.yearly_seasonality is True
        assert model.weekly_seasonality is False

    def test_create_model_with_custom_components(self):
        """Test Prophet model creation with custom components."""
        config = ForecastConfig(
            custom_seasonalities=[
                CustomSeasonality(name="monthly", period=30.5, fourier_order=3)
            ],
            regressors=[
                Regressor(name="temperature", prior_scale=1.0)
            ]
        )

        model = self.service.create_model(config)

        assert model is not None
        # Verify custom seasonalities and regressors were added
        # (Prophet doesn't expose these directly, so we test creation success)

    def test_validate_config_basic(self):
        """Test basic configuration validation."""
        config = ForecastConfig(growth="linear")

        result = self.service.validate_config(config)

        assert result["is_valid"] is True
        assert len(result["errors"]) == 0

    def test_validate_config_errors(self):
        """Test configuration validation with errors."""
        # Test floor >= cap
        config = ForecastConfig(growth="logistic", cap=100.0, floor=150.0)

        result = self.service.validate_config(config)

        assert result["is_valid"] is False
        assert any("floor" in error.lower() and "cap" in error.lower() for error in result["errors"])

    def test_validate_config_with_data(self):
        """Test configuration validation against data."""
        # Create test data
        dates = pd.date_range("2023-01-01", periods=100, freq="D")
        data = pd.DataFrame({
            "ds": dates,
            "y": range(100),
            "temperature": range(100, 200)
        })

        # Config with regressor that exists in data
        config = ForecastConfig(
            regressors=[Regressor(name="temperature")]
        )

        result = self.service.validate_config(config, data)

        assert result["is_valid"] is True

        # Config with regressor that doesn't exist in data
        config_bad = ForecastConfig(
            regressors=[Regressor(name="humidity")]
        )

        result_bad = self.service.validate_config(config_bad, data)

        assert result_bad["is_valid"] is False
        assert any("humidity" in error for error in result_bad["errors"])

    def test_get_templates(self):
        """Test template retrieval."""
        templates = self.service.get_templates()

        assert len(templates) >= 3
        assert all(isinstance(t, ConfigTemplate) for t in templates)

    def test_get_template_by_name(self):
        """Test template retrieval by name."""
        template = self.service.get_template_by_name("E-commerce Sales")

        assert template is not None
        assert template.name == "E-commerce Sales"

        # Test non-existent template
        template_none = self.service.get_template_by_name("Non-existent")
        assert template_none is None

    def test_create_config_from_template(self):
        """Test configuration creation from template."""
        config = self.service.create_config_from_template(
            "E-commerce Sales",
            horizon=120,
            name="Custom E-commerce Config"
        )

        assert config.horizon == 120  # Override applied
        assert config.name == "Custom E-commerce Config"  # Override applied
        assert config.seasonality_mode == "multiplicative"  # From template

    def test_create_config_from_invalid_template(self):
        """Test error handling for invalid template."""
        with pytest.raises(ProphetConfigurationError, match="Template .* not found"):
            self.service.create_config_from_template("Invalid Template")

    def test_export_import_config_json(self):
        """Test JSON export and import through service."""
        config = ForecastConfig(
            name="Service Test Config",
            horizon=75,
            growth="logistic",
            cap=1000.0
        )

        # Export
        json_str = self.service.export_config_json(config)
        assert isinstance(json_str, str)

        # Import
        imported_config = self.service.import_config_json(json_str)

        assert imported_config.name == config.name
        assert imported_config.horizon == config.horizon
        assert imported_config.growth == config.growth
        assert imported_config.cap == config.cap

    def test_import_invalid_json(self):
        """Test error handling for invalid JSON import."""
        with pytest.raises(ProphetConfigurationError, match="Invalid JSON format"):
            self.service.import_config_json("invalid json")

        # Test invalid configuration
        invalid_config_json = json.dumps({"growth": "invalid_growth"})
        with pytest.raises(ProphetConfigurationError, match="Failed to import configuration"):
            self.service.import_config_json(invalid_config_json)

    def test_get_config_summary(self):
        """Test configuration summary generation."""
        config = ForecastConfig(
            name="Summary Test",
            horizon=30,
            mcmc_samples=100
        )

        summary = self.service.get_config_summary(config)

        assert summary["name"] == "Summary Test"
        assert summary["horizon"] == 30
        assert summary["mcmc_enabled"] is True

    def test_cleanup_model(self):
        """Test model cleanup functionality."""
        config = ForecastConfig()
        model = self.service.create_model(config)

        # This should not raise an exception
        self.service.cleanup_model(model)
