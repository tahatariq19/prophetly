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

## License

MIT License - see LICENSE file for details