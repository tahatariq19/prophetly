# Development Guide

## Privacy-First Architecture

This application follows strict privacy principles:

- **No Persistent Storage**: All data processing happens in memory
- **Stateless Design**: No session data stored on server
- **Automatic Cleanup**: Memory cleared after each request
- **Client-Side Preferences**: User settings stored in browser only

## Project Structure

```
prophet-web-interface/
├── backend/                    # FastAPI backend
│   ├── src/                   # Source code
│   │   ├── api/              # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── models/           # Data models
│   │   ├── utils/            # Utilities
│   │   ├── config.py         # Configuration
│   │   └── main.py           # Application entry
│   ├── tests/                # Backend tests
│   └── requirements.txt      # Python dependencies
├── frontend/                  # Vue.js frontend
│   ├── src/                  # Source code
│   │   ├── components/       # Vue components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── utils/           # Utilities
│   │   └── main.js          # Application entry
│   ├── tests/               # Frontend tests
│   └── package.json         # Node dependencies
└── docker-compose.yml       # Development environment
```

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.9+ (for local development)
- Node.js 18+ (for local development)

### Quick Start

1. **Clone and start**
   ```bash
   git clone <repository>
   cd prophet-web-interface
   make dev
   ```

2. **Access applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Local Development (without Docker)

1. **Backend setup**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements-dev.txt
   uvicorn src.main:app --reload
   ```

2. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development Commands

```bash
# Start development environment
make dev

# Run tests
make test
make test-backend
make test-frontend
make test-e2e

# Code quality
make format
make lint

# Build and test production
make build
make prod-test

# Clean up
make clean
```

## Testing Strategy

### Backend Testing
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Privacy Tests**: Memory cleanup verification

### Frontend Testing
- **Component Tests**: Vue component testing
- **E2E Tests**: Full user workflow testing
- **Privacy Tests**: Client-side data handling

### Privacy Compliance Testing
- Memory usage monitoring
- Data persistence checks
- Session cleanup verification
- No logging of user data

## Code Quality Standards

### Python (Backend)
- **Black**: Code formatting
- **Flake8**: Linting
- **isort**: Import sorting
- **mypy**: Type checking
- **pytest**: Testing framework

### JavaScript (Frontend)
- **ESLint**: Linting
- **Prettier**: Code formatting
- **Vitest**: Unit testing
- **Playwright**: E2E testing

## Privacy Development Guidelines

### Backend Privacy Rules
1. Never write user data to disk
2. Process all data in memory only
3. Implement automatic memory cleanup
4. No user data in logs or error messages
5. Use secure session management

### Frontend Privacy Rules
1. Store preferences in browser only
2. Clear sensitive data on page unload
3. Display privacy notices prominently
4. Handle errors without exposing data
5. Use secure API communication

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Core settings
ENVIRONMENT=development
MAX_SESSION_AGE=7200
MAX_MEMORY_MB=512

# Security
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000

# File handling
MAX_FILE_SIZE_MB=50
```

## Deployment

### Render Platform
- Automatic deployment from Git
- Separate frontend and backend services
- Environment variables via dashboard
- Built-in SSL and scaling

### Local Production Testing
```bash
make prod-test
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `ALLOWED_ORIGINS` in backend config
   - Verify frontend API URL configuration

2. **Memory Issues**
   - Adjust `MAX_MEMORY_MB` setting
   - Check session cleanup intervals

3. **File Upload Issues**
   - Verify `MAX_FILE_SIZE_MB` setting
   - Check file type restrictions

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
export DEBUG=true
```

## Contributing

1. Follow privacy-first principles
2. Write tests for all new features
3. Update documentation
4. Run privacy compliance checks
5. Use conventional commit messages

## Privacy Compliance Checklist

- [ ] No persistent storage configured
- [ ] Memory-only data processing
- [ ] Automatic session cleanup
- [ ] No user data in logs
- [ ] Secure error handling
- [ ] Client-side preference storage
- [ ] Privacy notices displayed
- [ ] Data cleanup on errors