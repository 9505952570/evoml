from __future__ import annotations

from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC

app = FastAPI(title="EvoML Adaptive ML Platform", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DatasetInput(BaseModel):
    data: List[Dict[str, Any]] = Field(default_factory=list)
    target_column: str = Field(..., description="Name of the target column")


class DatasetProfile(BaseModel):
    rows: int
    columns: int
    target_column: str
    problem_type: str
    feature_summary: Dict[str, Dict[str, Any]]
    missing_ratio: float
    numeric_columns: List[str]
    categorical_columns: List[str]
    imbalance: Optional[float] = None
    drift_risk: float = 0.0


class PipelineRecommendation(BaseModel):
    preprocessing_steps: List[str]
    candidate_models: List[str]
    rationale: str
    drift_strategy: str
    adaptation_plan: List[str]


class ModelEvaluationRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(default_factory=list)
    target_column: str = Field(...)
    candidate_models: List[str] = [
        "logistic_regression",
        "random_forest",
        "gradient_boosting",
    ]


class ModelScore(BaseModel):
    model: str
    score: float
    metric: str


class DriftSummary(BaseModel):
    drift_risk: float
    label_imbalance: Optional[float] = None
    missingness: float
    recommendation: str


class HealthResponse(BaseModel):
    status: str
    message: str


def infer_problem_type(target: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(target) or pd.api.types.is_object_dtype(target):
        return "classification"
    if pd.api.types.is_numeric_dtype(target):
        unique_values = target.nunique(dropna=True)
        if unique_values <= 10:
            return "classification"
        return "regression"
    return "classification"


def summarize_columns(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    summary: Dict[str, Dict[str, Any]] = {}
    for column in df.columns:
        series = df[column]
        if pd.api.types.is_numeric_dtype(series):
            summary[column] = {
                "dtype": "numeric",
                "missing": int(series.isna().sum()),
                "unique": int(series.nunique(dropna=True)),
                "mean": round(float(series.mean()), 4) if series.notna().any() else None,
                "std": round(float(series.std()), 4) if series.notna().any() else None,
            }
        else:
            summary[column] = {
                "dtype": "categorical",
                "missing": int(series.isna().sum()),
                "unique": int(series.nunique(dropna=True)),
                "top_values": series.dropna().value_counts().head(3).to_dict(),
            }
    return summary


def compute_imbalance(df: pd.DataFrame, target_column: str) -> Optional[float]:
    if target_column not in df.columns:
        return None
    target = df[target_column].dropna()
    if target.empty:
        return None
    counts = target.value_counts()
    if len(counts) <= 1:
        return 1.0
    return float(counts.min() / counts.max())


def compute_drift_risk(df: pd.DataFrame, target_column: str) -> float:
    missing_ratio = float(df.isna().mean().mean())
    imbalance = compute_imbalance(df, target_column)
    risk = missing_ratio * 0.55
    if imbalance is not None:
        risk += (1.0 - imbalance) * 0.45
    return round(min(risk, 1.0), 4)


def profile_dataset(data: List[Dict[str, Any]], target_column: str) -> DatasetProfile:
    if not data:
        raise ValueError("Dataset cannot be empty")
    if target_column not in data[0]:
        raise ValueError(f"Target column '{target_column}' not found in dataset")

    df = pd.DataFrame(data)
    if df.empty:
        raise ValueError("Dataset cannot be empty")

    missing_ratio = float(df.isna().mean().mean())
    numeric_columns = list(df.select_dtypes(include=[np.number]).columns)
    categorical_columns = [col for col in df.columns if col not in numeric_columns]
    problem_type = infer_problem_type(df[target_column])
    imbalance = compute_imbalance(df, target_column)
    drift_risk = compute_drift_risk(df, target_column)

    return DatasetProfile(
        rows=int(len(df)),
        columns=int(len(df.columns)),
        target_column=target_column,
        problem_type=problem_type,
        feature_summary=summarize_columns(df),
        missing_ratio=missing_ratio,
        numeric_columns=numeric_columns,
        categorical_columns=categorical_columns,
        imbalance=imbalance,
        drift_risk=drift_risk,
    )


def build_recommendation(profile: DatasetProfile) -> PipelineRecommendation:
    steps: List[str] = []
    adaptation_plan: List[str] = []

    if profile.missing_ratio > 0:
        steps.append("impute missing values")
        adaptation_plan.append("re-check missing-value patterns after each retraining cycle")
    if profile.categorical_columns:
        steps.append("encode categorical variables")
    if profile.numeric_columns:
        steps.append("scale numeric features")
    if profile.problem_type == "classification":
        steps.append("apply stratified validation")
        adaptation_plan.append("monitor class balance and trigger rebalancing if drift occurs")
    else:
        adaptation_plan.append("track target distribution and prediction variance for regression drift")

    if profile.problem_type == "classification":
        if profile.imbalance is not None and profile.imbalance < 0.5:
            steps.append("rebalance target distribution")
        candidate_models = ["logistic_regression", "random_forest", "gradient_boosting", "svm"]
    else:
        candidate_models = ["linear_regression", "random_forest", "gradient_boosting"]

    if profile.drift_risk > 0.5:
        adaptation_plan.append("activate retraining trigger and fallback model selection")

    rationale = (
        "The system combines data quality checks, class/target balance analysis, and feature type profiling "
        "to choose preprocessing and model candidates that are stable under distribution shifts."
    )
    drift_strategy = (
        "monitor feature drift, prediction drift, and label drift; retrain when validation score falls or "
        "distribution change exceeds the configured threshold"
    )

    return PipelineRecommendation(
        preprocessing_steps=steps,
        candidate_models=candidate_models,
        rationale=rationale,
        drift_strategy=drift_strategy,
        adaptation_plan=adaptation_plan,
    )


def build_model(model_name: str):
    model_map = {
        "logistic_regression": LogisticRegression(max_iter=2000, random_state=42),
        "random_forest": RandomForestClassifier(n_estimators=250, random_state=42),
        "gradient_boosting": GradientBoostingClassifier(random_state=42),
        "svm": SVC(kernel="rbf", probability=False, random_state=42),
        "linear_regression": LinearRegression(),
        "random_forest_regressor": RandomForestRegressor(n_estimators=250, random_state=42),
        "gradient_boosting_regressor": GradientBoostingRegressor(random_state=42),
    }
    if model_name not in model_map:
        raise ValueError(f"Unsupported model: {model_name}")
    return model_map[model_name]


def build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    numeric_features = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_features = [col for col in X.columns if col not in numeric_features]

    transformers: List[tuple] = []

    if numeric_features:
        transformers.append(
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_features,
            )
        )

    if categorical_features:
        transformers.append(
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_features,
            )
        )

    return ColumnTransformer(transformers=transformers, remainder="drop")


@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", message="EvoML backend is running")


@app.post("/api/datasets/profile", response_model=DatasetProfile)
def profile_endpoint(payload: DatasetInput):
    return profile_dataset(payload.data, payload.target_column)


@app.post("/api/pipeline/recommend", response_model=PipelineRecommendation)
def recommend_pipeline(payload: DatasetInput):
    profile = profile_dataset(payload.data, payload.target_column)
    return build_recommendation(profile)


@app.post("/api/drift/summary")
def drift_summary(payload: DatasetInput) -> DriftSummary:
    profile = profile_dataset(payload.data, payload.target_column)
    risk = profile.drift_risk
    if risk > 0.7:
        recommendation = "High drift risk detected. Trigger retraining and re-sample data before deployment."
    elif risk > 0.4:
        recommendation = "Moderate drift risk. Monitor validation score and feature distribution closely."
    else:
        recommendation = "Low drift risk. Current pipeline remains stable for the present dataset."

    return DriftSummary(
        drift_risk=risk,
        label_imbalance=profile.imbalance,
        missingness=profile.missing_ratio,
        recommendation=recommendation,
    )


@app.post("/api/models/evaluate")
def evaluate_models(payload: ModelEvaluationRequest):
    if not payload.data:
        raise ValueError("Dataset cannot be empty")

    df = pd.DataFrame(payload.data)
    if payload.target_column not in df.columns:
        raise ValueError(f"Target column '{payload.target_column}' not found in dataset")

    X = df.drop(columns=[payload.target_column])
    y = df[payload.target_column]
    problem_type = infer_problem_type(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y if problem_type == "classification" and y.nunique() > 1 else None,
    )

    results: List[Dict[str, Any]] = []
    for model_name in payload.candidate_models:
        if problem_type == "classification":
            if model_name.endswith("_regressor"):
                continue
            model = build_model(model_name)
            pipeline = Pipeline(
                steps=[("preprocessor", build_preprocessor(X_train)), ("model", model)]
            )
            pipeline.fit(X_train, y_train)
            pred = pipeline.predict(X_test)
            score = float(accuracy_score(y_test, pred))
            metric_name = "accuracy"
        else:
            if model_name not in {"linear_regression", "random_forest_regressor", "gradient_boosting_regressor"}:
                continue
            model = build_model(model_name)
            pipeline = Pipeline(
                steps=[("preprocessor", build_preprocessor(X_train)), ("model", model)]
            )
            pipeline.fit(X_train, y_train)
            pred = pipeline.predict(X_test)
            score = float(r2_score(y_test, pred))
            metric_name = "r2"

        results.append({"model": model_name, "score": round(score, 4), "metric": metric_name})

    if not results:
        raise ValueError("No valid candidate models were available for this dataset")

    results.sort(key=lambda item: item["score"], reverse=True)
    return results


@app.post("/api/upload/csv")
def upload_csv(file: UploadFile = File(...)):
    contents = file.file.read().decode("utf-8")
    if not contents.strip():
        raise ValueError("Uploaded CSV file is empty")

    lines = contents.splitlines()
    if len(lines) < 2:
        raise ValueError("CSV must contain at least a header row and one data row")

    header = [cell.strip() for cell in lines[0].split(",")]
    rows = []
    for line in lines[1:]:
        values = [cell.strip() for cell in line.split(",")]
        if len(values) != len(header):
            continue
        rows.append(dict(zip(header, values)))

    return {"rows": rows, "headers": header}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
