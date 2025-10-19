from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, date
import os
import pickle
import json
import numpy as np
from utils import log_info, log_error
from config import BACKEND_MODELS_DIR, MODEL_FILES


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


# Global variables to store loaded models
LOADED_MODELS = {}
MODEL_METADATA = {}
WATER_QUALITY_MODELS = {}


def load_water_quality_models():
    """Load Water Quality ML models"""
    global WATER_QUALITY_MODELS
    
    log_info("🔬 Su Kalitesi modelleri yükleniyor...")
    
    try:
        # K-Means Clustering model
        kmeans_path = os.path.join('models_external', 'kmeans_water_quality.pkl')
        scaler_path = os.path.join('models_external', 'scaler_water_quality.pkl')
        
        if os.path.exists(kmeans_path) and os.path.exists(scaler_path):
            with open(kmeans_path, 'rb') as f:
                kmeans_model = pickle.load(f)
            with open(scaler_path, 'rb') as f:
                scaler = pickle.load(f)
            
            WATER_QUALITY_MODELS['kmeans'] = kmeans_model
            WATER_QUALITY_MODELS['scaler'] = scaler
            log_info(f"✅ K-Means Clustering model yüklendi")
            log_info(f"   - Clusters: 4")
            log_info(f"   - Features: NDWI, WRI, Chl-a, Turbidity")
        else:
            log_error(f"⚠️ Su kalitesi modelleri bulunamadı: {kmeans_path}")
        
        # XGBoost No Leakage model (opsiyonel)
        xgb_path = os.path.join('models_external', 'phase3_no_leakage_best_model.pkl')
        xgb_scaler_path = os.path.join('models_external', 'phase3_no_leakage_scaler.pkl')
        
        if os.path.exists(xgb_path) and os.path.exists(xgb_scaler_path):
            with open(xgb_path, 'rb') as f:
                xgb_model = pickle.load(f)
            with open(xgb_scaler_path, 'rb') as f:
                xgb_scaler = pickle.load(f)
            
            WATER_QUALITY_MODELS['xgboost'] = xgb_model
            WATER_QUALITY_MODELS['xgboost_scaler'] = xgb_scaler
            log_info(f"✅ XGBoost Classification model yüklendi")
        
        log_info(f"🎯 Toplam {len(WATER_QUALITY_MODELS)} su kalitesi modeli yüklendi")
        return True
        
    except Exception as e:
        log_error(f"❌ Su kalitesi model yükleme hatası: {e}")
        return False


def load_models():
    """Load ML models from the models directory"""
    global LOADED_MODELS, MODEL_METADATA
    
    log_info("🤖 ML modelleri yükleniyor...")
    
    try:
        # Check if CatBoost is available
        try:
            import catboost
            catboost_available = True
            log_info("✅ CatBoost kütüphanesi mevcut")
        except ImportError:
            catboost_available = False
            log_info("⚠️ CatBoost kütüphanesi bulunamadı - modeller yüklenemeyecek")
        
        # Load each model file
        for model_file in MODEL_FILES:
            model_path = os.path.join(BACKEND_MODELS_DIR, model_file)
            
            if not os.path.exists(model_path):
                log_error(f"Model dosyası bulunamadı: {model_path}")
                continue
            
            try:
                if catboost_available:
                    # Try to load with CatBoost
                    try:
                        model = catboost.CatBoostRegressor()
                        model.load_model(model_path)
                        horizon = model_file.split('_')[1].replace('.pkl', '')
                        LOADED_MODELS[horizon] = model
                        log_info(f"✅ CatBoost model yüklendi: {horizon} - {model_path}")
                    except Exception as catboost_error:
                        log_error(f"CatBoost model yükleme hatası {model_file}: {catboost_error}")
                        # Fallback to pickle
                        with open(model_path, 'rb') as f:
                            model = pickle.load(f)
                        horizon = model_file.split('_')[1].replace('.pkl', '')
                        LOADED_MODELS[horizon] = model
                        log_info(f"✅ Pickle model yüklendi: {horizon} - {model_path}")
                else:
                    # Try standard pickle loading
                    with open(model_path, 'rb') as f:
                        model = pickle.load(f)
                    horizon = model_file.split('_')[1].replace('.pkl', '')
                    LOADED_MODELS[horizon] = model
                    log_info(f"✅ Pickle model yüklendi: {horizon} - {model_path}")
                
            except Exception as e:
                log_error(f"Model yükleme hatası {model_file}: {e}")
                # Continue with other models even if one fails
                continue
        
        # Load metadata files
        for horizon in ['H1', 'H2', 'H3']:
            metadata_file = f"metadata_{horizon}_improved.json"
            metadata_path = os.path.join(BACKEND_MODELS_DIR, metadata_file)
            
            if os.path.exists(metadata_path):
                try:
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    MODEL_METADATA[horizon] = metadata
                    log_info(f"📊 Metadata yüklendi: {horizon}")
                except Exception as e:
                    log_error(f"Metadata yükleme hatası {metadata_file}: {e}")
        
        log_info(f"🎯 Toplam {len(LOADED_MODELS)} su miktarı modeli yüklendi: {list(LOADED_MODELS.keys())}")
        
        # Su kalitesi modellerini yükle
        load_water_quality_models()
        
        # Return True even if no models loaded - don't fail the app
        if len(LOADED_MODELS) == 0 and len(WATER_QUALITY_MODELS) == 0:
            log_info("⚠️ Hiç model yüklenemedi, ancak uygulama çalışmaya devam edecek")
        
        return True
        
    except Exception as e:
        log_error(f"Model yükleme genel hatası: {e}")
        # Don't fail the entire app if models can't be loaded
        log_info("⚠️ Model yükleme başarısız, ancak uygulama çalışmaya devam edecek")
        return True


