from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class MLAdminLoginRequest(BaseModel):
    password: str = Field(min_length=1)


class MLAdminSessionResponse(BaseModel):
    enabled: bool
    authenticated: bool
    token: str | None = None
    expires_at: datetime | None = None


class DistributionBucket(BaseModel):
    label: str
    count: int


class MLFeatureStat(BaseModel):
    feature: str
    average: float | None = None
    missing_count: int = 0
    sample_size: int = 0


class MLDataStats(BaseModel):
    total_users: int
    total_snapshots: int
    total_exam_results: int
    total_dataset_rows: int
    labeled_ratio: float


class MLDataQuality(BaseModel):
    avg_time_gap_days: float | None = None
    avg_activity_gap_days: float | None = None
    avg_confidence_score: float | None = None
    time_gap_distribution: list[DistributionBucket] = Field(default_factory=list)
    confidence_distribution: list[DistributionBucket] = Field(default_factory=list)


class MLDatasetHealth(BaseModel):
    usable_rows: int
    unusable_rows: int
    low_confidence_rows: int
    missing_snapshot_exam_results: int


class MLTrainingStatus(BaseModel):
    status: str
    artifact_path: str | None = None
    created_at: str | None = None
    message: str


class MLAdminDashboardResponse(BaseModel):
    stats: MLDataStats
    quality: MLDataQuality
    feature_stats: list[MLFeatureStat] = Field(default_factory=list)
    dataset_health: MLDatasetHealth
    training_status: MLTrainingStatus


class BuildDatasetResponse(BaseModel):
    built_rows: int
    usable_rows: int
    unusable_rows: int
    skipped_no_snapshot: int
    total_exam_results: int
    built_at: datetime


class TrainModelResponse(BaseModel):
    status: str
    message: str
    artifact_path: str
    dataset_rows: int
    usable_rows: int
    train_rows: int
    test_rows: int
    created_at: datetime
