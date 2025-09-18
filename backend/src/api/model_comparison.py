"""Model comparison API endpoints for Prophet forecasting."""

import gc
import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status

from ..models.model_comparison import (
    ModelComparisonRequest,
    ModelComparisonResult,
    ModelComparisonSummary,
    ModelResult
)
from ..services.model_comparison_service import model_comparison_service
from ..services.session_manager import session_manager
from ..utils.memory import MemoryTracker

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/model-comparison", tags=["model-comparison"])


@router.post("/store-result", response_model=Dict[str, str])
async def store_model_result(
    session_id: str,
    model_name: Optional[str] = None,
    config_json: Optional[str] = None,
    forecast_data: Optional[Dict[str, Any]] = None,
    components: Optional[Dict[str, Any]] = None,
    cv_metrics: Optional[Dict[str, float]] = None,
    training_metrics: Optional[Dict[str, float]] = None,
    processing_time_seconds: Optional[float] = None,
    data_points: Optional[int] = None
) -> Dict[str, str]:
    """Store a model result for comparison within a session.
    
    This endpoint stores forecast results in memory for comparison:
    1. Validates session exists
    2. Stores model configuration and results
    3. Returns model ID for future reference
    4. Automatically cleans up when session expires
    
    Args:
        session_id: Session identifier
        model_name: Human-readable model name
        config_json: Prophet configuration as JSON string
        forecast_data: Forecast results as dictionary
        components: Component decomposition as dictionary
        cv_metrics: Cross-validation metrics
        training_metrics: Training performance metrics
        processing_time_seconds: Total processing time
        data_points: Number of training data points
        
    Returns:
        Dictionary with model_id for the stored result
        
    Raises:
        HTTPException: If session not found or storage fails
    """
    with MemoryTracker("store_model_result"):
        try:
            logger.info(f"Storing model result for session {session_id}")

            # Validate session exists
            session_data = session_manager.get_session(session_id)
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found or expired"
                )

            # Parse configuration if provided
            config = None
            if config_json:
                try:
                    from ..models.prophet_config import ForecastConfig
                    config = ForecastConfig.from_json(config_json)
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid configuration JSON: {str(e)}"
                    )

            # Store the model result
            model_id = model_comparison_service.store_model_result(
                session_id=session_id,
                name=model_name,
                config=config,
                forecast_data=None,  # Will be converted from dict if provided
                components=None,     # Will be converted from dict if provided
                cv_metrics=cv_metrics,
                training_metrics=training_metrics,
                processing_time_seconds=processing_time_seconds,
                data_points=data_points
            )

            logger.info(f"Model result stored with ID: {model_id}")
            return {"model_id": model_id}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to store model result: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store model result: {str(e)}"
            )


@router.get("/session/{session_id}/models", response_model=List[Dict[str, Any]])
async def get_session_models(session_id: str) -> List[Dict[str, Any]]:
    """Get all models stored in a session for comparison.
    
    Args:
        session_id: Session identifier
        
    Returns:
        List of model summaries with basic information
        
    Raises:
        HTTPException: If session not found
    """
    try:
        logger.info(f"Retrieving models for session {session_id}")

        # Validate session exists
        session_data = session_manager.get_session(session_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired"
            )

        # Get models from comparison service
        models = model_comparison_service.get_session_models(session_id)

        # Return summary information (not full data)
        model_summaries = []
        for model in models:
            summary = {
                "model_id": model.model_id,
                "name": model.name,
                "created_at": model.created_at.isoformat(),
                "processing_time_seconds": model.processing_time_seconds,
                "data_points": model.data_points,
                "has_cv_metrics": model.cv_metrics is not None,
                "has_training_metrics": model.training_metrics is not None,
                "has_forecast_data": model.forecast_data is not None,
                "has_components": model.components is not None
            }
            
            # Add configuration summary if available
            if model.config:
                config_summary = model.config.get_summary()
                summary["config_summary"] = config_summary

            model_summaries.append(summary)

        logger.info(f"Retrieved {len(model_summaries)} models for session {session_id}")
        return model_summaries

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve session models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session models: {str(e)}"
        )


@router.post("/compare", response_model=ModelComparisonResult)
async def compare_models(request: ModelComparisonRequest) -> ModelComparisonResult:
    """Compare multiple models within a session.
    
    This endpoint performs comprehensive model comparison:
    1. Validates session and model availability
    2. Compares parameters between models
    3. Compares performance metrics
    4. Optionally compares forecast data
    5. Returns detailed comparison results
    
    Args:
        request: Model comparison request with session ID and model IDs
        
    Returns:
        ModelComparisonResult with detailed comparison analysis
        
    Raises:
        HTTPException: If session/models not found or comparison fails
    """
    with MemoryTracker("compare_models"):
        try:
            logger.info(f"Comparing {len(request.model_ids)} models in session {request.session_id}")

            # Validate session exists
            session_data = session_manager.get_session(request.session_id)
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found or expired"
                )

            # Validate minimum models for comparison
            if len(request.model_ids) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least 2 models required for comparison"
                )

            # Perform comparison
            comparison_result = model_comparison_service.compare_models(request)

            if not comparison_result.success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=comparison_result.message
                )

            logger.info(f"Model comparison completed successfully")
            return comparison_result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Model comparison failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Model comparison failed: {str(e)}"
            )


