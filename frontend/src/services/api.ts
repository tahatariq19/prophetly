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
    timeout: 60000, // 60s timeout for free tier
    headers: {
        'Content-Type': 'application/json',
    },
});

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
