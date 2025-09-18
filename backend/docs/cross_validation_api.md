# Cross-Validation API Documentation

## Overview

The Cross-Validation API provides endpoints for validating Prophet forecasting models using time series cross-validation. This allows users to assess model performance and reliability before deploying forecasts.

## Endpoints

### POST /api/cross-validation/execute

Execute Prophet cross-validation with performance metrics calculation.

#### Request Body

```json
{
  "session_id": "string",
  "config": {
    "initial": "730 days",
    "period": "180 days", 
    "horizon": "365 days",
    "cutoffs": ["2023-01-01", "2023-06-01"],  // Optional custom cutoffs
    "parallel": "processes"  // Optional: "processes" or "threads"
  },
  "forecast_config": {
    "horizon": 30,
    "growth": "linear",
    "yearly_seasonality": true,
    "weekly_seasonality": true,
    "daily_seasonality": false,
    // ... other Prophet configuration parameters
  },
  "dataset_name": "uploaded_data"  // Optional, defaults to "uploaded_data"
}
```

#### Response

```json
{
  "success": true,
  "message": "Cross-validation completed successfully",
  "config": {
    "initial": "730 days",
    "period": "180 days",
    "horizon": "365 days"
  },
  "metrics": {
    "rmse": 10.5,
    "mae": 8.2,
    "mape": 15.3,
    "mdape": 12.1,
    "smape": 14.7,
    "coverage": 85.2
  },
  "results": [
    {
      "ds": "2023-01-01T00:00:00",
      "cutoff": "2022-12-01T00:00:00",
      "y": 100.0,
      "yhat": 98.5,
      "yhat_lower": 90.0,
      "yhat_upper": 107.0,
      "horizon_days": 31,
      "error": 1.5,
      "abs_error": 1.5,
      "pct_error": 1.5
    }
    // ... more results
  ],
  "cutoff_count": 5,
  "total_predictions": 150,
  "processing_time_seconds": 12.5
}
```

### POST /api/cross-validation/validate-config

Validate cross-validation configuration without executing.

#### Request Body

Same as `/execute` endpoint.

#### Response

```json
{
  "is_valid": true,
  "errors": [],
  "warnings": [
    "Large dataset (5000 points) may result in slow cross-validation"
  ],
  "recommendations": [
    "Consider using parallel processing for faster execution"
  ],
  "data_points": 5000,
  "estimated_processing_time_seconds": 45.2,
  "estimated_memory_mb": 120.5,
  "estimated_cutoffs": 8,
  "dataset_name": "uploaded_data"
}
```

## Configuration Parameters

### Cross-Validation Configuration

- **initial**: Initial training period (e.g., "730 days", "2 years")
- **period**: Period between cutoff dates (e.g., "180 days", "6 months")  
- **horizon**: Forecast horizon for each cutoff (e.g., "365 days", "1 year")
- **cutoffs**: Optional list of custom cutoff dates in YYYY-MM-DD format
- **parallel**: Optional parallelization method ("processes" or "threads")

### Performance Metrics

- **RMSE**: Root Mean Square Error
- **MAE**: Mean Absolute Error
- **MAPE**: Mean Absolute Percentage Error
- **MDAPE**: Median Absolute Percentage Error
- **SMAPE**: Symmetric Mean Absolute Percentage Error
- **Coverage**: Percentage of actual values within prediction intervals

## Usage Examples

### Basic Cross-Validation

```python
import requests

# Execute cross-validation
response = requests.post("http://localhost:8000/api/cross-validation/execute", json={
    "session_id": "your-session-id",
    "config": {
        "initial": "365 days",
        "period": "90 days",
        "horizon": "30 days"
    },
    "forecast_config": {
        "horizon": 30,
        "growth": "linear",
        "yearly_seasonality": True
    }
})

result = response.json()
print(f"RMSE: {result['metrics']['rmse']}")
print(f"Coverage: {result['metrics']['coverage']}%")
```

### Custom Cutoffs

```python
# Use specific cutoff dates
response = requests.post("http://localhost:8000/api/cross-validation/execute", json={
    "session_id": "your-session-id", 
    "config": {
        "initial": "365 days",
        "horizon": "30 days",
        "cutoffs": ["2022-01-01", "2022-07-01", "2023-01-01"]
    },
    "forecast_config": {
        "horizon": 30,
        "growth": "logistic",
        "cap": 1000.0
    }
})
```

### Configuration Validation

```python
# Validate before executing
response = requests.post("http://localhost:8000/api/cross-validation/validate-config", json={
    "session_id": "your-session-id",
    "config": {
        "initial": "730 days",
        "period": "180 days", 
        "horizon": "365 days"
    },
    "forecast_config": {
        "horizon": 365,
        "growth": "linear"
    }
})

validation = response.json()
if validation["is_valid"]:
    print("Configuration is valid")
    print(f"Estimated time: {validation['estimated_processing_time_seconds']} seconds")
else:
    print("Validation errors:", validation["errors"])
```

## Error Handling

### Common Error Responses

- **404**: Session not found or expired
- **400**: Invalid configuration or insufficient data
- **500**: Internal server error during cross-validation

### Error Response Format

```json
{
  "detail": "Error message describing the issue"
}
```

## Privacy and Memory Management

- All cross-validation processing happens in server memory only
- No user data is persisted to disk during cross-validation
- Model objects are automatically cleaned up after processing
- Session data is automatically purged after timeout
- Results are only available during the API response

## Performance Considerations

### Processing Time Factors

- **Data size**: Larger datasets take longer to process
- **Number of cutoffs**: More cutoffs increase processing time
- **MCMC sampling**: Significantly increases processing time
- **Model complexity**: Custom seasonalities and regressors add overhead

### Memory Usage Factors

- **Data size**: Memory scales with dataset size
- **Cutoff count**: Each cutoff requires temporary model storage
- **MCMC samples**: Memory-intensive for uncertainty quantification
- **Parallel processing**: May increase memory usage

### Optimization Tips

- Use parallel processing for large datasets
- Reduce number of cutoffs for faster validation
- Consider shorter horizons for initial validation
- Monitor estimated processing time before execution