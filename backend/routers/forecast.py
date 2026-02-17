"""Forecast API endpoints."""
import logging
from fastapi import APIRouter, HTTPException
from models.schemas import (
    ForecastRequest,
    ForecastResponse,
    CrossValidationRequest,
    CrossValidationResponse,
)
from services.prophet_service import (
    generate_forecast,
    run_cross_validation,
    get_available_countries,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/forecast", response_model=ForecastResponse)
async def create_forecast(request: ForecastRequest) -> ForecastResponse:
    """Generate a Prophet forecast."""
    try:
        # Validate data size (free tier limit)
        if len(request.data) > 50000:
            raise HTTPException(
                status_code=400,
                detail="Dataset too large. Maximum 50,000 rows allowed."
            )
        
        # Validate MCMC samples (free tier limit)
        if request.config.mcmc_samples > 100:
            raise HTTPException(
                status_code=400,
                detail="MCMC samples limited to 100 on free tier."
            )
        
        # Validate country holidays
        if request.config.country_holidays:
            available_countries = get_available_countries()
            if request.config.country_holidays not in available_countries:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid country code: {request.config.country_holidays}. Use /api/countries to see available codes."
                )

        result = generate_forecast(
            data=request.data,
            config=request.config,
            periods=request.periods,
            freq=request.freq,
            regressor_data=request.regressor_data,
            future_regressor_data=request.future_regressor_data,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating forecast: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/cross-validate", response_model=CrossValidationResponse)
async def cross_validate(request: CrossValidationRequest) -> CrossValidationResponse:
    """Run cross-validation on a Prophet model."""
    try:
        # Validate data size
        if len(request.data) > 50000:
            raise HTTPException(
                status_code=400,
                detail="Dataset too large. Maximum 50,000 rows allowed."
            )
        
        # Validate country holidays
        if request.config.country_holidays:
            available_countries = get_available_countries()
            if request.config.country_holidays not in available_countries:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid country code: {request.config.country_holidays}. Use /api/countries to see available codes."
                )

        result = run_cross_validation(
            data=request.data,
            config=request.config,
            initial=request.initial,
            period=request.period,
            horizon=request.horizon,
            regressor_data=request.regressor_data,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running cross-validation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/countries")
async def list_countries() -> list[str]:
    """Get available country codes for built-in holidays."""
    try:
        return get_available_countries()
    except Exception as e:
        logger.error(f"Error listing countries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