@router.post("/compare/summary", response_model=ModelComparisonSummary)
async def get_comparison_summary(request: ModelComparisonRequest) -> ModelComparisonSummary:
    """Get a summary of model comparison results.
    
    This endpoint provides a quick overview of model differences:
    1. Performs model comparison
    2. Generates summary with key insights
    3. Provides recommendations
    
    Args:
        request: Model comparison request
        
    Returns:
        ModelComparisonSummary with key insights and recommendations
        
    Raises:
        HTTPException: If comparison fails
    """
    try:
        logger.info(f"Generating comparison summary for session {request.session_id}")

        # Perform full comparison first
        comparison_result = await compare_models(request)

        # Generate summary
        summary = model_comparison_service.get_comparison_summary(comparison_result)

        logger.info("Comparison summary generated successfully")
        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate comparison summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate comparison summary: {str(e)}"
        )


@router.get("/session/{session_id}/model/{model_id}", response_model=Dict[str, Any])
async def get_model_details(session_id: str, model_id: str) -> Dict[str, Any]:
    """Get detailed information about a specific model.
    
    Args:
        session_id: Session identifier
        model_id: Model identifier
        
    Returns:
        Dictionary with detailed model information
        
    Raises:
        HTTPException: If session or model not found
    """
    try:
        logger.info(f"Retrieving details for model {model_id} in session {session_id}")

        # Validate session exists
        session_data = session_manager.get_session(session_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired"
            )

        # Get model details
        model = model_comparison_service.get_model_by_id(session_id, model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model {model_id} not found in session"
            )

        # Return detailed information
        details = {
            "model_id": model.model_id,
            "name": model.name,
            "created_at": model.created_at.isoformat(),
            "processing_time_seconds": model.processing_time_seconds,
            "data_points": model.data_points,
            "cv_metrics": model.cv_metrics.model_dump() if model.cv_metrics else None,
            "training_metrics": model.training_metrics,
            "has_forecast_data": model.forecast_data is not None,
            "has_components": model.components is not None
        }

        # Add configuration details if available
        if model.config:
            details["config"] = model.config.model_dump()

        # Add forecast data summary if available
        if model.forecast_data:
            forecast_summary = {
                "columns": list(model.forecast_data.keys()),
                "data_points": len(next(iter(model.forecast_data.values()), [])),
                "date_range": {
                    "start": min(model.forecast_data.get('ds', [])) if 'ds' in model.forecast_data else None,
                    "end": max(model.forecast_data.get('ds', [])) if 'ds' in model.forecast_data else None
                }
            }
            details["forecast_summary"] = forecast_summary

        # Add components summary if available
        if model.components:
            components_summary = {
                "component_names": list(model.components.keys()),
                "component_count": len(model.components)
            }
            details["components_summary"] = components_summary

        logger.info(f"Retrieved details for model {model_id}")
        return details

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve model details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve model details: {str(e)}"
        )


@router.delete("/session/{session_id}/model/{model_id}")
async def delete_model(session_id: str, model_id: str) -> Dict[str, str]:
    """Delete a specific model from session storage.
    
    Args:
        session_id: Session identifier
        model_id: Model identifier
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If session or model not found
    """
    try:
        logger.info(f"Deleting model {model_id} from session {session_id}")

        # Validate session exists
        session_data = session_manager.get_session(session_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired"
            )

        # Delete the model
        success = model_comparison_service.cleanup_session_models(session_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model {model_id} not found in session"
            )

        # Force garbage collection
        gc.collect()

        logger.info(f"Model {model_id} deleted successfully")
        return {"message": f"Model {model_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {str(e)}"
        )


@router.delete("/session/{session_id}/models")
async def cleanup_session_models(session_id: str) -> Dict[str, str]:
    """Clean up all models for a session.
    
    Args:
        session_id: Session identifier
        
    Returns:
        Success message with cleanup count
        
    Raises:
        HTTPException: If session not found or cleanup fails
    """
    try:
        logger.info(f"Cleaning up all models for session {session_id}")

        # Validate session exists
        session_data = session_manager.get_session(session_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired"
            )

        # Get model count before cleanup
        models = model_comparison_service.get_session_models(session_id)
        model_count = len(models)

        # Cleanup all models
        success = model_comparison_service.cleanup_session_models(session_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cleanup session models"
            )

        logger.info(f"Cleaned up {model_count} models for session {session_id}")
        return {"message": f"Cleaned up {model_count} models successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cleanup session models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup session models: {str(e)}"
        )