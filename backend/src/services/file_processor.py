"""Privacy-first file processing service for CSV uploads.

This service processes uploaded files entirely in memory without creating
temporary files or persisting data to disk. All processing happens during
the request lifecycle and data is immediately discarded after processing.
"""

from datetime import datetime
import io
import logging
import re
from typing import Any, Dict, Tuple

from fastapi import HTTPException, UploadFile
import pandas as pd

from ..config import settings
from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)


class FileValidationError(Exception):
    """Exception raised when file validation fails."""

    pass


class FileProcessor:
    """Privacy-first file processor for CSV uploads.
    
    Features:
    - In-memory processing only (no temporary files)
    - Automatic encoding detection
    - CSV format validation
    - Security scanning for malicious content
    - Data quality assessment
    - Column type detection
    """

    # Supported file extensions
    ALLOWED_EXTENSIONS = {'.csv', '.txt'}

    # Maximum file size (configurable via settings)
    MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes

    # CSV parsing parameters
    MAX_COLUMNS = 1000
    MAX_ROWS = 1000000

    # Encoding detection order (most common first)
    ENCODING_CANDIDATES = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252', 'iso-8859-1']

    # Security patterns to detect potentially malicious content
    SECURITY_PATTERNS = [
        re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'vbscript:', re.IGNORECASE),
        re.compile(r'on\w+\s*=', re.IGNORECASE),
        re.compile(r'@import', re.IGNORECASE),
        re.compile(r'expression\s*\(', re.IGNORECASE),
    ]

    def __init__(self):
        self.logger = logger

    async def process_upload(self, file: UploadFile) -> Dict[str, Any]:
        """Process uploaded file and return parsed data with metadata.
        
        Args:
            file: FastAPI UploadFile object
            
        Returns:
            Dict containing parsed data, metadata, and validation results
            
        Raises:
            FileValidationError: If file validation fails
            HTTPException: If processing fails

        """
        with MemoryTracker("process_upload"):
            try:
                # Step 1: Basic file validation
                self._validate_file_basic(file)

                # Step 2: Read file content into memory
                content = await self._read_file_content(file)

                # Step 3: Security scanning
                self._scan_for_security_issues(content)

                # Step 4: Detect encoding and parse CSV
                df, encoding_used = self._parse_csv_with_encoding_detection(content)

                # Step 5: Validate CSV structure
                self._validate_csv_structure(df)

                # Step 6: Detect column types
                column_info = self._detect_column_types(df)

                # Step 7: Generate file metadata
                metadata = self._generate_file_metadata(file, df, encoding_used, column_info)

                # Step 8: Convert DataFrame to serializable format for session storage
                data_dict = self._dataframe_to_dict(df)

                return {
                    'success': True,
                    'data': data_dict,
                    'metadata': metadata,
                    'column_info': column_info,
                    'message': f'Successfully processed {len(df)} rows and {len(df.columns)} columns'
                }

            except FileValidationError as e:
                self.logger.warning(f"File validation failed: {e}")
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                self.logger.error(f"File processing failed: {e}")
                raise HTTPException(status_code=500, detail="File processing failed")
            finally:
                # Ensure file content is cleared from memory
                if 'content' in locals():
                    del content
                if 'df' in locals():
                    del df

    def _validate_file_basic(self, file: UploadFile) -> None:
        """Perform basic file validation."""
        # Check filename
        if not file.filename:
            raise FileValidationError("No filename provided")

        # Check file extension
        file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        if file_ext not in self.ALLOWED_EXTENSIONS:
            raise FileValidationError(
                f"Unsupported file type '{file_ext}'. "
                f"Allowed types: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )

        # Check content type
        if file.content_type and not file.content_type.startswith(('text/', 'application/csv')):
            raise FileValidationError(
                f"Invalid content type '{file.content_type}'. Expected text or CSV format."
            )

    async def _read_file_content(self, file: UploadFile) -> bytes:
        """Read file content into memory with size validation."""
        content = await file.read()

        # Check file size
        if len(content) > self.MAX_FILE_SIZE:
            raise FileValidationError(
                f"File too large ({len(content) / 1024 / 1024:.1f}MB). "
                f"Maximum allowed size: {settings.MAX_FILE_SIZE_MB}MB"
            )

        # Check for empty file
        if len(content) == 0:
            raise FileValidationError("File is empty")

        return content

    def _scan_for_security_issues(self, content: bytes) -> None:
        """Scan file content for potential security issues."""
        try:
            # Convert to string for pattern matching (try UTF-8 first)
            text_content = content.decode('utf-8', errors='ignore')
        except UnicodeDecodeError:
            # If UTF-8 fails, try latin1 which accepts any byte sequence
            text_content = content.decode('latin1', errors='ignore')

        # Check for suspicious patterns
        for pattern in self.SECURITY_PATTERNS:
            if pattern.search(text_content):
                raise FileValidationError(
                    "File contains potentially malicious content and cannot be processed"
                )

        # Check for extremely long lines (potential DoS)
        lines = text_content.split('\n')
        max_line_length = max(len(line) for line in lines) if lines else 0
        if max_line_length > 100000:  # 100KB per line
            raise FileValidationError("File contains extremely long lines and may be malicious")

    def _parse_csv_with_encoding_detection(self, content: bytes) -> Tuple[pd.DataFrame, str]:
        """Parse CSV content with automatic encoding detection."""
        last_error = None

        for encoding in self.ENCODING_CANDIDATES:
            try:
                # Decode content with current encoding
                text_content = content.decode(encoding)

                # Create StringIO object for pandas
                csv_buffer = io.StringIO(text_content)

                # Try to parse CSV
                df = pd.read_csv(
                    csv_buffer,
                    encoding=None,  # Already decoded
                    low_memory=False,
                    na_values=['', 'NA', 'N/A', 'null', 'NULL', 'None', 'NaN'],
                    keep_default_na=True,
                    skip_blank_lines=True,
                    nrows=self.MAX_ROWS  # Limit rows for security
                )

                self.logger.info(f"Successfully parsed CSV with encoding: {encoding}")
                return df, encoding

            except (UnicodeDecodeError, pd.errors.EmptyDataError, pd.errors.ParserError) as e:
                last_error = e
                continue

        # If all encodings failed, raise the last error
        raise FileValidationError(f"Could not parse CSV file. Last error: {str(last_error)}")

    def _validate_csv_structure(self, df: pd.DataFrame) -> None:
        """Validate CSV structure and content."""
        # Check if DataFrame is empty
        if df.empty:
            raise FileValidationError("CSV file contains no data")

        # Check column count
        if len(df.columns) > self.MAX_COLUMNS:
            raise FileValidationError(
                f"Too many columns ({len(df.columns)}). Maximum allowed: {self.MAX_COLUMNS}"
            )

        # Check for minimum columns (need at least 2 for time series)
        if len(df.columns) < 2:
            raise FileValidationError(
                "CSV file must contain at least 2 columns (date and value columns required for forecasting)"
            )

        # Check row count
        if len(df) > self.MAX_ROWS:
            raise FileValidationError(
                f"Too many rows ({len(df)}). Maximum allowed: {self.MAX_ROWS}"
            )

        # Check for minimum rows (Prophet needs at least 2 data points)
        if len(df) < 2:
            raise FileValidationError(
                "CSV file must contain at least 2 rows of data for time series forecasting"
            )

        # Check for duplicate column names
        if len(df.columns) != len(set(df.columns)):
            duplicate_cols = [col for col in df.columns if list(df.columns).count(col) > 1]
            raise FileValidationError(f"Duplicate column names found: {duplicate_cols}")

    def _detect_column_types(self, df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """Detect column types and identify potential date/value columns."""
        column_info = {}

        for col in df.columns:
            col_data = df[col].dropna()  # Remove NaN values for analysis

            if col_data.empty:
                column_info[col] = {
                    'type': 'empty',
                    'non_null_count': 0,
                    'null_count': len(df[col]),
                    'is_potential_date': False,
                    'is_potential_value': False,
                    'sample_values': []
                }
                continue

            # Basic statistics
            non_null_count = len(col_data)
            null_count = len(df[col]) - non_null_count
            sample_values = col_data.head(5).tolist()

            # Detect column type
            col_type, is_potential_date, is_potential_value = self._analyze_column_type(col_data)

            column_info[col] = {
                'type': col_type,
                'non_null_count': int(non_null_count),
                'null_count': int(null_count),
                'is_potential_date': is_potential_date,
                'is_potential_value': is_potential_value,
                'sample_values': [str(v) for v in sample_values]  # Convert to strings for serialization
            }

            # Add type-specific information
            if col_type == 'numeric':
                column_info[col].update({
                    'min': float(col_data.min()),
                    'max': float(col_data.max()),
                    'mean': float(col_data.mean()),
                    'std': float(col_data.std()) if len(col_data) > 1 else 0.0
                })
            elif col_type == 'datetime':
                column_info[col].update({
                    'min_date': col_data.min().isoformat() if hasattr(col_data.min(), 'isoformat') else str(col_data.min()),
                    'max_date': col_data.max().isoformat() if hasattr(col_data.max(), 'isoformat') else str(col_data.max())
                })
            elif col_type == 'text':
                unique_count = int(col_data.nunique())
                most_common_dict = col_data.value_counts().head(3).to_dict()
                # Convert numpy types to Python types
                most_common_dict = {str(k): int(v) for k, v in most_common_dict.items()}
                column_info[col].update({
                    'unique_count': unique_count,
                    'most_common': most_common_dict
                })

        return column_info

    def _analyze_column_type(self, series: pd.Series) -> Tuple[str, bool, bool]:
        """Analyze a pandas Series to determine its type and potential use."""
        is_potential_date = False
        is_potential_value = False

        # Try to convert to numeric
        try:
            pd.to_numeric(series, errors='raise')
            col_type = 'numeric'
            is_potential_value = True
        except (ValueError, TypeError):
            # Try to convert to datetime
            try:
                pd.to_datetime(series, errors='raise')
                col_type = 'datetime'
                is_potential_date = True
            except (ValueError, TypeError):
                # Check if it looks like a date string
                if self._looks_like_date_column(series):
                    col_type = 'potential_datetime'
                    is_potential_date = True
                else:
                    col_type = 'text'

        return col_type, is_potential_date, is_potential_value

    def _looks_like_date_column(self, series: pd.Series) -> bool:
        """Check if a text column looks like it contains dates."""
        # Common date patterns
        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
            r'\d{2}/\d{2}/\d{4}',  # MM/DD/YYYY
            r'\d{2}-\d{2}-\d{4}',  # MM-DD-YYYY
            r'\d{4}/\d{2}/\d{2}',  # YYYY/MM/DD
            r'\d{1,2}/\d{1,2}/\d{2,4}',  # M/D/YY or MM/DD/YYYY
        ]

        # Check first few non-null values
        sample_values = series.dropna().head(10).astype(str)

        for value in sample_values:
            for pattern in date_patterns:
                if re.search(pattern, value):
                    return True

        return False

    def _generate_file_metadata(
        self,
        file: UploadFile,
        df: pd.DataFrame,
        encoding: str,
        column_info: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate comprehensive file metadata."""
        # Find potential date and value columns
        potential_date_cols = [col for col, info in column_info.items() if info['is_potential_date']]
        potential_value_cols = [col for col, info in column_info.items() if info['is_potential_value']]

        return {
            'filename': file.filename,
            'file_size_bytes': 0,  # File size will be calculated from content length
            'encoding': encoding,
            'rows': int(len(df)),
            'columns': int(len(df.columns)),
            'column_names': list(df.columns),
            'potential_date_columns': potential_date_cols,
            'potential_value_columns': potential_value_cols,
            'processed_at': datetime.now().isoformat(),
            'memory_usage_bytes': int(df.memory_usage(deep=True).sum()),
            'has_missing_values': bool(df.isnull().any().any()),
            'missing_value_count': int(df.isnull().sum().sum()),
            'privacy_notice': 'File processed in memory only - no data stored on server'
        }

    def _dataframe_to_dict(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Convert DataFrame to a serializable dictionary format."""
        # Convert DataFrame to dict with proper handling of NaN values
        data_dict = {
            'columns': list(df.columns),
            'data': df.fillna('').to_dict('records'),  # Replace NaN with empty string
            'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()}
        }

        return data_dict


# Global file processor instance
file_processor = FileProcessor()
