import type {
  CrossValidationRequest,
  CrossValidationResponse,
  ForecastRequest,
  ForecastResponse,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function fetchForecast(
  request: ForecastRequest,
): Promise<ForecastResponse> {
  const res = await fetch(`${API_URL}/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Forecast failed with status ${res.status}`,
    );
  }

  return res.json();
}

export async function fetchCrossValidation(
  request: CrossValidationRequest,
): Promise<CrossValidationResponse> {
  const res = await fetch(`${API_URL}/cross-validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Cross-validation failed with status ${res.status}`,
    );
  }

  return res.json();
}

export async function fetchCountries(): Promise<string[]> {
  const res = await fetch(`${API_URL}/countries`);
  if (!res.ok) {
    throw new Error(`Failed to load countries: ${res.statusText}`);
  }
  return res.json();
}
