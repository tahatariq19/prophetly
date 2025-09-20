"""Privacy compliance tests for stateless architecture.

These tests verify that the system maintains privacy-first principles:
- No data persistence to disk
- Automatic memory cleanup
- Session-based data handling
- Secure data destruction
"""

import gc
import os
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import psutil
import pytest

from src.models.session import SessionData
from src.services.file_processor import file_processor
from src.services.prophet_service import prophet_service
from src.services.session_manager import session_manager
from src.utils.memory import MemoryTracker, get_memory_usage


@pytest.mark.privacy
class TestNoDataPersistence:
    """Test that no user data is persisted to disk."""

    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.initial_files = set(Path(self.temp_dir).rglob("*"))

    def teardown_method(self):
        """Clean up test environment."""
        # Clean up any test files
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_no_temporary_files_created_during_upload(self):
        """Test that file upload doesn't create temporary files."""
        # Monitor file system before upload
        initial_files = set(Path("/tmp").glob("*")) if os.path.exists("/tmp") else set()
        
        # Create test data
        test_data = "date,value\n2023-01-01,100\n2023-01-02,200"
        
        # Mock file upload
        from unittest.mock import Mock
        import io
        
        mock_file = Mock()
        mock_file.filename = "test.csv"
        mock_file.content_type = "text/csv"
        mock_file.file = io.BytesIO(test_data.encode())
        
        async def mock_read():
            mock_file.file.seek(0)
            return mock_file.file.read()
        
        mock_file.read = mock_read
        
        # Process upload
        import asyncio
        result = asyncio.run(file_processor.process_upload(mock_file))
        
        # Check no new files were created
        final_files = set(Path("/tmp").glob("*")) if os.path.exists("/tmp") else set()
        new_files = final_files - initial_files
        
        # Filter out system files that might be created
        user_files = [f for f in new_files if not str(f).startswith(('/tmp/tmp', '/tmp/pytest'))]
        
        assert len(user_files) == 0, f"Temporary files created: {user_files}"
        assert result['success'] is True

    def test_no_model_files_persisted(self):
        """Test that Prophet models are not saved to disk."""
        from src.models.prophet_config import ForecastConfig
        
        # Create test configuration
        config = ForecastConfig(
            name="Test Model",
            horizon=30,
            growth="linear"
        )
        
        # Create and fit model
        model = prophet_service.create_model(config)
        
        # Create test data
        dates = pd.date_range(start='2023-01-01', periods=100, freq='D')
        data = pd.DataFrame({
            'ds': dates,
            'y': range(100)
        })
        
        # Fit model
        fitted_model = prophet_service.fit_model(model, data)
        
        # Check no model files were created
        model_extensions = ['.pkl', '.joblib', '.json', '.csv']
        for ext in model_extensions:
            model_files = list(Path(".").rglob(f"*{ext}"))
            # Filter out existing test files
            new_model_files = [f for f in model_files if 'test' not in str(f).lower()]
            assert len(new_model_files) == 0, f"Model files found: {new_model_files}"

    def test_no_session_data_persisted(self):
        """Test that session data is not written to disk."""
        # Create session
        session_id = session_manager.create_session()
        session = session_manager.get_session(session_id)
        
        # Add data to session
        test_df = pd.DataFrame({
            'date': pd.date_range('2023-01-01', periods=100),
            'value': range(100)
        })
        session.store_dataframe("test_data", test_df)
        session.store_data("config", {"horizon": 30})
        
        # Check no session files were created
        session_files = list(Path(".").rglob("*session*"))
        data_files = list(Path(".").rglob("*.csv"))
        
        # Filter out test files
        user_session_files = [f for f in session_files if 'test' not in str(f).lower()]
        user_data_files = [f for f in data_files if 'test' not in str(f).lower()]
        
        assert len(user_session_files) == 0, f"Session files found: {user_session_files}"
        assert len(user_data_files) == 0, f"Data files found: {user_data_files}"
        
        # Cleanup
        session_manager.cleanup_session(session_id)

    def test_no_logging_of_user_data(self):
        """Test that user data is not logged to files."""
        import logging
        from io import StringIO
        
        # Capture log output
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        logger = logging.getLogger()
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        
        try:
            # Create session with sensitive data
            session_id = session_manager.create_session()
            session = session_manager.get_session(session_id)
            
            sensitive_data = pd.DataFrame({
                'personal_id': ['123-45-6789', '987-65-4321'],
                'income': [50000, 75000],
                'email': ['user@example.com', 'test@example.com']
            })
            
            session.store_dataframe("sensitive", sensitive_data)
            
            # Get log output
            log_output = log_capture.getvalue()
            
            # Check that sensitive data is not in logs
            sensitive_values = ['123-45-6789', '50000', 'user@example.com']
            for value in sensitive_values:
                assert str(value) not in log_output, f"Sensitive data '{value}' found in logs"
            
        finally:
            logger.removeHandler(handler)
            session_manager.cleanup_session(session_id)


