import type { ForecastHistoryEntry } from "./history";
import type {
  CrossValidationResponse,
  DataPoint,
  ForecastResponse,
  ModelConfig,
} from "./types";

export type Step = 1 | 2 | 3;

export type ActionType = "forecast" | "cross_validation" | "both";

export interface ForecastParams {
  periods: number;
  freq: string;
}

export interface CVParams {
  initial: string;
  period: string;
  horizon: string;
  initialPct?: number;
  horizonPct?: number;
  periodPct?: number;
}

export interface AppState {
  step: Step;
  data: DataPoint[];
  datasetName: string;
  sampleDataLoaded: boolean;
  actionType: ActionType;
  config: ModelConfig;
  forecastParams: ForecastParams;
  cvParams: CVParams;
  isLoading: boolean;
  loadingMessage: string;
  loadingProgress?: number;
  forecastResults: ForecastResponse | null;
  cvResults: CrossValidationResponse | null;
  activeResultsMode: "forecast" | "cross_validation";
  error: string | null;
}

export const defaultConfig: ModelConfig = {
  growth: "linear",
  n_changepoints: 25,
  changepoint_range: 0.8,
  changepoint_prior_scale: 0.05,
  changepoints: [],
  yearly_seasonality: "auto",
  weekly_seasonality: "auto",
  daily_seasonality: "auto",
  seasonality_mode: "additive",
  seasonality_prior_scale: 10.0,
  holidays_prior_scale: 10.0,
  country_holidays: undefined,
  interval_width: 0.8,
  mcmc_samples: 0,
  custom_seasonalities: [],
  holidays: [],
  regressors: [],
};

export const initialAppState: AppState = {
  step: 1,
  data: [],
  datasetName: "Dataset",
  sampleDataLoaded: false,
  actionType: "forecast",
  config: defaultConfig,
  forecastParams: {
    periods: 30,
    freq: "D",
  },
  cvParams: {
    initial: "730 days",
    period: "180 days",
    horizon: "365 days",
    initialPct: 0.6,
    horizonPct: 0.2,
    periodPct: 0.2,
  },
  isLoading: false,
  loadingMessage: "Fitting model...",
  loadingProgress: undefined,
  forecastResults: null,
  cvResults: null,
  activeResultsMode: "forecast",
  error: null,
};

export type AppAction =
  | {
      type: "SET_DATA";
      payload: {
        data: DataPoint[];
        isSample?: boolean;
        datasetName?: string;
      };
    }
  | { type: "SET_STEP"; payload: Step }
  | { type: "SET_ACTION_TYPE"; payload: ActionType }
  | {
      type: "SET_ACTIVE_RESULTS_MODE";
      payload: "forecast" | "cross_validation";
    }
  | { type: "SET_CONFIG"; payload: Partial<ModelConfig> }
  | { type: "SET_FORECAST_PARAMS"; payload: Partial<ForecastParams> }
  | { type: "SET_CV_PARAMS"; payload: Partial<CVParams> }
  | { type: "START_LOADING"; payload?: string; progress?: number }
  | {
      type: "SET_FORECAST_RESULTS";
      payload: ForecastResponse;
    }
  | {
      type: "SET_CV_RESULTS";
      payload: CrossValidationResponse;
    }
  | {
      type: "SET_BOTH_RESULTS";
      payload: { forecast: ForecastResponse; cv: CrossValidationResponse };
    }
  | { type: "LOAD_HISTORY_ENTRY"; payload: ForecastHistoryEntry }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_DATA":
      return {
        ...state,
        data: action.payload.data,
        sampleDataLoaded: !!action.payload.isSample,
        datasetName:
          action.payload.datasetName ||
          (action.payload.isSample
            ? "Airline Passengers (Sample)"
            : "Custom Dataset"),
        error: null,
      };
    case "SET_STEP":
      return {
        ...state,
        step: action.payload,
        error: null,
      };
    case "SET_ACTION_TYPE":
      return {
        ...state,
        actionType: action.payload,
      };
    case "SET_ACTIVE_RESULTS_MODE":
      return {
        ...state,
        activeResultsMode: action.payload,
      };
    case "SET_CONFIG":
      return {
        ...state,
        config: { ...state.config, ...action.payload },
      };
    case "SET_FORECAST_PARAMS":
      return {
        ...state,
        forecastParams: { ...state.forecastParams, ...action.payload },
      };
    case "SET_CV_PARAMS":
      return {
        ...state,
        cvParams: { ...state.cvParams, ...action.payload },
      };
    case "START_LOADING":
      return {
        ...state,
        isLoading: true,
        loadingMessage: action.payload || "Processing model request...",
        loadingProgress: action.progress,
        error: null,
      };
    case "SET_FORECAST_RESULTS":
      return {
        ...state,
        isLoading: false,
        forecastResults: action.payload,
        activeResultsMode: "forecast",
        step: 3,
        error: null,
      };
    case "SET_CV_RESULTS":
      return {
        ...state,
        isLoading: false,
        cvResults: action.payload,
        activeResultsMode: "cross_validation",
        step: 3,
        error: null,
      };
    case "SET_BOTH_RESULTS":
      return {
        ...state,
        isLoading: false,
        forecastResults: action.payload.forecast,
        cvResults: action.payload.cv,
        activeResultsMode: "forecast",
        step: 3,
        error: null,
      };
    case "LOAD_HISTORY_ENTRY":
      return {
        ...state,
        config: { ...state.config, ...action.payload.config },
        actionType: action.payload.actionType || state.actionType,
        forecastParams: action.payload.forecastParams
          ? { ...state.forecastParams, ...action.payload.forecastParams }
          : state.forecastParams,
        cvParams: action.payload.cvParams
          ? { ...state.cvParams, ...action.payload.cvParams }
          : state.cvParams,
        step: state.data.length > 0 ? 2 : 1,
      };
    case "SET_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case "RESET":
      return initialAppState;
    default:
      return state;
  }
}
