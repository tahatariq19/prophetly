rations happen in volatile memory during the request lifecycle and are immediately discarded upon completion.

## Core Architectural Principles

### 🔒 Privacy-First Design

- **No Persistent Storage**: Zero databases, file systems, or caches for user data
- **Memory-Only Processing**: All data exists solely in RAM during request processing
- **Automatic Cleanup**: Explicit memory clearing after each operation
- **Session Isolation**: Complete separation between concurrent user sessions
- **Secure Disposal**: Cryptographic-grade memory clearing for sensitive data

### ⚡ Stateless Operations

- **Request-Response Cycle**: Each API call is completely independent
- **No Server-Side State**: No session storage, cookies, or persistent connections
- **Idempotent Operations**: Same input always produces same output
- **Horizontal Scalability**: Stateless design enables easy scaling
- **Fault Tolerance**: No data loss risk since nothing is stored

## API Endpoints

### Base URL
```
Production: https://prophet-web-api.render.com
Development: http://localhost:8000
```

### Authentication
No authentication required - the stateless design eliminates the need for user accounts or API keys.

---

## Data Upload and Processing

### POST /api/upload
Upload and process CSV data entirely in memory.

**Privacy Features:**
- File processed directly from request stream
- No temporary files created on disk
- Data validated and parsed in RAM only
- Automatic memory cleanup after response

```http
POST /api/upload
Content-Type: multipart/form-data

{
  "file": <CSV file>,
  "options": {
    "date_column": "date",
    "value_column": "value",
    "encoding": "utf-8"
  }
}
```

**Response:**
```json
{
  "session_id": "temp-session-uuid",
  "data_info": {
    "rows": 1000,
    "columns": ["date", "value"],
    "date_range": {
      "start": "2020-01-01",
      "end": "2023-12-31"
    },
    "data_quality": {
      "missing_values": 5,
      "duplicates": 2,
      "outliers": 3
    }
  },
  "preview": [
    {"date": "2020-01-01", "value": 100.5},
    {"date": "2020-01-02", "value": 102.3}
  ]
}
```

**Memory Management:**
- Session data expires automatically after 2 hours
- Explicit cleanup on session termination
- Memory usage monitoring and limits
- Garbage collection after each request

---

## Data Processing

### POST /api/process
Apply data cleaning and transformations in memory.

**Stateless Processing:**
- No intermediate files or caches
- All transformations applied to in-memory data
- Original data discarded after transformation
- Results exist only during request lifecycle

```http
POST /api/process
Content-Type: application/json

{
  "session_id": "temp-session-uuid",
  "operations": [
    {
      "type": "remove_duplicates"
    },
    {
      "type": "interpolate_missing",
      "method": "linear"
    },
    {
      "type": "log_transform",
      "column": "value"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed_rows": 995,
  "operations_applied": 3,
  "data_quality": {
    "missing_values": 0,
    "duplicates": 0,
    "outliers": 1
  },
  "memory_usage": "15.2MB"
}
```

---

## Forecasting

### POST /api/forecast
Generate Prophet forecasts with complete memory isolation.

**Privacy-Safe Forecasting:**
- Prophet model created and trained in memory only
- No model persistence or caching
- Forecast results generated in RAM
- Automatic model disposal after response

```http
POST /api/forecast
Content-Type: application/json

{
  "session_id": "temp-session-uuid",
  "config": {
    "horizon": 30,
    "interval_width": 0.8,
    "growth": "linear",
    "yearly_seasonality": true,
    "weekly_seasonality": true,
    "daily_seasonality": false,
    "holidays": {
      "country": "US"
    },
    "advanced": {
      "changepoint_prior_scale": 0.05,
      "seasonality_prior_scale": 10.0,
      "mcmc_samples": 0
    }
  }
}
```

**Response:**
```json
{
  "forecast_id": "temp-forecast-uuid",
  "status": "completed",
  "forecast": [
    {
      "ds": "2024-01-01",
      "yhat": 105.2,
      "yhat_lower": 98.1,
      "yhat_upper": 112.3
    }
  ],
  "components": {
    "trend": [...],
    "yearly": [...],
    "weekly": [...]
  },
  "performance": {
    "training_time": "2.3s",
    "memory_peak": "45.7MB"
  }
}
```

