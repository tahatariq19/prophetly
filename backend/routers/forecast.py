"""Forecast API endpoints."""
import logging
from fastapi import APIRouter, HTTPException, Request
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
from limiter import limiter

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/forecast", response_model=ForecastResponse)
@limiter.limit("5/minute")
def create_forecast(request: Request, body: ForecastRequest) -> ForecastResponse:
    """Generate a Prophet forecast."""
    try:
        # Validate data size (free tier limit)
        if len(body.data) > 50000:
            raise HTTPException(
                status_code=400,
                detail="Dataset too large. Maximum 50,000 rows allowed."
            )
        
        # Validate MCMC samples (free tier limit)
        if body.config.mcmc_samples > 100:
            raise HTTPException(
                status_code=400,
                detail="MCMC samples limited to 100 on free tier."
            )
        
        # Validate country holidays
        if body.config.country_holidays:
            available_countries = get_available_countries()
            if body.config.country_holidays not in available_countries:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid country code: {body.config.country_holidays}. Use /api/countries to see available codes."
                )

        result = generate_forecast(
            data=body.data,
            config=body.config,
            periods=body.periods,
            freq=body.freq,
            regressor_data=body.regressor_data,
            future_regressor_data=body.future_regressor_data,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating forecast: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/cross-validate", response_model=CrossValidationResponse)
@limiter.limit("2/minute")
def cross_validate(request: Request, body: CrossValidationRequest) -> CrossValidationResponse:
    """Run cross-validation on a Prophet model."""
    try:
        # Validate data size
        if len(body.data) > 50000:
            raise HTTPException(
                status_code=400,
                detail="Dataset too large. Maximum 50,000 rows allowed."
            )
        
        # Validate country holidays
        if body.config.country_holidays:
            available_countries = get_available_countries()
            if body.config.country_holidays not in available_countries:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid country code: {body.config.country_holidays}. Use /api/countries to see available codes."
                )

        result = run_cross_validation(
            data=body.data,
            config=body.config,
            initial=body.initial,
            period=body.period,
            horizon=body.horizon,
            regressor_data=body.regressor_data,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running cross-validation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/countries")
def list_countries(request: Request) -> list[str]:
    """Get available country codes for built-in holidays."""
    try:
        return get_available_countries()
    except Exception as e:
        logger.error(f"Error listing countries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
