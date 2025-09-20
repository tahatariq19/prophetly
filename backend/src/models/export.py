"""
Data models for export functionality
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class ExportRequest(BaseModel):
    """Request model for data export operations"""
    session_id: str = Field(..., description="Session identifier")
    include_metadata: bool = Field(default=True, description="Include export metadata")
    include_components: bool = Field(default=True, description="Include component decomposition")
    include_cross_validation: bool = Field(default=False, description="Include cross-validation results")
    annotations: Optional[List[str]] = Field(default=None, description="User annotations to include")
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "abc123def456",
                "include_metadata": True,
                "include_components": True,
                "include_cross_validation": False,
                "annotations": ["This forecast shows strong seasonal patterns", "Model performs well on validation data"]
            }
        }

class ReportRequest(BaseModel):
    """Request model for report generation"""
    session_id: str = Field(..., description="Session identifier")
    title: Optional[str] = Field(default="Prophet Forecast Report", description="Report title")
    comments: Optional[str] = Field(default=None, description="User comments for the report")
    include_summary: bool = Field(default=True, description="Include executive summary")
    include_configuration: bool = Field(default=True, description="Include model configuration")
    include_metrics: bool = Field(default=True, description="Include performance metrics")
    include_components: bool = Field(default=True, description="Include component analysis")
    include_charts: bool = Field(default=False, description="Include chart images (client-side only)")
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "abc123def456",
                "title": "Q4 Sales Forecast Analysis",
                "comments": "This forecast was generated for quarterly planning purposes. The model shows strong seasonal patterns consistent with historical data.",
                "include_summary": True,
                "include_configuration": True,
                "include_metrics": True,
                "include_components": True,
                "include_charts": False
            }
        }

class ExportResponse(BaseModel):
    """Response model for export operations"""
    data: str = Field(..., description="Exported data content")
    filename: str = Field(..., description="Suggested filename for download")
    content_type: str = Field(..., description="MIME type of the exported data")
    size: int = Field(..., description="Size of exported data in bytes")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Export metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "data": "date,actual,forecast,lower_bound,upper_bound\n2023-01-01,100,98.5,85.2,111.8\n...",
                "filename": "forecast_data_20231201.csv",
                "content_type": "text/csv",
                "size": 15420,
                "metadata": {
                    "export_info": {
                        "exported_at": "2023-12-01T10:30:00Z",
                        "application": "Prophet Web Interface",
                        "version": "1.0.0"
                    },
                    "forecast_metadata": {
                        "data_points": 365,
                        "forecast_points": 30,
                        "confidence_interval": 0.8
                    }
                }
            }
        }

class ExportMetadata(BaseModel):
    """Metadata included with exports"""
    export_info: Dict[str, Any] = Field(default_factory=dict, description="Export information")
    session_info: Dict[str, Any] = Field(default_factory=dict, description="Session information")
    forecast_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Forecast-specific metadata")
    configuration_summary: Optional[Dict[str, Any]] = Field(default=None, description="Configuration summary")
    privacy_notice: str = Field(default="Data processed in memory only - no server storage", description="Privacy compliance notice")
    
    class Config:
        schema_extra = {
            "example": {
                "export_info": {
                    "exported_at": "2023-12-01T10:30:00Z",
                    "application": "Prophet Web Interface",
                    "version": "1.0.0",
                    "privacy_notice": "Data processed in memory only - no server storage"
                },
                "session_info": {
                    "session_id": "abc123def456",
                    "created_at": "2023-12-01T09:15:00Z",
                    "data_points": 365
                },
                "forecast_metadata": {
                    "model_summary": {},
                    "performance_metrics": {"mae": 5.2, "rmse": 7.8, "mape": 0.12},
                    "forecast_points": 30,
                    "has_components": True,
                    "confidence_interval": 0.8
                },
                "configuration_summary": {
                    "growth_mode": "linear",
                    "seasonality_mode": "additive",
                    "horizon": 30,
                    "has_custom_seasonalities": False,
                    "has_holidays": True,
                    "has_regressors": False
                }
            }
        }

class ConfigurationExport(BaseModel):
    """Model for configuration export data"""
    configuration: Dict[str, Any] = Field(..., description="Prophet model configuration")
    export_info: Dict[str, Any] = Field(default_factory=dict, description="Export metadata")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Configuration metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "configuration": {
                    "growth": "linear",
                    "seasonality_mode": "additive",
                    "yearly_seasonality": "auto",
                    "weekly_seasonality": "auto",
                    "daily_seasonality": "auto",
                    "horizon": 30,
                    "interval_width": 0.8
                },
                "export_info": {
                    "exported_at": "2023-12-01T10:30:00Z",
                    "version": "1.0.0",
                    "application": "Prophet Web Interface",
                    "privacy_notice": "This configuration contains no user data - safe to share"
                },
                "metadata": {
                    "parameters_count": 7,
                    "has_custom_seasonalities": False,
                    "has_holidays": True,
                    "has_regressors": False,
                    "growth_mode": "linear",
                    "seasonality_mode": "additive"
                }
            }
        }

class CompletePackage(BaseModel):
    """Model for complete export package"""
    package_info: Dict[str, Any] = Field(..., description="Package information")
    configuration: Optional[Dict[str, Any]] = Field(default=None, description="Model configuration")
    results: Dict[str, Any] = Field(default_factory=dict, description="Forecast results")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Export metadata")
    user_annotations: List[str] = Field(default_factory=list, description="User annotations")
    
    class Config:
        schema_extra = {
            "example": {
                "package_info": {
                    "created_at": "2023-12-01T10:30:00Z",
                    "application": "Prophet Web Interface",
                    "version": "1.0.0",
                    "session_id": "abc123def456",
                    "privacy_notice": "Data processed in memory only - no server storage"
                },
                "configuration": {
                    "growth": "linear",
                    "seasonality_mode": "additive",
                    "horizon": 30
                },
                "results": {
                    "forecast_data": [],
                    "components": {},
                    "performance_metrics": {"mae": 5.2, "rmse": 7.8},
                    "model_summary": {}
                },
                "metadata": {},
                "user_annotations": ["Strong seasonal patterns observed", "Model validation successful"]
            }
        }

class SharingPackage(BaseModel):
    """Model for privacy-safe sharing package"""
    sharing_info: Dict[str, Any] = Field(..., description="Sharing package information")
    model_summary: Dict[str, Any] = Field(default_factory=dict, description="Model summary (no raw data)")
    performance_metrics: Dict[str, Any] = Field(default_factory=dict, description="Performance metrics")
    configuration: Dict[str, Any] = Field(default_factory=dict, description="Model configuration")
    forecast_summary: Dict[str, Any] = Field(default_factory=dict, description="High-level forecast summary")
    
    class Config:
        schema_extra = {
            "example": {
                "sharing_info": {
                    "created_at": "2023-12-01T10:30:00Z",
                    "privacy_notice": "This package contains no raw user data - safe for sharing",
                    "application": "Prophet Web Interface"
                },
                "model_summary": {
                    "config_name": "Sales Forecast Model",
                    "growth": "linear",
                    "seasonality_mode": "additive"
                },
                "performance_metrics": {
                    "mae": 5.2,
                    "rmse": 7.8,
                    "mape": 0.12,
                    "r2": 0.85
                },
                "configuration": {
                    "horizon": 30,
                    "confidence_interval": 0.8,
                    "seasonalities": ["yearly", "weekly"]
                },
                "forecast_summary": {
                    "horizon": 30,
                    "data_points": 365,
                    "forecast_points": 30
                }
            }
        }

class ReproductionPackage(BaseModel):
    """Model for reproduction package"""
    reproduction_info: Dict[str, Any] = Field(..., description="Reproduction information")
    configuration: Dict[str, Any] = Field(..., description="Complete model configuration")
    preprocessing_steps: List[Dict[str, Any]] = Field(default_factory=list, description="Data preprocessing steps")
    data_requirements: Dict[str, Any] = Field(default_factory=dict, description="Data format requirements")
    
    class Config:
        schema_extra = {
            "example": {
                "reproduction_info": {
                    "created_at": "2023-12-01T10:30:00Z",
                    "purpose": "Model reproduction and replication",
                    "application": "Prophet Web Interface",
                    "instructions": "Upload this file to reproduce the same model configuration"
                },
                "configuration": {
                    "growth": "linear",
                    "seasonality_mode": "additive",
                    "yearly_seasonality": "auto",
                    "weekly_seasonality": "auto",
                    "daily_seasonality": "auto",
                    "horizon": 30,
                    "interval_width": 0.8,
                    "changepoint_prior_scale": 0.05,
                    "seasonality_prior_scale": 10.0,
                    "holidays_prior_scale": 10.0
                },
                "preprocessing_steps": [
                    {"step": "remove_duplicates", "parameters": {}},
                    {"step": "interpolate_missing", "method": "linear"},
                    {"step": "log_transform", "applied": False}
                ],
                "data_requirements": {
                    "columns_required": ["date", "value"],
                    "date_format": "YYYY-MM-DD",
                    "minimum_points": 10,
                    "recommended_points": 100
                }
            }
        }