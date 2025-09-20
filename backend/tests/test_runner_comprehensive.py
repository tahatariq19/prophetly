"""Comprehensive test runner for backend testing suite.

This module provides utilities to run all backend tests with proper
categorization and reporting for the stateless architecture.
"""

import os
import sys
from pathlib import Path

import pytest


def run_unit_tests():
    """Run all unit tests."""
    print("Running Unit Tests...")
    return pytest.main([
        "tests/test_prophet_service_comprehensive.py",
        "tests/test_session_manager.py", 
        "tests/test_file_processor.py",
        "tests/test_data_quality.py",
        "tests/test_data_preprocessor.py",
        "-v",
        "-m", "not integration and not privacy",
        "--cov=src",
        "--cov-report=term-missing"
    ])


def run_integration_tests():
    """Run all integration tests."""
    print("Running Integration Tests...")
    return pytest.main([
        "tests/test_api_integration_stateless.py",
        "tests/test_forecast_integration.py",
        "tests/test_cross_validation_api.py",
        "tests/test_model_comparison_integration.py",
        "-v",
        "-m", "integration",
        "--cov=src",
        "--cov-report=term-missing"
    ])


def run_privacy_tests():
    """Run all privacy compliance tests."""
    print("Running Privacy Compliance Tests...")
    return pytest.main([
        "tests/test_privacy_compliance.py",
        "-v",
        "-m", "privacy",
        "--cov=src",
        "--cov-report=term-missing"
    ])


def run_all_tests():
    """Run all backend tests."""
    print("Running All Backend Tests...")
    return pytest.main([
        "tests/",
        "-v",
        "--cov=src",
        "--cov-report=term-missing",
        "--cov-report=html",
        "--cov-fail-under=80"
    ])


def run_memory_tests():
    """Run memory-specific tests."""
    print("Running Memory Management Tests...")
    return pytest.main([
        "tests/test_privacy_compliance.py::TestAutomaticMemoryCleanup",
        "tests/test_privacy_compliance.py::TestSecureDataDestruction",
        "tests/test_session_manager.py::TestMemoryUtilities",
        "tests/test_prophet_service_comprehensive.py::TestMemoryManagement",
        "-v",
        "--cov=src",
        "--cov-report=term-missing"
    ])


def run_api_tests():
    """Run API endpoint tests."""
    print("Running API Endpoint Tests...")
    return pytest.main([
        "tests/test_api_integration_stateless.py",
        "tests/test_upload_api.py",
        "tests/test_forecast_api.py",
        "tests/test_session_api.py",
        "-v",
        "--cov=src",
        "--cov-report=term-missing"
    ])


if __name__ == "__main__":
    """Main test runner with command line options."""
    
    if len(sys.argv) > 1:
        test_type = sys.argv[1].lower()
        
        if test_type == "unit":
            exit_code = run_unit_tests()
        elif test_type == "integration":
            exit_code = run_integration_tests()
        elif test_type == "privacy":
            exit_code = run_privacy_tests()
        elif test_type == "memory":
            exit_code = run_memory_tests()
        elif test_type == "api":
            exit_code = run_api_tests()
        elif test_type == "all":
            exit_code = run_all_tests()
        else:
            print(f"Unknown test type: {test_type}")
            print("Available options: unit, integration, privacy, memory, api, all")
            exit_code = 1
    else:
        # Default to running all tests
        exit_code = run_all_tests()
    
    sys.exit(exit_code)