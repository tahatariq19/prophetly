"""Tests for data preprocessing service."""

import numpy as np
import pandas as pd
import pytest

from src.services.data_preprocessor import DataPreprocessingError, DataPreprocessor


class TestDataPreprocessor:
    """Test cases for DataPreprocessor class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.preprocessor = DataPreprocessor()

        # Create sample data for testing
        dates = pd.date_range('2023-01-01', periods=100, freq='D')
        values = np.random.normal(100, 10, 100)

        # Add some missing values and duplicates
        values[10:15] = np.nan
        values[50] = np.nan

        self.sample_df = pd.DataFrame({
            'date': dates,
            'value': values,
            'category': ['A'] * 50 + ['B'] * 50
        })

        # Add duplicate rows
        self.sample_df = pd.concat([self.sample_df, self.sample_df.iloc[[0, 1]]], ignore_index=True)

    def test_clean_data_remove_duplicates(self):
        """Test removing duplicate rows."""
        cleaning_options = {'remove_duplicates': True}

        cleaned_df, report = self.preprocessor.clean_data(self.sample_df, cleaning_options)

        assert len(cleaned_df) == 100  # Should remove 2 duplicates
        assert 'remove_duplicates' in report['operations_performed']
        assert report['changes_summary']['duplicates_removed'] == 2

    def test_clean_data_interpolate_missing(self):
        """Test interpolating missing values."""
        cleaning_options = {
            'missing_values_strategy': 'interpolate',
            'interpolation_method': 'linear'
        }

        cleaned_df, report = self.preprocessor.clean_data(self.sample_df, cleaning_options)

        # Should have fewer missing values
        assert cleaned_df['value'].isnull().sum() < self.sample_df['value'].isnull().sum()
        assert 'handle_missing_interpolate' in report['operations_performed']

    def test_clean_data_drop_missing_rows(self):
        """Test dropping rows with missing values."""
        cleaning_options = {'missing_values_strategy': 'drop_rows'}

        cleaned_df, report = self.preprocessor.clean_data(self.sample_df, cleaning_options)

        # Should have no missing values
        assert cleaned_df.isnull().sum().sum() == 0
        assert len(cleaned_df) < len(self.sample_df)
        assert 'handle_missing_drop_rows' in report['operations_performed']

    def test_clean_data_remove_outliers(self):
        """Test removing outliers."""
        # Add some extreme outliers
        df_with_outliers = self.sample_df.copy()
        df_with_outliers.loc[0, 'value'] = 1000  # Extreme outlier
        df_with_outliers.loc[1, 'value'] = -1000  # Extreme outlier

        cleaning_options = {
            'remove_outliers': True,
            'outlier_columns': ['value'],
            'outlier_method': 'iqr'
        }

        cleaned_df, report = self.preprocessor.clean_data(df_with_outliers, cleaning_options)

        # Should remove outlier rows
        assert len(cleaned_df) < len(df_with_outliers)
        assert 'remove_outliers_iqr' in report['operations_performed']

    def test_transform_data_log_transform(self):
        """Test log transformation."""
        # Create data with positive values only
        df = pd.DataFrame({
            'value': [1, 2, 3, 4, 5, 10, 20, 30]
        })

        transformation_options = {'log_transform_columns': ['value']}

        transformed_df, report = self.preprocessor.transform_data(df, transformation_options)

        assert 'value_log' in transformed_df.columns
        assert 'log_transform_value' in report['transformations_applied']
        assert 'value_log' in report['new_columns']

        # Check that log transformation was applied correctly
        expected_log = np.log(df['value'])
        np.testing.assert_array_almost_equal(
            transformed_df['value_log'].values,
            expected_log.values
        )

    def test_transform_data_log_transform_with_negatives(self):
        """Test log transformation with negative values."""
        df = pd.DataFrame({
            'value': [-5, -2, 0, 1, 2, 3, 4, 5]
        })

        transformation_options = {'log_transform_columns': ['value']}

        transformed_df, report = self.preprocessor.transform_data(df, transformation_options)

        assert 'value_log' in transformed_df.columns
        assert report['transformation_details']['value_log']['type'] == 'log_transform_with_constant'
        assert report['transformation_details']['value_log']['constant_added'] == 6.0  # abs(-5) + 1

    def test_transform_data_differencing(self):
        """Test differencing transformation."""
        df = pd.DataFrame({
            'value': [1, 3, 6, 10, 15, 21, 28, 36]
        })

        transformation_options = {'differencing_columns': ['value']}

        transformed_df, report = self.preprocessor.transform_data(df, transformation_options)

        assert 'value_diff' in transformed_df.columns
        assert 'differencing_value' in report['transformations_applied']
        assert 'value_diff' in report['new_columns']

        # Check that differencing was applied correctly
        expected_diff = df['value'].diff()
        pd.testing.assert_series_equal(
            transformed_df['value_diff'],
            expected_diff,
            check_names=False
        )

    def test_transform_data_sqrt_transform(self):
        """Test square root transformation."""
        df = pd.DataFrame({
            'value': [1, 4, 9, 16, 25, 36, 49, 64]
        })

        transformation_options = {'sqrt_transform_columns': ['value']}

        transformed_df, report = self.preprocessor.transform_data(df, transformation_options)

        assert 'value_sqrt' in transformed_df.columns
        assert 'sqrt_transform_value' in report['transformations_applied']

        # Check that sqrt transformation was applied correctly
        expected_sqrt = np.sqrt(df['value'])
        np.testing.assert_array_almost_equal(
            transformed_df['value_sqrt'].values,
            expected_sqrt.values
        )

    def test_validate_for_prophet_valid_data(self):
        """Test Prophet validation with valid data."""
        # Create valid Prophet data
        dates = pd.date_range('2023-01-01', periods=50, freq='D')
        values = np.random.normal(100, 10, 50)

        df = pd.DataFrame({
            'ds': dates,
            'y': values
        })

        validation_result = self.preprocessor.validate_for_prophet(df, 'ds', 'y')

        assert validation_result['is_valid'] is True
        assert validation_result['prophet_ready'] is True
        assert len(validation_result['errors']) == 0
        assert validation_result['data_summary']['total_rows'] == 50

    def test_validate_for_prophet_missing_columns(self):
        """Test Prophet validation with missing columns."""
        df = pd.DataFrame({
            'date': ['2023-01-01', '2023-01-02'],
            'value': [100, 110]
        })

        validation_result = self.preprocessor.validate_for_prophet(df, 'missing_col', 'value')

        assert validation_result['is_valid'] is False
        assert len(validation_result['errors']) > 0
        assert "not found in data" in validation_result['errors'][0]

    def test_validate_for_prophet_insufficient_data(self):
        """Test Prophet validation with insufficient data."""
        df = pd.DataFrame({
            'ds': ['2023-01-01'],
            'y': [100]
        })

        validation_result = self.preprocessor.validate_for_prophet(df, 'ds', 'y')

        assert validation_result['is_valid'] is False
        assert any("Insufficient data points" in error for error in validation_result['errors'])

    def test_validate_for_prophet_invalid_date_format(self):
        """Test Prophet validation with invalid date format."""
        df = pd.DataFrame({
            'ds': ['not-a-date', 'also-not-a-date'],
            'y': [100, 110]
        })

        validation_result = self.preprocessor.validate_for_prophet(df, 'ds', 'y')

        assert validation_result['is_valid'] is False
        assert any("Cannot convert date column" in error for error in validation_result['errors'])

    def test_validate_for_prophet_non_numeric_values(self):
        """Test Prophet validation with non-numeric values."""
        df = pd.DataFrame({
            'ds': pd.date_range('2023-01-01', periods=10, freq='D'),
            'y': ['not', 'numeric', 'values'] + [100] * 7
        })

        validation_result = self.preprocessor.validate_for_prophet(df, 'ds', 'y')

        # Should still be valid but with warnings about non-numeric values
        assert len(validation_result['warnings']) > 0
        assert any("non-numeric values" in warning for warning in validation_result['warnings'])

    def test_prepare_for_download(self):
        """Test preparing data for download."""
        metadata = {
            'processing_level': 'cleaned',
            'operations': ['remove_duplicates', 'interpolate_missing']
        }

        download_data = self.preprocessor.prepare_for_download(self.sample_df, metadata)

        assert 'data' in download_data
        assert 'metadata' in download_data
        assert 'format_info' in download_data

        assert download_data['data']['columns'] == list(self.sample_df.columns)
        assert len(download_data['data']['rows']) == len(self.sample_df)
        assert download_data['format_info']['csv_ready'] is True
        assert download_data['metadata']['processing_history'] == metadata

    def test_handle_missing_values_strategies(self):
        """Test different missing value handling strategies."""
        df = pd.DataFrame({
            'a': [1, 2, np.nan, 4, 5],
            'b': [np.nan, 2, 3, np.nan, 5],
            'c': [1, 2, 3, 4, 5]
        })

        # Test forward fill
        result = self.preprocessor._handle_missing_values(df.copy(), 'forward_fill', {})
        assert result['a'].iloc[2] == 2  # Forward filled

        # Test backward fill
        result = self.preprocessor._handle_missing_values(df.copy(), 'backward_fill', {})
        assert result['a'].iloc[2] == 4  # Backward filled

        # Test mean fill
        result = self.preprocessor._handle_missing_values(df.copy(), 'mean_fill', {})
        expected_mean = df['a'].mean()  # Mean of [1, 2, 4, 5] = 3.0
        assert result['a'].iloc[2] == expected_mean

    def test_remove_outliers_methods(self):
        """Test different outlier removal methods."""
        # Create data with clear outliers
        df = pd.DataFrame({
            'value': [1, 2, 3, 4, 5, 1000, 6, 7, 8, 9, 10]  # 1000 is extreme outlier
        })

        # Test IQR method
        result = self.preprocessor._remove_outliers(df.copy(), ['value'], 'iqr')
        assert 1000 not in result['value'].values

        # Test Z-score method
        result = self.preprocessor._remove_outliers(df.copy(), ['value'], 'zscore')
        assert 1000 not in result['value'].values

        # Test percentile method
        result = self.preprocessor._remove_outliers(df.copy(), ['value'], 'percentile')
        assert 1000 not in result['value'].values

    def test_error_handling(self):
        """Test error handling in preprocessing operations."""
        # Test with invalid strategy
        with pytest.raises(DataPreprocessingError):
            self.preprocessor._handle_missing_values(
                self.sample_df, 'invalid_strategy', {}
            )

        # Test with invalid outlier method
        with pytest.raises(DataPreprocessingError):
            self.preprocessor._remove_outliers(
                self.sample_df, ['value'], 'invalid_method'
            )
