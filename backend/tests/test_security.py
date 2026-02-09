import sys
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from main import app

client = TestClient(app)

def test_invalid_country_holidays():
    """Test that invalid country_holidays returns 400 Bad Request."""
    payload = {
        "data": [{"ds": "2023-01-01", "y": 10}],
        "config": {"country_holidays": "INVALID_COUNTRY"},
        "periods": 10,
        "freq": "D"
    }
    response = client.post("/api/forecast", json=payload)

    # Currently fails with 500 (leak)
    # Goal: 400 Bad Request
    assert response.status_code == 400
    assert "Invalid country code" in response.json()["detail"]

def test_internal_server_error_leakage():
    """Test that internal errors do not leak implementation details."""
    payload = {
        "data": [{"ds": "2023-01-01", "y": 10}],
        "config": {},
        "periods": 10,
        "freq": "D"
    }

    # Mock generate_forecast to raise a generic exception with sensitive info
    with patch("routers.forecast.generate_forecast") as mock_forecast:
        mock_forecast.side_effect = Exception("Sensitive database connection string leaked!")

        response = client.post("/api/forecast", json=payload)

        # Currently fails because it returns 500 with the leaked string
        # Goal: 500 Internal Server Error without the string
        assert response.status_code == 500
        assert response.json()["detail"] == "Internal Server Error"
        assert "Sensitive database connection string leaked!" not in response.text