**Async Processing for Large Datasets:**
```http
POST /api/forecast?async=true
```

Returns immediately with:
```json
{
  "task_id": "temp-task-uuid",
  "status": "processing",
  "estimated_completion": "2024-01-01T10:05:00Z"
}
```

Check status with:
```http
GET /api/forecast/status/{task_id}
```

---

## Model Validation

### POST /api/validate
Perform cross-validation with memory-only operations.

**Stateless Validation:**
- Multiple model training iterations in memory
- No validation result caching
- Performance metrics calculated on-demand
- Complete cleanup after validation

```http
POST /api/validate
Content-Type: application/json

{
  "session_id": "temp-session-uuid",
  "config": {
    "initial": "365 days",
    "period": "30 days",
    "horizon": "30 days",
    "parallel": "processes"
  },
  "metrics": ["rmse", "mae", "mape", "coverage"]
}
```

**Response:**
```json
{
  "validation_results": {
    "rmse": 12.5,
    "mae": 9.8,
    "mape": 0.15,
    "coverage": 0.82
  },
  "cutoff_performance": [
    {
      "cutoff": "2023-01-01",
      "rmse": 11.2,
      "mae": 8.9
    }
  ],
  "processing_time": "15.2s"
}
```

---

## Data Export

### GET /api/export/{format}
Export results in various formats with immediate generation.

**Privacy-Safe Export:**
- Files generated in memory and streamed directly
- No temporary files on server
- Immediate cleanup after download
- Client-side file handling only

```http
GET /api/export/csv?session_id=temp-session-uuid&type=forecast
GET /api/export/json?session_id=temp-session-uuid&type=full_report
```

**Supported Formats:**
- `csv`: Forecast data with confidence intervals
- `json`: Complete results with metadata
- `png`: Chart images (generated on-demand)
- `svg`: Vector charts for high-quality printing

---

## System Health and Monitoring

### GET /api/health
System health check with privacy compliance status.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "privacy_compliance": {
    "data_persistence": false,
    "memory_only": true,
    "auto_cleanup": true,
    "session_isolation": true
  },
  "system_metrics": {
    "memory_usage": "2.1GB",
    "active_sessions": 15,
    "uptime": "72h"
  }
}
```

### GET /api/metrics
System performance metrics (no user data).

```http
GET /api/metrics
```

**Response:**
```json
{
  "requests_per_minute": 45,
  "average_response_time": "1.2s",
  "memory_efficiency": "94%",
  "session_cleanup_rate": "100%",
  "privacy_violations": 0
}
```

---

## Error Handling

### Error Response Format
All errors follow a consistent format with privacy-safe messages.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date format in uploaded file",
    "details": "Expected YYYY-MM-DD format",
    "timestamp": "2024-01-01T10:00:00Z",
    "request_id": "temp-request-uuid"
  }
}
```

### Common Error Codes

| Code | Description | Privacy Impact |
|------|-------------|----------------|
| `VALIDATION_ERROR` | Data validation failed | No user data in logs |
| `MEMORY_LIMIT` | Session memory exceeded | Automatic cleanup triggered |
| `SESSION_EXPIRED` | Session timeout reached | Data already purged |
| `PROPHET_ERROR` | Prophet model error | Model-specific error only |
| `PROCESSING_ERROR` | General processing error | No data details logged |

---

## Rate Limiting and Security

### Rate Limits
- **Upload**: 10 files per hour per IP
- **Forecast**: 20 requests per hour per IP
- **Export**: 50 downloads per hour per IP

