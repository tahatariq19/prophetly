"""Prophet forecasting service with all features."""
import gc
from typing import Optional
import pandas as pd
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics

from models.schemas import (
    ModelConfig,
    DataPoint,
    Holiday,
    CustomSeasonality,
    Regressor,
    RegressorData,
    ForecastPoint,
    ForecastResponse,
    ComponentData,
    CrossValidationResponse,
    PerformanceMetrics,
)


def _build_dataframe(data: list[DataPoint]) -> pd.DataFrame:
    """Convert data points to Prophet-compatible DataFrame."""
    df = pd.DataFrame([d.model_dump() for d in data])
    df["ds"] = pd.to_datetime(df["ds"])
    return df


def _build_regressor_df(
    regressor_data: Optional[list[RegressorData]], 
    base_df: pd.DataFrame
) -> pd.DataFrame:
    """Merge regressor values into the dataframe."""
    if not regressor_data:
        return base_df
    
    reg_records = []
    for rd in regressor_data:
        record = {"ds": pd.to_datetime(rd.ds)}
        record.update(rd.values)
        reg_records.append(record)
    
    reg_df = pd.DataFrame(reg_records)
    return base_df.merge(reg_df, on="ds", how="left")


def _create_model(config: ModelConfig) -> Prophet:
    """Create and configure a Prophet model."""
    # Limit MCMC samples for free tier (max 100)
    mcmc_samples = min(config.mcmc_samples, 100)
    
    model = Prophet(
        growth=config.growth,
        n_changepoints=config.n_changepoints,
        changepoint_range=config.changepoint_range,
        changepoint_prior_scale=config.changepoint_prior_scale,
        changepoints=config.changepoints,
        yearly_seasonality=config.yearly_seasonality,
        weekly_seasonality=config.weekly_seasonality,
        daily_seasonality=config.daily_seasonality,
        seasonality_mode=config.seasonality_mode,
        seasonality_prior_scale=config.seasonality_prior_scale,
        holidays_prior_scale=config.holidays_prior_scale,
        interval_width=config.interval_width,
        mcmc_samples=mcmc_samples,
    )
    
    # Add country holidays
    if config.country_holidays:
        model.add_country_holidays(country_name=config.country_holidays)
    
    # Add custom holidays
    if config.holidays:
        holidays_df = pd.DataFrame([h.model_dump() for h in config.holidays])
        holidays_df["ds"] = pd.to_datetime(holidays_df["ds"])
        model.holidays = holidays_df
    
    # Add custom seasonalities
    for seasonality in config.custom_seasonalities:
        model.add_seasonality(
            name=seasonality.name,
            period=seasonality.period,
            fourier_order=seasonality.fourier_order,
            prior_scale=seasonality.prior_scale,
            mode=seasonality.mode,
        )
    
    # Add regressors
    for regressor in config.regressors:
        model.add_regressor(
            name=regressor.name,
            prior_scale=regressor.prior_scale,
            standardize=regressor.standardize,
            mode=regressor.mode,
        )
    
    return model