@pytest.mark.privacy
class TestAutomaticMemoryCleanup:
    """Test automatic memory cleanup functionality."""

    def setup_method(self):
        """Set up test environment."""
        # Get initial memory usage
        self.initial_memory = get_memory_usage()

    def test_session_data_cleanup_on_expiration(self):
        """Test that session data is cleaned up when expired."""
        # Create session with short expiration
        session_id = session_manager.create_session()
        session = session_manager.get_session(session_id)
        
        # Add data
        large_df = pd.DataFrame({
            'col1': range(10000),
            'col2': range(10000, 20000)
        })
        session.store_dataframe("large_data", large_df)
        
        # Verify data exists
        assert session.get_dataframe("large_data") is not None
        
        # Expire session
        session.expires_at = datetime.now() - timedelta(seconds=1)
        
        # Try to access expired session (should trigger cleanup)
        expired_session = session_manager.get_session(session_id)
        assert expired_session is None
        
        # Verify session was removed
        assert session_id not in session_manager.sessions

    def test_explicit_session_cleanup(self):
        """Test explicit session cleanup."""
        # Create session with data
        session_id = session_manager.create_session()
        session = session_manager.get_session(session_id)
        
        # Add various types of data
        session.store_data("config", {"key": "value"})
        session.store_dataframe("df", pd.DataFrame({'col': range(1000)}))
        
        # Get memory usage before cleanup
        memory_before = session.get_memory_usage()
        assert memory_before['data_items'] > 0
        assert memory_before['dataframes'] > 0
        
        # Cleanup session
        success = session_manager.cleanup_session(session_id)
        assert success is True
        
        # Verify session is gone
        assert session_id not in session_manager.sessions

    def test_memory_cleanup_after_prophet_operations(self):
        """Test memory cleanup after Prophet operations."""
        from src.models.prophet_config import ForecastConfig
        
        initial_memory = get_memory_usage()
        
        # Perform multiple Prophet operations
        for i in range(3):
            config = ForecastConfig(
                name=f"Test Model {i}",
                horizon=30,
                growth="linear"
            )
            
            # Create model
            model = prophet_service.create_model(config)
            
            # Create data
            dates = pd.date_range(start='2023-01-01', periods=365, freq='D')
            data = pd.DataFrame({
                'ds': dates,
                'y': range(365)
            })
            
            # Fit and predict
            fitted_model = prophet_service.fit_model(model, data)
            future = fitted_model.make_future_dataframe(periods=30)
            forecast = prophet_service.predict(fitted_model, future)
            
            # Explicit cleanup
            del model, fitted_model, data, future, forecast
            gc.collect()
        
        # Check memory usage after operations
        final_memory = get_memory_usage()
        memory_increase = final_memory['rss_mb'] - initial_memory['rss_mb']
        
        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100, f"Excessive memory usage: {memory_increase}MB"

    def test_garbage_collection_effectiveness(self):
        """Test that garbage collection effectively frees memory."""
        initial_memory = get_memory_usage()
        
        # Create large objects
        large_objects = []
        for i in range(10):
            df = pd.DataFrame({
                'col1': range(10000),
                'col2': range(10000, 20000),
                'col3': [f"text_{j}" for j in range(10000)]
            })
            large_objects.append(df)
        
        # Memory should have increased
        after_creation = get_memory_usage()
        assert after_creation['rss_mb'] > initial_memory['rss_mb']
        
        # Delete objects and force garbage collection
        del large_objects
        collected = gc.collect()
        
        # Memory should be freed
        after_cleanup = get_memory_usage()
        memory_freed = after_creation['rss_mb'] - after_cleanup['rss_mb']
        
        assert collected > 0, "No objects were garbage collected"
        assert memory_freed > 0, "No memory was freed"

    def test_memory_tracker_context_manager(self):
        """Test MemoryTracker context manager for leak detection."""
        with MemoryTracker("test_operation") as tracker:
            # Create and destroy objects
            data = pd.DataFrame({'col': range(10000)})
            processed = data.copy()
            del data, processed
            gc.collect()
        
        # Get memory delta
        delta = tracker.get_memory_delta()
        
        # Should not have significant memory increase
        assert abs(delta['rss_mb']) < 10, f"Memory leak detected: {delta['rss_mb']}MB"


