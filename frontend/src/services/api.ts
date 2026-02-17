import axios from 'axios';
import type {
    ForecastRequest,
    ForecastResponse,
    CrossValidationRequest,
    CrossValidationResponse,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    timeout: 180000, // 180s timeout to allow Render cold start
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to detect if error is a timeout or network error (backend warming up)
export function isBackendWarmingUp(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        return (
            error.code === 'ECONNABORTED' || // timeout
            error.code === 'ECONNREFUSED' || // connection refused
            error.code === 'ETIMEDOUT' || // timeout
            error.message?.includes('timeout') ||
            error.response?.status === 503 // Service Unavailable
        );
    }
    return false;
}

export async function generateForecast(
    request: ForecastRequest
): Promise<ForecastResponse> {
    const response = await api.post<ForecastResponse>('/api/forecast', request);
    return response.data;
}

export async function runCrossValidation(
    request: CrossValidationRequest
): Promise<CrossValidationResponse> {
    const response = await api.post<CrossValidationResponse>(
        '/api/cross-validate',
        request
    );
    return response.data;
}

export async function getCountries(): Promise<string[]> {
    const response = await api.get<string[]>('/api/countries');
    return response.data;
}

export async function healthCheck(): Promise<boolean> {
    try {
        await api.get('/health');
        return true;
    } catch {
        return false;
    }
}
