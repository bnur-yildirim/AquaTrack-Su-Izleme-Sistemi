# ==========================
# DATA SOURCES CONFIGURATION
# AquaTrack - Merkezi Veri Kaynakları
# ==========================

import os
from pathlib import Path

# Proje kök dizini
PROJECT_ROOT = Path(__file__).parent

# ==========================
# 1. SU KALİTESİ VERİ KAYNAKLARI
# ==========================

WATER_QUALITY_DATA = {
    # Ana CSV dosyası - Clustered Water Quality
    "clustered_csv": PROJECT_ROOT / "data" / "clustered_water_quality.csv",
    
    # API Endpoints
    "endpoints": {
        "matrix_analysis": "/api/quality/matrix-analysis",
        "lake_cluster": "/api/quality/lake/{lake_key}/cluster",
        "general_analysis": "/api/quality/general-analysis"
    },
    
    # Veri Yapısı
    "columns": [
        "lake_name", "date", "year", "month",
        "ndwi_mean", "chl_a_mean", "turbidity_mean", "wri_mean",
        "cluster", "confidence"
    ],
    
    # Göl ID'leri ve İsimleri
    "lake_mapping": {
        "van": "Van Gölü",
        "tuz": "Tuz Gölü", 
        "burdur": "Burdur Gölü",
        "egirdir": "Eğirdir Gölü",
        "ulubat": "Ulubat Gölü",
        "sapanca": "Sapanca Gölü",
        "salda": "Salda Gölü"
    }
}

# ==========================
# 2. SU MİKTARI VERİ KAYNAKLARI  
# ==========================

WATER_QUANTITY_DATA = {
    # Parquet dosyaları - Ana veri
    "parquet_files": {
        "train": PROJECT_ROOT / "backend" / "models" / "train_combined.parquet",
        "validation": PROJECT_ROOT / "backend" / "models" / "val_combined.parquet", 
        "test": PROJECT_ROOT / "backend" / "models" / "test_combined.parquet",
        "all_predictions": PROJECT_ROOT / "backend" / "models" / "all_predictions_final.parquet"
    },
    
    # CSV dosyaları - Metrikler
    "csv_files": {
        "metrics": PROJECT_ROOT / "outputs" / "models_optuna" / "metrics_summary_final.csv",
        "lake_metrics": PROJECT_ROOT / "outputs" / "models_optuna" / "lake_metrics_realistic.csv"
    },
    
    # API Endpoints
    "endpoints": {
        "historical": "/api/forecast/lake/{lake_id}/historical",
        "predictions": "/api/forecast/lake/{lake_id}/predictions",
        "all_lakes": "/api/forecast/all-lakes"
    },
    
    # ML Modelleri
    "models": {
        "H1": PROJECT_ROOT / "backend" / "models" / "catboost_H1_improved.pkl",
        "H2": PROJECT_ROOT / "backend" / "models" / "catboost_H2_improved.pkl", 
        "H3": PROJECT_ROOT / "backend" / "models" / "catboost_H3_improved.pkl"
    },
    
    # Model Metadata
    "metadata": {
        "H1": PROJECT_ROOT / "backend" / "models" / "metadata_H1_improved.json",
        "H2": PROJECT_ROOT / "backend" / "models" / "metadata_H2_improved.json",
        "H3": PROJECT_ROOT / "backend" / "models" / "metadata_H3_improved.json"
    }
}

# ==========================
# 3. GENEL YAPILANDIRMA
# ==========================

APP_CONFIG = {
    # Backend
    "backend": {
        "host": "127.0.0.1",
        "port": 5000,
        "debug": True
    },
    
    # Frontend  
    "frontend": {
        "url": "http://localhost:3000",
        "api_base": "http://127.0.0.1:5000"
    },
    
    # Veri Aralığı
    "data_range": {
        "start_year": 2018,
        "end_year": 2024,
        "months": ["Oca", "Şub", "Mar", "Nis", "May", "Haz", 
                  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
    }
}

# ==========================
# 4. VERİ DOĞRULAMA FONKSİYONLARI
# ==========================

def validate_data_sources():
    """Tüm veri kaynaklarının varlığını kontrol et"""
    print("🔍 Veri kaynakları kontrol ediliyor...")
    
    missing_files = []
    
    # Su Kalitesi dosyaları
    if not WATER_QUALITY_DATA["clustered_csv"].exists():
        missing_files.append(str(WATER_QUALITY_DATA["clustered_csv"]))
    
    # Su Miktarı dosyaları
    for key, file_path in WATER_QUANTITY_DATA["parquet_files"].items():
        if not file_path.exists():
            missing_files.append(str(file_path))
    
    for key, file_path in WATER_QUANTITY_DATA["models"].items():
        if not file_path.exists():
            missing_files.append(str(file_path))
    
    if missing_files:
        print("❌ Eksik dosyalar:")
        for file in missing_files:
            print(f"   - {file}")
        return False
    else:
        print("✅ Tüm veri kaynakları mevcut!")
        return True

def get_data_info():
    """Veri kaynakları hakkında bilgi ver"""
    info = {
        "water_quality": {
            "source": str(WATER_QUALITY_DATA["clustered_csv"]),
            "exists": WATER_QUALITY_DATA["clustered_csv"].exists(),
            "endpoints": list(WATER_QUALITY_DATA["endpoints"].values())
        },
        "water_quantity": {
            "parquet_files": {
                key: {"path": str(path), "exists": path.exists()}
                for key, path in WATER_QUANTITY_DATA["parquet_files"].items()
            },
            "models": {
                key: {"path": str(path), "exists": path.exists()}
                for key, path in WATER_QUANTITY_DATA["models"].items()
            },
            "endpoints": list(WATER_QUANTITY_DATA["endpoints"].values())
        }
    }
    return info

# ==========================
# 5. FRONTEND İÇİN JAVASCRIPT CONFIG
# ==========================

FRONTEND_CONFIG = {
    "api_base_url": "http://127.0.0.1:5000",
    "water_quality_endpoints": {
        "matrix_analysis": "/api/quality/matrix-analysis",
        "lake_cluster": "/api/quality/lake/{lake_key}/cluster"
    },
    "water_quantity_endpoints": {
        "historical": "/api/forecast/lake/{lake_id}/historical",
        "predictions": "/api/forecast/lake/{lake_id}/predictions"
    },
    "lake_names": {
        "van": "Van Gölü",
        "tuz": "Tuz Gölü",
        "burdur": "Burdur Gölü", 
        "egirdir": "Eğirdir Gölü",
        "ulubat": "Ulubat Gölü",
        "sapanca": "Sapanca Gölü",
        "salda": "Salda Gölü"
    }
}

if __name__ == "__main__":
    print("📊 AquaTrack Veri Kaynakları Konfigürasyonu")
    print("=" * 50)
    
    # Veri kaynaklarını kontrol et
    validate_data_sources()
    
    # Bilgi ver
    info = get_data_info()
    print("\n📋 Veri Kaynakları Özeti:")
    print(f"Su Kalitesi: {info['water_quality']['source']}")
    print(f"Su Miktarı Parquet: {len(info['water_quantity']['parquet_files'])} dosya")
    print(f"ML Modelleri: {len(info['water_quantity']['models'])} model")
