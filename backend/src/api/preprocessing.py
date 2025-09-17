"""Data preprocessing API endpoints with session-based processing."""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
import pandas as pd
from pydantic import BaseModel, Field

from ..services.data_preprocessor import data_preprocessor
from ..services.session_manager import session_manager
from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/preprocessing", tags=["preprocessing"])


class CleaningOptions(BaseModel):
    """Options for data cleaning operations."""

    remove_duplicates: bool = False
    missing_values_strategy: str = Field(
        default="none",
        description="Strategy for handling missing values: none, drop_rows, drop_columns, interpolate, forward_fill, backward_fill, mean_fill, median_fill"
    )
    missing_threshold: float = Field(default=0.5, ge=0.0, le=1.0, description="Threshold for dropping columns with missing values")
    interpolation_method: str = Field(default="linear", description="Method for interpolation: linear, polynomial, spline")
    remove_outliers: bool = False
    outlier_columns: List[str] = Field(default_factory=list, description="Columns to check for outliers")
    outlier_method: str = Field(default="iqr", description="Method for outlier detection: iqr, zscore, percentile")
    remove_empty_rows: bool = False


class TransformationOptions(BaseModel):
    """Options for data transformation operations."""

    log_transform_columns: List[str] = Field(default_factory=list, description="Columns to apply log transformation")
    differencing_columns: List[str] = Field(default_factory=list, description="Columns to apply differencing")
    sqrt_transform_columns: List[str] = Field(default_factory=list, description="Columns to apply square root transformation")
    boxcox_transform_columns: List[str] = Field(default_factory=list, description="Columns to apply Box-Cox transformation")


class ProphetValidationRequest(BaseModel):
    """Request for Prophet validation."""

    date_column: str = Field(description="Name of the date column")
    value_column: str = Field(description="Name of the value column")


class PreprocessingResponse(BaseModel):
    """Response for preprocessing operations."""

    success: bool
    message: str
    session_id: str
    operation_report: Dict[str, Any]
    data_preview: Dict[str, Any] = None


class ValidationResponse(BaseModel):
    """Response for Prophet validation."""

    success: bool
    session_id: str
    validation_result: Dict[str, Any]


class DownloadResponse(BaseModel):
    """Response for download preparation."""

    success: bool
    session_id: str
    download_data: Dict[str, Any]


