# Prophet Web Interface

A privacy-first, full-stack web application for Facebook Prophet time series forecasting. All data processing happens in memory with no persistent storage.

## Features

- **Privacy-First**: Zero server-side data storage
- **Stateless Architecture**: All processing in memory
- **User-Friendly**: Accessible interface for business users
- **Advanced Options**: Full Prophet parameter control for data scientists
- **Cross-Platform**: Responsive web interface

## Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prophet-web-interface
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### Manual Setup

#### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn src.main:app --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Testing

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Backend tests only
cd backend
pytest tests/ -v --cov=src

# Frontend tests only
cd frontend
npm test
npm run test:e2e
```

## Privacy Commitment

- All data processing happens in server memory only
- No persistent storage or caching
- Automatic memory cleanup after each request
- User preferences stored only in browser cookies/localStorage
- No user data in server logs

## Architecture

- **Frontend**: Vue.js single-page application
- **Backend**: FastAPI with stateless processing
- **Processing**: In-memory Prophet forecasting
- **Deployment**: Render platform ready

## Deployment

### Render Platform (Recommended)

The application is configured for automatic deployment on Render:

1. **Connect Repository**: Link your GitHub repository to Render
2. **Blueprint Deployment**: Render automatically detects `render.yaml`
3. **Automatic Scaling**: Built-in scaling and health monitoring
4. **Privacy Compliance**: Stateless architecture with automatic cleanup

```bash
# Test deployment configuration
python scripts/test_deployment_config.py

# Validate deployed services
python scripts/validate_render_deployment.py
```

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed deployment instructions.

### Local Production Testing

```bash
# Test production build locally
docker-compose -f docker-compose.prod.yml up --build
```

## Documentation

- **[Deployment Guide](./RENDER_DEPLOYMENT.md)**: Complete Render deployment instructions
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)**: Step-by-step deployment validation
- **[Development Guide](./DEVELOPMENT.md)**: Local development setup and guidelines

## License

MIT License - see LICENSE file for details