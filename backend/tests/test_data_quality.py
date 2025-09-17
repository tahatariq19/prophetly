"""Tests for data quality assessment service."""

import numpy as np
import pandas as pd
import pytest

from src.services.data_quality import data_quality_service


class TestDataQualityAssessment:
    """Test cases for data quality assessment functionality."""

    def test_basic_statistics_calculation(self):
        """Test basic statistics calculation for a simple dataset."""
        # Create test DataFrame
        df = pd.DataFrame({
            'date': pd.date_range('2023-01-01', periods=100, freq='D'),
            'value': np.random.normal(100, 10, 100),
            'category': ['A', 'B', 'C'] * 33 + ['A']
        })

        # Create column info
        column_info = {
            'date': {'type': 'datetime', 'is_potential_date': True, 'is_potential_value': False},
            'value': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'category': {'type': 'text', 'is_potential_date': False, 'is_potential_value': False}
        }

        # Perform assessment
        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify basic statistics
        assert assessment['basic_statistics']['total_rows'] == 100
        assert assessment['basic_statistics']['total_columns'] == 3
        assert assessment['basic_statistics']['numeric_columns'] == 1
        assert assessment['basic_statistics']['text_columns'] == 2
        assert assessment['basic_statistics']['duplicate_rows'] == 0
        assert assessment['basic_statistics']['completely_empty_rows'] == 0

    def test_missing_values_analysis(self):
        """Test missing values analysis."""
        # Create DataFrame with missing values
        df = pd.DataFrame({
            'complete_col': [1, 2, 3, 4, 5],
            'partial_missing': [1, np.nan, 3, np.nan, 5],
            'mostly_missing': [np.nan, np.nan, np.nan, np.nan, 1]
        })

        column_info = {
            'complete_col': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'partial_missing': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'mostly_missing': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True}
        }

        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify missing value analysis
        missing_analysis = assessment['missing_values']
        assert missing_analysis['total_missing_values'] == 6
        assert missing_analysis['missing_percentage'] == 40.0  # 6 out of 15 total values

        # Check per-column analysis
        assert 'complete_col' not in missing_analysis['columns_with_missing']
        assert missing_analysis['columns_with_missing']['partial_missing']['count'] == 2
        assert missing_analysis['columns_with_missing']['partial_missing']['percentage'] == 40.0
        assert missing_analysis['columns_with_missing']['mostly_missing']['count'] == 4
        assert missing_analysis['columns_with_missing']['mostly_missing']['percentage'] == 80.0

    def test_outlier_detection(self):
        """Test outlier detection functionality."""
        # Create data with known outliers
        normal_data = np.random.normal(50, 5, 95)
        outliers = [100, 0, 150, -50, 200]  # Clear outliers
        data = np.concatenate([normal_data, outliers])

        df = pd.DataFrame({
            'values': data,
            'date': pd.date_range('2023-01-01', periods=100, freq='D')
        })

        column_info = {
            'values': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'date': {'type': 'datetime', 'is_potential_date': True, 'is_potential_value': False}
        }

        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify outlier detection
        outlier_analysis = assessment['outliers']
        assert 'values' in outlier_analysis['outliers_found']
        assert outlier_analysis['outliers_found']['values']['total_outliers'] > 0
        assert outlier_analysis['outliers_found']['values']['iqr_outliers']['count'] > 0

    def test_time_series_readiness_check(self):
        """Test time series readiness assessment."""
        # Create time series ready data
        df = pd.DataFrame({
            'date': pd.date_range('2023-01-01', periods=50, freq='D'),
            'sales': np.random.normal(1000, 100, 50),
            'category': ['A'] * 25 + ['B'] * 25
        })

        column_info = {
            'date': {'type': 'datetime', 'is_potential_date': True, 'is_potential_value': False},
            'sales': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'category': {'type': 'text', 'is_potential_date': False, 'is_potential_value': False}
        }

        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify time series readiness
        ts_checks = assessment['time_series_checks']
        assert ts_checks['time_series_readiness']['has_date_column'] is True
        assert ts_checks['time_series_readiness']['has_value_column'] is True
        assert ts_checks['time_series_readiness']['minimum_rows'] is True
        assert ts_checks['time_series_readiness']['ready_for_forecasting'] is True

        # Check frequency analysis
        assert 'frequency_analysis' in ts_checks
        freq_analysis = ts_checks['frequency_analysis']
        assert freq_analysis['detected_frequency'] == 'daily'
        assert freq_analysis['regular_intervals'] is True

    def test_time_series_not_ready(self):
        """Test time series readiness when data is not suitable."""
        # Create data without proper date/value columns
        df = pd.DataFrame({
            'text_col1': ['A', 'B', 'C'],
            'text_col2': ['X', 'Y', 'Z'],
            'small_numeric': [1, 2, 3]  # Too few rows
        })

        column_info = {
            'text_col1': {'type': 'text', 'is_potential_date': False, 'is_potential_value': False},
            'text_col2': {'type': 'text', 'is_potential_date': False, 'is_potential_value': False},
            'small_numeric': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True}
        }

        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify not ready for time series
        ts_checks = assessment['time_series_checks']
        assert ts_checks['time_series_readiness']['has_date_column'] is False
        assert ts_checks['time_series_readiness']['minimum_rows'] is False
        assert ts_checks['time_series_readiness']['ready_for_forecasting'] is False

    def test_overall_quality_score(self):
        """Test overall quality score calculation."""
        # Create high-quality data
        df = pd.DataFrame({
            'date': pd.date_range('2023-01-01', periods=100, freq='D'),
            'value': np.random.normal(100, 10, 100)
        })

        column_info = {
            'date': {'type': 'datetime', 'is_potential_date': True, 'is_potential_value': False},
            'value': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True}
        }

        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify high quality score
        overall_quality = assessment['overall_quality']
        assert overall_quality['score'] >= 80  # Should be high quality
        assert overall_quality['grade'] in ['A', 'B']
        assert overall_quality['summary']['time_series_ready'] is True
        assert len(overall_quality['critical_issues']) == 0

    def test_recommendations_generation(self):
        """Test that appropriate recommendations are generated."""
        # Create data with various issues
        df = pd.DataFrame({
            'date': ['2023-01-01', '2023-01-02', '2023-01-05', '2023-01-06'],  # Gap in dates
            'value': [100, np.nan, 200, np.nan],  # Missing values
            'duplicate_row': [1, 1, 1, 1]  # No variation
        })

        # Add duplicate row
        df = pd.concat([df, df.iloc[[0]]], ignore_index=True)

        column_info = {
            'date': {'type': 'potential_datetime', 'is_potential_date': True, 'is_potential_value': False},
            'value': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'duplicate_row': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True}
        }

        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify recommendations are generated
        recommendations = assessment['recommendations']
        assert len(recommendations) > 0

        # Check for specific recommendations based on data issues
        rec_text = ' '.join(recommendations).lower()
        assert 'missing' in rec_text or 'duplicate' in rec_text or 'gap' in rec_text

    def test_data_distribution_analysis(self):
        """Test data distribution analysis for numeric and categorical data."""
        # Create data with known distribution characteristics
        df = pd.DataFrame({
            'normal_dist': np.random.normal(0, 1, 1000),
            'skewed_dist': np.random.exponential(2, 1000),
            'categorical': ['A'] * 500 + ['B'] * 300 + ['C'] * 200
        })

        column_info = {
            'normal_dist': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'skewed_dist': {'type': 'numeric', 'is_potential_date': False, 'is_potential_value': True},
            'categorical': {'type': 'text', 'is_potential_date': False, 'is_potential_value': False}
        }

        assessment = data_quality_service.assess_data_quality(df, column_info)

        # Verify distribution analysis
        dist_analysis = assessment['data_distribution']

        # Check numeric distributions
        assert 'normal_dist' in dist_analysis['numeric_distributions']
        assert 'skewed_dist' in dist_analysis['numeric_distributions']

        normal_dist = dist_analysis['numeric_distributions']['normal_dist']
        skewed_dist = dist_analysis['numeric_distributions']['skewed_dist']

        # Normal distribution should have low skewness
        assert abs(normal_dist['skewness']) < 0.5

        # Exponential distribution should be positively skewed
        assert skewed_dist['skewness'] > 1

        # Check categorical distribution
        assert 'categorical' in dist_analysis['categorical_distributions']
        cat_dist = dist_analysis['categorical_distributions']['categorical']
        assert cat_dist['unique_values'] == 3
        assert cat_dist['most_frequent']['value'] == 'A'
        assert cat_dist['most_frequent']['count'] == 500

    def test_error_handling(self):
        """Test error handling for invalid inputs."""
        # Test with empty DataFrame
        empty_df = pd.DataFrame()
        assessment = data_quality_service.assess_data_quality(empty_df, {})

        # Should return error assessment
        assert 'error' in assessment
        assert assessment['error'] is True
        assert assessment['overall_quality']['score'] == 0
        assert assessment['overall_quality']['grade'] == 'F'


if __name__ == "__main__":
    pytest.main([__file__])
