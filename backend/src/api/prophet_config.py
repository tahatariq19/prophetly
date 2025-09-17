"""API endpoints for Prophet configuration management."""

import logging
from typing import Any, Dict, List, Optional

import pandas as pd
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


class AdvancedFeaturesRequest(BaseModel):
    """Request for advanced Prophet features validation."""
    
    config: ForecastConfig = Field(description="Prophet configuration with advanced features")
    session_id: str = Field(description="Session ID for data validation")


class AdvancedFeaturesResponse(BaseModel):
    """Response for advanced Prophet features validation."""
    
    success: bool
    seasonality_validation: Dict[str, Any] = Field(default_factory=dict)
    regressor_validation: Dict[str, Any] = Field(default_factory=dict)
    holiday_validation: Dict[str, Any] = Field(default_factory=dict)
    mcmc_validation: Dict[str, Any] = Field(default_factory=dict)
    recommendations: List[str] = Field(default_factory=list)


class HolidayCountriesResponse(BaseModel):
    """Response for available holiday countries."""
    
    success: bool
    countries: List[Dict[str, str]] = Field(default_factory=list)


@router.post("/advanced/validate", response_model=AdvancedFeaturesResponse)
async def validate_advanced_features(
    request: AdvancedFeaturesRequest
) -> AdvancedFeaturesResponse:
    """Validate advanced Prophet features against session data.
    
    This endpoint provides detailed validation for custom seasonalities,
    external regressors, holidays, and MCMC sampling configuration.
    """
    with MemoryTracker("validate_advanced_features_endpoint"):
        try:
            logger.info("Validating advanced Prophet features for session: %s", request.session_id)

            # Get session data
            session = session_manager.get_session(request.session_id)
            if not session:
                raise HTTPException(
                    status_code=404,
                    detail="Session not found"
                )

            data = session.get_dataframe('processed_data')
            if data is None:
                raise HTTPException(
                    status_code=400,
                    detail="No processed data found in session"
                )

            # Validate advanced features
            validation_result = prophet_service.validate_config(request.config, data)
            
            # Detailed validation for each advanced feature
            seasonality_validation = _validate_seasonalities(request.config, data)
            regressor_validation = _validate_regressors(request.config, data)
            holiday_validation = _validate_holidays(request.config)
            mcmc_validation = _validate_mcmc_settings(request.config, data)

            recommendations = []
            recommendations.extend(validation_result.get('recommendations', []))
            recommendations.extend(seasonality_validation.get('recommendations', []))
            recommendations.extend(regressor_validation.get('recommendations', []))
            recommendations.extend(holiday_validation.get('recommendations', []))
            recommendations.extend(mcmc_validation.get('recommendations', []))

            logger.info("Advanced features validation completed")

            return AdvancedFeaturesResponse(
                success=True,
                seasonality_validation=seasonality_validation,
                regressor_validation=regressor_validation,
                holiday_validation=holiday_validation,
                mcmc_validation=mcmc_validation,
                recommendations=recommendations
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Advanced features validation failed: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Advanced validation failed: {str(e)}"
            )


@router.get("/holidays/countries", response_model=HolidayCountriesResponse)
async def get_holiday_countries() -> HolidayCountriesResponse:
    """Get available countries for built-in holidays.
    
    Returns a list of country codes and names that are supported
    for built-in holiday effects in Prophet.
    """
    with MemoryTracker("get_holiday_countries_endpoint"):
        try:
            # Common countries supported by Prophet's holiday functionality
            countries = [
                {"code": "US", "name": "United States"},
                {"code": "CA", "name": "Canada"},
                {"code": "GB", "name": "United Kingdom"},
                {"code": "DE", "name": "Germany"},
                {"code": "FR", "name": "France"},
                {"code": "IT", "name": "Italy"},
                {"code": "ES", "name": "Spain"},
                {"code": "AU", "name": "Australia"},
                {"code": "JP", "name": "Japan"},
                {"code": "CN", "name": "China"},
                {"code": "IN", "name": "India"},
                {"code": "BR", "name": "Brazil"},
                {"code": "MX", "name": "Mexico"},
                {"code": "RU", "name": "Russia"},
                {"code": "KR", "name": "South Korea"},
                {"code": "NL", "name": "Netherlands"},
                {"code": "SE", "name": "Sweden"},
                {"code": "NO", "name": "Norway"},
                {"code": "DK", "name": "Denmark"},
                {"code": "FI", "name": "Finland"}
            ]

            logger.info("Retrieved %d holiday countries", len(countries))

            return HolidayCountriesResponse(
                success=True,
                countries=countries
            )

        except Exception as e:
            logger.error("Failed to get holiday countries: %s", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve holiday countries: {str(e)}"
            )


