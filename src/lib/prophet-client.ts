import Holidays from "date-holidays";
import type {
  CrossValidationRequest,
  CrossValidationResponse,
  ForecastRequest,
  ForecastResponse,
} from "./types";

interface PendingRequest<T = unknown> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: unknown) => void;
  onProgress?: (percent: number, step: string) => void;
}

let workerInstance: Worker | null = null;

// biome-ignore lint/suspicious/noExplicitAny: Worker request promises have diverse return types
const pendingRequests = new Map<string, PendingRequest<any>>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL("./prophet.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerInstance.onmessage = (event: MessageEvent) => {
      const { type, id, payload, error, percent, step } = event.data || {};

      if (type === "CV_PROGRESS") {
        const pending = pendingRequests.get(id);
        if (pending?.onProgress) {
          pending.onProgress(percent, step);
        }
        return;
      }

      const pending = pendingRequests.get(id);
      if (!pending) return;

      if (
        type === "PRELOAD_SUCCESS" ||
        type === "FORECAST_SUCCESS" ||
        type === "CV_SUCCESS"
      ) {
        pendingRequests.delete(id);
        pending.resolve(payload);
      } else if (type === "CV_CANCELLED") {
        pendingRequests.delete(id);
        pending.reject(new Error("Cross-validation cancelled by user"));
      } else {
        pendingRequests.delete(id);
        pending.reject(new Error(error || "Worker request failed"));
      }
    };

    workerInstance.onerror = (err) => {
      console.error("Prophet Worker Error:", err);
    };
  }
  return workerInstance;
}

function generateRequestId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function preloadProphetEngine(): Promise<void> {
  const worker = getWorker();
  const id = generateRequestId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ type: "PRELOAD", id });
  });
}

export async function fetchForecast(
  request: ForecastRequest,
): Promise<ForecastResponse> {
  const worker = getWorker();
  const id = generateRequestId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ type: "FORECAST", id, payload: request });
  });
}

export async function fetchCrossValidation(
  request: CrossValidationRequest,
  onProgress?: (percent: number, step: string) => void,
): Promise<CrossValidationResponse> {
  const worker = getWorker();
  const id = generateRequestId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject, onProgress });
    worker.postMessage({ type: "CROSS_VALIDATE", id, payload: request });
  });
}

export function cancelCrossValidation(): void {
  if (workerInstance) {
    workerInstance.postMessage({ type: "CANCEL_CV" });
  }
}

export async function fetchCountries(): Promise<string[]> {
  const hd = new Holidays();
  const countriesMap = hd.getCountries("en");
  return Object.keys(countriesMap).sort();
}

export async function fetchCountryMap(): Promise<Record<string, string>> {
  const hd = new Holidays();
  return hd.getCountries("en");
}
