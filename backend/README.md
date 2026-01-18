# Prophetly Backend

FastAPI backend for Prophetly, serving Facebook Prophet forecasts.

## Stack

- **Framework**: FastAPI
- **ML Library**: Facebook Prophet
- **Data**: Pandas

## Setup

```bash
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
```

## Running

```bash
uvicorn main:app --reload
```

## Deployment (Render)

Ensure `requirements.txt` is present. Render will auto-detect the Python environment.
Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
