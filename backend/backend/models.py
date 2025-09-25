"""
Model yükleme ve tahmin modülü
"""

import os
import pickle
from utils import log_info, log_error
from config import MODEL_DIR, MODEL_FILES

# CatBoost import'u - varsa kullan
try:
    from catboost import CatBoostRegressor
    CATBOOST_AVAILABLE = True
except ImportError:
    CATBOOST_AVAILABLE = False
    log_error("CatBoost kütüphanesi bulunamadı - pip install catboost")

# Global model saklama
MODELS = {}

def load_models():
    """Eğitilmiş modelleri yükle"""
    global MODELS
    
    if not CATBOOST_AVAILABLE:
        log_error("CatBoost mevcut değil - modeller yüklenemedi")
        return
    
    for model_file in MODEL_FILES:
        model_path = os.path.join(MODEL_DIR, model_file)
        if os.path.exists(model_path):
            try:
                # CatBoost modellerini doğru şekilde yükle
                model_name = model_file.replace('.pkl', '')
                model = CatBoostRegressor()
                model.load_model(model_path)
                MODELS[model_name] = model
                log_info(f"CatBoost model yüklendi: {model_name}")
            except Exception as e:
                log_error(f"Model yükleme hatası {model_file}: {e}")
                # Fallback: pickle ile dene
                try:
                    with open(model_path, 'rb') as f:
                        MODELS[model_name] = pickle.load(f)
                        log_info(f"Pickle model yüklendi: {model_name}")
                except Exception as e2:
                    log_error(f"Pickle yükleme de başarısız {model_file}: {e2}")

def get_models():
    """Yüklü modelleri döndür"""
    return MODELS

def get_model(model_name):
    """Belirli bir modeli döndür"""
    return MODELS.get(model_name)

def is_models_loaded():
    """Modellerin yüklenip yüklenmediğini kontrol et"""
    return len(MODELS) > 0
