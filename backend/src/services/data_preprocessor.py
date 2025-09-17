"""Session-based data preprocessing service for Prophet forecasting.

This service provides data cleaning and transformation functions that operate
entirely in memory during the session lifecycle. All preprocessing happens
without persisting data to disk, maintaining privacy-first principles.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Tuple
import warnings

import numpy as np
import pandas as pd
from prophet import Prophet

from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)

# Suppress pandas warnings for cleaner output
warnings.filterwarnings('ignore', category=pd.errors.PerformanceWarning)


class DataPreprocessingError(Exception):
    """Exception raised when data preprocessing fails."""

    pass


class DataPreprocessor:
    """Privacy-first data preprocessing service for time series data.
    
    Features:
    - Data cleaning (duplicates, missing values, outliers)
    - Data transformation (log transform, differencing)
    - Prophet-specific validation and preparation
    - Session-based processing with automatic cleanup
    - Manual download/upload support for data continuity
    """

    def __init__(self):
        self.logger = logger

    def clean_data(
        self,
        df: pd.DataFrame,
        cleaning_options: Dict[str, Any]
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Clean data based on specified options.
        
        Args:
            df: DataFrame to clean
            cleaning_options: Dictionary specifying cleaning operations
            
        Returns:
            Tuple of (cleaned_dataframe, cleaning_report)
            
        Raises:
            DataPreprocessingError: If cleaning fails

        """
        with MemoryTracker("clean_data"):
            try:
                cleaned_df = df.copy()
                cleaning_report = {
                    'operations_performed': [],
                    'rows_before': len(df),
                    'rows_after': 0,
                    'columns_before': len(df.columns),
                    'columns_after': 0,
                    'changes_summary': {}
                }

                # Remove duplicate rows
                if cleaning_options.get('remove_duplicates', False):
                    duplicates_before = cleaned_df.duplicated().sum()
                    cleaned_df = cleaned_df.drop_duplicates()
                    duplicates_removed = duplicates_before - cleaned_df.duplicated().sum()

                    if duplicates_removed > 0:
                        cleaning_report['operations_performed'].append('remove_duplicates')
                        cleaning_report['changes_summary']['duplicates_removed'] = int(duplicates_removed)
                        self.logger.info("Removed %d duplicate rows", duplicates_removed)

                # Handle missing values
                missing_strategy = cleaning_options.get('missing_values_strategy', 'none')
                if missing_strategy != 'none':
                    missing_before = cleaned_df.isnull().sum().sum()
                    cleaned_df = self._handle_missing_values(cleaned_df, missing_strategy, cleaning_options)
                    missing_after = cleaned_df.isnull().sum().sum()
                    missing_handled = missing_before - missing_after

                    if missing_handled > 0:
                        cleaning_report['operations_performed'].append(f'handle_missing_{missing_strategy}')
                        cleaning_report['changes_summary']['missing_values_handled'] = int(missing_handled)
                        self.logger.info("Handled %d missing values using %s strategy", missing_handled, missing_strategy)

                # Remove outliers
                if cleaning_options.get('remove_outliers', False):
                    outlier_columns = cleaning_options.get('outlier_columns', [])
                    outlier_method = cleaning_options.get('outlier_method', 'iqr')

                    if outlier_columns:
                        rows_before_outliers = len(cleaned_df)
                        cleaned_df = self._remove_outliers(cleaned_df, outlier_columns, outlier_method)
                        outliers_removed = rows_before_outliers - len(cleaned_df)

                        if outliers_removed > 0:
                            cleaning_report['operations_performed'].append(f'remove_outliers_{outlier_method}')
                            cleaning_report['changes_summary']['outliers_removed'] = int(outliers_removed)
                            self.logger.info("Removed %d outlier rows using %s method", outliers_removed, outlier_method)

                # Remove empty rows
                if cleaning_options.get('remove_empty_rows', False):
                    empty_before = cleaned_df.isnull().all(axis=1).sum()
                    cleaned_df = cleaned_df.dropna(how='all')
                    empty_removed = empty_before - cleaned_df.isnull().all(axis=1).sum()

                    if empty_removed > 0:
                        cleaning_report['operations_performed'].append('remove_empty_rows')
                        cleaning_report['changes_summary']['empty_rows_removed'] = int(empty_removed)
                        self.logger.info("Removed %d completely empty rows", empty_removed)

                # Update final counts
                cleaning_report['rows_after'] = len(cleaned_df)
                cleaning_report['columns_after'] = len(cleaned_df.columns)

                return cleaned_df, cleaning_report

            except Exception as e:
                self.logger.error("Data cleaning failed: %s", str(e))
                raise DataPreprocessingError(f"Data cleaning failed: {str(e)}") from e

    def transform_data(
        self,
        df: pd.DataFrame,
        transformation_options: Dict[str, Any]
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Apply data transformations for better forecasting performance.
        
        Args:
            df: DataFrame to transform
            transformation_options: Dictionary specifying transformations
            
        Returns:
            Tuple of (transformed_dataframe, transformation_report)
            
        Raises:
            DataPreprocessingError: If transformation fails

        """
        with MemoryTracker("transform_data"):
            try:
                transformed_df = df.copy()
                transformation_report = {
                    'transformations_applied': [],
                    'original_columns': list(df.columns),
                    'new_columns': [],
                    'transformation_details': {}
                }

                # Log transformation
                log_columns = transformation_options.get('log_transform_columns', [])
                if log_columns:
                    for col in log_columns:
                        if col in transformed_df.columns:
                            original_col = col
                            log_col = f"{col}_log"

                            # Check for non-positive values
                            non_positive = (transformed_df[col] <= 0).sum()
                            if non_positive > 0:
                                self.logger.warning(
                                    "Column %s has %d non-positive values, adding constant before log transform",
                                    col, non_positive
                                )
                                # Add small constant to make all values positive
                                min_val = transformed_df[col].min()
                                constant = abs(min_val) + 1 if min_val <= 0 else 0
                                transformed_df[log_col] = np.log(transformed_df[col] + constant)
                                transformation_report['transformation_details'][log_col] = {
                                    'type': 'log_transform_with_constant',
                                    'constant_added': float(constant),
                                    'original_column': original_col
                                }
                            else:
                                transformed_df[log_col] = np.log(transformed_df[col])
                                transformation_report['transformation_details'][log_col] = {
                                    'type': 'log_transform',
                                    'original_column': original_col
                                }

                            transformation_report['transformations_applied'].append(f'log_transform_{col}')
                            transformation_report['new_columns'].append(log_col)
                            self.logger.info("Applied log transformation to column: %s", col)

                # Differencing transformation
                diff_columns = transformation_options.get('differencing_columns', [])
                if diff_columns:
                    for col in diff_columns:
                        if col in transformed_df.columns:
                            original_col = col
                            diff_col = f"{col}_diff"

                            # Apply first-order differencing
                            transformed_df[diff_col] = transformed_df[col].diff()

                            transformation_report['transformations_applied'].append(f'differencing_{col}')
                            transformation_report['new_columns'].append(diff_col)
                            transformation_report['transformation_details'][diff_col] = {
                                'type': 'first_order_differencing',
                                'original_column': original_col,
                                'missing_values_created': int(transformed_df[diff_col].isnull().sum())
                            }
                            self.logger.info("Applied differencing to column: %s", col)

                # Square root transformation
                sqrt_columns = transformation_options.get('sqrt_transform_columns', [])
                if sqrt_columns:
                    for col in sqrt_columns:
                        if col in transformed_df.columns:
                            original_col = col
                            sqrt_col = f"{col}_sqrt"

                            # Check for negative values
                            negative_count = (transformed_df[col] < 0).sum()
                            if negative_count > 0:
                                self.logger.warning(
                                    "Column %s has %d negative values, cannot apply square root transform",
                                    col, negative_count
                                )
                                continue

                            transformed_df[sqrt_col] = np.sqrt(transformed_df[col])
                            transformation_report['transformations_applied'].append(f'sqrt_transform_{col}')
                            transformation_report['new_columns'].append(sqrt_col)
                            transformation_report['transformation_details'][sqrt_col] = {
                                'type': 'square_root_transform',
                                'original_column': original_col
                            }
                            self.logger.info("Applied square root transformation to column: %s", col)

                # Box-Cox transformation (simplified)
                boxcox_columns = transformation_options.get('boxcox_transform_columns', [])
                if boxcox_columns:
                    for col in boxcox_columns:
                        if col in transformed_df.columns:
                            original_col = col
                            boxcox_col = f"{col}_boxcox"

                            # Simple Box-Cox with lambda=0.5 (square root) for positive values
                            if (transformed_df[col] > 0).all():
                                transformed_df[boxcox_col] = np.power(transformed_df[col], 0.5)
                                transformation_report['transformations_applied'].append(f'boxcox_transform_{col}')
                                transformation_report['new_columns'].append(boxcox_col)
                                transformation_report['transformation_details'][boxcox_col] = {
                                    'type': 'boxcox_transform',
                                    'lambda': 0.5,
                                    'original_column': original_col
                                }
                                self.logger.info("Applied Box-Cox transformation to column: %s", col)
                            else:
                                self.logger.warning(
                                    "Column %s has non-positive values, skipping Box-Cox transform", col
                                )

                return transformed_df, transformation_report

            except Exception as e:
                self.logger.error("Data transformation failed: %s", str(e))
                raise DataPreprocessingError(f"Data transformation failed: {str(e)}") from e

    def validate_for_prophet(
        self,
        df: pd.DataFrame,
        date_column: str,
        value_column: str
    ) -> Dict[str, Any]:
        """Validate data for Prophet forecasting requirements.
        
        Args:
            df: DataFrame to validate
            date_column: Name of the date column
            value_column: Name of the value column
            
        Returns:
            Dictionary containing validation results and recommendations

        """
        with MemoryTracker("validate_for_prophet"):
            validation_result = {
                'is_valid': False,
                'errors': [],
                'warnings': [],
                'recommendations': [],
                'prophet_ready': False,
                'data_summary': {}
            }

            try:
                # Check if required columns exist
                if date_column not in df.columns:
                    validation_result['errors'].append(f"Date column '{date_column}' not found in data")
                    return validation_result

                if value_column not in df.columns:
                    validation_result['errors'].append(f"Value column '{value_column}' not found in data")
                    return validation_result

                # Create Prophet-format DataFrame
                prophet_df = df[[date_column, value_column]].copy()
                prophet_df.columns = ['ds', 'y']

                # Validate date column
                try:
                    prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
                except Exception as e:
                    validation_result['errors'].append(f"Cannot convert date column to datetime: {str(e)}")
                    return validation_result

                # Validate value column
                try:
                    prophet_df['y'] = pd.to_numeric(prophet_df['y'], errors='coerce')
                    numeric_nulls = prophet_df['y'].isnull().sum()
                    if numeric_nulls > 0:
                        validation_result['warnings'].append(
                            f"Value column has {numeric_nulls} non-numeric values that will be treated as missing"
                        )
                except Exception as e:
                    validation_result['errors'].append(f"Cannot convert value column to numeric: {str(e)}")
                    return validation_result

                # Remove rows with missing values for validation
                clean_df = prophet_df.dropna()

                # Check minimum data requirements
                if len(clean_df) < 2:
                    validation_result['errors'].append(
                        f"Insufficient data points: {len(clean_df)} (minimum 2 required)"
                    )
                    return validation_result

                if len(clean_df) < 10:
                    validation_result['warnings'].append(
                        f"Limited data points: {len(clean_df)} (recommended minimum 10 for reliable forecasting)"
                    )

                # Check for duplicate dates
                duplicate_dates = clean_df['ds'].duplicated().sum()
                if duplicate_dates > 0:
                    validation_result['warnings'].append(
                        f"Found {duplicate_dates} duplicate dates - Prophet will aggregate these automatically"
                    )

                # Check date range and frequency
                date_range = clean_df['ds'].max() - clean_df['ds'].min()
                if date_range.days < 1:
                    validation_result['warnings'].append("Date range is less than 1 day")

                # Analyze data frequency
                clean_df_sorted = clean_df.sort_values('ds')
                intervals = clean_df_sorted['ds'].diff().dropna()
                if len(intervals) > 0:
                    median_interval = intervals.median()
                    validation_result['data_summary']['median_interval_days'] = median_interval.total_seconds() / (24 * 3600)

                    # Check for irregular intervals
                    interval_std = intervals.std()
                    if interval_std > median_interval * 0.5:
                        validation_result['warnings'].append("Irregular time intervals detected")
                        validation_result['recommendations'].append(
                            "Consider resampling data to regular intervals for better forecasting"
                        )

                # Check for missing values in the middle of the series
                if len(prophet_df) > len(clean_df):
                    missing_count = len(prophet_df) - len(clean_df)
                    validation_result['warnings'].append(f"Found {missing_count} rows with missing values")
                    validation_result['recommendations'].append(
                        "Consider interpolating missing values or removing incomplete rows"
                    )

                # Check value column characteristics
                y_values = clean_df['y']

                # Check for constant values
                if y_values.nunique() == 1:
                    validation_result['warnings'].append("Value column has constant values - forecasting may not be meaningful")

                # Check for negative values
                negative_count = (y_values < 0).sum()
                if negative_count > 0:
                    validation_result['warnings'].append(f"Found {negative_count} negative values")
                    validation_result['recommendations'].append(
                        "Consider using logistic growth mode if values should be non-negative"
                    )

                # Check for extreme outliers
                q1, q3 = y_values.quantile([0.25, 0.75])
                iqr = q3 - q1
                outliers = ((y_values < (q1 - 3 * iqr)) | (y_values > (q3 + 3 * iqr))).sum()
                if outliers > 0:
                    validation_result['warnings'].append(f"Found {outliers} potential outliers")
                    validation_result['recommendations'].append("Review outliers and consider removal or capping")

                # Test Prophet model creation (basic validation)
                try:
                    test_model = Prophet(
                        daily_seasonality=False,
                        weekly_seasonality=False,
                        yearly_seasonality=False
                    )
                    # Use only a subset for testing to save memory
                    test_data = clean_df.head(min(100, len(clean_df)))
                    test_model.fit(test_data)
                    validation_result['prophet_ready'] = True
                    self.logger.info("Prophet model validation successful")
                except Exception as e:
                    validation_result['errors'].append(f"Prophet model validation failed: {str(e)}")
                    validation_result['recommendations'].append(
                        "Check data format and ensure date/value columns are properly formatted"
                    )

                # Data summary
                validation_result['data_summary'].update({
                    'total_rows': len(prophet_df),
                    'valid_rows': len(clean_df),
                    'missing_rows': len(prophet_df) - len(clean_df),
                    'date_range_days': date_range.days,
                    'start_date': clean_df['ds'].min().isoformat(),
                    'end_date': clean_df['ds'].max().isoformat(),
                    'value_min': float(y_values.min()),
                    'value_max': float(y_values.max()),
                    'value_mean': float(y_values.mean()),
                    'value_std': float(y_values.std())
                })

                # Overall validation status
                validation_result['is_valid'] = len(validation_result['errors']) == 0

                return validation_result

            except Exception as e:
                self.logger.error("Prophet validation failed: %s", str(e))
                validation_result['errors'].append(f"Validation failed: {str(e)}")
                return validation_result

    def prepare_for_download(
        self,
        df: pd.DataFrame,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Prepare processed data for client-side download.
        
        Args:
            df: Processed DataFrame
            metadata: Processing metadata
            
        Returns:
            Dictionary containing download-ready data and metadata

        """
        with MemoryTracker("prepare_for_download"):
            try:
                # Convert DataFrame to serializable format
                download_data = {
                    'data': {
                        'columns': list(df.columns),
                        'rows': df.fillna('').to_dict('records'),  # Replace NaN with empty string
                        'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()}
                    },
                    'metadata': {
                        'processed_at': datetime.now().isoformat(),
                        'total_rows': len(df),
                        'total_columns': len(df.columns),
                        'processing_history': metadata,
                        'privacy_notice': 'Data processed in memory only - no server storage'
                    },
                    'format_info': {
                        'csv_ready': True,
                        'json_ready': True,
                        'excel_ready': True
                    }
                }

                return download_data

            except Exception as e:
                self.logger.error("Download preparation failed: %s", str(e))
                raise DataPreprocessingError(f"Download preparation failed: {str(e)}") from e

    def _handle_missing_values(
        self,
        df: pd.DataFrame,
        strategy: str,
        options: Dict[str, Any]
    ) -> pd.DataFrame:
        """Handle missing values using specified strategy."""
        if strategy == 'drop_rows':
            return df.dropna()

        elif strategy == 'drop_columns':
            threshold = options.get('missing_threshold', 0.5)
            return df.dropna(axis=1, thresh=int(len(df) * (1 - threshold)))

        elif strategy == 'interpolate':
            method = options.get('interpolation_method', 'linear')
            numeric_cols = df.select_dtypes(include=[np.number]).columns

            for col in numeric_cols:
                if df[col].isnull().any():
                    df[col] = df[col].interpolate(method=method)

            return df

        elif strategy == 'forward_fill':
            return df.ffill()

        elif strategy == 'backward_fill':
            return df.bfill()

        elif strategy == 'mean_fill':
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                df[col] = df[col].fillna(df[col].mean())
            return df

        elif strategy == 'median_fill':
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                df[col] = df[col].fillna(df[col].median())
            return df

        else:
            raise DataPreprocessingError(f"Unknown missing values strategy: {strategy}")

    def _remove_outliers(
        self,
        df: pd.DataFrame,
        columns: List[str],
        method: str
    ) -> pd.DataFrame:
        """Remove outliers using specified method."""
        if method == 'iqr':
            for col in columns:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]

        elif method == 'zscore':
            for col in columns:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
                    df = df[z_scores < 3]

        elif method == 'percentile':
            for col in columns:
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    lower_percentile = df[col].quantile(0.01)
                    upper_percentile = df[col].quantile(0.99)
                    df = df[(df[col] >= lower_percentile) & (df[col] <= upper_percentile)]

        else:
            raise DataPreprocessingError(f"Unknown outlier removal method: {method}")

        return df


# Global data preprocessor instance
data_preprocessor = DataPreprocessor()
