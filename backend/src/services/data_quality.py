"""Data quality assessment service for uploaded datasets.

This service provides comprehensive data quality analysis for time series data
without persisting any information to disk. All analysis happens in memory
during the session lifecycle.
"""

import logging
from typing import Any, Dict, List
import warnings

import numpy as np
import pandas as pd

from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)

# Suppress pandas warnings for cleaner output
warnings.filterwarnings('ignore', category=pd.errors.PerformanceWarning)


class DataQualityAssessment:
    """Comprehensive data quality assessment for time series data.
    
    Features:
    - Basic statistics calculation
    - Missing value analysis
    - Outlier detection
    - Data distribution analysis
    - Time series specific checks
    - Column type validation
    - Data consistency checks
    """

    def __init__(self):
        self.logger = logger

    def assess_data_quality(self, df: pd.DataFrame, column_info: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Perform comprehensive data quality assessment.
        
        Args:
            df: DataFrame to assess
            column_info: Column information from file processor
            
        Returns:
            Dict containing comprehensive quality assessment

        """
        with MemoryTracker("assess_data_quality"):
            try:
                assessment = {
                    'overall_quality': {},
                    'basic_statistics': {},
                    'missing_values': {},
                    'outliers': {},
                    'data_distribution': {},
                    'time_series_checks': {},
                    'column_analysis': {},
                    'recommendations': []
                }

                # Basic statistics
                assessment['basic_statistics'] = self._calculate_basic_statistics(df)

                # Missing value analysis
                assessment['missing_values'] = self._analyze_missing_values(df)

                # Outlier detection
                assessment['outliers'] = self._detect_outliers(df, column_info)

                # Data distribution analysis
                assessment['data_distribution'] = self._analyze_data_distribution(df, column_info)

                # Time series specific checks
                assessment['time_series_checks'] = self._perform_time_series_checks(df, column_info)

                # Column-specific analysis
                assessment['column_analysis'] = self._analyze_columns(df, column_info)

                # Generate overall quality score and recommendations
                assessment['overall_quality'] = self._calculate_overall_quality(assessment)
                assessment['recommendations'] = self._generate_recommendations(assessment, column_info)

                return assessment

            except Exception as e:
                self.logger.error("Data quality assessment failed: %s", str(e))
                return self._create_error_assessment(str(e))

    def _calculate_basic_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate basic dataset statistics."""
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns

            stats = {
                'total_rows': int(len(df)),
                'total_columns': int(len(df.columns)),
                'numeric_columns': int(len(numeric_cols)),
                'text_columns': int(len(df.columns) - len(numeric_cols)),
                'memory_usage_mb': float(df.memory_usage(deep=True).sum() / 1024 / 1024),
                'duplicate_rows': int(df.duplicated().sum()),
                'completely_empty_rows': int(df.isnull().all(axis=1).sum()),
                'data_types': {col: str(dtype) for col, dtype in df.dtypes.items()}
            }

            # Add numeric statistics if we have numeric columns
            if len(numeric_cols) > 0:
                numeric_df = df[numeric_cols]
                stats['numeric_summary'] = {
                    'mean_values': {col: float(numeric_df[col].mean()) for col in numeric_cols if not numeric_df[col].isna().all()},
                    'median_values': {col: float(numeric_df[col].median()) for col in numeric_cols if not numeric_df[col].isna().all()},
                    'std_values': {col: float(numeric_df[col].std()) for col in numeric_cols if not numeric_df[col].isna().all()},
                    'min_values': {col: float(numeric_df[col].min()) for col in numeric_cols if not numeric_df[col].isna().all()},
                    'max_values': {col: float(numeric_df[col].max()) for col in numeric_cols if not numeric_df[col].isna().all()}
                }

            return stats
        except Exception as e:
            self.logger.error("Error calculating basic statistics: %s", str(e))
            return {
                'total_rows': 0,
                'total_columns': 0,
                'numeric_columns': 0,
                'text_columns': 0,
                'memory_usage_mb': 0.0,
                'duplicate_rows': 0,
                'completely_empty_rows': 0,
                'data_types': {},
                'error': str(e)
            }

    def _analyze_missing_values(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze missing values in the dataset."""
        missing_analysis = {
            'total_missing_values': int(df.isnull().sum().sum()),
            'missing_percentage': float((df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100) if len(df) > 0 and len(df.columns) > 0 else 0.0,
            'columns_with_missing': {},
            'missing_patterns': {},
            'consecutive_missing': {}
        }

        # Per-column missing value analysis
        for col in df.columns:
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                missing_analysis['columns_with_missing'][col] = {
                    'count': missing_count,
                    'percentage': float((missing_count / len(df)) * 100),
                    'first_missing_index': int(df[col].isnull().idxmax()) if df[col].isnull().any() else None,
                    'last_missing_index': int(df[col].isnull()[::-1].idxmax()) if df[col].isnull().any() else None
                }

                # Analyze consecutive missing values
                missing_analysis['consecutive_missing'][col] = self._find_consecutive_missing(df[col])

        # Missing value patterns (combinations of columns with missing values)
        if len(df.columns) <= 20:  # Only for reasonable number of columns
            missing_patterns = df.isnull().value_counts().head(10)
            missing_analysis['missing_patterns'] = {
                str(pattern): int(count) for pattern, count in missing_patterns.items()
            }

        return missing_analysis

    def _find_consecutive_missing(self, series: pd.Series) -> Dict[str, Any]:
        """Find consecutive missing value sequences in a series."""
        if not series.isnull().any():
            return {'max_consecutive': 0, 'sequences': []}

        # Find consecutive missing sequences
        missing_mask = series.isnull()
        sequences = []
        current_start = None

        for i, is_missing in enumerate(missing_mask):
            if is_missing and current_start is None:
                current_start = i
            elif not is_missing and current_start is not None:
                sequences.append({'start': current_start, 'end': i - 1, 'length': i - current_start})
                current_start = None

        # Handle case where series ends with missing values
        if current_start is not None:
            sequences.append({'start': current_start, 'end': len(series) - 1, 'length': len(series) - current_start})

        max_consecutive = max([seq['length'] for seq in sequences]) if sequences else 0

        return {
            'max_consecutive': max_consecutive,
            'sequences': sequences[:5],  # Limit to first 5 sequences
            'total_sequences': len(sequences)
        }

    def _detect_outliers(self, df: pd.DataFrame, column_info: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Detect outliers in numeric columns."""
        outlier_analysis = {
            'method': 'IQR and Z-score',
            'columns_analyzed': [],
            'outliers_found': {}
        }

        numeric_cols = [col for col, info in column_info.items() if info['type'] == 'numeric']
        outlier_analysis['columns_analyzed'] = numeric_cols

        for col in numeric_cols:
            if col not in df.columns:
                continue

            series = df[col].dropna()
            if len(series) < 4:  # Need at least 4 values for meaningful outlier detection
                continue

            outliers = self._detect_column_outliers(series)
            if outliers['total_outliers'] > 0:
                outlier_analysis['outliers_found'][col] = outliers

        return outlier_analysis

    def _detect_column_outliers(self, series: pd.Series) -> Dict[str, Any]:
        """Detect outliers in a single numeric column using multiple methods."""
        outliers = {
            'total_outliers': 0,
            'iqr_outliers': {'count': 0, 'indices': []},
            'zscore_outliers': {'count': 0, 'indices': []},
            'extreme_values': {'min': None, 'max': None}
        }

        # IQR method
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR

        iqr_outlier_mask = (series < lower_bound) | (series > upper_bound)
        iqr_outliers = series[iqr_outlier_mask]

        outliers['iqr_outliers'] = {
            'count': int(len(iqr_outliers)),
            'indices': iqr_outliers.index.tolist()[:10],  # Limit to first 10
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound)
        }

        # Z-score method (for normally distributed data)
        if len(series) > 10:  # Need reasonable sample size
            z_scores = np.abs((series - series.mean()) / series.std())
            zscore_outlier_mask = z_scores > 3
            zscore_outliers = series[zscore_outlier_mask]

            outliers['zscore_outliers'] = {
                'count': int(len(zscore_outliers)),
                'indices': zscore_outliers.index.tolist()[:10],  # Limit to first 10
                'threshold': 3.0
            }

        # Extreme values
        outliers['extreme_values'] = {
            'min': float(series.min()),
            'max': float(series.max()),
            'range': float(series.max() - series.min())
        }

        # Total unique outliers (union of both methods)
        all_outlier_indices = set(outliers['iqr_outliers']['indices'] + outliers['zscore_outliers']['indices'])
        outliers['total_outliers'] = len(all_outlier_indices)

        return outliers

    def _analyze_data_distribution(self, df: pd.DataFrame, column_info: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze data distribution for numeric columns."""
        distribution_analysis = {
            'numeric_distributions': {},
            'categorical_distributions': {}
        }

        # Analyze numeric columns
        numeric_cols = [col for col, info in column_info.items() if info['type'] == 'numeric']
        for col in numeric_cols:
            if col not in df.columns:
                continue

            series = df[col].dropna()
            if len(series) < 2:
                continue

            distribution_analysis['numeric_distributions'][col] = self._analyze_numeric_distribution(series)

        # Analyze categorical/text columns
        text_cols = [col for col, info in column_info.items() if info['type'] == 'text']
        for col in text_cols:
            if col not in df.columns:
                continue

            series = df[col].dropna()
            if len(series) < 1:
                continue

            distribution_analysis['categorical_distributions'][col] = self._analyze_categorical_distribution(series)

        return distribution_analysis

    def _analyze_numeric_distribution(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze distribution characteristics of a numeric series."""
        distribution = {
            'skewness': float(series.skew()),
            'kurtosis': float(series.kurtosis()),
            'is_normal_distributed': False,
            'quartiles': {
                'Q1': float(series.quantile(0.25)),
                'Q2': float(series.quantile(0.5)),
                'Q3': float(series.quantile(0.75))
            },
            'percentiles': {
                'P5': float(series.quantile(0.05)),
                'P95': float(series.quantile(0.95)),
                'P99': float(series.quantile(0.99))
            },
            'unique_values': int(series.nunique()),
            'zero_values': int((series == 0).sum()),
            'negative_values': int((series < 0).sum()),
            'positive_values': int((series > 0).sum())
        }

        # Simple normality check based on skewness and kurtosis
        # Normal distribution has skewness ≈ 0 and kurtosis ≈ 3
        skew_normal = abs(distribution['skewness']) < 1
        kurt_normal = abs(distribution['kurtosis'] - 3) < 2
        distribution['is_normal_distributed'] = skew_normal and kurt_normal

        return distribution

    def _analyze_categorical_distribution(self, series: pd.Series) -> Dict[str, Any]:
        """Analyze distribution characteristics of a categorical series."""
        value_counts = series.value_counts()

        distribution = {
            'unique_values': int(series.nunique()),
            'most_frequent': {
                'value': str(value_counts.index[0]) if len(value_counts) > 0 else None,
                'count': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                'percentage': float((value_counts.iloc[0] / len(series)) * 100) if len(value_counts) > 0 else 0
            },
            'least_frequent': {
                'value': str(value_counts.index[-1]) if len(value_counts) > 0 else None,
                'count': int(value_counts.iloc[-1]) if len(value_counts) > 0 else 0,
                'percentage': float((value_counts.iloc[-1] / len(series)) * 100) if len(value_counts) > 0 else 0
            },
            'top_values': {
                str(val): int(count) for val, count in value_counts.head(5).items()
            },
            'cardinality_ratio': float(series.nunique() / len(series)),
            'has_single_value': series.nunique() == 1
        }

        return distribution

    def _perform_time_series_checks(self, df: pd.DataFrame, column_info: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Perform time series specific data quality checks."""
        ts_checks = {
            'potential_date_columns': [],
            'potential_value_columns': [],
            'time_series_readiness': {},
            'frequency_analysis': {},
            'temporal_patterns': {}
        }

        # Identify potential date and value columns
        date_cols = [col for col, info in column_info.items() if info['is_potential_date']]
        value_cols = [col for col, info in column_info.items() if info['is_potential_value']]

        ts_checks['potential_date_columns'] = date_cols
        ts_checks['potential_value_columns'] = value_cols

        # Check time series readiness
        ts_checks['time_series_readiness'] = {
            'has_date_column': len(date_cols) > 0,
            'has_value_column': len(value_cols) > 0,
            'minimum_rows': len(df) >= 10,  # Prophet needs at least 10 data points
            'ready_for_forecasting': len(date_cols) > 0 and len(value_cols) > 0 and len(df) >= 10
        }

        # Analyze frequency if we have a date column
        if date_cols and len(date_cols) > 0:
            primary_date_col = date_cols[0]  # Use first detected date column
            ts_checks['frequency_analysis'] = self._analyze_time_frequency(df, primary_date_col)

        return ts_checks

    def _analyze_time_frequency(self, df: pd.DataFrame, date_col: str) -> Dict[str, Any]:
        """Analyze time frequency patterns in the date column."""
        frequency_analysis = {
            'detected_frequency': None,
            'regular_intervals': False,
            'gaps_detected': False,
            'date_range': {},
            'interval_analysis': {}
        }

        try:
            # Try to convert to datetime
            date_series = pd.to_datetime(df[date_col], errors='coerce').dropna().sort_values()

            if len(date_series) < 2:
                return frequency_analysis

            # Basic date range
            frequency_analysis['date_range'] = {
                'start_date': date_series.min().isoformat(),
                'end_date': date_series.max().isoformat(),
                'total_span_days': int((date_series.max() - date_series.min()).days),
                'data_points': int(len(date_series))
            }

            # Analyze intervals between consecutive dates
            intervals = date_series.diff().dropna()
            if len(intervals) > 0:
                # Convert to days for analysis
                interval_days = intervals.dt.total_seconds() / (24 * 3600)

                frequency_analysis['interval_analysis'] = {
                    'mean_interval_days': float(interval_days.mean()),
                    'median_interval_days': float(interval_days.median()),
                    'std_interval_days': float(interval_days.std()),
                    'min_interval_days': float(interval_days.min()),
                    'max_interval_days': float(interval_days.max()),
                    'unique_intervals': int(interval_days.nunique())
                }

                # Detect common frequencies
                median_interval = interval_days.median()
                if abs(median_interval - 1) < 0.1:
                    frequency_analysis['detected_frequency'] = 'daily'
                elif abs(median_interval - 7) < 0.5:
                    frequency_analysis['detected_frequency'] = 'weekly'
                elif abs(median_interval - 30.44) < 2:  # Average month length
                    frequency_analysis['detected_frequency'] = 'monthly'
                elif abs(median_interval - 365.25) < 10:  # Account for leap years
                    frequency_analysis['detected_frequency'] = 'yearly'
                elif median_interval < 1:
                    if abs(median_interval * 24 - 1) < 0.1:
                        frequency_analysis['detected_frequency'] = 'hourly'
                    else:
                        frequency_analysis['detected_frequency'] = 'sub-daily'
                else:
                    frequency_analysis['detected_frequency'] = 'irregular'

                # Check for regular intervals (low standard deviation relative to mean)
                if interval_days.std() / interval_days.mean() < 0.1:
                    frequency_analysis['regular_intervals'] = True

                # Check for significant gaps (intervals much larger than median)
                large_gaps = interval_days > (interval_days.median() * 3)
                frequency_analysis['gaps_detected'] = bool(large_gaps.any())

                if frequency_analysis['gaps_detected']:
                    frequency_analysis['gap_details'] = {
                        'number_of_gaps': int(large_gaps.sum()),
                        'largest_gap_days': float(interval_days.max())
                    }

        except Exception as e:
            self.logger.warning("Time frequency analysis failed: %s", str(e))
            frequency_analysis['error'] = str(e)

        return frequency_analysis

    def _analyze_columns(self, df: pd.DataFrame, column_info: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Perform detailed analysis of individual columns."""
        column_analysis = {}

        for col, info in column_info.items():
            if col not in df.columns:
                continue

            analysis = {
                'basic_info': info,
                'quality_score': 0,
                'issues': [],
                'recommendations': []
            }

            series = df[col]

            # Calculate quality score based on various factors
            quality_factors = []

            # Factor 1: Missing values (lower is better)
            missing_ratio = series.isnull().sum() / len(series)
            missing_score = max(0, 100 - (missing_ratio * 100))
            quality_factors.append(missing_score)

            if missing_ratio > 0.5:
                analysis['issues'].append(f"High missing value ratio: {missing_ratio:.1%}")
                analysis['recommendations'].append("Consider data imputation or column removal")

            # Factor 2: Data consistency
            if info['type'] == 'numeric':
                # Check for infinite values
                numeric_series = pd.to_numeric(series, errors='coerce')
                if np.isinf(numeric_series).any():
                    analysis['issues'].append("Contains infinite values")
                    analysis['recommendations'].append("Remove or replace infinite values")
                    quality_factors.append(50)
                else:
                    quality_factors.append(100)

                # Check for extreme outliers
                if 'outliers' in info and info.get('outlier_count', 0) > len(series) * 0.1:
                    analysis['issues'].append("High number of outliers detected")
                    analysis['recommendations'].append("Review and potentially remove outliers")

            elif info['type'] == 'text':
                # Check for very high cardinality
                cardinality_ratio = series.nunique() / len(series.dropna())
                if cardinality_ratio > 0.9:
                    analysis['issues'].append("Very high cardinality (mostly unique values)")
                    analysis['recommendations'].append("Consider if this column is suitable for analysis")
                    quality_factors.append(60)
                else:
                    quality_factors.append(100)

            # Factor 3: Data completeness
            completeness_score = (1 - missing_ratio) * 100
            quality_factors.append(completeness_score)

            # Calculate overall quality score
            analysis['quality_score'] = int(np.mean(quality_factors)) if quality_factors else 0

            column_analysis[col] = analysis

        return column_analysis

    def _calculate_overall_quality(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall data quality score and summary."""
        overall_quality = {
            'score': 0,
            'grade': 'F',
            'summary': {},
            'critical_issues': [],
            'warnings': []
        }

        quality_factors = []

        # Factor 1: Missing values (30% weight)
        missing_pct = assessment['missing_values']['missing_percentage']
        missing_score = max(0, 100 - missing_pct * 2)  # Penalize missing values
        quality_factors.append(('missing_values', missing_score, 0.3))

        if missing_pct > 25:
            overall_quality['critical_issues'].append(f"High missing value percentage: {missing_pct:.1f}%")
        elif missing_pct > 10:
            overall_quality['warnings'].append(f"Moderate missing values: {missing_pct:.1f}%")

        # Factor 2: Data completeness (20% weight)
        total_rows = assessment['basic_statistics']['total_rows']
        empty_rows = assessment['basic_statistics']['completely_empty_rows']
        completeness_score = max(0, 100 - (empty_rows / total_rows * 100) * 2)
        quality_factors.append(('completeness', completeness_score, 0.2))

        # Factor 3: Time series readiness (25% weight)
        ts_ready = assessment['time_series_checks']['time_series_readiness']['ready_for_forecasting']
        ts_score = 100 if ts_ready else 30
        quality_factors.append(('time_series_readiness', ts_score, 0.25))

        if not ts_ready:
            overall_quality['critical_issues'].append("Data not ready for time series forecasting")

        # Factor 4: Data consistency (25% weight)
        duplicate_ratio = assessment['basic_statistics']['duplicate_rows'] / total_rows
        consistency_score = max(0, 100 - duplicate_ratio * 100)
        quality_factors.append(('consistency', consistency_score, 0.25))

        if duplicate_ratio > 0.1:
            overall_quality['warnings'].append(f"Duplicate rows detected: {duplicate_ratio:.1%}")

        # Calculate weighted average
        weighted_score = sum(score * weight for _, score, weight in quality_factors)
        overall_quality['score'] = int(weighted_score)

        # Assign grade
        if weighted_score >= 90:
            overall_quality['grade'] = 'A'
        elif weighted_score >= 80:
            overall_quality['grade'] = 'B'
        elif weighted_score >= 70:
            overall_quality['grade'] = 'C'
        elif weighted_score >= 60:
            overall_quality['grade'] = 'D'
        else:
            overall_quality['grade'] = 'F'

        # Summary
        overall_quality['summary'] = {
            'total_rows': total_rows,
            'total_columns': assessment['basic_statistics']['total_columns'],
            'missing_percentage': missing_pct,
            'duplicate_rows': assessment['basic_statistics']['duplicate_rows'],
            'time_series_ready': ts_ready,
            'quality_factors': {name: int(score) for name, score, _ in quality_factors}
        }

        return overall_quality

    def _generate_recommendations(self, assessment: Dict[str, Any], column_info: Dict[str, Dict[str, Any]]) -> List[str]:
        """Generate actionable recommendations based on assessment."""
        recommendations = []

        # Missing value recommendations
        missing_pct = assessment['missing_values']['missing_percentage']
        if missing_pct > 0:
            if missing_pct > 25:
                recommendations.append("Consider data imputation or removing columns with excessive missing values")
            else:
                recommendations.append("Handle missing values through interpolation or forward/backward fill")

        # Time series recommendations
        ts_checks = assessment['time_series_checks']
        if not ts_checks['time_series_readiness']['ready_for_forecasting']:
            if not ts_checks['time_series_readiness']['has_date_column']:
                recommendations.append("Identify and properly format the date/time column")
            if not ts_checks['time_series_readiness']['has_value_column']:
                recommendations.append("Identify the numeric column containing values to forecast")
            if not ts_checks['time_series_readiness']['minimum_rows']:
                recommendations.append("Collect more data points (minimum 10 required for forecasting)")

        # Frequency recommendations
        if 'frequency_analysis' in ts_checks and ts_checks['frequency_analysis'].get('gaps_detected'):
            recommendations.append("Address gaps in time series data for better forecasting accuracy")

        # Outlier recommendations
        outliers = assessment['outliers']
        if outliers['outliers_found']:
            recommendations.append("Review detected outliers and consider removal or transformation")

        # Duplicate data recommendations
        if assessment['basic_statistics']['duplicate_rows'] > 0:
            recommendations.append("Remove duplicate rows to improve data quality")

        # Column-specific recommendations
        date_cols = [col for col, info in column_info.items() if info['is_potential_date']]
        value_cols = [col for col, info in column_info.items() if info['is_potential_value']]

        if len(date_cols) > 1:
            recommendations.append("Multiple date columns detected - select the primary time column")
        if len(value_cols) > 1:
            recommendations.append("Multiple numeric columns available - choose the target variable for forecasting")

        # Data transformation recommendations
        for col, info in column_info.items():
            if info['type'] == 'numeric' and col in value_cols:
                # Check if data might benefit from transformation
                if 'data_distribution' in assessment and col in assessment['data_distribution']['numeric_distributions']:
                    dist = assessment['data_distribution']['numeric_distributions'][col]
                    if abs(dist['skewness']) > 2:
                        recommendations.append(f"Consider log transformation for highly skewed column '{col}'")

        return recommendations[:10]  # Limit to top 10 recommendations

    def _create_error_assessment(self, error_message: str) -> Dict[str, Any]:
        """Create error assessment when analysis fails."""
        return {
            'error': True,
            'message': error_message,
            'overall_quality': {
                'score': 0,
                'grade': 'F',
                'summary': {},
                'critical_issues': ['Data quality assessment failed'],
                'warnings': []
            },
            'basic_statistics': {},
            'missing_values': {},
            'outliers': {},
            'data_distribution': {},
            'time_series_checks': {},
            'column_analysis': {},
            'recommendations': ['Please check data format and try again']
        }


# Global data quality assessment instance
data_quality_service = DataQualityAssessment()
