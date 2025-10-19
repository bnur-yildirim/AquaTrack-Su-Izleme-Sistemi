"""
Su Kalitesi API Route'ları - K-Means Clustering Bazlı
Data leakage olmayan, gerçek spektral analiz
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
import pickle
import os
from datetime import datetime
from config import LAKE_INFO, KEY_BY_ID
from utils import log_info, log_error

water_quality_bp = Blueprint('water_quality', __name__)

# Base directory - Backend directory (where water_quality folder is copied)
# __file__ = backend/routes/water_quality_routes.py
# parent x2 = backend/routes -> backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Model ve scaler'ı global olarak yükle
KMEANS_MODEL = None
SCALER = None
CLUSTER_FEATURES = None

def load_models():
    """K-Means modelini ve scaler'ı yükle"""
    global KMEANS_MODEL, SCALER, CLUSTER_FEATURES
    
    try:
        # Proje root'undan modelleri yükle
        model_path = os.path.join(BASE_DIR, 'models_external', 'kmeans_water_quality.pkl')
        scaler_path = os.path.join(BASE_DIR, 'models_external', 'scaler_water_quality.pkl')
        
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                KMEANS_MODEL = pickle.load(f)
            log_info("✅ K-Means model yüklendi")
        
        if os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                SCALER = pickle.load(f)
            log_info("✅ Scaler yüklendi")
        
        # Cluster özellikleri
        CLUSTER_FEATURES = {
            0: {
                "name": "Normal Su Kalitesi",
                "description": "Standart temiz su profili. Düşük turbidite, orta NDWI, düşük klorofil.",
                "color": "#10b981",  # Yeşil
                "icon": "🟢",
                "risk_level": "Düşük",
                "recommendations": [
                    "Su kalitesi normal sınırlarda",
                    "Rutin izleme yeterli",
                    "Mevsimsel değişimler izlenmeli"
                ]
            },
            1: {
                "name": "Alg Patlaması Riski",
                "description": "Ekstrem yüksek klorofil-a değerleri. Alg bloom olayları.",
                "color": "#ef4444",  # Kırmızı
                "icon": "🔴",
                "risk_level": "Yüksek",
                "recommendations": [
                    "Acil izleme gerektirir",
                    "Besin maddesi kirliliği kontrol edilmeli",
                    "Su kullanımı sınırlandırılmalı"
                ]
            },
            2: {
                "name": "Tuzlu Su Özellikleri",
                "description": "Tuzlu göl karakteristikleri. Düşük turbidite, yüksek mineral içerik.",
                "color": "#3b82f6",  # Mavi
                "icon": "🔵",
                "risk_level": "Normal",
                "recommendations": [
                    "Tuzlu göl için normal profil",
                    "Tuz konsantrasyonu izlenmeli",
                    "Ekolojik denge korunmalı"
                ]
            },
            3: {
                "name": "Özel Coğrafi Durum",
                "description": "Alkalin/soda göl özellikleri. Yüksek pH, özel mineral içerik.",
                "color": "#8b5cf6",  # Mor
                "icon": "🟣",
                "risk_level": "Özel",
                "recommendations": [
                    "Göle özgü özel durum",
                    "Jeolojik özellikler etkili",
                    "Doğal durum, müdahale gerektirmez"
                ]
            }
        }
        
        return True
        
    except Exception as e:
        log_error(f"Model yükleme hatası: {e}")
        return False

# Uygulama başlatıldığında modelleri yükle
load_models()


