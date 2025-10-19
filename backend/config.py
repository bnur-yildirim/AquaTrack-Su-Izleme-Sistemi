"""
Konfigürasyon dosyası - Tüm sabitler ve ayarlar
"""

import os
from database import get_database
from database.queries import DatabaseQueries

# Dizin yolları
BACKEND_MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_DIR = BACKEND_MODELS_DIR

# Göl bilgileri - MongoDB'den dinamik olarak yüklenir
def get_lake_info():
    """Get lake information from MongoDB"""
    try:
        queries = DatabaseQueries()
        lakes = queries.get_all_lakes()
        lake_info = {}
        key_by_id = {}
        
        for lake in lakes:
            lake_key = lake['lake_key']
            lake_info[lake_key] = {
                "id": lake['lake_id'],
                "name": lake['name'],
                "lat": lake['coordinates']['lat'],
                "lng": lake['coordinates']['lng']
            }
            key_by_id[lake['lake_id']] = lake_key
        
        return lake_info, key_by_id
    except Exception as e:
        print(f"Error loading lake info: {e}")
        # Fallback to empty dicts
        return {}, {}

# Global lake info - loaded at startup
LAKE_INFO, KEY_BY_ID = get_lake_info()

# Model dosya isimleri - Improved modeller (küçük göller için iyileştirilmiş)
MODEL_FILES = ["catboost_H1_improved.pkl", "catboost_H2_improved.pkl", "catboost_H3_improved.pkl"]

# Su kalitesi parametreleri - MongoDB'den dinamik olarak yüklenir
def get_lake_quality_params():
    """Get lake quality parameters from MongoDB"""
    try:
        queries = DatabaseQueries()
        lakes = queries.get_all_lakes()
        quality_params = {}
        
        for lake in lakes:
            quality_params[lake['lake_id']] = lake.get('quality_parameters', {})
        
        return quality_params
    except Exception as e:
        print(f"Error loading quality params: {e}")
        return {}

def get_spectral_profiles():
    """Get spectral profiles from MongoDB"""
    try:
        queries = DatabaseQueries()
        lakes = queries.get_all_lakes()
        spectral_profiles = {}
        
        for lake in lakes:
            spectral_profiles[lake['lake_id']] = lake.get('spectral_profile', {})
        
        return spectral_profiles
    except Exception as e:
        print(f"Error loading spectral profiles: {e}")
        return {}

# Global quality data - loaded at startup
LAKE_QUALITY_PARAMS = get_lake_quality_params()
SPECTRAL_PROFILES = get_spectral_profiles()

# Su kalitesi trend parametreleri - sabit değerler
QUALITY_TRENDS = {
    "pH": -0.05,
    "Turbidite": 0.1,
    "Çözünmüş_Oksijen": -0.1,
    "Sıcaklık": 0.5,  # Mevsimsel artış
    "Nitrat": 0.02
}

# Flask uygulama ayarları
FLASK_CONFIG = {
    "DEBUG": True,
    "HOST": "127.0.0.1",
    "PORT": 5000,
    "THREADED": True
}

# API sınırları
API_LIMITS = {
    "MAX_TIMESERIES_LIMIT": 5000,
    "DEFAULT_TIMESERIES_LIMIT": 1000,
    "MIN_TIMESERIES_LIMIT": 1
}
