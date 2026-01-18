import { create } from 'zustand';
import type { DataPoint } from '@/types';

interface DataStore {
    // Raw data
    rawData: DataPoint[];
    fileName: string | null;

    // Column mapping
    dsColumn: string | null;
    yColumn: string | null;
    capColumn: string | null;
    floorColumn: string | null;
    regressorColumns: string[];

    // Available columns from CSV
    availableColumns: string[];

    // Actions
    setRawData: (data: DataPoint[], fileName: string) => void;
    setAvailableColumns: (columns: string[]) => void;
    setDsColumn: (col: string | null) => void;
    setYColumn: (col: string | null) => void;
    setCapColumn: (col: string | null) => void;
    setFloorColumn: (col: string | null) => void;
    setRegressorColumns: (cols: string[]) => void;
    clearData: () => void;

    // Computed
    isDataValid: () => boolean;
}

export const useDataStore = create<DataStore>((set, get) => ({
    rawData: [],
    fileName: null,
    dsColumn: null,
    yColumn: null,
    capColumn: null,
    floorColumn: null,
    regressorColumns: [],
    availableColumns: [],

    setRawData: (data, fileName) => set({ rawData: data, fileName }),
    setAvailableColumns: (columns) => set({ availableColumns: columns }),
    setDsColumn: (col) => set({ dsColumn: col }),
    setYColumn: (col) => set({ yColumn: col }),
    setCapColumn: (col) => set({ capColumn: col }),
    setFloorColumn: (col) => set({ floorColumn: col }),
    setRegressorColumns: (cols) => set({ regressorColumns: cols }),
    clearData: () => set({
        rawData: [],
        fileName: null,
        dsColumn: null,
        yColumn: null,
        capColumn: null,
        floorColumn: null,
        regressorColumns: [],
        availableColumns: [],
    }),

    isDataValid: () => {
        const state = get();
        return state.rawData.length > 0 &&
            state.dsColumn !== null &&
            state.yColumn !== null;
    },
}));
