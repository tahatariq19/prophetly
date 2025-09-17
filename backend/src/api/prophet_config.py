"""API endpoints for Prophet configuration management."""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ..models.prophet_config import ConfigTemplate, ForecastConfig
from ..services.prophet_service import ProphetConfigurationError, prophet_service
from ..services.session_manager import session_manager
from ..utils.memory import MemoryTracker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prophet", tags=["prophet-config"])


class ConfigValidationRequest(BaseModel):
    """Request for configuration validation."""

    config: ForecastConfig = Field(description="Prophet configuration to validate")
    session_id: Optional[str] = Field(default=None, description="Session ID for data validation")


class ConfigValidationResponse(BaseModel):
    """Response for configuration validation."""

    success: bool
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)


class ConfigExportResponse(BaseModel):
    """Response for configuration export."""

    success: bool
    filename: str
    json_content: str
    summary: Dict[str, Any]


class ConfigImportRequest(BaseModel):
    """Request for configuration import."""

    json_content: str = Field(description="JSON configuration content")


class ConfigImportResponse(BaseModel):
    """Response for configuration import."""

    success: bool
    config: ForecastConfig
    validation: ConfigValidationResponse
    message: str


class TemplateListResponse(BaseModel):
    """Response for template listing."""

    success: bool
    templates: List[ConfigTemplate]


class TemplateCreateRequest(BaseModel):
    """Request for creating config from template."""

    template_name: str = Field(description="Name of the template to use")
    overrides: Dict[str, Any] = Field(default_factory=dict, description="Parameter overrides")


@router.get("/templates", response_model=TemplateListResponse)
async def get_templates() -> TemplateListResponse:
    """Get available Prophet configuration templates.
    
    Returns a list of pre-configured templates for common use cases
    like e-commerce sales, website traffic, and financial data.
    """
    with MemoryTracker("get_templates_endpoint"):
        try:
            templates = prophet_service.get_templates()

            logger.info("Retrieved %d configuration templates", len(templates))

            return TemplateListResponse(
                success=True,
                templates=templates
            )

        except Exception as e:
            logger.error("Failed to get templates: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve templates: {str(e)}"
            )


@router.post("/config/from-template", response_model=ConfigImportResponse)
async def create_config_from_template(
    request: TemplateCreateRequest
) -> ConfigImportResponse:
    """Create a Prophet configuration from a template with optional overrides.
    
    This endpoint allows users to start with a pre-configured template
    and customize specific parameters as needed.
    """
    with MemoryTracker("create_config_from_template_endpoint"):
        try:
            logger.info(
                "Creating config from template: %s with %d overrides",
                request.template_name, len(request.overrides)
            )

            # Create config from template
            config = prophet_service.create_config_from_template(
                request.template_name,
                **request.overrides
            )

            # Validate the created configuration
            validation_result = prophet_service.validate_config(config)

            validation_response = ConfigValidationResponse(
                success=True,
                is_valid=validation_result['is_valid'],
                errors=validation_result['errors'],
                warnings=validation_result['warnings'],
                recommendations=validation_result['recommendations'],
                summary=prophet_service.get_config_summary(config)
            )

            logger.info("Configuration created from template successfully")

            return ConfigImportResponse(
                success=True,
                config=config,
                validation=validation_response,
                message=f"Configuration created from template '{request.template_name}'"
            )

        except ProphetConfigurationError as e:
            logger.error("Template configuration error: %s", str(e))
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
        except Exception as e:
            logger.error("Failed to create config from template: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create configuration: {str(e)}"
            )


@router.post("/config/validate", response_model=ConfigValidationResponse)
async def validate_config(
    request: ConfigValidationRequest
) -> ConfigValidationResponse:
    """Validate a Prophet configuration.
    
    This endpoint validates the configuration parameters and optionally
    checks compatibility with uploaded data if a session ID is provided.
    """
    with MemoryTracker("validate_config_endpoint"):
        try:
            logger.info("Validating Prophet configuration: %s", request.config.name or "unnamed")

            # Get data from session if provided
            data = None
            if request.session_id:
                session = session_manager.get_session(request.session_id)
                if session:
                    data = session.get_dataframe('processed_data')

            # Validate configuration
            validation_result = prophet_service.validate_config(request.config, data)

            # Get configuration summary
            summary = prophet_service.get_config_summary(request.config)

            logger.info("Configuration validation completed: valid=%s", validation_result['is_valid'])

            return ConfigValidationResponse(
                success=True,
                is_valid=validation_result['is_valid'],
                errors=validation_result['errors'],
                warnings=validation_result['warnings'],
                recommendations=validation_result['recommendations'],
                summary=summary
            )

        except Exception as e:
            logger.error("Configuration validation failed: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Validation failed: {str(e)}"
            )