def _validate_seasonalities(config: ForecastConfig, data: pd.DataFrame) -> Dict[str, Any]:
    """Validate custom seasonalities against data."""
    validation = {
        'is_valid': True,
        'errors': [],
        'warnings': [],
        'recommendations': [],
        'seasonalities': []
    }

    for seasonality in config.custom_seasonalities:
        seasonality_info = {
            'name': seasonality.name,
            'period': seasonality.period,
            'fourier_order': seasonality.fourier_order,
            'mode': seasonality.mode,
            'is_valid': True,
            'issues': []
        }

        # Validate period against data frequency
        if len(data) > 0 and 'ds' in data.columns:
            data_freq = pd.infer_freq(data['ds'].sort_values())
            if data_freq:
                if seasonality.period < 2:
                    seasonality_info['issues'].append("Period should be at least 2 for meaningful seasonality")
                    seasonality_info['is_valid'] = False

        # Validate Fourier order
        if seasonality.fourier_order > seasonality.period / 2:
            seasonality_info['issues'].append("Fourier order should not exceed period/2")
            seasonality_info['is_valid'] = False

        # Check for conditional seasonality
        if seasonality.condition_name:
            if seasonality.condition_name not in data.columns:
                seasonality_info['issues'].append(f"Condition column '{seasonality.condition_name}' not found in data")
                seasonality_info['is_valid'] = False

        if not seasonality_info['is_valid']:
            validation['is_valid'] = False
            validation['errors'].extend(seasonality_info['issues'])

        validation['seasonalities'].append(seasonality_info)

    return validation


def _validate_regressors(config: ForecastConfig, data: pd.DataFrame) -> Dict[str, Any]:
    """Validate external regressors against data."""
    validation = {
        'is_valid': True,
        'errors': [],
        'warnings': [],
        'recommendations': [],
        'regressors': []
    }

    data_columns = set(data.columns) if data is not None else set()

    for regressor in config.regressors:
        regressor_info = {
            'name': regressor.name,
            'mode': regressor.mode,
            'standardize': regressor.standardize,
            'prior_scale': regressor.prior_scale,
            'is_valid': True,
            'issues': []
        }

        # Check if regressor column exists in data
        if regressor.name not in data_columns:
            regressor_info['issues'].append(f"Regressor column '{regressor.name}' not found in data")
            regressor_info['is_valid'] = False

        # Check for missing values
        elif data is not None and regressor.name in data.columns:
            missing_count = data[regressor.name].isna().sum()
            if missing_count > 0:
                regressor_info['issues'].append(f"Regressor has {missing_count} missing values")
                if missing_count > len(data) * 0.1:  # More than 10% missing
                    regressor_info['is_valid'] = False

        if not regressor_info['is_valid']:
            validation['is_valid'] = False
            validation['errors'].extend(regressor_info['issues'])

        validation['regressors'].append(regressor_info)

    return validation


def _validate_holidays(config: ForecastConfig) -> Dict[str, Any]:
    """Validate holiday configuration."""
    validation = {
        'is_valid': True,
        'errors': [],
        'warnings': [],
        'recommendations': [],
        'built_in_country': config.holidays_country,
        'custom_holidays_count': len(config.custom_holidays)
    }

    # Validate custom holidays
    holiday_names = set()
    for holiday in config.custom_holidays:
        if holiday.holiday in holiday_names:
            validation['errors'].append(f"Duplicate holiday name: {holiday.holiday}")
            validation['is_valid'] = False
        holiday_names.add(holiday.holiday)

        if holiday.lower_window > holiday.upper_window:
            validation['errors'].append(f"Holiday '{holiday.holiday}' has invalid window: lower > upper")
            validation['is_valid'] = False

    return validation


def _validate_mcmc_settings(config: ForecastConfig, data: pd.DataFrame) -> Dict[str, Any]:
    """Validate MCMC sampling configuration."""
    validation = {
        'is_valid': True,
        'errors': [],
        'warnings': [],
        'recommendations': [],
        'mcmc_samples': config.mcmc_samples,
        'estimated_time': None,
        'memory_usage': None
    }

    if config.mcmc_samples > 0:
        # Estimate processing time and memory usage
        data_size = len(data) if data is not None else 0
        
        # Rough estimates based on data size and MCMC samples
        if data_size > 0:
            estimated_minutes = (config.mcmc_samples * data_size) / 10000  # Rough estimate
            validation['estimated_time'] = f"{estimated_minutes:.1f} minutes"
            
            estimated_mb = (config.mcmc_samples * data_size * 8) / (1024 * 1024)  # Rough memory estimate
            validation['memory_usage'] = f"{estimated_mb:.1f} MB"

        # Warnings for high MCMC samples
        if config.mcmc_samples > 1000:
            validation['warnings'].append("High MCMC sample count may result in slow processing")
        
        if config.mcmc_samples > 1500:
            validation['warnings'].append("Very high MCMC sample count may cause memory issues")
            validation['recommendations'].append("Consider reducing MCMC samples to 500-1000 for faster processing")

    return validation