def _extract_components(
    model: Prophet, 
    forecast_df: pd.DataFrame
) -> dict[str, ComponentData]:
    """Extract seasonality and other components from forecast."""
    components = {}
    
    # Trend
    components["trend"] = ComponentData(
        ds=forecast_df["ds"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist(),
        values=forecast_df["trend"].tolist(),
        lower=forecast_df.get("trend_lower", pd.Series()).tolist() or None,
        upper=forecast_df.get("trend_upper", pd.Series()).tolist() or None,
    )
    
    # Yearly seasonality
    if "yearly" in forecast_df.columns:
        components["yearly"] = ComponentData(
            ds=forecast_df["ds"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist(),
            values=forecast_df["yearly"].tolist(),
        )
    
    # Weekly seasonality
    if "weekly" in forecast_df.columns:
        components["weekly"] = ComponentData(
            ds=forecast_df["ds"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist(),
            values=forecast_df["weekly"].tolist(),
        )
    
    # Daily seasonality
    if "daily" in forecast_df.columns:
        components["daily"] = ComponentData(
            ds=forecast_df["ds"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist(),
            values=forecast_df["daily"].tolist(),
        )
    
    # Holidays
    if "holidays" in forecast_df.columns:
        components["holidays"] = ComponentData(
            ds=forecast_df["ds"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist(),
            values=forecast_df["holidays"].tolist(),
        )
    
    # Custom seasonalities
    for col in forecast_df.columns:
        if col not in ["ds", "yhat", "yhat_lower", "yhat_upper", "trend", 
                       "trend_lower", "trend_upper", "yearly", "weekly", 
                       "daily", "holidays", "additive_terms", "additive_terms_lower",
                       "additive_terms_upper", "multiplicative_terms", 
                       "multiplicative_terms_lower", "multiplicative_terms_upper"]:
            if not col.endswith("_lower") and not col.endswith("_upper"):
                components[col] = ComponentData(
                    ds=forecast_df["ds"].dt.strftime("%Y-%m-%d %H:%M:%S").tolist(),
                    values=forecast_df[col].tolist(),
                )
    
    return components


def generate_forecast(
    data: list[DataPoint],
    config: ModelConfig,
    periods: int,
    freq: str,
    regressor_data: Optional[list[RegressorData]] = None,
    future_regressor_data: Optional[list[RegressorData]] = None,
) -> ForecastResponse:
    """Generate a forecast using Prophet."""
    # Build dataframe
    df = _build_dataframe(data)
    df = _build_regressor_df(regressor_data, df)
    
    # Create and fit model
    model = _create_model(config)
    model.fit(df)
    
    # Create future dataframe
    future = model.make_future_dataframe(periods=periods, freq=freq)
    
    # Add cap/floor for logistic growth
    if config.growth == "logistic":
        if "cap" in df.columns:
            future["cap"] = df["cap"].iloc[-1]
        if "floor" in df.columns:
            future["floor"] = df["floor"].iloc[-1]
    
    # Add regressor values to future
    if future_regressor_data:
        future = _build_regressor_df(future_regressor_data, future)
    elif regressor_data:
        # Use last known values for future (simple approach)
        for reg in config.regressors:
            if reg.name in df.columns:
                future[reg.name] = df[reg.name].iloc[-1]
    
    # Predict
    forecast_df = model.predict(future)
    
    # Build response
    forecast_points = []
    for _, row in forecast_df.iterrows():
        forecast_points.append(ForecastPoint(
            ds=row["ds"].strftime("%Y-%m-%d %H:%M:%S"),
            yhat=row["yhat"],
            yhat_lower=row["yhat_lower"],
            yhat_upper=row["yhat_upper"],
            trend=row["trend"],
            trend_lower=row.get("trend_lower"),
            trend_upper=row.get("trend_upper"),
        ))
    
    # Extract components
    components = _extract_components(model, forecast_df)
    
    # Get changepoints
    changepoints = []
    if hasattr(model, "changepoints") and model.changepoints is not None:
        changepoints = model.changepoints.dt.strftime("%Y-%m-%d").tolist()
    
    # Clean up for memory
    del model
    gc.collect()
    
    return ForecastResponse(
        forecast=forecast_points,
        components=components,
        changepoints=changepoints,
    )


def run_cross_validation(
    data: list[DataPoint],
    config: ModelConfig,
    initial: str,
    period: str,
    horizon: str,
    regressor_data: Optional[list[RegressorData]] = None,
) -> CrossValidationResponse:
    """Run cross-validation on a Prophet model."""
    # Build dataframe
    df = _build_dataframe(data)
    df = _build_regressor_df(regressor_data, df)
    
    # Create and fit model
    model = _create_model(config)
    model.fit(df)
    
    # Run cross-validation (limit cutoffs for free tier)
    cv_df = cross_validation(
        model,
        initial=initial,
        period=period,
        horizon=horizon,
    )
    
    # Calculate performance metrics
    metrics_df = performance_metrics(cv_df)
    
    # Build response
    cv_results = cv_df.to_dict(orient="records")
    for r in cv_results:
        for key, value in r.items():
            if hasattr(value, "strftime"):
                r[key] = value.strftime("%Y-%m-%d %H:%M:%S")
    
    metrics = PerformanceMetrics(
        horizon=metrics_df["horizon"].astype(str).tolist(),
        mse=metrics_df["mse"].tolist(),
        rmse=metrics_df["rmse"].tolist(),
        mae=metrics_df["mae"].tolist(),
        mape=metrics_df["mape"].tolist(),
        mdape=metrics_df["mdape"].tolist(),
        coverage=metrics_df["coverage"].tolist(),
    )
    
    # Clean up
    del model
    gc.collect()
    
    return CrossValidationResponse(
        cv_results=cv_results,
        metrics=metrics,
    )


def get_available_countries() -> list[str]:
    """Get list of available country codes for holidays."""
    import holidays as holidays_lib
    return sorted(list(holidays_lib.list_supported_countries().keys()))
