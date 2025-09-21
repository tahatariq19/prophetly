"""File upload API endpoints."""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..services.data_quality import data_quality_service
from ..services.file_processor import file_processor
from ..services.session_manager import session_manager
from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])


class UploadResponse(BaseModel):
    """Response for file upload operations."""

    success: bool
    message: str
    session_id: str
    file_info: Dict[str, Any]
    column_info: Dict[str, Any]
    data_quality: Dict[str, Any]
    data_preview: Optional[Dict[str, Any]] = None


class UploadError(BaseModel):
    """Error response for upload failures."""

    success: bool = False
    error: str
    details: Optional[str] = None


@router.post("/csv", response_model=UploadResponse)
async def upload_csv_file(
    file: UploadFile = File(..., description="CSV file to upload and process"),
    session_id: Optional[str] = None,
) -> UploadResponse:
    """Upload and process a CSV file with immediate in-memory processing.

    This endpoint:
    1. Validates the uploaded file (size, format, security)
    2. Parses CSV with automatic encoding detection
    3. Performs data quality assessment
    4. Stores processed data in session memory (temporary)
    5. Returns file metadata and column information

    File is processed entirely in memory and never written to disk.
    Data is automatically cleaned up when session expires.
    """
    with MemoryTracker("upload_csv_file"):
        try:
            # Create session if not provided
            if session_id is None:
                session_id = session_manager.create_session()
                logger.info("Created new session %s for file upload", session_id)
            else:
                # Validate existing session
                session = session_manager.get_session(session_id)
                if session is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Session not found or expired. Please create a new session.",
                    )

            # Process the uploaded file
            logger.info("Processing file upload for session: %s", session_id)

            processing_result = await file_processor.process_upload(file)

            # Store processed data in session
            session = session_manager.get_session(session_id)
            if session is None:
                raise HTTPException(status_code=500, detail="Session lost during processing")

            # Convert data dict back to DataFrame for quality assessment
            import pandas as pd

            df = pd.DataFrame(processing_result["data"]["data"])
            df.columns = processing_result["data"]["columns"]

            # Perform data quality assessment
            logger.info("Performing data quality assessment for session: %s", session_id)
            quality_assessment = data_quality_service.assess_data_quality(
                df, processing_result["column_info"]
            )

            # Store the processed data and quality assessment
            session.store_data("uploaded_file_data", processing_result["data"])
            session.store_data("file_metadata", processing_result["metadata"])
            session.store_data("column_info", processing_result["column_info"])
            session.store_data("data_quality_assessment", quality_assessment)

            # Clean up DataFrame from memory
            del df

            # Create data preview (first 10 rows)
            data_preview = None
            if processing_result["data"]["data"]:
                preview_rows = processing_result["data"]["data"][:10]
                data_preview = {
                    "columns": processing_result["data"]["columns"],
                    "rows": preview_rows,
                    "total_rows": len(processing_result["data"]["data"]),
                    "showing_rows": len(preview_rows),
                }

            logger.info(
                "Successfully processed file %s: %d rows, %d columns, quality score: %d",
                file.filename,
                processing_result["metadata"]["rows"],
                processing_result["metadata"]["columns"],
                quality_assessment["overall_quality"]["score"],
            )

            return UploadResponse(
                success=True,
                message=processing_result["message"],
                session_id=session_id,
                file_info=processing_result["metadata"],
                column_info=processing_result["column_info"],
                data_quality=quality_assessment,
                data_preview=data_preview,
            )

        except HTTPException:
            # Re-raise HTTP exceptions (validation errors, etc.)
            raise
        except Exception as e:
            logger.error("Unexpected error during file upload: %s", str(e))
            raise HTTPException(
                status_code=500, detail="An unexpected error occurred during file processing"
            ) from e


