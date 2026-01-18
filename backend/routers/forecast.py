"""Forecast API endpoints."""
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
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/countries")
async def list_countries() -> list[str]:
    """Get available country codes for built-in holidays."""
    try:
        return get_available_countries()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
