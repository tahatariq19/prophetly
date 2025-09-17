"""Integration tests for preprocessing API endpoints."""

from io import BytesIO

from fastapi.testclient import TestClient
import numpy as np
import pandas as pd

from src.main import app
from src.services.session_manager import session_manager


class TestPreprocessingAPI:
    """Test cases for preprocessing API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)

        # Create sample CSV data
        dates = pd.date_range('2023-01-01', periods=50, freq='D')
        values = np.random.normal(100, 10, 50)

        # Add some missing values and duplicates
        values[10:15] = np.nan

        self.sample_data = pd.DataFrame({
            'date': dates,
            'value': values,
            'category': ['A'] * 25 + ['B'] * 25
        })

        # Add duplicate rows
        self.sample_data = pd.concat([self.sample_data, self.sample_data.iloc[[0, 1]]], ignore_index=True)

        # Convert to CSV bytes
        csv_string = self.sample_data.to_csv(index=False)
        self.csv_content = csv_string.encode('utf-8')

    def test_preprocessing_options_endpoint(self):
        """Test getting preprocessing options."""
        response = self.client.get("/api/preprocessing/options")

        assert response.status_code == 200
        data = response.json()

        assert 'cleaning_options' in data
        assert 'transformation_options' in data
        assert 'prophet_validation' in data

        # Check specific options
        assert 'remove_duplicates' in data['cleaning_options']
        assert 'log_transform_columns' in data['transformation_options']

    def test_full_preprocessing_workflow(self):
        """Test complete preprocessing workflow."""
        # Step 1: Create session
        session_response = self.client.post("/api/session/create")
        assert session_response.status_code == 200
        session_id = session_response.json()['session_id']

        # Step 2: Upload file
        files = {"file": ("test.csv", BytesIO(self.csv_content), "text/csv")}
        upload_response = self.client.post(
            f"/api/upload/csv?session_id={session_id}",
            files=files
        )
        assert upload_response.status_code == 200

        # Step 3: Clean data
        cleaning_options = {
            "remove_duplicates": True,
            "missing_values_strategy": "interpolate",
            "interpolation_method": "linear"
        }

        clean_response = self.client.post(
            f"/api/preprocessing/clean?session_id={session_id}",
            json=cleaning_options
        )
        assert clean_response.status_code == 200
        clean_data = clean_response.json()

        assert clean_data['success'] is True
        assert 'remove_duplicates' in clean_data['operation_report']['operations_performed']
        assert clean_data['operation_report']['changes_summary']['duplicates_removed'] == 2

        # Step 4: Transform data
        transformation_options = {
            "log_transform_columns": ["value"]
        }

        transform_response = self.client.post(
            f"/api/preprocessing/transform?session_id={session_id}",
            json=transformation_options
        )
        assert transform_response.status_code == 200
        transform_data = transform_response.json()

        assert transform_data['success'] is True
        assert 'log_transform_value' in transform_data['operation_report']['transformations_applied']
        assert 'value_log' in transform_data['operation_report']['new_columns']

        # Step 5: Validate for Prophet
        validation_request = {
            "date_column": "date",
            "value_column": "value"
        }

        validate_response = self.client.post(
            f"/api/preprocessing/validate-prophet?session_id={session_id}",
            json=validation_request
        )
        assert validate_response.status_code == 200
        validation_data = validate_response.json()

        assert validation_data['success'] is True
        assert validation_data['validation_result']['is_valid'] is True
        assert validation_data['validation_result']['prophet_ready'] is True

        # Step 6: Get processing history
        history_response = self.client.get(f"/api/preprocessing/session/{session_id}/processing-history")
        assert history_response.status_code == 200
        history_data = history_response.json()

        assert history_data['has_original_data'] is True
        assert history_data['has_cleaned_data'] is True
        assert history_data['has_transformed_data'] is True
        assert history_data['current_state'] == 'transformed'

        # Step 7: Prepare download
        download_response = self.client.get(f"/api/preprocessing/download/{session_id}")
        assert download_response.status_code == 200
        download_data = download_response.json()

        assert download_data['success'] is True
        assert 'data' in download_data['download_data']
        assert 'metadata' in download_data['download_data']

        # Verify the processed data has the expected columns
        processed_columns = download_data['download_data']['data']['columns']
        assert 'date' in processed_columns
        assert 'value' in processed_columns
        assert 'value_log' in processed_columns  # From transformation

        # Step 8: Clean up
        cleanup_response = self.client.delete(f"/api/preprocessing/session/{session_id}/processed-data")
        assert cleanup_response.status_code == 200

        # Verify original data is preserved
        cleanup_data = cleanup_response.json()
        assert cleanup_data['original_data_preserved'] is True

    def test_error_handling(self):
        """Test error handling in preprocessing endpoints."""
        # Test with invalid session
        invalid_session = "invalid-session-id"

        clean_response = self.client.post(
            f"/api/preprocessing/clean?session_id={invalid_session}",
            json={"remove_duplicates": True}
        )
        assert clean_response.status_code == 404
        assert "Session not found" in clean_response.json()['detail']

        # Test validation with missing columns
        session_response = self.client.post("/api/session/create")
        session_id = session_response.json()['session_id']

        files = {"file": ("test.csv", BytesIO(self.csv_content), "text/csv")}
        self.client.post(f"/api/upload/csv?session_id={session_id}", files=files)

        validation_request = {
            "date_column": "nonexistent_column",
            "value_column": "value"
        }

        validate_response = self.client.post(
            f"/api/preprocessing/validate-prophet?session_id={session_id}",
            json=validation_request
        )
        assert validate_response.status_code == 200
        validation_data = validate_response.json()

        assert validation_data['validation_result']['is_valid'] is False
        assert len(validation_data['validation_result']['errors']) > 0

    def test_transformation_edge_cases(self):
        """Test transformation with edge cases."""
        # Create session and upload data with negative values
        session_response = self.client.post("/api/session/create")
        session_id = session_response.json()['session_id']

        # Data with negative values for log transform testing
        edge_case_data = pd.DataFrame({
            'date': pd.date_range('2023-01-01', periods=10, freq='D'),
            'value': [-5, -2, 0, 1, 2, 3, 4, 5, 6, 7]
        })
        csv_string = edge_case_data.to_csv(index=False)
        csv_content = csv_string.encode('utf-8')

        files = {"file": ("test.csv", BytesIO(csv_content), "text/csv")}
        self.client.post(f"/api/upload/csv?session_id={session_id}", files=files)

        # Try log transformation with negative values
        transformation_options = {
            "log_transform_columns": ["value"]
        }

        transform_response = self.client.post(
            f"/api/preprocessing/transform?session_id={session_id}",
            json=transformation_options
        )
        assert transform_response.status_code == 200
        transform_data = transform_response.json()

        # Should handle negative values by adding constant
        assert transform_data['success'] is True
        assert 'value_log' in transform_data['operation_report']['new_columns']

        # Check transformation details
        details = transform_data['operation_report']['transformation_details']['value_log']
        assert details['type'] == 'log_transform_with_constant'
        assert details['constant_added'] == 6.0  # abs(-5) + 1

    def teardown_method(self):
        """Clean up after tests."""
        # Clear all sessions
        session_manager.cleanup_all_sessions()
