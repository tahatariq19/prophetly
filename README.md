# Prophet Web Interface

A privacy-first, full-stack web application for Facebook Prophet time series forecasting. All data processing happens in memory with no persistent storage.

## Features

- **Privacy-First**: Zero server-side data storage.
- **Stateless Architecture**: All processing in memory, with no user data stored on the server.
- **User-Friendly**: Simple interface for business users to upload data and generate forecasts.
- **Advanced Options**: Full Prophet parameter control for data scientists.
- **Cross-Platform**: Responsive web interface for desktop and mobile.

## Privacy Commitment

This application is built on a foundation of privacy-by-design.

- All data processing happens in server memory (volatile RAM) only.
- No persistent storage (databases, file systems) or caching is used for user data.
- Memory is automatically and securely cleared after each request is processed.
- User preferences are stored only in the browser's local storage.
- No user data is ever written to server logs.

## Architecture

- **Frontend**: Vue.js single-page application.
- **Backend**: Python FastAPI service with stateless, in-memory processing.
- **Deployment**: Configured for easy deployment on the Render platform.

## Local Development

### Prerequisites

- Docker and Docker Compose
- Python 3.9+ (for non-Docker setup)
- Node.js 18+ (for non-Docker setup)

### Quick Start with Docker (Recommended)

This is the easiest way to get the full application stack running.

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
    - **Frontend**: [http://localhost:3000](http://localhost:3000)
    - **Backend API**: [http://localhost:8000](http://localhost:8000)
    - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Manual Setup (without Docker)

#### Backend (FastAPI)

```bash
cd backend
python -m venv venv
# Activate the virtual environment (use source venv/bin/activate on Mac/Linux)
venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn src.main:app --reload
```

#### Frontend (Vue.js)

```bash
cd frontend
npm install
npm run dev
```

## Testing

You can run tests using Docker or manually for each part of the application.

```bash
# Run all tests via Docker (recommended)
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Run backend tests only
cd backend
pytest

# Run frontend tests only
cd frontend
npm test
```

## Deployment

This project is configured for seamless deployment to the [Render](https://render.com) platform using the [`render.yaml`](render.yaml:0) file.

1. **Connect Your Repository to Render**: In the Render dashboard, create a new "Blueprint" and select your repository.
2. **Deploy**: Render will automatically detect [`render.yaml`](render.yaml:0) and provision the frontend and backend services.
3. **Automatic Updates**: By default, Render will automatically redeploy your application whenever you push changes to your main branch.

The `render.yaml` file handles all the necessary environment variables and build commands for a production environment.

## Documentation

- **[API Documentation](./API_DOCUMENTATION.md)**: A complete technical reference for all API endpoints, perfect for developers building integrations.
- **[Privacy Policy](./PRIVACY_POLICY.md)**: A detailed look at the privacy commitments and legal documentation.

## License

MIT License - see LICENSE file for details.
