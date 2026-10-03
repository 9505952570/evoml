# EvoML

EvoML is a self-adaptive machine learning system that automatically determines how data should be processed, which model to use, and how the pipeline should adapt to shifting data.

## Architecture

- Backend: FastAPI API for dataset profiling, model recommendations, and evaluation
- Frontend: Lightweight dashboard for exploring dataset characteristics and pipeline suggestions

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

Open the static dashboard in a browser:

```bash
cd frontend
python -m http.server 3000
```

Then visit:

- http://localhost:3000

The frontend calls the API at http://localhost:8000.

## API endpoints

- GET /api/health
- POST /api/datasets/profile
- POST /api/pipeline/recommend
- POST /api/models/evaluate

## Example workflow

1. Upload or paste a dataset into the dashboard.
2. Profile the data to detect feature types, missing values, and target behavior.
3. Get model and preprocessing recommendations.
4. Evaluate candidate models and choose the best adapter.

## Notes

This starter project is designed for experimentation and extension. You can evolve it into a full streaming ML platform by adding:

- retraining jobs
- drift detection monitors
- model registry storage
- experiment tracking
- automated deployment workflows
