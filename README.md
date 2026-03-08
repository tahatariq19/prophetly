# Prophetly

A modern, dark-themed time series forecasting application using **Facebook Prophet**, **FastAPI**, and **React**.

## Project Structure

- **frontend/**: React application (Vite, Tailwind, Recharts).
- **backend/**: Python API (FastAPI, Prophet).
- **scripts/**: Utility scripts (e.g., favicon generation).

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)

### Running Locally

1. **Backend**:

   ```bash
   cd backend
   python -m venv .venv

   # Linux & MacOS
   .venv/bin/activate

   # Windows
   .venv\Scripts\Activate.ps1
   
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Frontend**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Access the app at `http://localhost:5173`.
