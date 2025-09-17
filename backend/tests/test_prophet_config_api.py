"""Tests for Prophet configuration API endpoints."""

import json

from fastapi.testclient import TestClient

from src.main import app
from src.models.prophet_config import CustomSeasonality, ForecastConfig, Regressor


class TestProphetConfigAPI:
    """Test Prophet configuration API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)

    def test_get_templates(self):
        """Test GET /api/prophet/templates endpoint."""
        response = self.client.get("/api/prophet/templates")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "templates" in data
        assert len(data["templates"]) >= 3

        # Check template structure
        template = data["templates"][0]
        assert "name" in template
        assert "description" in template
        assert "use_case" in template
        assert "config" in template

    def test_create_config_from_template(self):
        """Test POST /api/prophet/config/from-template endpoint."""
        request_data = {
            "template_name": "E-commerce Sales",
            "overrides": {
                "horizon": 120,
                "name": "Custom E-commerce Config"
            }
        }

        response = self.client.post(
            "/api/prophet/config/from-template",
            json=request_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["config"]["horizon"] == 120
        assert data["config"]["name"] == "Custom E-commerce Config"
        assert data["validation"]["success"] is True
        assert data["validation"]["is_valid"] is True

    def test_create_config_from_invalid_template(self):
        """Test template creation with invalid template name."""
        request_data = {
            "template_name": "Non-existent Template",
            "overrides": {}
        }

        response = self.client.post(
            "/api/prophet/config/from-template",
            json=request_data
        )

        assert response.status_code == 400
        assert "not found" in response.json()["detail"]

    def test_validate_config_valid(self):
        """Test POST /api/prophet/config/validate with valid config."""
        config = ForecastConfig(
            name="Test Config",
            horizon=30,
            growth="linear"
        )

        request_data = {
            "config": config.model_dump(mode='json')
        }

        response = self.client.post(
            "/api/prophet/config/validate",
            json=request_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["is_valid"] is True
        assert len(data["errors"]) == 0
        assert "summary" in data

    def test_validate_config_invalid(self):
        """Test config validation with invalid configuration."""
        # Create invalid config (floor >= cap)
        config = ForecastConfig(
            name="Invalid Config",
            horizon=30,
            growth="logistic",
            cap=100.0,
            floor=150.0  # Floor greater than cap
        )

        request_data = {
            "config": config.model_dump(mode='json')
        }

        response = self.client.post(
            "/api/prophet/config/validate",
            json=request_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["is_valid"] is False
        assert len(data["errors"]) > 0
        assert any("floor" in error.lower() and "cap" in error.lower() for error in data["errors"])

    def test_export_config(self):
        """Test POST /api/prophet/config/export endpoint."""
        config = ForecastConfig(
            name="Export Test Config",
            horizon=45,
            growth="linear",
            yearly_seasonality=True
        )

        response = self.client.post(
            "/api/prophet/config/export",
            json=config.model_dump(mode='json')
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "filename" in data
        assert data["filename"].endswith(".json")
        assert "json_content" in data
        assert "summary" in data

        # Verify JSON content is valid
        json_content = json.loads(data["json_content"])
        assert json_content["name"] == "Export Test Config"
        assert json_content["horizon"] == 45

    def test_import_config_json(self):
        """Test POST /api/prophet/config/import endpoint."""
        # Create a valid configuration JSON
        config = ForecastConfig(
            name="Import Test Config",
            horizon=60,
            growth="logistic",
            cap=1000.0
        )
        json_content = config.to_json()

        request_data = {
            "json_content": json_content
        }

        response = self.client.post(
            "/api/prophet/config/import",
            json=request_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["config"]["name"] == "Import Test Config"
        assert data["config"]["horizon"] == 60
        assert data["config"]["growth"] == "logistic"
        assert data["config"]["cap"] == 1000.0
        assert data["validation"]["is_valid"] is True

    def test_import_config_invalid_json(self):
        """Test config import with invalid JSON."""
        request_data = {
            "json_content": "invalid json content"
        }

        response = self.client.post(
            "/api/prophet/config/import",
            json=request_data
        )

        assert response.status_code == 400
        assert "Invalid JSON format" in response.json()["detail"]

    def test_import_config_invalid_configuration(self):
        """Test config import with invalid configuration."""
        # Create JSON with invalid configuration
        invalid_config = {
            "name": "Invalid Config",
            "growth": "invalid_growth_mode"
        }
        json_content = json.dumps(invalid_config)

        request_data = {
            "json_content": json_content
        }

        response = self.client.post(
            "/api/prophet/config/import",
            json=request_data
        )

        assert response.status_code == 400
        assert "Failed to import configuration" in response.json()["detail"]

    def test_import_config_file(self):
        """Test POST /api/prophet/config/import-file endpoint."""
        # Create a valid configuration JSON file content
        config = ForecastConfig(
            name="File Import Test",
            horizon=30,
            growth="linear"
        )
        json_content = config.to_json()

        # Create file-like object
        files = {
            "file": ("test_config.json", json_content, "application/json")
        }

        response = self.client.post(
            "/api/prophet/config/import-file",
            files=files
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["config"]["name"] == "File Import Test"
        assert data["validation"]["is_valid"] is True
        assert "test_config.json" in data["message"]

    def test_import_config_file_invalid_type(self):
        """Test file import with invalid file type."""
        files = {
            "file": ("test.txt", "not json content", "text/plain")
        }

        response = self.client.post(
            "/api/prophet/config/import-file",
            files=files
        )

        assert response.status_code == 400
        assert "Only JSON files are supported" in response.json()["detail"]

    def test_complex_config_roundtrip(self):
        """Test complex configuration export/import roundtrip."""
        # Create complex configuration
        config = ForecastConfig(
            name="Complex Test Config",
            horizon=90,
            growth="logistic",
            cap=5000.0,
            floor=100.0,
            yearly_seasonality=True,
            weekly_seasonality=False,
            seasonality_mode="multiplicative",
            changepoint_prior_scale=0.1,
            mcmc_samples=200,
            custom_seasonalities=[
                CustomSeasonality(
                    name="monthly",
                    period=30.5,
                    fourier_order=5,
                    prior_scale=2.0
                )
            ],
            regressors=[
                Regressor(
                    name="temperature",
                    prior_scale=1.5,
                    mode="additive"
                )
            ]
        )

        # Export configuration
        export_response = self.client.post(
            "/api/prophet/config/export",
            json=config.model_dump(mode='json')
        )

        assert export_response.status_code == 200
        export_data = export_response.json()
        json_content = export_data["json_content"]

        # Import configuration
        import_request = {
            "json_content": json_content
        }

        import_response = self.client.post(
            "/api/prophet/config/import",
            json=import_request
        )

        assert import_response.status_code == 200
        import_data = import_response.json()

        # Verify all complex parameters were preserved
        imported_config = import_data["config"]
        assert imported_config["name"] == "Complex Test Config"
        assert imported_config["horizon"] == 90
        assert imported_config["growth"] == "logistic"
        assert imported_config["cap"] == 5000.0
        assert imported_config["floor"] == 100.0
        assert imported_config["seasonality_mode"] == "multiplicative"
        assert imported_config["mcmc_samples"] == 200
        assert len(imported_config["custom_seasonalities"]) == 1
        assert len(imported_config["regressors"]) == 1

        # Verify custom seasonality details
        seasonality = imported_config["custom_seasonalities"][0]
        assert seasonality["name"] == "monthly"
        assert seasonality["period"] == 30.5
        assert seasonality["fourier_order"] == 5

        # Verify regressor details
        regressor = imported_config["regressors"][0]
        assert regressor["name"] == "temperature"
        assert regressor["prior_scale"] == 1.5
        assert regressor["mode"] == "additive"

    def test_validation_with_warnings(self):
        """Test configuration validation that produces warnings."""
        config = ForecastConfig(
            name="Warning Test Config",
            horizon=30,
            mcmc_samples=1500,  # High value should produce warning
            custom_seasonalities=[
                CustomSeasonality(name=f"season_{i}", period=i+7, fourier_order=3)
                for i in range(6)  # Many seasonalities should produce warning
            ]
        )

        request_data = {
            "config": config.model_dump(mode='json')
        }

        response = self.client.post(
            "/api/prophet/config/validate",
            json=request_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["is_valid"] is True  # Should still be valid
        assert len(data["warnings"]) > 0  # But should have warnings

        # Check for specific warnings
        warnings_text = " ".join(data["warnings"])
        assert "MCMC samples" in warnings_text or "seasonalities" in warnings_text