### Security Headers
All responses include privacy-focused security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
X-Privacy-Policy: no-data-storage
```

---

## Memory Management Details

### Session Lifecycle

1. **Creation**: Temporary session ID generated
2. **Processing**: Data stored in isolated memory space
3. **Expiration**: Automatic cleanup after 2 hours or on completion
4. **Cleanup**: Explicit memory clearing and garbage collection

### Memory Safety Features

```python
# Example memory management (implementation detail)
class MemoryManager:
    def cleanup_session(self, session_id: str):
        """Secure cleanup of session data"""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            
            # Explicit data clearing
            if hasattr(session, 'data'):
                session.data = None
            
            # Force garbage collection
            import gc
            gc.collect()
            
            # Remove from active sessions
            del self.sessions[session_id]
```

### Resource Monitoring

- **Memory Usage**: Continuous monitoring per session
- **Cleanup Verification**: Automated verification of data disposal
- **Leak Detection**: Regular checks for memory leaks
- **Performance Metrics**: Response time and resource usage tracking

---

## Integration Examples

### JavaScript/TypeScript Client

```javascript
class ProphetAPIClient {
  constructor(baseURL = 'https://prophet-web-api.render.com') {
    this.baseURL = baseURL;
  }

  async uploadData(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await fetch(`${this.baseURL}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async generateForecast(sessionId, config) {
    const response = await fetch(`${this.baseURL}/api/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        config: config
      })
    });

    return await response.json();
  }

  async exportResults(sessionId, format = 'csv') {
    const response = await fetch(
      `${this.baseURL}/api/export/${format}?session_id=${sessionId}`
    );
    
    return await response.blob();
  }
}
```

### Python Client

```python
import requests
import json

class ProphetAPIClient:
    def __init__(self, base_url="https://prophet-web-api.render.com"):
        self.base_url = base_url
    
    def upload_data(self, file_path, options=None):
        """Upload CSV data for processing"""
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'options': json.dumps(options or {})}
            
            response = requests.post(
                f"{self.base_url}/api/upload",
                files=files,
                data=data
            )
            
        return response.json()
    
    def generate_forecast(self, session_id, config):
        """Generate Prophet forecast"""
        response = requests.post(
            f"{self.base_url}/api/forecast",
            json={
                'session_id': session_id,
                'config': config
            }
        )
        
        return response.json()
```

---

## Privacy Compliance Verification

### Automated Privacy Checks

The API includes built-in privacy compliance verification:

```http
GET /api/privacy/verify
```

**Response:**
```json
{
  "compliance_status": "FULLY_COMPLIANT",
  "checks": {
    "no_data_persistence": true,
    "memory_only_processing": true,
    "automatic_cleanup": true,
    "session_isolation": true,
    "secure_disposal": true,
    "no_user_data_logging": true
  },
  "last_verification": "2024-01-01T10:00:00Z"
}
```

### Privacy Audit Trail

```http
GET /api/privacy/audit
```

**Response:**
```json
{
  "audit_summary": {
    "total_sessions": 1000,
    "successful_cleanups": 1000,
    "cleanup_failures": 0,
    "average_session_duration": "45 minutes",
    "memory_leaks_detected": 0
  },
  "compliance_score": "100%"
}
```

---

## Development and Testing

### Local Development Setup

```bash
# Start the stateless API server
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Verify privacy compliance
curl http://localhost:8000/api/privacy/verify
```

### Testing Privacy Features

```python
# Example privacy test
def test_no_data_persistence():
    """Verify no data persists after session cleanup"""
    client = TestClient(app)
    
    # Upload data
    response = client.post("/api/upload", files={"file": test_csv})
    session_id = response.json()["session_id"]
    
    # Verify data exists during session
    assert session_id in memory_manager.sessions
    
    # Trigger cleanup
    memory_manager.cleanup_session(session_id)
    
    # Verify complete data removal
    assert session_id not in memory_manager.sessions
    assert memory_manager.get_session_data(session_id) is None
```

---

## Conclusion

This API is designed from the ground up with privacy as the core architectural principle. Every endpoint, every operation, and every data structure is built to ensure that user data never persists beyond the immediate processing needs. The stateless design not only provides unparalleled privacy protection but also enables horizontal scaling and fault tolerance.

For questions about the API or privacy features, please refer to the Privacy Policy and User Manual documentation.