def get_model(horizon):
    """Get a specific model by horizon (H1, H2, H3)"""
    return LOADED_MODELS.get(horizon)


def get_model_metadata(horizon):
    """Get metadata for a specific model"""
    return MODEL_METADATA.get(horizon)


def get_all_models():
    """Get all loaded models"""
    return LOADED_MODELS


def get_all_metadata():
    """Get all model metadata"""
    return MODEL_METADATA


def get_models():
    """Get all loaded models (alias for get_all_models)"""
    return LOADED_MODELS


def is_models_loaded():
    """Check if any models are loaded"""
    return len(LOADED_MODELS) > 0


# Küçük göller için iyileştirme ayarları
SMALL_LAKE_CONFIG = {
    '14510': {  # Sapanca
        'name': 'Sapanca Gölü',
        'samples': 22,
        'ensemble_weight': {'baseline_seasonal': 0.7, 'model_prediction': 0.3},
        'confidence_factor': 0.6,
        'transfer_from': '1340'  # Eğirdir'den transfer learning
    },
    '14741': {  # Salda
        'name': 'Salda Gölü', 
        'samples': 39,
        'ensemble_weight': {'baseline_seasonal': 0.6, 'model_prediction': 0.4},
        'confidence_factor': 0.7,
        'transfer_from': '1342'  # Burdur'dan transfer learning
    },
    '1321': {  # Ulubat
        'name': 'Ulubat Gölü',
        'samples': 54, 
        'ensemble_weight': {'baseline_seasonal': 0.5, 'model_prediction': 0.5},
        'confidence_factor': 0.8,
        'transfer_from': '140'  # Tuz'dan transfer learning
    }
}


# ============================================================
# SU KALİTESİ TAHMİN FONKSİYONLARI
# ============================================================

def predict_water_quality_cluster(ndwi, wri, chl_a, turbidity):
    """
    Su kalitesi cluster tahmini (Unsupervised)
    
    Args:
        ndwi: NDWI mean value
        wri: WRI mean value
        chl_a: Chlorophyll-a mean value
        turbidity: Turbidity mean value
    
    Returns:
        dict: {
            'cluster': int,
            'interpretation': str,
            'confidence': float,
            'features': dict
        }
    """
    try:
        if 'kmeans' not in WATER_QUALITY_MODELS or 'scaler' not in WATER_QUALITY_MODELS:
            return {
                'error': 'Model yüklenmemiş',
                'cluster': None
            }
        
        kmeans = WATER_QUALITY_MODELS['kmeans']
        scaler = WATER_QUALITY_MODELS['scaler']
        
        # Feature array
        features = np.array([[ndwi, wri, chl_a, turbidity]])
        
        # Normalize
        features_scaled = scaler.transform(features)
        
        # Cluster prediction
        cluster = int(kmeans.predict(features_scaled)[0])
        
        # Distance to cluster center (confidence)
        distances = kmeans.transform(features_scaled)[0]
        confidence = 1.0 / (1.0 + distances[cluster])
        
        # Cluster interpretations
        interpretations = {
            0: "Normal su kalitesi - Standart durum",
            1: "Alg patlaması riski - Yüksek Chlorophyll-a",
            2: "Tuzlu su özellikleri - Tuz Gölü benzeri",
            3: "Özel coğrafi durum - Van Gölü benzeri"
        }
        
        # Similar lakes by cluster
        similar_lakes = {
            0: ["Burdur", "Tuz", "Ulubat", "Eğirdir"],
            1: ["Salda"],
            2: ["Tuz"],
            3: ["Van", "Salda"]
        }
        
        return {
            'cluster': cluster,
            'interpretation': interpretations.get(cluster, 'Bilinmeyen'),
            'confidence': float(confidence),
            'similar_lakes': similar_lakes.get(cluster, []),
            'features': {
                'ndwi': float(ndwi),
                'wri': float(wri),
                'chl_a': float(chl_a),
                'turbidity': float(turbidity)
            }
        }
        
    except Exception as e:
        log_error(f"Cluster tahmin hatası: {e}")
        return {
            'error': str(e),
            'cluster': None
        }