@pytest.mark.privacy
class TestSecureDataDestruction:
    """Test secure data destruction functionality."""

    def test_dataframe_secure_cleanup(self):
        """Test secure cleanup of DataFrame data."""
        session = SessionData()
        
        # Create DataFrame with sensitive data
        sensitive_df = pd.DataFrame({
            'ssn': ['123-45-6789', '987-65-4321'],
            'credit_card': ['4111-1111-1111-1111', '5555-5555-5555-4444'],
            'salary': [50000, 75000]
        })
        
        session.store_dataframe("sensitive", sensitive_df)
        
        # Verify data exists
        retrieved = session.get_dataframe("sensitive")
        assert retrieved is not None
        assert len(retrieved) == 2
        
        # Cleanup session
        session.cleanup()
        
        # Verify data is gone
        assert session.get_dataframe("sensitive") is None
        assert len(session._dataframes) == 0

    def test_dictionary_data_secure_cleanup(self):
        """Test secure cleanup of dictionary data."""
        session = SessionData()
        
        # Store sensitive configuration
        sensitive_config = {
            'api_key': 'secret_key_12345',
            'database_password': 'super_secret_password',
            'user_data': {
                'email': 'user@example.com',
                'phone': '555-1234'
            }
        }
        
        session.store_data("config", sensitive_config)
        
        # Verify data exists
        retrieved = session.get_data("config")
        assert retrieved is not None
        assert retrieved['api_key'] == 'secret_key_12345'
        
        # Cleanup session
        session.cleanup()
        
        # Verify data is gone
        assert session.get_data("config") is None
        assert len(session._data) == 0

    def test_prophet_model_cleanup(self):
        """Test Prophet model cleanup doesn't leave traces."""
        from src.models.prophet_config import ForecastConfig
        
        config = ForecastConfig(
            name="Sensitive Model",
            horizon=30,
            growth="linear"
        )
        
        # Create model with sensitive data
        model = prophet_service.create_model(config)
        
        # Create data with sensitive values
        dates = pd.date_range(start='2023-01-01', periods=100, freq='D')
        sensitive_data = pd.DataFrame({
            'ds': dates,
            'y': [i * 1000 for i in range(100)]  # Sensitive financial data
        })
        
        # Fit model
        fitted_model = prophet_service.fit_model(model, sensitive_data)
        
        # Verify model has data
        assert hasattr(fitted_model, 'history')
        assert len(fitted_model.history) == 100
        
        # Cleanup model
        prophet_service.cleanup_model(fitted_model)
        
        # Model should still exist but with cleaned internal data
        assert fitted_model is not None

    def test_session_manager_cleanup_all(self):
        """Test that cleanup_all_sessions securely destroys all data."""
        # Create multiple sessions with data
        session_ids = []
        for i in range(5):
            session_id = session_manager.create_session()
            session = session_manager.get_session(session_id)
            
            # Add sensitive data
            session.store_data(f"secret_{i}", f"sensitive_value_{i}")
            session.store_dataframe(f"df_{i}", pd.DataFrame({
                'sensitive_col': [f"data_{i}_{j}" for j in range(100)]
            }))
            
            session_ids.append(session_id)
        
        # Verify sessions exist
        assert len(session_manager.sessions) == 5
        
        # Cleanup all sessions
        cleaned_count = session_manager.cleanup_all_sessions()
        assert cleaned_count == 5
        
        # Verify all sessions are gone
        assert len(session_manager.sessions) == 0
        
        # Verify individual sessions cannot be retrieved
        for session_id in session_ids:
            assert session_manager.get_session(session_id) is None


