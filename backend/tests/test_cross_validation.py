"""Tests for cross-validation functionality."""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from src.models.cross_validation import (
    CrossValidationConfig,
    CrossValidationMetrics,
    CrossValidationRequest
)
from src.models.prophet_config import ForecastConfig
from src.services.prophet_service import ProphetService


class TestCrossValidationModels:
    """Test cross-validation data models."""

    def test_cross_validation_config_default(self):
        """Test default cross-validation configuration."""
        config = CrossValidationConfig()
        
        assert config.initial == "730 days"
        assert config.period == "180 days"
        assert config.horizon == "365 days"
        assert config.cutoffs is None
        assert config.parallel is None

    def test_cross_validation_config_custom_cutoffs(self):
        """Test cross-validation configuration with custom cutoffs."""
        cutoffs = ["2023-01-01", "2023-06-01", "2023-12-01"]
        config = CrossValidationConfig(cutoffs=cutoffs)
        
        assert config.cutoffs == cutoffs

    def test_cross_validation_config_invalid_cutoffs(self):
        """Test validation of invalid cutoff dates."""
        with pytest.raises(ValueError, match="Invalid date format"):
            CrossValidationConfig(cutoffs=["invalid-date"])

    def test_cross_validation_metrics(self):
        """Test cross-validation metrics model."""
        metrics = CrossValidationMetrics(
            rmse=10.5,
            mae=8.2,
            mape=15.3,
            mdape=12.1,
            smape=14.7,
            coverage=85.2
        )
        
        assert metrics.rmse == 10.5
        assert metrics.mae == 8.2
        assert metrics.mape == 15.3
        assert metrics.coverage == 85.2


class TestCrossValidationService:
    """Test cross-validation service functionality."""

    @pytest.fixture
    def prophet_service(self):
        """Create Prophet service instance."""
        return ProphetService()

    @pytest.fixture
    def sample_data(self):
        """Create sample time series data for testing."""
        dates = pd.date_range(start='2020-01-01', end='2023-12-31', freq='D')
        # Create synthetic data with trend and seasonality
        trend = np.linspace(100, 200, len(dates))
        seasonal = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)
        noise = np.random.normal(0, 5, len(dates))
        values = trend + seasonal + noise
        
        return pd.DataFrame({
            'ds': dates,
            'y': values
        })

    @pytest.fixture
    def forecast_config(self):
        """Create basic forecast configuration."""
        return ForecastConfig(
            horizon=30,
            growth="linear",
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False
        )

    def test_cross_validation_basic(self, prophet_service, sample_data, forecast_config):
        """Test basic cross-validation functionality."""
        # Create Prophet model
        model = prophet_service.create_model(forecast_config)
        
        # Perform cross-validation with shorter periods for testing
        cv_config = CrossValidationConfig(
            initial="365 days",
            period="90 days", 
            horizon="30 days"
        )
        
        cv_results = prophet_service.cross_validate(
            model=model,
            data=sample_data,
            initial=cv_config.initial,
            period=cv_config.period,
            cv_horizon=cv_config.horizon
        )
        
        # Verify results structure
        assert isinstance(cv_results, pd.DataFrame)
        assert 'ds' in cv_results.columns
        assert 'cutoff' in cv_results.columns
        assert 'y' in cv_results.columns
        assert 'yhat' in cv_results.columns
        assert 'yhat_lower' in cv_results.columns
        assert 'yhat_upper' in cv_results.columns
        
        # Verify we have multiple cutoffs
        assert len(cv_results['cutoff'].unique()) >= 2
        
        # Clean up
        prophet_service.cleanup_model(model)

    def test_cross_validation_custom_cutoffs(self, prophet_service, sample_data, forecast_config):
        """Test cross-validation with custom cutoffs."""
        # Create Prophet model
        model = prophet_service.create_model(forecast_config)
        
        # Define custom cutoffs
        custom_cutoffs = pd.to_datetime(['2022-01-01', '2022-07-01', '2023-01-01'])
        
        cv_results = prophet_service.cross_validate(
            model=model,
            data=sample_data,
            initial="365 days",
            cv_horizon="30 days",
            cutoffs=custom_cutoffs
        )
        
        # Verify results
        assert isinstance(cv_results, pd.DataFrame)
        assert len(cv_results['cutoff'].unique()) == len(custom_cutoffs)
        
        # Clean up
        prophet_service.cleanup_model(model)

    def test_performance_metrics_calculation(self, prophet_service):
        """Test performance metrics calculation."""
        # Create mock cross-validation results
        cv_data = {
            'ds': pd.date_range('2023-01-01', periods=10, freq='D'),
            'cutoff': pd.date_range('2022-12-01', periods=10, freq='D'),
            'y': [100, 105, 110, 95, 120, 115, 108, 102, 118, 125],
            'yhat': [98, 107, 108, 97, 118, 117, 106, 104, 116, 123],
            'yhat_lower': [90, 99, 100, 89, 110, 109, 98, 96, 108, 115],
            'yhat_upper': [106, 115, 116, 105, 126, 125, 114, 112, 124, 131]
        }
        cv_results = pd.DataFrame(cv_data)
        
        metrics = prophet_service.calculate_performance_metrics(cv_results)
        
        # Verify metrics are calculated
        assert isinstance(metrics, dict)
        assert 'rmse' in metrics
        assert 'mae' in metrics
        assert 'mape' in metrics
        
        # Verify metrics are reasonable
        assert metrics['rmse'] > 0
        assert metrics['mae'] > 0
        assert 0 <= metrics['mape'] <= 100


if __name__ == "__main__":
    pytest.main([__file__])