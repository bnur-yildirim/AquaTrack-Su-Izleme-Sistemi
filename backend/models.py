from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, date


class Lake(BaseModel):
    lake_id: int  # Unique numeric ID for your lake
    name: str  # Lake name, e.g., "Tuz Gölü"
    location: Dict[str, float]  # {"lat": 38.75, "lon": 33.33}
    area_km2: Optional[float]  # Approximate lake area
    basin: Optional[str] = None  # Basin name, e.g., "Central Anatolia"
    altitude_m: Optional[float] = None  # Elevation above sea level
    extra_info: Optional[Dict[str, str]] = {}  # Any other metadata


class SatelliteImage(BaseModel):
    lake_id: int
    date: date
    source: str
    bands: List[str]
    storage_path: str


class WaterQuantityPrediction(BaseModel):
    lake_id: int
    date: date
    model_version: str
    prediction_type: str = "water_quantity"
    inputs: Dict[str, float]  # e.g., {"tiles_processed": 5, "avg_ndwi": 0.34}
    outputs: Dict[
        str, float
    ]  # e.g., {"water_area_km2": 1220.5, "water_extent_change_pct": -2.4}
    created_at: Optional[datetime] = None


class WaterQualityPrediction(BaseModel):
    lake_id: int
    date: date
    model_version: str
    prediction_type: str = "water_quality"
    inputs: Dict[str, str]  # e.g., {"bands_used": ["B2", "B3"]}
    outputs: Dict[
        str, float
    ]  # e.g., {"turbidity_index": 15.2, "algae_probability": 0.67}
    created_at: Optional[datetime] = None


class WaterQuantityObservation(BaseModel):
    lake_id: int
    date: int  # Unix timestamp in ms (so it matches your dataset)
    water_area_m2: float
    valid_pixel_ratio: float
    cloud_pct: float
    num_tiles: int
    missing_flag: int
    features: Dict[
        str, float
    ]  # All extra statistics (ndwi, bands, rolling means, etc.)
    lake_name: str  # ✅ required, no Optional
    created_at: Optional[datetime] = None


# New models for additional data
class User(BaseModel):
    username: str
    password_hash: str
    user_type: str  # 'admin', 'municipality', 'public'
    city: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    preferences: Optional[Dict[str, Any]] = {}
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class UserSession(BaseModel):
    user_id: str  # MongoDB ObjectId as string
    token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class ModelMetadata(BaseModel):
    model_id: str
    model_type: str
    version: str
    parameters: Dict[str, Any]
    performance: Dict[str, float]
    training_date: Optional[datetime] = None
    status: str = "active"  # 'active', 'deprecated', 'training'
    file_path: Optional[str] = None
    created_at: Optional[datetime] = None


class ModelPredictionHistory(BaseModel):
    lake_id: int
    date: str  # Changed to string for MongoDB compatibility
    model_id: str
    prediction_type: str
    horizon: int  # H=1,2,3 months ahead
    inputs: Dict[str, Any]
    outputs: Dict[str, float]
    confidence_score: Optional[float] = None
    baseline_locf: Optional[float] = None
    baseline_seasonal: Optional[float] = None
    created_at: Optional[datetime] = None


class WaterQualityParameters(BaseModel):
    lake_id: int
    parameters: Dict[str, float]  # pH, Turbidite, etc.
    source: str = "historical_data"
    updated_at: Optional[datetime] = None


class QualityTrends(BaseModel):
    parameter: str
    trend_value: float
    unit: str = "per_month"
    updated_at: Optional[datetime] = None


class SpectralProfiles(BaseModel):
    lake_id: int
    bands: Dict[str, float]  # B2, B3, B4, etc.
    updated_at: Optional[datetime] = None


class QualityScores(BaseModel):
    lake_id: int
    base_score: float
    updated_at: Optional[datetime] = None


class SystemConfig(BaseModel):
    config_type: str  # 'api_limits', 'model_paths', etc.
    settings: Dict[str, Any]
    updated_at: Optional[datetime] = None


class TrainingData(BaseModel):
    lake_id: int
    date: date
    horizon: int  # H=1,2,3
    split_type: str  # 'train', 'val', 'test'
    features: Dict[str, float]
    target_water_area_m2: Optional[float] = None
    target_date: Optional[date] = None
    baseline_locf: Optional[float] = None
    baseline_seasonal: Optional[float] = None
    lake_id_enc: Optional[int] = None
    created_at: Optional[datetime] = None


class LabelEncoder(BaseModel):
    encoder_name: str
    classes: List[str]
    file_path: Optional[str] = None
    created_at: Optional[datetime] = None