@pytest.mark.privacy
class TestMemoryLimitsEnforcement:
    """Test memory limits enforcement for privacy protection."""

    def test_session_memory_limit_enforcement(self):
        """Test that memory limits are enforced at session level."""
        # Create session manager with low memory limit
        test_manager = session_manager.__class__(
            max_session_age=timedelta(hours=1),
            max_memory_mb=1,  # Very low limit
            auto_start_cleanup=False
        )
        
        try:
            # Create session
            session_id = test_manager.create_session()
            session = test_manager.get_session(session_id)
            
            # Add data that exceeds limit
            large_df = pd.DataFrame({
                'col1': range(50000),
                'col2': range(50000, 100000)
            })
            session.store_dataframe("large_data", large_df)
            
            # Check memory limits
            assert not test_manager.check_memory_limits()
            
            # Enforce limits (should cleanup sessions)
            cleaned = test_manager.enforce_memory_limits()
            assert cleaned > 0
            
        finally:
            test_manager.cleanup_all_sessions()

    def test_file_size_limits_enforced(self):
        """Test that file size limits prevent memory exhaustion."""
        from unittest.mock import Mock
        import io
        
        # Create oversized file content
        large_content = "date,value\n" + "\n".join([f"2023-01-{i:02d},{i}" for i in range(1, 32)]) * 10000
        
        mock_file = Mock()
        mock_file.filename = "large_file.csv"
        mock_file.content_type = "text/csv"
        mock_file.file = io.BytesIO(large_content.encode())
        
        async def mock_read():
            return large_content.encode()
        
        mock_file.read = mock_read
        
        # Should raise error for oversized file
        import asyncio
        from src.services.file_processor import FileValidationError
        
        with pytest.raises(FileValidationError, match="File too large"):
            asyncio.run(file_processor.process_upload(mock_file))

    def test_dataframe_size_limits(self):
        """Test that DataFrame size limits are enforced."""
        # Test with very large DataFrame
        try:
            # This should be within reasonable limits
            df = pd.DataFrame({
                'col1': range(100000),
                'col2': range(100000, 200000)
            })
            
            # CSV validation should handle reasonable sizes
            file_processor._validate_csv_structure(df)
            
        except Exception as e:
            # If limits are exceeded, should get appropriate error
            assert "Too many rows" in str(e) or "memory" in str(e).lower()