@water_quality_bp.route("/api/water-quality/predict", methods=["POST"])
def predict_water_quality():
    """
    Su kalitesi cluster tahmini (K-Means)
    
    Body: {
        "ndwi_mean": 5.26,
        "wri_mean": 1206.05,
        "chl_a_mean": 1212.66,
        "turbidity_mean": 0.54
    }
    
    Response: {
        "cluster": 0,
        "cluster_name": "Normal Su Kalitesi",
        "description": "...",
        "risk_level": "Düşük",
        "color": "#10b981",
        "icon": "🟢",
        "recommendations": [...],
        "spectral_values": {...}
    }
    """
    if KMEANS_MODEL is None or SCALER is None:
        return jsonify({"error": "Model yüklenemedi"}), 500
    
    try:
        data = request.json
        
        # Feature'ları al
        features = np.array([[
            float(data.get('ndwi_mean', 0)),
            float(data.get('wri_mean', 0)),
            float(data.get('chl_a_mean', 0)),
            float(data.get('turbidity_mean', 0))
        ]])
        
        # Normalize
        features_scaled = SCALER.transform(features)
        
        # Cluster tahmini
        cluster = int(KMEANS_MODEL.predict(features_scaled)[0])
        
        # Cluster bilgilerini al
        cluster_info = CLUSTER_FEATURES.get(cluster, CLUSTER_FEATURES[0])
        
        # Mesafe hesapla (güven skoru için)
        distances = KMEANS_MODEL.transform(features_scaled)[0]
        confidence = 1 - (distances[cluster] / np.sum(distances))
        
        result = {
            "status": "success",
            "cluster": cluster,
            "cluster_name": cluster_info["name"],
            "description": cluster_info["description"],
            "risk_level": cluster_info["risk_level"],
            "color": cluster_info["color"],
            "icon": cluster_info["icon"],
            "confidence": round(float(confidence), 3),
            "recommendations": cluster_info["recommendations"],
            "spectral_values": {
                "ndwi_mean": float(data.get('ndwi_mean', 0)),
                "wri_mean": float(data.get('wri_mean', 0)),
                "chl_a_mean": float(data.get('chl_a_mean', 0)),
                "turbidity_mean": float(data.get('turbidity_mean', 0))
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Tahmin hatası: {e}")
        return jsonify({"error": str(e)}), 500


@water_quality_bp.route("/api/water-quality/batch", methods=["POST"])
def batch_predict_water_quality():
    """
    Toplu su kalitesi tahmini (zaman serisi için)
    
    Body: {
        "lake_id": 141,
        "measurements": [
            {"date": "2024-01-01", "ndwi_mean": 5.26, "wri_mean": 1206.05, ...},
            {"date": "2024-02-01", "ndwi_mean": 5.30, "wri_mean": 1210.00, ...},
            ...
        ]
    }
    """
    if KMEANS_MODEL is None or SCALER is None:
        return jsonify({"error": "Model yüklenemedi"}), 500
    
    try:
        data = request.json
        lake_id = data.get('lake_id')
        measurements = data.get('measurements', [])
        
        if not measurements:
            return jsonify({"error": "Ölçüm verisi yok"}), 400
        
        results = []
        
        for measurement in measurements:
            # Feature'ları hazırla
            features = np.array([[
                float(measurement.get('ndwi_mean', 0)),
                float(measurement.get('wri_mean', 0)),
                float(measurement.get('chl_a_mean', 0)),
                float(measurement.get('turbidity_mean', 0))
            ]])
            
            # Normalize ve tahmin
            features_scaled = SCALER.transform(features)
            cluster = int(KMEANS_MODEL.predict(features_scaled)[0])
            cluster_info = CLUSTER_FEATURES.get(cluster, CLUSTER_FEATURES[0])
            
            # Güven skoru
            distances = KMEANS_MODEL.transform(features_scaled)[0]
            confidence = 1 - (distances[cluster] / np.sum(distances))
            
            results.append({
                "date": measurement.get('date'),
                "cluster": cluster,
                "cluster_name": cluster_info["name"],
                "risk_level": cluster_info["risk_level"],
                "confidence": round(float(confidence), 3),
                "spectral_values": {
                    "ndwi_mean": float(measurement.get('ndwi_mean', 0)),
                    "wri_mean": float(measurement.get('wri_mean', 0)),
                    "chl_a_mean": float(measurement.get('chl_a_mean', 0)),
                    "turbidity_mean": float(measurement.get('turbidity_mean', 0))
                }
            })
        
        return jsonify({
            "status": "success",
            "lake_id": lake_id,
            "total_measurements": len(results),
            "results": results
        })
        
    except Exception as e:
        log_error(f"Toplu tahmin hatası: {e}")
        return jsonify({"error": str(e)}), 500


@water_quality_bp.route("/api/water-quality/lake-analysis/<lake_id>", methods=["GET"])
def lake_analysis(lake_id):
    """
    Belirli bir göl için geçmiş su kalitesi analizi
    data/b5_b11_combined_features.csv dosyasından veri çeker
    """
    try:
        # CSV dosyasını oku (proje root'undan)
        csv_path = os.path.join(BASE_DIR, 'water_quality', 'data', 'clustered_water_quality.csv')
        
        if not os.path.exists(csv_path):
            return jsonify({"error": f"Spektral veri dosyası bulunamadı: {csv_path}"}), 404
        
        df = pd.read_csv(csv_path)
        
        # Lake ID'yi numerik'e çevir
        if lake_id.isdigit():
            lake_numeric_id = int(lake_id)
        else:
            # İsimden ID'ye çevir
            lake_key = lake_id.lower()
            if lake_key in LAKE_INFO:
                lake_numeric_id = LAKE_INFO[lake_key]["id"]
            else:
                return jsonify({"error": f"Göl bulunamadı: {lake_id}"}), 404
        
        # Lake name mapping
        lake_names = {
            140: 'Tuz Gölü',
            141: 'Van Gölü',
            1321: 'Ulubat Gölü',
            1340: 'Eğirdir Gölü',
            1342: 'Burdur Gölü',
            14510: 'Sapanca Gölü',
            14741: 'Salda Gölü'
        }
        
        lake_name = lake_names.get(lake_numeric_id)
        if not lake_name:
            return jsonify({"error": f"Göl {lake_id} bulunamadı"}), 404
        
        # Göl verilerini filtrele
        lake_data = df[df['lake_name'] == lake_name].copy()
        
        if lake_data.empty:
            return jsonify({"error": f"Göl {lake_id} için veri bulunamadı"}), 404
        
        # Cluster tahminlerini hesapla
        features = lake_data[['ndwi_mean', 'wri_mean', 'chl_a_mean', 'turbidity_mean']].values
        features_scaled = SCALER.transform(features)
        clusters = KMEANS_MODEL.predict(features_scaled)
        
        lake_data['cluster'] = clusters
        
        # İstatistikler
        cluster_distribution = lake_data['cluster'].value_counts().to_dict()
        
        # Zaman serisi verileri
        time_series = []
        for _, row in lake_data.iterrows():
            cluster_info = CLUSTER_FEATURES.get(int(row['cluster']), CLUSTER_FEATURES[0])
            time_series.append({
                "date": row['date'],
                "cluster": int(row['cluster']),
                "cluster_name": cluster_info["name"],
                "risk_level": cluster_info["risk_level"],
                "ndwi_mean": float(row['ndwi_mean']),
                "wri_mean": float(row['wri_mean']),
                "chl_a_mean": float(row['chl_a_mean']),
                "turbidity_mean": float(row['turbidity_mean'])
            })
        
        # Ortalama değerler
        avg_values = {
            "ndwi_mean": float(lake_data['ndwi_mean'].mean()),
            "wri_mean": float(lake_data['wri_mean'].mean()),
            "chl_a_mean": float(lake_data['chl_a_mean'].mean()),
            "turbidity_mean": float(lake_data['turbidity_mean'].mean())
        }
        
        # Baskın cluster
        dominant_cluster = int(lake_data['cluster'].mode()[0])
        dominant_info = CLUSTER_FEATURES.get(dominant_cluster, CLUSTER_FEATURES[0])
        
        result = {
            "status": "success",
            "lake_id": lake_numeric_id,
            "lake_name": lake_data['lake_name'].iloc[0] if 'lake_name' in lake_data.columns else f"Lake {lake_numeric_id}",
            "total_measurements": len(lake_data),
            "date_range": {
                "start": lake_data['date'].min(),
                "end": lake_data['date'].max()
            },
            "dominant_cluster": {
                "cluster": dominant_cluster,
                "name": dominant_info["name"],
                "percentage": round(float(cluster_distribution.get(dominant_cluster, 0) / len(lake_data) * 100), 2),
                "risk_level": dominant_info["risk_level"]
            },
            "cluster_distribution": {
                str(k): {
                    "count": int(v),
                    "percentage": round(float(v / len(lake_data) * 100), 2),
                    "name": CLUSTER_FEATURES.get(k, {}).get("name", f"Cluster {k}")
                }
                for k, v in cluster_distribution.items()
            },
            "average_values": avg_values,
            "time_series": time_series[-50:]  # Son 50 ölçüm
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Göl analizi hatası: {e}")
        return jsonify({"error": str(e)}), 500


@water_quality_bp.route("/api/water-quality/clusters/info", methods=["GET"])
def clusters_info():
    """Tüm cluster'ların açıklamalarını döndür"""
    return jsonify({
        "status": "success",
        "total_clusters": 4,
        "clusters": CLUSTER_FEATURES,
        "model": "K-Means Unsupervised Learning",
        "features": ["NDWI", "WRI", "Chlorophyll-a", "Turbidity"],
        "data_source": "Sentinel-2 Satellite (2018-2024)"
    })


@water_quality_bp.route("/api/water-quality/all-lakes-summary", methods=["GET"])
def all_lakes_summary():
    """Tüm göller için özet su kalitesi bilgisi"""
    try:
        # MongoDB'den su kalitesi verilerini al
        from database import get_database
        
        db = get_database()
        
        # Her göl için cluster dağılımı
        lakes_summary = []
        
        # Tüm gölleri al
        for lake_key, lake_info in LAKE_INFO.items():
            lake_id = lake_info.get('id')
            lake_name = lake_info.get('name', f'Göl {lake_id}')
            
            # Bu göl için su kalitesi verilerini al
            quality_data = list(db['water_quality_measurements'].find({'lake_id': lake_id}).limit(100))
            
            if quality_data:
                # Cluster dağılımını hesapla
                cluster_counts = {}
                for record in quality_data:
                    cluster = record.get('cluster', 0)
                    cluster_counts[cluster] = cluster_counts.get(cluster, 0) + 1
                
                # Baskın cluster
                if cluster_counts:
                    dominant_cluster = max(cluster_counts, key=cluster_counts.get)
                    
                    lakes_summary.append({
                        "lake_id": int(lake_id),
                        "lake_name": lake_name,
                        "measurements": len(quality_data),
                        "dominant_cluster": dominant_cluster,
                        "cluster_distribution": cluster_counts
                    })
                else:
                    lakes_summary.append({
                        "lake_id": int(lake_id),
                        "lake_name": lake_name,
                        "measurements": 0,
                        "dominant_cluster": None,
                        "cluster_distribution": {}
                    })
        
        return jsonify({
            "status": "success",
            "total_lakes": len(lakes_summary),
            "lakes": lakes_summary
        })
        
    except Exception as e:
        log_error(f"Özet hatası: {e}")
        return jsonify({"error": str(e)}), 500

