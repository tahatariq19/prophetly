import { create } from 'zustand';
import type { ForecastResponse, CrossValidationResponse } from '@/types';

interface ResultsStore {
    // Forecast results
    forecast: ForecastResponse | null;
    isLoading: boolean;
    error: string | null;

    // Cross-validation results
    cvResults: CrossValidationResponse | null;
    isCvLoading: boolean;
    cvError: string | null;

    // Actions
    setForecast: (forecast: ForecastResponse) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    setCvResults: (results: CrossValidationResponse) => void;
    setCvLoading: (loading: boolean) => void;
    setCvError: (error: string | null) => void;

    clearResults: () => void;
}

export const useResultsStore = create<ResultsStore>((set) => ({
    forecast: null,
    isLoading: false,
    error: null,
    cvResults: null,
    isCvLoading: false,
    cvError: null,

    setForecast: (forecast) => set({ forecast, error: null }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),

    setCvResults: (cvResults) => set({ cvResults, cvError: null }),
    setCvLoading: (isCvLoading) => set({ isCvLoading }),
    setCvError: (cvError) => set({ cvError, isCvLoading: false }),

    clearResults: () =>
        set({
            forecast: null,
            error: null,
            cvResults: null,
            cvError: null,
        }),
}));
