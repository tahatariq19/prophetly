# Render Deployment Guide

This guide explains how to deploy the Prophet Web Interface to Render with privacy-first, stateless architecture.

## Overview

The Prophet Web Interface is deployed as two separate services on Render:
- **Backend Service**: Python web service running FastAPI
- **Frontend Service**: Static site serving the Vue.js application

Both services are configured for automatic deployment from the main branch and include comprehensive privacy protections.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Code must be in a GitHub repository
3. **Environment Variables**: Configure required environment variables

## Deployment Steps

### 1. Connect Repository to Render

1. Log into your Render dashboard
2. Click "New +" and select "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` configuration

### 2. Configure Environment Variables

The following environment variables are automatically configured in `render.yaml`, but you can override them in the Render dashboard:

#### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `production` | Application environment |
| `DEBUG` | `false` | Debug mode (disabled in production) |
| `MAX_SESSION_AGE` | `7200` | Session timeout in seconds (2 hours) |
| `MAX_MEMORY_MB` | `512` | Memory limit for stateless processing |
| `AUTO_CLEANUP_INTERVAL` | `300` | Cleanup interval in seconds (5 minutes) |
| `SECRET_KEY` | Auto-generated | Secure random key for sessions |
| `ALLOWED_ORIGINS` | Frontend URL | CORS allowed origins |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload file size |
| `LOG_LEVEL` | `INFO` | Logging level |

#### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | Backend URL | API endpoint for frontend |
| `VITE_ENVIRONMENT` | `production` | Frontend environment |

### 3. Deploy Services

Once connected, Render will automatically:
1. Build both services according to `render.yaml`
2. Deploy the backend as a web service
3. Deploy the frontend as a static site
4. Set up automatic deployments on Git push

## Privacy and Security Features

### Stateless Architecture
- **No Database**: All data processing happens in memory
- **Session-Based**: Temporary data stored only during request lifecycle
- **Automatic Cleanup**: Memory cleared after each operation
- **No Persistent Storage**: Zero server-side data retention

### Security Headers
The deployment includes comprehensive security headers:

```yaml
# Content Security Policy
Content-Security-Policy: "default-src 'self'; script-src 'self' 'unsafe-inline'; ..."

# Privacy Protection
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin

# Permissions Policy
Permissions-Policy: "geolocation=(), microphone=(), camera=(), ..."
```

### Memory Management
- Automatic session cleanup every 5 minutes
- 2-hour maximum session age
- 512MB memory limit per instance
- Real-time memory monitoring

## Validation and Testing

### Automated Validation

Use the provided validation script to test deployment:

```bash
# Test deployed services
python scripts/validate_render_deployment.py

# Test specific URLs
python scripts/validate_render_deployment.py \
  https://your-backend.onrender.com \
  https://your-frontend.onrender.com
```

### Manual Testing Checklist

1. **Backend Health Check**
   - Visit: `https://your-backend.onrender.com/health`
   - Verify: `"privacy": "stateless"` in response

2. **Frontend Accessibility**
   - Visit: `https://your-frontend.onrender.com`
   - Verify: Application loads correctly

3. **Privacy Compliance**
   - Upload test data
   - Verify: No data persistence after session ends
   - Check: Memory cleanup in health endpoint

4. **CORS Configuration**
   - Test: Frontend can communicate with backend
   - Verify: No CORS errors in browser console

## Monitoring and Maintenance

### Health Monitoring

The backend provides a comprehensive health endpoint:

```json
{
  "status": "healthy",
  "privacy": "stateless",
  "environment": "production",
  "memory_limit_mb": 512,
  "current_memory_mb": 128,
  "active_sessions": 3,
  "total_sessions": 157
}
```

### Automatic Scaling

Render automatically scales based on:
- CPU usage
- Memory usage
- Request volume
- Response times

### Log Monitoring

- **Privacy-Safe Logs**: No user data in logs
- **Error Tracking**: Application errors without PII
- **Performance Metrics**: Response times and resource usage

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check: `requirements.txt` and `package.json` are up to date
   - Verify: Build commands in `render.yaml` are correct

2. **Memory Issues**
   - Monitor: Memory usage in health endpoint
   - Adjust: `MAX_MEMORY_MB` environment variable
   - Upgrade: Render plan for more memory

3. **CORS Errors**
   - Check: `ALLOWED_ORIGINS` includes frontend URL
   - Verify: Frontend `VITE_API_URL` points to backend

4. **Session Issues**
   - Check: Session cleanup is working
   - Verify: `MAX_SESSION_AGE` is appropriate
   - Monitor: Active sessions in health endpoint

### Debug Mode

For debugging (development only):
```bash
# Enable debug mode
ENVIRONMENT=development
DEBUG=true
```

**⚠️ Never enable debug mode in production**

## Security Best Practices

1. **Environment Variables**
   - Use Render's environment variable management
   - Never commit secrets to Git
   - Rotate `SECRET_KEY` regularly

2. **Access Control**
   - Use Render's team management
   - Limit deployment permissions
   - Monitor access logs

3. **Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Test updates in staging first

## Performance Optimization

### Backend Optimization
- **Memory Efficiency**: Explicit cleanup after processing
- **Async Processing**: Non-blocking I/O operations
- **Request Queuing**: Handle concurrent forecasting requests

### Frontend Optimization
- **Code Splitting**: Lazy load components
- **Asset Optimization**: Compressed images and fonts
- **Caching**: Browser caching for static assets

## Support and Documentation

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **FastAPI Documentation**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **Vue.js Documentation**: [vuejs.org](https://vuejs.org)
- **Prophet Documentation**: [facebook.github.io/prophet](https://facebook.github.io/prophet)

## Privacy Compliance

This deployment is designed to be compliant with privacy regulations:

- **GDPR**: No personal data storage or processing
- **CCPA**: No data collection or retention
- **HIPAA**: Suitable for healthcare data (no PHI storage)
- **SOC 2**: Render provides SOC 2 Type II compliance

The stateless architecture ensures that user data never persists on servers, providing the highest level of privacy protection.