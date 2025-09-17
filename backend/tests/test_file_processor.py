"""Tests for file processing service."""

import io
from unittest.mock import Mock

import pytest

from src.services.file_processor import FileProcessor, FileValidationError


class TestFileProcessor:
    """Test cases for FileProcessor class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.processor = FileProcessor()

    def create_upload_file(self, content: str, filename: str = "test.csv", content_type: str = "text/csv") -> Mock:
        """Helper to create UploadFile mock for testing."""
        file_obj = io.BytesIO(content.encode('utf-8'))

        # Create a mock UploadFile
        mock_file = Mock()
        mock_file.filename = filename
        mock_file.content_type = content_type
        mock_file.file = file_obj

        # Mock the read method to return the content
        async def mock_read():
            file_obj.seek(0)  # Reset to beginning
            return file_obj.read()

        mock_file.read = mock_read
        return mock_file

    def test_validate_file_basic_success(self):
        """Test successful basic file validation."""
        file = self.create_upload_file("date,value\n2023-01-01,100", "test.csv")
        # Should not raise any exception
        self.processor._validate_file_basic(file)

    def test_validate_file_basic_no_filename(self):
        """Test validation failure with no filename."""
        file = self.create_upload_file("date,value\n2023-01-01,100", filename=None)

        with pytest.raises(FileValidationError, match="No filename provided"):
            self.processor._validate_file_basic(file)

    def test_validate_file_basic_invalid_extension(self):
        """Test validation failure with invalid file extension."""
        file = self.create_upload_file("date,value\n2023-01-01,100", "test.xlsx")

        with pytest.raises(FileValidationError, match="Unsupported file type"):
            self.processor._validate_file_basic(file)

    def test_validate_file_basic_invalid_content_type(self):
        """Test validation failure with invalid content type."""
        file = self.create_upload_file(
            "date,value\n2023-01-01,100",
            "test.csv",
            content_type="application/json"
        )

        with pytest.raises(FileValidationError, match="Invalid content type"):
            self.processor._validate_file_basic(file)

    @pytest.mark.asyncio
    async def test_read_file_content_success(self):
        """Test successful file content reading."""
        content = "date,value\n2023-01-01,100\n2023-01-02,200"
        file = self.create_upload_file(content)

        result = await self.processor._read_file_content(file)
        assert result == content.encode('utf-8')

    @pytest.mark.asyncio
    async def test_read_file_content_empty_file(self):
        """Test reading empty file."""
        file = self.create_upload_file("")

        with pytest.raises(FileValidationError, match="File is empty"):
            await self.processor._read_file_content(file)

    def test_scan_for_security_issues_clean_content(self):
        """Test security scanning with clean content."""
        content = b"date,value\n2023-01-01,100\n2023-01-02,200"
        # Should not raise any exception
        self.processor._scan_for_security_issues(content)

    def test_scan_for_security_issues_malicious_script(self):
        """Test security scanning detects malicious script."""
        content = b"date,value\n2023-01-01,<script>alert('xss')</script>"

        with pytest.raises(FileValidationError, match="potentially malicious content"):
            self.processor._scan_for_security_issues(content)

    def test_scan_for_security_issues_javascript_url(self):
        """Test security scanning detects javascript URLs."""
        content = b"date,value\n2023-01-01,javascript:alert('xss')"

        with pytest.raises(FileValidationError, match="potentially malicious content"):
            self.processor._scan_for_security_issues(content)

    def test_parse_csv_with_encoding_detection_utf8(self):
        """Test CSV parsing with UTF-8 encoding."""
        content = "date,value\n2023-01-01,100\n2023-01-02,200".encode('utf-8')

        df, encoding = self.processor._parse_csv_with_encoding_detection(content)

        assert encoding == 'utf-8'
        assert len(df) == 2
        assert list(df.columns) == ['date', 'value']
        assert df.iloc[0]['value'] == 100

    def test_parse_csv_with_encoding_detection_latin1(self):
        """Test CSV parsing with Latin-1 encoding."""
        content = "date,value\n2023-01-01,100\n2023-01-02,200".encode('latin1')

        df, encoding = self.processor._parse_csv_with_encoding_detection(content)

        assert encoding in ['latin1', 'utf-8']  # Could be detected as either
        assert len(df) == 2
        assert list(df.columns) == ['date', 'value']

    def test_parse_csv_with_encoding_detection_invalid_csv(self):
        """Test CSV parsing with invalid CSV content."""
        content = b"not,a,valid\ncsv,content,here,extra,columns"

        # Should still parse but might have issues - let's test it doesn't crash
        try:
            df, encoding = self.processor._parse_csv_with_encoding_detection(content)
            # If it parses, that's fine too
        except FileValidationError:
            # Expected for truly invalid CSV
            pass

    def test_validate_csv_structure_valid(self):
        """Test CSV structure validation with valid data."""
        import pandas as pd
        df = pd.DataFrame({
            'date': ['2023-01-01', '2023-01-02', '2023-01-03'],
            'value': [100, 200, 300]
        })

        # Should not raise any exception
        self.processor._validate_csv_structure(df)

    def test_validate_csv_structure_empty_dataframe(self):
        """Test CSV structure validation with empty DataFrame."""
        import pandas as pd
        df = pd.DataFrame()

        with pytest.raises(FileValidationError, match="contains no data"):
            self.processor._validate_csv_structure(df)

    def test_validate_csv_structure_insufficient_columns(self):
        """Test CSV structure validation with insufficient columns."""
        import pandas as pd
        df = pd.DataFrame({'single_column': [1, 2, 3]})

        with pytest.raises(FileValidationError, match="at least 2 columns"):
            self.processor._validate_csv_structure(df)

    def test_validate_csv_structure_insufficient_rows(self):
        """Test CSV structure validation with insufficient rows."""
        import pandas as pd
        df = pd.DataFrame({'date': ['2023-01-01'], 'value': [100]})

        with pytest.raises(FileValidationError, match="at least 2 rows"):
            self.processor._validate_csv_structure(df)

    def test_validate_csv_structure_duplicate_columns(self):
        """Test CSV structure validation with duplicate column names."""
        import pandas as pd
        df = pd.DataFrame()
        df['date'] = ['2023-01-01', '2023-01-02']
        df['value'] = [100, 200]
        # Manually create duplicate column names
        df.columns = ['date', 'date']

        with pytest.raises(FileValidationError, match="Duplicate column names"):
            self.processor._validate_csv_structure(df)

    def test_detect_column_types_numeric(self):
        """Test column type detection for numeric data."""
        import pandas as pd
        df = pd.DataFrame({'numbers': [1, 2, 3, 4, 5]})

        column_info = self.processor._detect_column_types(df)

        assert column_info['numbers']['type'] == 'numeric'
        assert column_info['numbers']['is_potential_value'] is True
        assert column_info['numbers']['is_potential_date'] is False
        assert 'min' in column_info['numbers']
        assert 'max' in column_info['numbers']

    def test_detect_column_types_datetime(self):
        """Test column type detection for datetime data."""
        import pandas as pd
        df = pd.DataFrame({'dates': ['2023-01-01', '2023-01-02', '2023-01-03']})

        column_info = self.processor._detect_column_types(df)

        # Should detect as datetime or potential_datetime
        assert column_info['dates']['type'] in ['datetime', 'potential_datetime']
        assert column_info['dates']['is_potential_date'] is True
        assert column_info['dates']['is_potential_value'] is False

    def test_detect_column_types_text(self):
        """Test column type detection for text data."""
        import pandas as pd
        df = pd.DataFrame({'text': ['apple', 'banana', 'cherry', 'apple']})

        column_info = self.processor._detect_column_types(df)

        assert column_info['text']['type'] == 'text'
        assert column_info['text']['is_potential_date'] is False
        assert column_info['text']['is_potential_value'] is False
        assert 'unique_count' in column_info['text']
        assert 'most_common' in column_info['text']

    def test_detect_column_types_empty_column(self):
        """Test column type detection for empty column."""
        import pandas as pd
        df = pd.DataFrame({'empty': [None, None, None]})

        column_info = self.processor._detect_column_types(df)

        assert column_info['empty']['type'] == 'empty'
        assert column_info['empty']['non_null_count'] == 0
        assert column_info['empty']['null_count'] == 3

    def test_looks_like_date_column_various_formats(self):
        """Test date pattern recognition for various formats."""
        import pandas as pd

        # Test different date formats
        test_cases = [
            (['2023-01-01', '2023-01-02'], True),  # YYYY-MM-DD
            (['01/01/2023', '01/02/2023'], True),  # MM/DD/YYYY
            (['01-01-2023', '01-02-2023'], True),  # MM-DD-YYYY
            (['2023/01/01', '2023/01/02'], True),  # YYYY/MM/DD
            (['1/1/23', '1/2/23'], True),          # M/D/YY
            (['apple', 'banana'], False),          # Not dates
            (['123', '456'], False),               # Numbers
        ]

        for values, expected in test_cases:
            series = pd.Series(values)
            result = self.processor._looks_like_date_column(series)
            assert result == expected, f"Failed for {values}: expected {expected}, got {result}"

    def test_dataframe_to_dict(self):
        """Test DataFrame to dictionary conversion."""
        import numpy as np
        import pandas as pd

        df = pd.DataFrame({
            'date': ['2023-01-01', '2023-01-02'],
            'value': [100, 200],
            'nullable': [1.5, np.nan]
        })

        result = self.processor._dataframe_to_dict(df)

        assert 'columns' in result
        assert 'data' in result
        assert 'dtypes' in result
        assert result['columns'] == ['date', 'value', 'nullable']
        assert len(result['data']) == 2
        assert result['data'][0]['date'] == '2023-01-01'
        assert result['data'][0]['value'] == 100
        assert result['data'][1]['nullable'] == ''  # NaN converted to empty string

    @pytest.mark.asyncio
    async def test_process_upload_complete_workflow(self):
        """Test complete file upload processing workflow."""
        content = "date,value\n2023-01-01,100\n2023-01-02,200\n2023-01-03,300"
        file = self.create_upload_file(content, "test_data.csv")

        result = await self.processor.process_upload(file)

        assert result['success'] is True
        assert 'data' in result
        assert 'metadata' in result
        assert 'column_info' in result
        assert 'message' in result

        # Check data structure
        assert result['data']['columns'] == ['date', 'value']
        assert len(result['data']['data']) == 3

        # Check metadata
        metadata = result['metadata']
        assert metadata['filename'] == 'test_data.csv'
        assert metadata['rows'] == 3
        assert metadata['columns'] == 2
        assert 'processed_at' in metadata
        assert 'privacy_notice' in metadata

        # Check column info
        column_info = result['column_info']
        assert 'date' in column_info
        assert 'value' in column_info
        assert column_info['date']['is_potential_date'] is True
        assert column_info['value']['is_potential_value'] is True