@router.post("/clean", response_model=PreprocessingResponse)
async def clean_data(
    session_id: str,
    cleaning_options: CleaningOptions
) -> PreprocessingResponse:
    """Clean data in the session using specified options.
    
    This endpoint performs data cleaning operations including:
    - Removing duplicate rows
    - Handling missing values (various strategies)
    - Removing outliers
    - Removing empty rows
    
    All operations are performed in memory and results are stored in the session.
    """
    with MemoryTracker("clean_data_endpoint"):
        try:
            # Get session and validate
            session = session_manager.get_session(session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Session not found or expired")

            # Get uploaded data
            file_data = session.get_data('uploaded_file_data')
            if file_data is None:
                raise HTTPException(status_code=404, detail="No data found in session to clean")

            # Convert to DataFrame
            df = pd.DataFrame(file_data['data'])
            df.columns = file_data['columns']

            # Restore original data types
            if 'dtypes' in file_data:
                for col, dtype_str in file_data['dtypes'].items():
                    if col in df.columns:
                        try:
                            if 'float' in dtype_str or 'int' in dtype_str:
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                            elif 'datetime' in dtype_str:
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                        except Exception:
                            pass  # Keep original type if conversion fails

            logger.info("Starting data cleaning for session %s with options: %s", session_id, cleaning_options.model_dump())

            # Perform cleaning
            cleaned_df, cleaning_report = data_preprocessor.clean_data(
                df,
                cleaning_options.model_dump()
            )

            # Store cleaned data back to session
            cleaned_data = {
                'columns': list(cleaned_df.columns),
                'data': cleaned_df.fillna('').to_dict('records'),
                'dtypes': {col: str(dtype) for col, dtype in cleaned_df.dtypes.items()}
            }

            session.store_data('cleaned_file_data', cleaned_data)
            session.store_data('cleaning_report', cleaning_report)

            # Create data preview
            preview_rows = cleaned_data['data'][:10]
            data_preview = {
                'columns': cleaned_data['columns'],
                'rows': preview_rows,
                'total_rows': len(cleaned_data['data']),
                'showing_rows': len(preview_rows)
            }

            # Clean up DataFrame from memory
            del df, cleaned_df

            logger.info(
                "Data cleaning completed for session %s: %d -> %d rows, operations: %s",
                session_id,
                cleaning_report['rows_before'],
                cleaning_report['rows_after'],
                cleaning_report['operations_performed']
            )

            return PreprocessingResponse(
                success=True,
                message=f"Data cleaning completed. {len(cleaning_report['operations_performed'])} operations performed.",
                session_id=session_id,
                operation_report=cleaning_report,
                data_preview=data_preview
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Data cleaning failed for session %s: %s", session_id, str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Data cleaning failed: {str(e)}"
            ) from e


@router.post("/transform", response_model=PreprocessingResponse)
async def transform_data(
    session_id: str,
    transformation_options: TransformationOptions
) -> PreprocessingResponse:
    """Transform data in the session using specified options.
    
    This endpoint performs data transformations including:
    - Log transformation
    - Differencing
    - Square root transformation
    - Box-Cox transformation
    
    All operations are performed in memory and results are stored in the session.
    """
    with MemoryTracker("transform_data_endpoint"):
        try:
            # Get session and validate
            session = session_manager.get_session(session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Session not found or expired")

            # Get data (prefer cleaned data if available, otherwise use original)
            file_data = session.get_data('cleaned_file_data') or session.get_data('uploaded_file_data')
            if file_data is None:
                raise HTTPException(status_code=404, detail="No data found in session to transform")

            # Convert to DataFrame
            df = pd.DataFrame(file_data['data'])
            df.columns = file_data['columns']

            # Restore original data types
            if 'dtypes' in file_data:
                for col, dtype_str in file_data['dtypes'].items():
                    if col in df.columns:
                        try:
                            if 'float' in dtype_str or 'int' in dtype_str:
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                            elif 'datetime' in dtype_str:
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                        except Exception:
                            pass  # Keep original type if conversion fails

            logger.info("Starting data transformation for session %s with options: %s", session_id, transformation_options.model_dump())

            # Perform transformation
            transformed_df, transformation_report = data_preprocessor.transform_data(
                df,
                transformation_options.model_dump()
            )

            # Store transformed data back to session
            transformed_data = {
                'columns': list(transformed_df.columns),
                'data': transformed_df.fillna('').to_dict('records'),
                'dtypes': {col: str(dtype) for col, dtype in transformed_df.dtypes.items()}
            }

            session.store_data('transformed_file_data', transformed_data)
            session.store_data('transformation_report', transformation_report)

            # Create data preview
            preview_rows = transformed_data['data'][:10]
            data_preview = {
                'columns': transformed_data['columns'],
                'rows': preview_rows,
                'total_rows': len(transformed_data['data']),
                'showing_rows': len(preview_rows)
            }

            # Clean up DataFrame from memory
            del df, transformed_df

            logger.info(
                "Data transformation completed for session %s: %d transformations applied, %d new columns created",
                session_id,
                len(transformation_report['transformations_applied']),
                len(transformation_report['new_columns'])
            )

            return PreprocessingResponse(
                success=True,
                message=f"Data transformation completed. {len(transformation_report['transformations_applied'])} transformations applied.",
                session_id=session_id,
                operation_report=transformation_report,
                data_preview=data_preview
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Data transformation failed for session %s: %s", session_id, str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Data transformation failed: {str(e)}"
            ) from e


@router.post("/validate-prophet", response_model=ValidationResponse)
async def validate_for_prophet(
    session_id: str,
    validation_request: ProphetValidationRequest
) -> ValidationResponse:
    """Validate data for Prophet forecasting requirements.
    
    This endpoint checks if the data meets Prophet's requirements:
    - Proper date column format
    - Numeric value column
    - Sufficient data points
    - Data quality checks
    - Frequency analysis
    
    Returns detailed validation results and recommendations.
    """
    with MemoryTracker("validate_prophet_endpoint"):
        try:
            # Get session and validate
            session = session_manager.get_session(session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Session not found or expired")

            # Get data (prefer transformed > cleaned > original)
            file_data = (
                session.get_data('transformed_file_data') or
                session.get_data('cleaned_file_data') or
                session.get_data('uploaded_file_data')
            )
            if file_data is None:
                raise HTTPException(status_code=404, detail="No data found in session to validate")

            # Convert to DataFrame
            df = pd.DataFrame(file_data['data'])
            df.columns = file_data['columns']

            # Restore original data types
            if 'dtypes' in file_data:
                for col, dtype_str in file_data['dtypes'].items():
                    if col in df.columns:
                        try:
                            if 'float' in dtype_str or 'int' in dtype_str:
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                            elif 'datetime' in dtype_str:
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                        except Exception:
                            pass  # Keep original type if conversion fails

            logger.info(
                "Starting Prophet validation for session %s: date_column=%s, value_column=%s",
                session_id, validation_request.date_column, validation_request.value_column
            )

            # Perform Prophet validation
            validation_result = data_preprocessor.validate_for_prophet(
                df,
                validation_request.date_column,
                validation_request.value_column
            )

            # Store validation results in session
            session.store_data('prophet_validation', validation_result)
            session.store_data('prophet_columns', {
                'date_column': validation_request.date_column,
                'value_column': validation_request.value_column
            })

            # Clean up DataFrame from memory
            del df

            logger.info(
                "Prophet validation completed for session %s: valid=%s, ready=%s, errors=%d, warnings=%d",
                session_id,
                validation_result['is_valid'],
                validation_result['prophet_ready'],
                len(validation_result['errors']),
                len(validation_result['warnings'])
            )

            return ValidationResponse(
                success=True,
                session_id=session_id,
                validation_result=validation_result
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Prophet validation failed for session %s: %s", session_id, str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Prophet validation failed: {str(e)}"
            ) from e


@router.get("/download/{session_id}", response_model=DownloadResponse)
async def prepare_download(session_id: str) -> DownloadResponse:
    """Prepare processed data for client-side download.
    
    This endpoint prepares the most recent processed data (transformed > cleaned > original)
    for download by the client. The data is formatted for CSV, JSON, or Excel export.
    
    Returns download-ready data with metadata about processing history.
    """
    with MemoryTracker("prepare_download_endpoint"):
        try:
            # Get session and validate
            session = session_manager.get_session(session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Session not found or expired")

            # Get the most recent processed data
            file_data = None
            processing_metadata = {}

            # Check for transformed data first
            if session.get_data('transformed_file_data'):
                file_data = session.get_data('transformed_file_data')
                processing_metadata['transformation_report'] = session.get_data('transformation_report')
                processing_metadata['processing_level'] = 'transformed'

            # Then check for cleaned data
            elif session.get_data('cleaned_file_data'):
                file_data = session.get_data('cleaned_file_data')
                processing_metadata['cleaning_report'] = session.get_data('cleaning_report')
                processing_metadata['processing_level'] = 'cleaned'

            # Finally use original data
            elif session.get_data('uploaded_file_data'):
                file_data = session.get_data('uploaded_file_data')
                processing_metadata['processing_level'] = 'original'

            if file_data is None:
                raise HTTPException(status_code=404, detail="No data found in session to download")

            # Convert to DataFrame for processing
            df = pd.DataFrame(file_data['data'])
            df.columns = file_data['columns']

            # Restore original data types
            if 'dtypes' in file_data:
                for col, dtype_str in file_data['dtypes'].items():
                    if col in df.columns:
                        try:
                            if 'float' in dtype_str or 'int' in dtype_str:
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                            elif 'datetime' in dtype_str:
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                        except Exception:
                            pass  # Keep original type if conversion fails

            # Add additional metadata
            processing_metadata.update({
                'file_metadata': session.get_data('file_metadata'),
                'column_info': session.get_data('column_info'),
                'data_quality_assessment': session.get_data('data_quality_assessment'),
                'prophet_validation': session.get_data('prophet_validation'),
                'prophet_columns': session.get_data('prophet_columns')
            })

            logger.info("Preparing download for session %s: %s data with %d rows, %d columns",
                       session_id, processing_metadata['processing_level'], len(df), len(df.columns))

            # Prepare download data
            download_data = data_preprocessor.prepare_for_download(df, processing_metadata)

            # Clean up DataFrame from memory
            del df

            logger.info("Download preparation completed for session %s", session_id)

            return DownloadResponse(
                success=True,
                session_id=session_id,
                download_data=download_data
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Download preparation failed for session %s: %s", session_id, str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Download preparation failed: {str(e)}"
            ) from e


@router.get("/session/{session_id}/processing-history")
async def get_processing_history(session_id: str) -> Dict[str, Any]:
    """Get the processing history for a session.
    
    Returns information about all preprocessing operations performed
    on the data in this session.
    """
    with MemoryTracker("get_processing_history"):
        try:
            # Get session and validate
            session = session_manager.get_session(session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Session not found or expired")

            # Collect processing history
            history = {
                'session_id': session_id,
                'has_original_data': session.get_data('uploaded_file_data') is not None,
                'has_cleaned_data': session.get_data('cleaned_file_data') is not None,
                'has_transformed_data': session.get_data('transformed_file_data') is not None,
                'cleaning_report': session.get_data('cleaning_report'),
                'transformation_report': session.get_data('transformation_report'),
                'prophet_validation': session.get_data('prophet_validation'),
                'prophet_columns': session.get_data('prophet_columns')
            }

            # Determine current data state
            if history['has_transformed_data']:
                history['current_state'] = 'transformed'
            elif history['has_cleaned_data']:
                history['current_state'] = 'cleaned'
            elif history['has_original_data']:
                history['current_state'] = 'original'
            else:
                history['current_state'] = 'no_data'

            return history

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to get processing history for session %s: %s", session_id, str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get processing history: {str(e)}"
            ) from e


@router.delete("/session/{session_id}/processed-data")
async def clear_processed_data(session_id: str) -> Dict[str, Any]:
    """Clear processed data from session, keeping only original uploaded data.
    
    This allows users to start over with preprocessing while keeping
    the original uploaded file data.
    """
    with MemoryTracker("clear_processed_data"):
        try:
            # Get session and validate
            session = session_manager.get_session(session_id)
            if session is None:
                raise HTTPException(status_code=404, detail="Session not found or expired")

            # Remove processed data
            removed_items = []
            for key in ['cleaned_file_data', 'transformed_file_data', 'cleaning_report',
                       'transformation_report', 'prophet_validation', 'prophet_columns']:
                if session.remove_data(key):
                    removed_items.append(key)

            logger.info("Cleared processed data from session %s: %s", session_id, removed_items)

            return {
                'success': True,
                'message': 'Processed data cleared successfully',
                'removed_items': removed_items,
                'original_data_preserved': session.get_data('uploaded_file_data') is not None
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to clear processed data for session %s: %s", session_id, str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Failed to clear processed data: {str(e)}"
            ) from e


@router.get("/options")
async def get_preprocessing_options() -> Dict[str, Any]:
    """Get available preprocessing options and their descriptions.
    
    Returns information about all available cleaning and transformation
    options that can be used with the preprocessing endpoints.
    """
    return {
        'cleaning_options': {
            'remove_duplicates': {
                'description': 'Remove duplicate rows from the dataset',
                'type': 'boolean',
                'default': False
            },
            'missing_values_strategy': {
                'description': 'Strategy for handling missing values',
                'type': 'string',
                'options': ['none', 'drop_rows', 'drop_columns', 'interpolate', 'forward_fill', 'backward_fill', 'mean_fill', 'median_fill'],
                'default': 'none'
            },
            'missing_threshold': {
                'description': 'Threshold for dropping columns with missing values (0.0-1.0)',
                'type': 'float',
                'range': [0.0, 1.0],
                'default': 0.5
            },
            'interpolation_method': {
                'description': 'Method for interpolation when using interpolate strategy',
                'type': 'string',
                'options': ['linear', 'polynomial', 'spline'],
                'default': 'linear'
            },
            'remove_outliers': {
                'description': 'Remove outliers from specified columns',
                'type': 'boolean',
                'default': False
            },
            'outlier_method': {
                'description': 'Method for outlier detection',
                'type': 'string',
                'options': ['iqr', 'zscore', 'percentile'],
                'default': 'iqr'
            },
            'remove_empty_rows': {
                'description': 'Remove completely empty rows',
                'type': 'boolean',
                'default': False
            }
        },
        'transformation_options': {
            'log_transform_columns': {
                'description': 'Apply log transformation to specified columns',
                'type': 'array',
                'items': 'string',
                'default': []
            },
            'differencing_columns': {
                'description': 'Apply first-order differencing to specified columns',
                'type': 'array',
                'items': 'string',
                'default': []
            },
            'sqrt_transform_columns': {
                'description': 'Apply square root transformation to specified columns',
                'type': 'array',
                'items': 'string',
                'default': []
            },
            'boxcox_transform_columns': {
                'description': 'Apply Box-Cox transformation to specified columns',
                'type': 'array',
                'items': 'string',
                'default': []
            }
        },
        'prophet_validation': {
            'description': 'Validate data for Prophet forecasting requirements',
            'required_fields': ['date_column', 'value_column'],
            'checks_performed': [
                'Date column format validation',
                'Numeric value column validation',
                'Minimum data points check',
                'Duplicate dates detection',
                'Missing values analysis',
                'Data frequency analysis',
                'Outlier detection',
                'Prophet model compatibility test'
            ]
        }
    }
