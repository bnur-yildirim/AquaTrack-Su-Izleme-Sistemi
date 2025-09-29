"""
Konfigürasyon dosyası - Tüm sabitler ve ayarlar
"""

import os

# Dizin yolları
BACKEND_MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_DIR = BACKEND_MODELS_DIR

# Göl bilgileri
LAKE_INFO = {
    "tuz": {"id": 140, "name": "Tuz Gölü", "lat": 38.4167, "lng": 33.3500},
    "van": {"id": 141, "name": "Van Gölü", "lat": 38.4942, "lng": 43.3832},
    "ulubat": {"id": 1321, "name": "Ulubat Gölü", "lat": 40.1833, "lng": 28.9833},
    "egridir": {"id": 1340, "name": "Eğridir Gölü", "lat": 37.8167, "lng": 30.8500},
    "burdur": {"id": 1342, "name": "Burdur Gölü", "lat": 37.7167, "lng": 30.2833},
    "sapanca": {"id": 14510, "name": "Sapanca Gölü", "lat": 40.7167, "lng": 30.2667},
    "salda": {"id": 14741, "name": "Salda Gölü", "lat": 37.5500, "lng": 29.6833}
}

# Numeric ID'den anahtara hızlı erişim
KEY_BY_ID = {info["id"]: key for key, info in LAKE_INFO.items()}

# Model dosya isimleri
MODEL_FILES = ["catboost_H1_optuna.pkl", "catboost_H2_optuna.pkl", "catboost_H3_optuna.pkl"]

# Su kalitesi parametreleri (göle özel)
LAKE_QUALITY_PARAMS = {
    141: {"pH": 9.2, "Turbidite": 2.1, "Çözünmüş_Oksijen": 8.5, "Sıcaklık": 15.2, "Nitrat": 0.8},  # Van
    140: {"pH": 9.8, "Turbidite": 1.5, "Çözünmüş_Oksijen": 7.2, "Sıcaklık": 18.5, "Nitrat": 1.2},  # Tuz
    1321: {"pH": 7.8, "Turbidite": 3.2, "Çözünmüş_Oksijen": 8.8, "Sıcaklık": 16.8, "Nitrat": 0.6}, # Ulubat
    1340: {"pH": 8.1, "Turbidite": 2.8, "Çözünmüş_Oksijen": 8.2, "Sıcaklık": 17.1, "Nitrat": 0.7}, # Eğridir
    1342: {"pH": 8.9, "Turbidite": 2.0, "Çözünmüş_Oksijen": 7.9, "Sıcaklık": 19.2, "Nitrat": 0.9}, # Burdur
    14510: {"pH": 7.6, "Turbidite": 3.5, "Çözünmüş_Oksijen": 9.1, "Sıcaklık": 14.8, "Nitrat": 0.4}, # Sapanca
    14741: {"pH": 8.7, "Turbidite": 1.8, "Çözünmüş_Oksijen": 8.6, "Sıcaklık": 20.1, "Nitrat": 0.5}  # Salda
}

# Su kalitesi trend parametreleri
QUALITY_TRENDS = {
    "pH": -0.05,
    "Turbidite": 0.1,
    "Çözünmüş_Oksijen": -0.1,
    "Sıcaklık": 0.5,  # Mevsimsel artış
    "Nitrat": 0.02
}

# Spektral profiller (göle özel)
SPECTRAL_PROFILES = {
    140: {"B2": 0.08, "B3": 0.12, "B4": 0.15, "B5": 0.25, "B8": 0.35, "B11": 0.28},  # Tuz
    141: {"B2": 0.06, "B3": 0.09, "B4": 0.08, "B5": 0.18, "B8": 0.42, "B11": 0.22},  # Van
    1321: {"B2": 0.09, "B3": 0.14, "B4": 0.18, "B5": 0.28, "B8": 0.38, "B11": 0.25}, # Ulubat
    1340: {"B2": 0.07, "B3": 0.11, "B4": 0.12, "B5": 0.22, "B8": 0.40, "B11": 0.20}, # Eğridir
    1342: {"B2": 0.08, "B3": 0.13, "B4": 0.16, "B5": 0.26, "B8": 0.36, "B11": 0.24}, # Burdur
    14510: {"B2": 0.05, "B3": 0.08, "B4": 0.07, "B5": 0.16, "B8": 0.45, "B11": 0.18}, # Sapanca
    14741: {"B2": 0.04, "B3": 0.06, "B4": 0.05, "B5": 0.14, "B8": 0.48, "B11": 0.15}  # Salda
}

# Su kalitesi temel skorları (göle özel)
BASE_QUALITY_SCORES = {
    140: 45,   # Tuz Gölü - orta
    141: 75,   # Van Gölü - iyi
    1321: 55,  # Ulubat - orta
    1340: 70,  # Eğridir - iyi
    1342: 65,  # Burdur - orta-iyi
    14510: 80, # Sapanca - çok iyi
    14741: 85  # Salda - mükemmel
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
