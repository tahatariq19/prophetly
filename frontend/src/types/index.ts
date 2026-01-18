/* API Types - matching backend schemas */

export interface DataPoint {
    ds: string;
    y: number;
    cap?: number;
    floor?: number;
}

export interface Holiday {
    holiday: string;
    ds: string;
    lower_window: number;
    upper_window: number;
}

export interface CustomSeasonality {
    name: string;
    period: number;
    fourier_order: number;
    prior_scale?: number;
    mode?: 'additive' | 'multiplicative';
}

export interface Regressor {
    name: string;
    prior_scale?: number;
    standardize?: boolean;
    mode?: 'additive' | 'multiplicative';
}

export interface RegressorData {
    ds: string;
    values: Record<string, number>;
}

export interface ModelConfig {
    // Growth
    growth: 'linear' | 'logistic' | 'flat';

    // Changepoints
    n_changepoints: number;
    changepoint_range: number;
    changepoint_prior_scale: number;
    changepoints?: string[];

    // Seasonality
    yearly_seasonality: boolean | number | 'auto';
    weekly_seasonality: boolean | number | 'auto';
    daily_seasonality: boolean | number | 'auto';
    seasonality_mode: 'additive' | 'multiplicative';
    seasonality_prior_scale: number;

    // Holidays
    holidays_prior_scale: number;
    country_holidays?: string;

    // Uncertainty
    interval_width: number;
    mcmc_samples: number;

    // Custom components
    custom_seasonalities: CustomSeasonality[];
    holidays: Holiday[];
    regressors: Regressor[];
}

export interface ForecastRequest {
    data: DataPoint[];
    config: ModelConfig;
    periods: number;
    freq: string;
    regressor_data?: RegressorData[];
    future_regressor_data?: RegressorData[];
}

export interface ForecastPoint {
    ds: string;
    yhat: number;
    yhat_lower: number;
    yhat_upper: number;
    trend: number;
    trend_lower?: number;
    trend_upper?: number;
}

export interface ComponentData {
    ds: string[];
    values: number[];
    lower?: number[];
    upper?: number[];
}

export interface ForecastResponse {
    forecast: ForecastPoint[];
    components: Record<string, ComponentData>;
    changepoints: string[];
}

export interface CrossValidationRequest {
    data: DataPoint[];
    config: ModelConfig;
    initial: string;
    period: string;
    horizon: string;
    regressor_data?: RegressorData[];
}

export interface PerformanceMetrics {
    horizon: string[];
    mse: number[];
    rmse: number[];
    mae: number[];
    mape: number[];
    mdape: number[];
    coverage: number[];
}

export interface CrossValidationResponse {
    cv_results: Record<string, unknown>[];
    metrics: PerformanceMetrics;
}

// Default config
export const defaultModelConfig: ModelConfig = {
    growth: 'linear',
    n_changepoints: 25,
    changepoint_range: 0.8,
    changepoint_prior_scale: 0.05,
    yearly_seasonality: 'auto',
    weekly_seasonality: 'auto',
    daily_seasonality: 'auto',
    seasonality_mode: 'additive',
    seasonality_prior_scale: 10.0,
    holidays_prior_scale: 10.0,
    interval_width: 0.8,
    mcmc_samples: 0,
    custom_seasonalities: [],
    holidays: [],
    regressors: [],
};
