import type { ActionType, CVParams, ForecastParams } from "./state";
import type { ModelConfig, PerformanceMetrics } from "./types";

export interface ForecastMetrics {
  rmse?: number;
  mae?: number;
  mape?: number;
  mdape?: number;
  coverage?: number;
  mse?: number;
}

export interface ForecastSummary {
  periods?: number;
  freq?: string;
  horizon?: string;
  pointsCount?: number;
  lastYhat?: number;
  metrics?: PerformanceMetrics | ForecastMetrics;
}

export interface ForecastHistoryEntry {
  id: string;
  timestamp: string;
  datasetName: string;
  rowCount: number;
  config: ModelConfig;
  actionType?: ActionType;
  forecastParams?: ForecastParams;
  cvParams?: CVParams;
  forecastSummary?: ForecastSummary;
  metrics?: PerformanceMetrics | ForecastMetrics;
  executionTimeMs?: number;
}

const HISTORY_STORAGE_KEY = "prophetly_forecast_history";
const MAX_HISTORY_ITEMS = 10;

export function getHistory(): ForecastHistoryEntry[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ForecastHistoryEntry[];
  } catch {
    return [];
  }
}

export function addHistoryEntry(
  entry: Omit<ForecastHistoryEntry, "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  },
): ForecastHistoryEntry {
  const fullEntry: ForecastHistoryEntry = {
    ...entry,
    id:
      entry.id || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return fullEntry;
  }

  try {
    const current = getHistory();
    const filtered = current.filter((item) => item.id !== fullEntry.id);
    const updated = [fullEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("prophetly_history_updated"));
  } catch (err) {
    console.error("Failed to save forecast history to localStorage:", err);
  }

  return fullEntry;
}

export function clearHistory(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    window.dispatchEvent(new Event("prophetly_history_updated"));
  } catch (err) {
    console.error("Failed to clear forecast history from localStorage:", err);
  }
}

export function deleteHistoryEntry(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const current = getHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("prophetly_history_updated"));
  } catch (err) {
    console.error("Failed to delete forecast history entry:", err);
  }
}
