"""Privacy-aware error handling utilities for the backend."""

import logging
import traceback
from datetime import datetime
from typing import Any, Dict, Optional, Union
from enum import Enum

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorType(str, Enum):
    """Error type enumeration for categorization."""
    VALIDATION = "validation"
    PROPHET = "prophet"
    FILE_PROCESSING = "file_processing"
    SESSION = "session"
    MEMORY = "memory"
    NETWORK = "network"
    AUTHENTICATION = "authentication"
    RATE_LIMIT = "rate_limit"
    INTERNAL = "internal"


class ErrorSeverity(str, Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PrivacyErrorResponse(BaseModel):
    """Privacy-focused error response model."""
    success: bool = False
    error_type: ErrorType
    message: str
    privacy_message: str
    details: Optional[Dict[str, Any]] = None
    suggestions: Optional[list[str]] = None
    retry_after: Optional[int] = None
    request_id: Optional[str] = None
    timestamp: str


class PrivacyErrorHandler:
    """Privacy-aware error handler that ensures no user data is logged or exposed."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def create_error_response(
        self,
        error: Union[Exception, HTTPException],
        error_type: ErrorType = ErrorType.INTERNAL,
        user_message: Optional[str] = None,
        privacy_message: Optional[str] = None,
        suggestions: Optional[list[str]] = None,
        request_id: Optional[str] = None
    ) -> PrivacyErrorResponse:
        """Create a privacy-focused error response."""
        
        # Default privacy message
        if privacy_message is None:
            privacy_message = "Your data was processed in memory only and has been automatically discarded."
        
        # Determine error details based on type
        if isinstance(error, HTTPException):
            status_code = error.status_code
            message = user_message or error.detail or "An error occurred"
        else:
            status_code = 500
            message = user_message or "An unexpected error occurred"
        
        # Create response
        response = PrivacyErrorResponse(
            error_type=error_type,
            message=message,
            privacy_message=privacy_message,
            suggestions=suggestions or self._get_default_suggestions(error_type),
            request_id=request_id,
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Add retry information for certain error types
        if error_type in [ErrorType.NETWORK, ErrorType.RATE_LIMIT]:
            response.retry_after = self._get_retry_delay(error_type)
        
        # Log error safely (no user data)
        self._log_error_safely(error, error_type, request_id)
        
        return response
    
    def handle_validation_error(
        self,
        error: Exception,
        field_errors: Optional[Dict[str, str]] = None,
        request_id: Optional[str] = None
    ) -> PrivacyErrorResponse:
        """Handle validation errors with field-specific details."""
        
        suggestions = [
            "Check your input format and try again",
            "Ensure all required fields are filled",
            "Verify that numeric values are properly formatted"
        ]
        
        details = {}
        if field_errors:
            details["field_errors"] = field_errors
            suggestions.insert(0, "Review the highlighted fields below")
        
        response = self.create_error_response(
            error=error,
            error_type=ErrorType.VALIDATION,
            user_message="Input validation failed. Please check your data and try again.",
            privacy_message="Invalid data was rejected and not stored on our servers.",
            suggestions=suggestions,
            request_id=request_id
        )
        
        if details:
            response.details = details
        
        return response
    
    def handle_file_processing_error(
        self,
        error: Exception,
        file_info: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> PrivacyErrorResponse:
        """Handle file processing errors."""
        
        # Determine specific error message
        error_msg = str(error).lower()
        
        if "size" in error_msg or "large" in error_msg:
            message = "File too large. Please use a smaller dataset (max 10MB)."
            privacy_msg = "Large file was rejected and not stored on our servers."
            suggestions = [
                "Reduce your dataset size",
                "Split large files into smaller chunks",
                "Remove unnecessary columns or rows"
            ]
        elif "format" in error_msg or "csv" in error_msg:
            message = "Invalid file format. Please upload a CSV file."
            privacy_msg = "Invalid file was rejected and not processed."
            suggestions = [
                "Ensure your file is in CSV format",
                "Check that your file has proper column headers",
                "Verify that data is comma-separated"
            ]
        elif "encoding" in error_msg:
            message = "File encoding not supported. Please save as UTF-8."
            privacy_msg = "File with unsupported encoding was not processed."
            suggestions = [
                "Save your file with UTF-8 encoding",
                "Try opening and re-saving in a text editor",
                "Use a different CSV export option"
            ]
        else:
            message = "File processing failed. Please check your file and try again."
            privacy_msg = "File processing error prevented data storage."
            suggestions = [
                "Verify your file is not corrupted",
                "Try uploading a different file",
                "Check that your file contains valid data"
            ]
        
        response = self.create_error_response(
            error=error,
            error_type=ErrorType.FILE_PROCESSING,
            user_message=message,
            privacy_message=privacy_msg,
            suggestions=suggestions,
            request_id=request_id
        )
        
        # Add safe file info (no actual data)
        if file_info:
            safe_info = {
                "filename": file_info.get("filename", "unknown"),
                "size_mb": file_info.get("size_mb", 0),
                "detected_encoding": file_info.get("encoding", "unknown")
            }
            response.details = {"file_info": safe_info}
        
        return response
    
    def handle_prophet_error(
        self,
        error: Exception,
        config_info: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ) -> PrivacyErrorResponse:
        """Handle Prophet-specific forecasting errors."""
        
        error_msg = str(error).lower()
        
        if "insufficient" in error_msg or "data" in error_msg:
            message = "Insufficient data for forecasting. Please provide more historical data."
            suggestions = [
                "Ensure you have at least 10 data points",
                "Check that your date column is properly formatted",
                "Verify that your value column contains numeric data"
            ]
        elif "seasonality" in error_msg:
            message = "Seasonality configuration error. Please adjust your settings."
            suggestions = [
                "Reduce the number of custom seasonalities",
                "Check seasonality period values",
                "Try using automatic seasonality detection"
            ]
        elif "growth" in error_msg or "capacity" in error_msg:
            message = "Growth model configuration error. Please check your capacity settings."
            suggestions = [
                "Ensure carrying capacity is greater than your maximum values",
                "Check that floor values are less than capacity",
                "Try using linear growth instead of logistic"
            ]
        elif "regressor" in error_msg:
            message = "External regressor error. Please check your additional variables."
            suggestions = [
                "Ensure regressor data covers the forecast period",
                "Check that regressor values are numeric",
                "Verify regressor column names match configuration"
            ]
        else:
            message = "Forecasting failed. Please check your data and configuration."
            suggestions = [
                "Verify your data quality",
                "Try simpler model configuration",
                "Check for missing or invalid values"
            ]
        
        response = self.create_error_response(
            error=error,
            error_type=ErrorType.PROPHET,
            user_message=message,
            privacy_message="Forecasting error prevented model creation. No data was stored.",
            suggestions=suggestions,
            request_id=request_id
        )
        
        # Add safe config info (no actual data)
        if config_info:
            safe_config = {
                "growth_mode": config_info.get("growth", "unknown"),
                "horizon": config_info.get("horizon", 0),
                "seasonality_mode": config_info.get("seasonality_mode", "unknown")
            }
            response.details = {"config_info": safe_config}
        
        return response
    
    def handle_session_error(
        self,
        error: Exception,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> PrivacyErrorResponse:
        """Handle session-related errors."""
        
        error_msg = str(error).lower()
        
        if "expired" in error_msg or "not found" in error_msg:
            message = "Session expired or not found. Please start a new session."
            privacy_msg = "Session data was automatically cleared for privacy protection."
            suggestions = [
                "Start a new session",
                "Upload your data again",
                "Download results before sessions expire"
            ]
        elif "memory" in error_msg:
            message = "Session memory limit exceeded. Please use smaller datasets."
            privacy_msg = "Memory limit protection prevented data processing."
            suggestions = [
                "Use a smaller dataset",
                "Clear unused session data",
                "Process data in smaller chunks"
            ]
        else:
            message = "Session error occurred. Please try again."
            privacy_msg = "Session error prevented processing. No data was stored."
            suggestions = [
                "Refresh the page and try again",
                "Clear browser cache and cookies",
                "Start a new session"
            ]
        
        return self.create_error_response(
            error=error,
            error_type=ErrorType.SESSION,
            user_message=message,
            privacy_message=privacy_msg,
            suggestions=suggestions,
            request_id=request_id
        )
    
    def handle_rate_limit_error(
        self,
        error: Exception,
        retry_after: int = 60,
        request_id: Optional[str] = None
    ) -> PrivacyErrorResponse:
        """Handle rate limiting errors."""
        
        response = self.create_error_response(
            error=error,
            error_type=ErrorType.RATE_LIMIT,
            user_message=f"Too many requests. Please wait {retry_after} seconds before trying again.",
            privacy_message="Rate limiting protects privacy by preventing data accumulation.",
            suggestions=[
                f"Wait {retry_after} seconds before retrying",
                "Reduce the frequency of your requests",
                "Process larger datasets less frequently"
            ],
            request_id=request_id
        )
        
        response.retry_after = retry_after
        return response
    
    def _get_default_suggestions(self, error_type: ErrorType) -> list[str]:
        """Get default suggestions based on error type."""
        
        suggestions_map = {
            ErrorType.VALIDATION: [
                "Check your input format",
                "Ensure all required fields are provided",
                "Verify data types are correct"
            ],
            ErrorType.PROPHET: [
                "Check your data quality",
                "Verify your configuration settings",
                "Try a simpler model configuration"
            ],
            ErrorType.FILE_PROCESSING: [
                "Ensure your file is in CSV format",
                "Check file size (max 10MB)",
                "Verify file is not corrupted"
            ],
            ErrorType.SESSION: [
                "Start a new session",
                "Refresh the page",
                "Clear browser cache"
            ],
            ErrorType.MEMORY: [
                "Use a smaller dataset",
                "Clear unused data",
                "Process in smaller chunks"
            ],
            ErrorType.NETWORK: [
                "Check your internet connection",
                "Try again in a moment",
                "Refresh the page"
            ],
            ErrorType.RATE_LIMIT: [
                "Wait before trying again",
                "Reduce request frequency",
                "Process larger batches less often"
            ],
            ErrorType.INTERNAL: [
                "Try again later",
                "Refresh the page",
                "Contact support if problem persists"
            ]
        }
        
        return suggestions_map.get(error_type, ["Try again later"])
    
    def _get_retry_delay(self, error_type: ErrorType) -> int:
        """Get recommended retry delay in seconds."""
        
        delay_map = {
            ErrorType.NETWORK: 5,
            ErrorType.RATE_LIMIT: 60,
            ErrorType.MEMORY: 30,
            ErrorType.INTERNAL: 10
        }
        
        return delay_map.get(error_type, 5)
    
    def _log_error_safely(
        self,
        error: Exception,
        error_type: ErrorType,
        request_id: Optional[str] = None
    ) -> None:
        """Log error information without exposing user data."""
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_type": error_type.value,
            "error_class": error.__class__.__name__,
            "error_message": str(error)[:200],  # Truncate long messages
            "request_id": request_id,
            # Explicitly exclude any user data or PII
        }
        
        # Log at appropriate level based on error type
        if error_type in [ErrorType.INTERNAL, ErrorType.MEMORY]:
            self.logger.error("Privacy-safe error log: %s", log_data)
        elif error_type in [ErrorType.PROPHET, ErrorType.FILE_PROCESSING]:
            self.logger.warning("Privacy-safe error log: %s", log_data)
        else:
            self.logger.info("Privacy-safe error log: %s", log_data)


# Global error handler instance
privacy_error_handler = PrivacyErrorHandler()


def create_http_exception_handler():
    """Create FastAPI HTTP exception handler with privacy focus."""
    
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """Handle HTTP exceptions with privacy-focused responses."""
        
        request_id = getattr(request.state, 'request_id', None)
        
        # Determine error type based on status code
        if exc.status_code == status.HTTP_400_BAD_REQUEST:
            error_type = ErrorType.VALIDATION
        elif exc.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE:
            error_type = ErrorType.FILE_PROCESSING
        elif exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
            error_type = ErrorType.VALIDATION
        elif exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            error_type = ErrorType.RATE_LIMIT
        elif exc.status_code == status.HTTP_404_NOT_FOUND:
            error_type = ErrorType.SESSION
        else:
            error_type = ErrorType.INTERNAL
        
        # Create privacy-focused error response
        error_response = privacy_error_handler.create_error_response(
            error=exc,
            error_type=error_type,
            request_id=request_id
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response.dict(),
            headers={
                "X-Privacy-Mode": "stateless",
                "X-Data-Processed": "memory-only",
                "X-Request-ID": request_id or "unknown"
            }
        )
    
    return http_exception_handler


def create_general_exception_handler():
    """Create general exception handler for unhandled errors."""
    
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle general exceptions with privacy protection."""
        
        request_id = getattr(request.state, 'request_id', None)
        
        # Create privacy-focused error response
        error_response = privacy_error_handler.create_error_response(
            error=exc,
            error_type=ErrorType.INTERNAL,
            user_message="An unexpected error occurred. Please try again.",
            request_id=request_id
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response.dict(),
            headers={
                "X-Privacy-Mode": "stateless",
                "X-Data-Processed": "memory-only",
                "X-Request-ID": request_id or "unknown"
            }
        )
    
    return general_exception_handler