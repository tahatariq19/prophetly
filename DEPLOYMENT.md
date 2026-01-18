# Deployment Guide

Follow these steps to deploy Prophetly to production.

## 1. Backend Deployment (Render)

We will deploy the FastAPI backend first to get the API URL.

1. **Push to GitHub**: Ensure your code is pushed to your repository.
2. **Create Service**:
    * Log in to [Render](https://render.com).
    * Click **New +** -> **Web Service**.
    * Connect your GitHub repository.
3. **Configure**:
    * **Root Directory**: `backend`
    * **Name**: `prophetly-api` (or similar)
    * **Runtime**: Python 3
    * **Build Command**: `pip install -r requirements.txt`
    * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
4. **Wait for Deploy**: Render will install dependencies and start the server.
5. **Copy URL**: Once live, copy your backend URL (e.g., `https://prophetly-api.onrender.com`).

---

## 2. Frontend Deployment (Vercel)

Now we deploy the React frontend and point it to the backend.

1. **Create Project**:
    * Log in to [Vercel](https://vercel.com).
    * Click **Add New...** -> **Project**.
    * Import your GitHub repository.
2. **Configure**:
    * **Root Directory**: Click "Edit" and select `frontend`.
    * **Framework Preset**: Vite (should be auto-detected).
    * **Build Command**: `npm run build`
    * **Output Directory**: `dist`
3. **Environment Variables**:
    * Expand the **Environment Variables** section.
    * Add:
        * **Key**: `VITE_API_URL`
        * **Value**: The Render URL you copied earlier (e.g., `https://prophetly-api.onrender.com`). **Important**: Do not add a trailing slash.
4. **Deploy**: Click **Deploy**.

## 3. Verification

1. Open your Vercel URL.
2. The app should load.
3. Upload a CSV and verify that "Configure Model" appears.
4. Run a Forecast. If it works, the Frontend is successfully talking to the Backend!