def get_improved_prediction(lake_id, model_prediction, baseline_seasonal, horizon='H1'):
    """
    Küçük göller için iyileştirilmiş tahmin
    
    Args:
        lake_id: Göl ID'si
        model_prediction: Model tahmini
        baseline_seasonal: Mevsimsel baseline tahmini
        horizon: Tahmin horizonu (H1, H2, H3)
    
    Returns:
        dict: İyileştirilmiş tahmin ve güven skoru
    """
    lake_id_str = str(lake_id)
    
    # Küçük göl mü kontrol et
    if lake_id_str in SMALL_LAKE_CONFIG:
        config = SMALL_LAKE_CONFIG[lake_id_str]
        
        # Ensemble tahmini hesapla
        ensemble_pred = (
            config['ensemble_weight']['baseline_seasonal'] * baseline_seasonal +
            config['ensemble_weight']['model_prediction'] * model_prediction
        )
        
        return {
            'prediction': ensemble_pred,
            'confidence': config['confidence_factor'],
            'method': 'ensemble',
            'weights': config['ensemble_weight'],
            'transfer_from': config['transfer_from'],
            'original_model_pred': model_prediction,
            'baseline_pred': baseline_seasonal
        }
    else:
        # Büyük göller için normal model tahmini
        return {
            'prediction': model_prediction,
            'confidence': 0.95,  # Yüksek güven
            'method': 'direct_model',
            'weights': {'baseline_seasonal': 0.0, 'model_prediction': 1.0},
            'transfer_from': None,
            'original_model_pred': model_prediction,
            'baseline_pred': baseline_seasonal
        }


def get_lake_performance_metrics(lake_id):
    """
    Göl performans metriklerini al (iyileştirme sonrası)
    """
    lake_id_str = str(lake_id)
    
    if lake_id_str in SMALL_LAKE_CONFIG:
        config = SMALL_LAKE_CONFIG[lake_id_str]
        return {
            'lake_name': config['name'],
            'samples': config['samples'],
            'improvement_applied': True,
            'ensemble_method': True,
            'confidence_factor': config['confidence_factor'],
            'transfer_learning': config['transfer_from']
        }
    else:
        return {
            'lake_name': f"Göl {lake_id}",
            'samples': 70,  # Ortalama büyük göl örneği
            'improvement_applied': False,
            'ensemble_method': False,
            'confidence_factor': 0.95,
            'transfer_learning': None
        }