@router.post("/config/export", response_model=ConfigExportResponse)
async def export_config(
    config: ForecastConfig
) -> ConfigExportResponse:
    """Export Prophet configuration as JSON for client-side download.
    
    This endpoint converts the configuration to a JSON format that can be
    downloaded by the client and later re-imported for continuity.
    """
    with MemoryTracker("export_config_endpoint"):
        try:
            logger.info("Exporting Prophet configuration: %s", config.name or "unnamed")

            # Export configuration as JSON
            json_content = prophet_service.export_config_json(config)

            # Generate filename
            config_name = config.name or "prophet_config"
            safe_name = "".join(c for c in config_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            filename = f"{safe_name}_{config.created_at.strftime('%Y%m%d_%H%M%S')}.json"

            # Get summary
            summary = prophet_service.get_config_summary(config)

            logger.info("Configuration exported successfully: %s", filename)

            return ConfigExportResponse(
                success=True,
                filename=filename,
                json_content=json_content,
                summary=summary
            )

        except Exception as e:
            logger.error("Configuration export failed: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Export failed: {str(e)}"
            )


@router.post("/config/import", response_model=ConfigImportResponse)
async def import_config(
    request: ConfigImportRequest
) -> ConfigImportResponse:
    """Import Prophet configuration from JSON (client upload).
    
    This endpoint accepts a JSON configuration file uploaded by the client
    and validates it before returning the parsed configuration.
    """
    with MemoryTracker("import_config_endpoint"):
        try:
            logger.info("Importing Prophet configuration from JSON")

            # Import configuration from JSON
            config = prophet_service.import_config_json(request.json_content)

            # Validate imported configuration
            validation_result = prophet_service.validate_config(config)

            validation_response = ConfigValidationResponse(
                success=True,
                is_valid=validation_result['is_valid'],
                errors=validation_result['errors'],
                warnings=validation_result['warnings'],
                recommendations=validation_result['recommendations'],
                summary=prophet_service.get_config_summary(config)
            )

            logger.info("Configuration imported successfully: %s", config.name or "unnamed")

            return ConfigImportResponse(
                success=True,
                config=config,
                validation=validation_response,
                message="Configuration imported successfully"
            )

        except ProphetConfigurationError as e:
            logger.error("Configuration import error: %s", str(e))
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
        except Exception as e:
            logger.error("Configuration import failed: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Import failed: {str(e)}"
            )


@router.post("/config/import-file")
async def import_config_file(
    file: UploadFile = File(...)
) -> ConfigImportResponse:
    """Import Prophet configuration from uploaded JSON file.
    
    This endpoint accepts a JSON file upload and imports the configuration,
    providing an alternative to the JSON string import endpoint.
    """
    with MemoryTracker("import_config_file_endpoint"):
        try:
            logger.info("Importing Prophet configuration from file: %s", file.filename)

            # Validate file type
            if not file.filename or not file.filename.endswith('.json'):
                raise HTTPException(
                    status_code=400,
                    detail="Only JSON files are supported"
                )

            # Read file content
            content = await file.read()
            json_content = content.decode('utf-8')

            # Import configuration
            config = prophet_service.import_config_json(json_content)

            # Validate imported configuration
            validation_result = prophet_service.validate_config(config)

            validation_response = ConfigValidationResponse(
                success=True,
                is_valid=validation_result['is_valid'],
                errors=validation_result['errors'],
                warnings=validation_result['warnings'],
                recommendations=validation_result['recommendations'],
                summary=prophet_service.get_config_summary(config)
            )

            logger.info("Configuration imported from file successfully: %s", config.name or "unnamed")

            return ConfigImportResponse(
                success=True,
                config=config,
                validation=validation_response,
                message=f"Configuration imported from file '{file.filename}'"
            )

        except HTTPException:
            # Re-raise HTTP exceptions (like file type validation)
            raise
        except ProphetConfigurationError as e:
            logger.error("Configuration file import error: %s", str(e))
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
        except Exception as e:
            logger.error("Configuration file import failed: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"File import failed: {str(e)}"
            )