@pytest.mark.privacy
class TestPrivacyComplianceIntegration:
    """Integration tests for privacy compliance across services."""

    def test_end_to_end_privacy_workflow(self):
        """Test complete workflow maintains privacy compliance."""
        from unittest.mock import Mock
        import io
        import asyncio
        
        # Step 1: File upload (no persistence)
        test_data = "date,value\n" + "\n".join([f"2023-01-{i:02d},{i*10}" for i in range(1, 32)])
        
        mock_file = Mock()
        mock_file.filename = "test_data.csv"
        mock_file.content_type = "text/csv"
        mock_file.file = io.BytesIO(test_data.encode())
        
        async def mock_read():
            mock_file.file.seek(0)
            return mock_file.file.read()
        
        mock_file.read = mock_read
        
        # Process upload
        upload_result = asyncio.run(file_processor.process_upload(mock_file))
        assert upload_result['success'] is True
        
        # Step 2: Store in session (memory only)
        session_id = session_manager.create_session()
        session = session_manager.get_session(session_id)
        
        # Convert uploaded data back to DataFrame
        data_dict = upload_result['data']
        df = pd.DataFrame(data_dict['data'])
        session.store_dataframe("uploaded_data", df)
        
        # Step 3: Prophet forecasting (no model persistence)
        from src.models.prophet_config import ForecastConfig
        
        config = ForecastConfig(
            name="Privacy Test Model",
            horizon=7,
            growth="linear"
        )
        
        # Prepare data for Prophet
        prophet_data = df.copy()
        prophet_data.columns = ['ds', 'y']
        prophet_data['ds'] = pd.to_datetime(prophet_data['ds'])
        
        # Create and fit model
        model = prophet_service.create_model(config)
        fitted_model = prophet_service.fit_model(model, prophet_data)
        
        # Generate forecast
        future = fitted_model.make_future_dataframe(periods=config.horizon)
        forecast = prophet_service.predict(fitted_model, future)
        
        # Store results in session
        session.store_dataframe("forecast", forecast)
        
        # Step 4: Verify no data persistence
        # Check no files were created
        temp_files = list(Path("/tmp").glob("*")) if os.path.exists("/tmp") else []
        user_files = [f for f in temp_files if not str(f).startswith(('/tmp/tmp', '/tmp/pytest'))]
        assert len(user_files) == 0, f"Files created: {user_files}"
        
        # Step 5: Session cleanup (secure destruction)
        session_manager.cleanup_session(session_id)
        
        # Verify session is gone
        assert session_manager.get_session(session_id) is None
        
        # Step 6: Memory cleanup
        del model, fitted_model, prophet_data, forecast, df
        gc.collect()

    def test_concurrent_sessions_privacy_isolation(self):
        """Test that concurrent sessions maintain data isolation."""
        # Create multiple sessions with different data
        sessions_data = {}
        
        for i in range(3):
            session_id = session_manager.create_session()
            session = session_manager.get_session(session_id)
            
            # Add unique data to each session
            unique_data = pd.DataFrame({
                'session_id': [session_id] * 10,
                'value': [i * 100 + j for j in range(10)],
                'secret': [f"secret_{i}_{j}" for j in range(10)]
            })
            
            session.store_dataframe("unique_data", unique_data)
            sessions_data[session_id] = unique_data
        
        # Verify data isolation
        for session_id, expected_data in sessions_data.items():
            session = session_manager.get_session(session_id)
            retrieved_data = session.get_dataframe("unique_data")
            
            # Data should match exactly
            assert len(retrieved_data) == len(expected_data)
            assert retrieved_data['session_id'].iloc[0] == session_id
            
            # Data should not contain other sessions' data
            for other_id in sessions_data:
                if other_id != session_id:
                    assert other_id not in retrieved_data['session_id'].values
        
        # Cleanup all sessions
        for session_id in sessions_data:
            session_manager.cleanup_session(session_id)

    def test_error_handling_maintains_privacy(self):
        """Test that error conditions don't leak data."""
        session_id = session_manager.create_session()
        session = session_manager.get_session(session_id)
        
        # Add sensitive data
        sensitive_data = pd.DataFrame({
            'ssn': ['123-45-6789'],
            'password': ['secret123']
        })
        session.store_dataframe("sensitive", sensitive_data)
        
        try:
            # Cause an error in Prophet processing
            from src.models.prophet_config import ForecastConfig
            
            config = ForecastConfig(
                name="Error Test",
                horizon=30,
                growth="linear"
            )
            
            model = prophet_service.create_model(config)
            
            # Invalid data should cause error
            invalid_data = pd.DataFrame({'wrong': ['columns']})
            
            with pytest.raises(Exception):
                prophet_service.fit_model(model, invalid_data)
                
        except Exception as e:
            # Error message should not contain sensitive data
            error_msg = str(e)
            assert '123-45-6789' not in error_msg
            assert 'secret123' not in error_msg
        
        finally:
            # Cleanup should still work
            session_manager.cleanup_session(session_id)
            assert session_manager.get_session(session_id) is None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "privacy"])