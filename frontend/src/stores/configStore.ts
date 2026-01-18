import { create } from 'zustand';
import type { ModelConfig, CustomSeasonality, Holiday, Regressor } from '@/types';
import { defaultModelConfig } from '@/types';

interface ConfigStore {
    config: ModelConfig;
    periods: number;
    freq: string;

    // Actions
    setConfig: (config: Partial<ModelConfig>) => void;
    setPeriods: (periods: number) => void;
    setFreq: (freq: string) => void;

    // Seasonality
    addCustomSeasonality: (seasonality: CustomSeasonality) => void;
    removeCustomSeasonality: (name: string) => void;

    // Holidays
    addHoliday: (holiday: Holiday) => void;
    removeHoliday: (index: number) => void;
    setCountryHolidays: (country: string | undefined) => void;

    // Regressors
    addRegressor: (regressor: Regressor) => void;
    removeRegressor: (name: string) => void;

    // Reset
    resetConfig: () => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
    config: defaultModelConfig,
    periods: 30,
    freq: 'D',

    setConfig: (partial) =>
        set((state) => ({
            config: { ...state.config, ...partial },
        })),

    setPeriods: (periods) => set({ periods }),
    setFreq: (freq) => set({ freq }),

    addCustomSeasonality: (seasonality) =>
        set((state) => ({
            config: {
                ...state.config,
                custom_seasonalities: [...state.config.custom_seasonalities, seasonality],
            },
        })),

    removeCustomSeasonality: (name) =>
        set((state) => ({
            config: {
                ...state.config,
                custom_seasonalities: state.config.custom_seasonalities.filter(
                    (s) => s.name !== name
                ),
            },
        })),

    addHoliday: (holiday) =>
        set((state) => ({
            config: {
                ...state.config,
                holidays: [...state.config.holidays, holiday],
            },
        })),

    removeHoliday: (index) =>
        set((state) => ({
            config: {
                ...state.config,
                holidays: state.config.holidays.filter((_, i) => i !== index),
            },
        })),

    setCountryHolidays: (country) =>
        set((state) => ({
            config: { ...state.config, country_holidays: country },
        })),

    addRegressor: (regressor) =>
        set((state) => ({
            config: {
                ...state.config,
                regressors: [...state.config.regressors, regressor],
            },
        })),

    removeRegressor: (name) =>
        set((state) => ({
            config: {
                ...state.config,
                regressors: state.config.regressors.filter((r) => r.name !== name),
            },
        })),

    resetConfig: () => set({ config: defaultModelConfig, periods: 30, freq: 'D' }),
}));