def predict_future(lake_numeric_id, months_ahead=3):
    """
    Gerçek CatBoost modeli ile gelecek tahminleri
    """
    import pandas as pd
    import numpy as np
    
    try:
        # Mevcut veriyi al
        parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
        df = pd.read_parquet(parquet_path)
        lake_data = df[df['lake_id'] == lake_numeric_id].copy()
        
        if lake_data.empty:
            log_error(f"Göl verisi bulunamadı: {lake_numeric_id}")
            return None
        
        # Son 12 aylık veriyi al (feature engineering için)
        lake_data['date'] = pd.to_datetime(lake_data['date'])
        lake_data = lake_data.sort_values('date')
        recent_data = lake_data.tail(12)
        
        if len(recent_data) < 3:
            log_error(f"Yetersiz veri: {lake_numeric_id} - sadece {len(recent_data)} kayıt")
            return None
        
        # Feature'ları hazırla (son satır)
        last_row = recent_data.iloc[-1]
        
        # Model metadata'sından gerekli feature'ları al
        metadata = MODEL_METADATA.get('H1', {})
        required_features = metadata.get('selected_features', [])
        
        # Temel features
        features = {}
        
        # 1. Water area features
        current_area = last_row['target_water_area_m2']
        features['water_area_m2'] = current_area
        features['water_area_target_H1'] = current_area  # Placeholder
        features['water_area_target_H2'] = current_area  # Placeholder  
        features['water_area_target_H3'] = current_area  # Placeholder
        
        # 2. Lag features
        for lag in [1, 2, 3, 5, 6]:
            if len(recent_data) >= lag:
                features[f'lag_{lag}'] = recent_data.iloc[-lag]['target_water_area_m2']
                features[f'water_area_lag_{lag}'] = recent_data.iloc[-lag]['target_water_area_m2']
            else:
                features[f'lag_{lag}'] = current_area
                features[f'water_area_lag_{lag}'] = current_area
        
        # 3. Rolling features
        if len(recent_data) >= 3:
            features['rolling3_mean'] = recent_data.tail(3)['target_water_area_m2'].mean()
            features['rolling3_max'] = recent_data.tail(3)['target_water_area_m2'].max()
            features['rolling3_min'] = recent_data.tail(3)['target_water_area_m2'].min()
            features['rolling_mean_3'] = features['rolling3_mean']
        
        if len(recent_data) >= 6:
            features['rolling6_mean'] = recent_data.tail(6)['target_water_area_m2'].mean()
            features['rolling6_std'] = recent_data.tail(6)['target_water_area_m2'].std()
            features['rolling_std_6'] = features['rolling6_std']
            
        if len(recent_data) >= 12:
            features['rolling12_mean'] = recent_data['target_water_area_m2'].mean()
            features['rolling12_max'] = recent_data['target_water_area_m2'].max()
            features['rolling12_std'] = recent_data['target_water_area_m2'].std()
        
        # 4. Time features
        features['doy'] = last_row['date'].dayofyear
        features['month'] = last_row['date'].month
        
        # 5. Lake encoding
        features['lake_id_enc'] = lake_numeric_id % 10  # Simple encoding
        
        # 6. Statistical features
        features['zscore'] = (current_area - recent_data['target_water_area_m2'].mean()) / recent_data['target_water_area_m2'].std() if recent_data['target_water_area_m2'].std() > 0 else 0
        features['water_area_cumsum'] = recent_data['target_water_area_m2'].cumsum().iloc[-1]
        
        # 7. NDWI features (placeholder)
        features['ndwi_mean'] = 0.5  # Placeholder
        features['ndwi_var'] = 0.1
        features['ndwi_p25'] = 0.4
        features['ndwi_min'] = 0.2
        features['ndwi_rolling_3'] = 0.5
        
        # 8. Spectral features (placeholder)
        features['b2_min'] = 0.05
        features['b8_min'] = 0.35
        features['b8_mean'] = 0.40
        
        # 9. Other features
        features['valid_pixel_ratio'] = 0.8  # Placeholder
        features['season_avg'] = current_area  # Placeholder
        features['baseline_seasonal'] = current_area  # Placeholder
        features['gap_days_since_last_obs'] = 30  # Placeholder
        
        # DataFrame'e çevir - doğru feature sırası ile
        feature_df = pd.DataFrame([features])
        
        # Model metadata'sından feature sırasını al
        if required_features:
            # Sadece gerekli feature'ları seç ve doğru sırada düzenle
            ordered_features = []
            for feature_name in required_features:
                if feature_name in features:
                    ordered_features.append(features[feature_name])
                else:
                    # Eksik feature için placeholder
                    ordered_features.append(0.0)
            
            # DataFrame'i yeniden oluştur
            feature_df = pd.DataFrame([ordered_features], columns=required_features)
        
        # Her horizon için tahmin yap
        predictions = {}
        
        # Modelleri yeniden yükle (güvenlik için)
        if not LOADED_MODELS:
            load_models()
        
        for horizon in ['H1', 'H2', 'H3']:
            model = LOADED_MODELS.get(horizon)
            
            if model is not None:
                try:
                    # Her horizon için ayrı feature seti hazırla
                    horizon_metadata = MODEL_METADATA.get(horizon, {})
                    horizon_features = horizon_metadata.get('selected_features', [])
                    
                    if horizon_features:
                        # Horizon'a özel feature sırası
                        ordered_features = []
                        for feature_name in horizon_features:
                            if feature_name in features:
                                ordered_features.append(features[feature_name])
                            else:
                                # Eksik feature için placeholder
                                ordered_features.append(0.0)
                        
                        # Horizon'a özel DataFrame
                        horizon_df = pd.DataFrame([ordered_features], columns=horizon_features)
                    else:
                        # Fallback - genel feature set
                        horizon_df = feature_df
                    
                    # Tahmin yap
                    pred = model.predict(horizon_df)[0]
                    predictions[horizon] = float(pred)
                    log_info(f"✅ {horizon} tahmini: {pred:.0f} m² (Göl: {lake_numeric_id})")
                except Exception as pred_error:
                    log_error(f"Tahmin hatası {horizon}: {pred_error}")
                    predictions[horizon] = None
            else:
                log_error(f"Model bulunamadı: {horizon}")
                predictions[horizon] = None
        
        return predictions
        
    except Exception as e:
        log_error(f"Tahmin hatası (Göl {lake_numeric_id}): {e}")
        return None