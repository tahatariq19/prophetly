import { create } from 'zustand';
import type { ForecastResponse, CrossValidationResponse } from '@/types';

interface ResultsStore {
    // Forecast results
    forecast: ForecastResponse | null;
    isLoading: boolean;
    error: string | null;
    isWarmingUp: boolean;

    // Cross-validation results
    cvResults: CrossValidationResponse | null;
    isCvLoading: boolean;
    cvError: string | null;
    isCvWarmingUp: boolean;

    // Actions
    setForecast: (forecast: ForecastResponse) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setWarmingUp: (warmingUp: boolean) => void;

    setCvResults: (results: CrossValidationResponse) => void;
    setCvLoading: (loading: boolean) => void;
    setCvError: (error: string | null) => void;
    setCvWarmingUp: (warmingUp: boolean) => void;

    clearResults: () => void;
}

export const useResultsStore = create<ResultsStore>((set) => ({
    forecast: null,
    isLoading: false,
    error: null,
    isWarmingUp: false,
    cvResults: null,
    isCvLoading: false,
    cvError: null,
    isCvWarmingUp: false,

    setForecast: (forecast) => set({ forecast, error: null }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
    setWarmingUp: (isWarmingUp) => set({ isWarmingUp }),

    setCvResults: (cvResults) => set({ cvResults, cvError: null }),
    setCvLoading: (isCvLoading) => set({ isCvLoading }),
    setCvError: (cvError) => set({ cvError, isCvLoading: false }),
    setCvWarmingUp: (isCvWarmingUp) => set({ isCvWarmingUp }),

    clearResults: () =>
        set({
            forecast: null,
            error: null,
            isWarmingUp: false,
            cvResults: null,
            cvError: null,
            isCvWarmingUp: false,
        }),
}));