@router.get("/session/{session_id}/file-info")
async def get_file_info(session_id: str) -> Dict[str, Any]:
    """Get information about the uploaded file in the session.

    Returns file metadata, column information, and basic statistics
    without returning the actual data (for privacy and performance).
    """
    with MemoryTracker("get_file_info"):
        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        file_metadata = session.get_data("file_metadata")
        column_info = session.get_data("column_info")

        if file_metadata is None:
            raise HTTPException(status_code=404, detail="No file uploaded in this session")

        return {
            "session_id": session_id,
            "file_metadata": file_metadata,
            "column_info": column_info,
        }


@router.get("/session/{session_id}/data-quality")
async def get_data_quality_assessment(session_id: str) -> Dict[str, Any]:
    """Get comprehensive data quality assessment for the uploaded file.

    Returns detailed analysis including:
    - Overall quality score and grade
    - Missing value analysis
    - Outlier detection
    - Data distribution analysis
    - Time series readiness checks
    - Column-specific analysis
    - Actionable recommendations
    """
    with MemoryTracker("get_data_quality_assessment"):
        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        quality_assessment = session.get_data("data_quality_assessment")
        if quality_assessment is None:
            raise HTTPException(
                status_code=404, detail="No data quality assessment found in this session"
            )

        return {
            "session_id": session_id,
            "assessment": quality_assessment,
        }


@router.get("/session/{session_id}/data-preview")
async def get_data_preview(session_id: str, rows: int = 10, offset: int = 0) -> Dict[str, Any]:
    """Get a preview of the uploaded data.

    Args:
        session_id: Session identifier
        rows: Number of rows to return (max 100)
        offset: Starting row offset

    Returns:
        Preview of the data with specified rows and columns

    """
    with MemoryTracker("get_data_preview"):
        # Validate parameters
        if rows > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 rows allowed per request")
        if rows < 1:
            raise HTTPException(status_code=400, detail="Rows parameter must be positive")
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset parameter must be non-negative")

        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        file_data = session.get_data("uploaded_file_data")
        if file_data is None:
            raise HTTPException(status_code=404, detail="No file data found in session")

        # Extract requested rows
        all_rows = file_data["data"]
        total_rows = len(all_rows)

        if offset >= total_rows:
            return {
                "columns": file_data["columns"],
                "rows": [],
                "total_rows": total_rows,
                "showing_rows": 0,
                "offset": offset,
                "has_more": False,
            }

        end_index = min(offset + rows, total_rows)
        preview_rows = all_rows[offset:end_index]

        return {
            "columns": file_data["columns"],
            "rows": preview_rows,
            "total_rows": total_rows,
            "showing_rows": len(preview_rows),
            "offset": offset,
            "has_more": end_index < total_rows,
        }


@router.delete("/session/{session_id}/file-data")
async def clear_file_data(session_id: str) -> Dict[str, Any]:
    """Clear uploaded file data from session memory.

    This endpoint allows users to manually clear their uploaded data
    from memory before the session expires.
    """
    with MemoryTracker("clear_file_data"):
        session = session_manager.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found or expired")

        # Remove file-related data
        removed_items = []
        for key in [
            "uploaded_file_data",
            "file_metadata",
            "column_info",
            "data_quality_assessment",
        ]:
            if session.remove_data(key):
                removed_items.append(key)

        if not removed_items:
            return {"success": True, "message": "No file data found to clear", "removed_items": []}

        logger.info("Cleared file data from session %s: %s", session_id, removed_items)

        return {
            "success": True,
            "message": "Successfully cleared file data from session memory",
            "removed_items": removed_items,
        }


@router.get("/limits")
async def get_upload_limits() -> Dict[str, Any]:
    """Get current upload limits and constraints.

    Returns information about file size limits, supported formats,
    and other constraints for file uploads.
    """
    return {
        "max_file_size_mb": file_processor.MAX_FILE_SIZE / (1024 * 1024),
        "max_rows": file_processor.MAX_ROWS,
        "max_columns": file_processor.MAX_COLUMNS,
        "allowed_extensions": list(file_processor.ALLOWED_EXTENSIONS),
        "supported_encodings": file_processor.ENCODING_CANDIDATES,
    }
