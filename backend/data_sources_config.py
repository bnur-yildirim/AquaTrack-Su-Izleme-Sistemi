# ==========================
# DATA SOURCES CONFIGURATION - MERKEZİ VERİ KAYNAKLARI
# AquaTrack - TÜM VERİLER BURADAN OKUNUR
# ==========================

import os
from pathlib import Path

# Backend dizini - Tüm dosyalar artık backend içinde
BACKEND_ROOT = Path(__file__).parent

print("\n" + "="*70)
print("📊 AQUATRACK VERİ KAYNAKLARI KONFİGÜRASYONU")
print("="*70)

# ==========================
# 1. SU KALİTESİ VERİ KAYNAKLARI
# ==========================

WATER_QUALITY_DATA = {
    # ✅ Ana CSV dosyası - Gerçek Sentinel-2 TIFF'lerden hesaplanmış
    "clustered_csv": BACKEND_ROOT / "water_quality" / "data" / "clustered_water_quality.csv",
    
    # 📊 Veri İstatistikleri:
    # - 2,775 günlük kayıt
    # - 7 göl (Van, Tuz, Burdur, Eğirdir, Ulubat, Sapanca, Salda)
    # - 2018-2024 (7 yıl)
    # - Kaynak: Gerçek Sentinel-2 uydu görüntüleri
    
    # 🔄 Yeniden oluşturma scripti:
    "generation_script": BACKEND_ROOT / "water_quality" / "final_real_clusters.py",
    
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
    # ✅ Ana Parquet dosyası - CatBoost tahminleri
    "main_data": BACKEND_ROOT / "models" / "all_predictions_final.parquet",
    
    # 📊 Veri İstatistikleri:
    # - 8,109 kayıt
    # - 7 göl (ID: 140, 141, 1321, 1340, 1342, 14510, 14741)
    # - 2018-2024 (7 yıl)
    # - Kolonlar: lake_id, date, H, target_water_area_m2, predicted_water_area
    
    # ⚠️ Train/Val/Test dosyaları (optional - sadece training için):
    "training_files": {
        "train": BACKEND_ROOT / "models" / "train_combined.parquet",
        "validation": BACKEND_ROOT / "models" / "val_combined.parquet", 
        "test": BACKEND_ROOT / "models" / "test_combined.parquet"
    },
    
    # CSV dosyaları - Metrikler
    "csv_files": {
        "metrics": BACKEND_ROOT / "outputs" / "models_optuna" / "metrics_summary_final.csv",
        "lake_metrics": BACKEND_ROOT / "outputs" / "models_optuna" / "lake_metrics_realistic.csv"
    },
    
    # API Endpoints
    "endpoints": {
        "historical": "/api/forecast/lake/{lake_id}/historical",
        "predictions": "/api/forecast/lake/{lake_id}/predictions",
        "all_lakes": "/api/forecast/all-lakes"
    },
    
    # ✅ ML Modelleri (CatBoost Regression)
    "models": {
        "H1": BACKEND_ROOT / "models" / "catboost_H1_improved.pkl",  # 1 ay tahmin (WMAPE: 2.44%)
        "H2": BACKEND_ROOT / "models" / "catboost_H2_improved.pkl",  # 2 ay tahmin (WMAPE: 3.12%)
        "H3": BACKEND_ROOT / "models" / "catboost_H3_improved.pkl"   # 3 ay tahmin (WMAPE: 4.58%)
    },
    
    # ✅ Su Kalitesi ML Modeli (K-Means Clustering)
    "quality_models": {
        "kmeans": BACKEND_ROOT / "models_external" / "kmeans_water_quality.pkl",
        "scaler": BACKEND_ROOT / "models_external" / "scaler_water_quality.pkl"
    },
    
    # Model Metadata
    "metadata": {
        "H1": BACKEND_ROOT / "models" / "metadata_H1_improved.json",
        "H2": BACKEND_ROOT / "models" / "metadata_H2_improved.json",
        "H3": BACKEND_ROOT / "models" / "metadata_H3_improved.json"
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
    
    # Su Miktarı ana dosyası
    if not WATER_QUANTITY_DATA["main_data"].exists():
        missing_files.append(str(WATER_QUANTITY_DATA["main_data"]))
    
    # ML Modelleri
    for key, file_path in WATER_QUANTITY_DATA["models"].items():
        if not file_path.exists():
            missing_files.append(str(file_path))
    
    # Su Kalitesi modelleri
    for key, file_path in WATER_QUANTITY_DATA["quality_models"].items():
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
            "main_data": {
                "path": str(WATER_QUANTITY_DATA["main_data"]),
                "exists": WATER_QUANTITY_DATA["main_data"].exists()
            },
            "models": {
                key: {"path": str(path), "exists": path.exists()}
                for key, path in WATER_QUANTITY_DATA["models"].items()
            },
            "quality_models": {
                key: {"path": str(path), "exists": path.exists()}
                for key, path in WATER_QUANTITY_DATA["quality_models"].items()
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
    print("\n" + "=" * 70)
    print("📊 AQUATRACK VERİ KAYNAKLARI KONFİGÜRASYONU")
    print("=" * 70)
    
    # Veri kaynaklarını kontrol et
    is_valid = validate_data_sources()
    
    if is_valid:
        print("\n" + "=" * 70)
        print("✅ TÜM VERİ KAYNAKLARI HAZIR!")
        print("=" * 70)
        
        print("\n📁 ANA VERİ DOSYALARI:")
        print(f"   Su Kalitesi: water_quality/data/clustered_water_quality.csv (2,775 kayıt)")
        print(f"   Su Miktarı:  backend/models/all_predictions_final.parquet (8,109 kayıt)")
        print(f"   Metrikler:   outputs/models_optuna/metrics_summary_final.csv")
        
        print("\n🤖 ML MODELLERİ:")
        print(f"   CatBoost H1: catboost_H1_improved.pkl (1 ay - WMAPE: 2.44%)")
        print(f"   CatBoost H2: catboost_H2_improved.pkl (2 ay - WMAPE: 3.12%)")
        print(f"   CatBoost H3: catboost_H3_improved.pkl (3 ay - WMAPE: 4.58%)")
        print(f"   K-Means:     kmeans_water_quality.pkl (4 cluster)")
        
        print("\n🚀 BACKEND'İ BAŞLAT:")
        print(f"   cd backend && python app.py")
        
        print("\n✅ Frontend data_sources.js ile senkron!")
        print("=" * 70 + "\n")
    else:
        print("\n" + "=" * 70)
        print("❌ BAZI VERİ KAYNAKLARI EKSİK!")
        print("=" * 70)
        print("\n📝 EKSİK DOSYALAR YUKARDA LİSTELENDİ")
        print("\n🔄 Çözüm:")
        print("   1. Su Kalitesi: python water_quality/final_real_clusters.py")
        print("   2. Diğer dosyalar: README.md'deki kurulum adımlarını takip et")
        print("=" * 70 + "\n")
