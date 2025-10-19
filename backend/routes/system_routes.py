"""
Sistem API Route'ları
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import traceback

from database_data_loader import DatabaseDataLoader
from database.queries import DatabaseQueries
from models import get_models, is_models_loaded
from utils import calculate_normalized_metrics, log_error
from config import LAKE_INFO, KEY_BY_ID
from database import get_client, get_database
import numpy as np

system_bp = Blueprint('system', __name__)

@system_bp.route("/", methods=["GET"])
def home():
    return """
    <h2>🌊 AquaTrack API çalışıyor!</h2>
    <h3>📊 Mevcut Endpoints:</h3>
    
    <h4>🏔️ Temel Göl Verileri:</h4>
    <ul>
        <li><b>/api/lakes</b> - Tüm göllerin listesi</li>
        <li><b>/api/forecast?lake_id=van</b> - Göl su miktarı tahmini</li>
        <li><b>/api/forecast/timeseries?lake_id=van</b> - Zaman serisi verileri</li>
        <li><b>/api/metrics</b> - Model performans metrikleri</li>
        <li><b>/api/status</b> - API durumu</li>
    </ul>
    
    <h4>💧 Su Kalitesi:</h4>
    <ul>
        <li><b>/api/quality/status</b> - Su kalitesi durumu</li>
        <li><b>/api/quality/forecast?lake_id=van</b> - Su kalitesi tahmini</li>
    </ul>
    
    <h4>📈 Yeni Analitik API'ler:</h4>
    <ul>
        <li><b>/api/analytics/lake/van/overview</b> - Göl genel analizi</li>
        <li><b>/api/analytics/lake/van/quality</b> - Su kalitesi detaylı analizi</li>
        <li><b>/api/analytics/lake/van/spectral</b> - Spektral analiz verileri</li>
        <li><b>/api/analytics/comparison</b> - Göller arası karşılaştırma</li>
    </ul>
    
    <h4>🔧 Sistem:</h4>
    <ul>
        <li><b>/api/debug?lake_id=141</b> - Debug bilgileri</li>
        <li><b>/api/health</b> - Sistem sağlığı</li>
        <li><b>/api/reload</b> - Veri yeniden yükleme (POST)</li>
    </ul>
    
    <p><i>🎨 Frontend grafikleri için analytics endpoint'lerini kullanın!</i></p>
    """

@system_bp.route("/api/lakes", methods=["GET"])
def get_lakes():
    """Tüm göllerin listesini döndür - MongoDB'den"""
    try:
        # MongoDB'den veri çek
        db = get_database()
        queries = DatabaseQueries()
        
        # Her göl için MongoDB'den istatistikler
        enhanced_lake_info = {}
        lake_data_points = {}
        
        for key, info in LAKE_INFO.items():
            enhanced_info = info.copy()
            lake_id = info["id"]
            
            # MongoDB'den veri noktası sayısı
            observations_count = db["water_quantity_observations"].count_documents({"lake_id": lake_id})
            predictions_count = db["predictions"].count_documents({"lake_id": lake_id, "prediction_type": "water_quantity"})
            
            lake_data_points[lake_id] = observations_count
            enhanced_info["data_points"] = observations_count
            enhanced_info["predictions_count"] = predictions_count
            
            # Son veri tarihi ve alan
            latest_obs = db["water_quantity_observations"].find_one(
                {"lake_id": lake_id}, 
                sort=[("date", -1)]
            )
            
            if latest_obs:
                date = latest_obs.get("date")
                if date:
                    if hasattr(date, 'strftime'):
                        enhanced_info["last_data_date"] = date.strftime('%Y-%m-%d')
                    else:
                        enhanced_info["last_data_date"] = str(date)[:10]
                enhanced_info["latest_area_m2"] = float(latest_obs.get("water_area_m2", 0)) if latest_obs.get("water_area_m2") else None
            
            # İlk veri tarihi
            first_obs = db["water_quantity_observations"].find_one(
                {"lake_id": lake_id}, 
                sort=[("date", 1)]
            )
            
            if first_obs:
                date = first_obs.get("date")
                if date:
                    if hasattr(date, 'strftime'):
                        enhanced_info["first_data_date"] = date.strftime('%Y-%m-%d')
                    else:
                        enhanced_info["first_data_date"] = str(date)[:10]
            
            enhanced_lake_info[key] = enhanced_info
        
        return jsonify({
            "lakes": enhanced_lake_info,
            "by_id": KEY_BY_ID,
            "total_count": len(LAKE_INFO),
            "data_points": lake_data_points,
            "available_models": list(get_models().keys()) if get_models() else [],
            "data_source": "mongodb"
        })
        
    except Exception as e:
        log_error(f"MongoDB'den göl listesi çekme hatası: {e}")
        
        # Fallback: Basit göl listesi
        enhanced_lake_info = {}
        for key, info in LAKE_INFO.items():
            enhanced_info = info.copy()
            enhanced_info["data_points"] = 0
            enhanced_lake_info[key] = enhanced_info
        
        return jsonify({
            "lakes": enhanced_lake_info,
            "by_id": KEY_BY_ID,
            "total_count": len(LAKE_INFO),
            "data_points": {},
            "available_models": [],
            "data_source": "fallback"
        })

@system_bp.route("/api/status", methods=["GET"])
def status():
    """API durumu ve sistem bilgileri"""
    try:
        # MongoDB'den veri durumunu kontrol et
        db = get_database()
        
        # Koleksiyon istatistikleri
        collections_stats = {}
        collections = ['lakes', 'predictions', 'water_quality_measurements', 'news', 'users']
        
        for collection_name in collections:
            try:
                count = db[collection_name].count_documents({})
                collections_stats[collection_name] = count
            except Exception as e:
                collections_stats[collection_name] = 0
        
        return jsonify({
            "status": "active",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "type": "mongodb",
                "status": "connected",
                "collections": collections_stats
            },
            "models": {
                "loaded_models": ["H1", "H2", "H3"],
                "total_models": 3
            },
            "metrics": {
                "available": ["normalized", "unified"],
                "count": 2
            },
            "lakes": {
                "available_lakes": list(LAKE_INFO.keys()),
                "total_lakes": len(LAKE_INFO)
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)[:100]
        }), 500

@system_bp.route("/api/metrics", methods=["GET"])
def get_metrics_endpoint():
    """Model metriklerini döndür"""
    try:
        # MongoDB'den model metadata'yı al
        db = get_database()
        queries = DatabaseQueries()
        
        model_metadata = queries.get_model_metadata()
        
        return jsonify({
            "metrics": model_metadata,
            "loaded_at": datetime.now().isoformat(),
            "available_metrics": [model['model_name'] for model in model_metadata]
        })
    except Exception as e:
        return jsonify({
            "error": str(e)[:100],
            "loaded_at": datetime.now().isoformat()
        }), 500

@system_bp.route("/api/metrics/normalized", methods=["GET"])
def get_normalized_metrics():
    """Normalize edilmiş model başarı metriklerini döndür"""
    try:
        # MongoDB'den model metadata'yı al
        db = get_database()
        queries = DatabaseQueries()
        
        model_metadata = queries.get_model_metadata()
        
        # Model performans metriklerini hazırla
        normalized_metrics = {}
        
        for model in model_metadata:
            model_name = model['model_name']
            performance_metrics = model.get('performance_metrics', {})
            
            normalized_metrics[model_name] = {
                'mae': performance_metrics.get('mae', 0),
                'rmse': performance_metrics.get('rmse', 0),
                'r2': performance_metrics.get('r2', 0),
                'wmape': performance_metrics.get('wmape', 0)
            }
        
        return jsonify({
            "normalized_metrics": normalized_metrics,
            "loaded_at": datetime.now().isoformat(),
            "models": list(normalized_metrics.keys())
        })
        
    except Exception as e:
        return jsonify({
            "error": str(e)[:100],
            "loaded_at": datetime.now().isoformat()
        }), 500

@system_bp.route("/api/debug", methods=["GET"])
def debug_data():
    """Debug endpoint - veri yapısını kontrol etmek için"""
    try:
        # MongoDB'den debug bilgilerini al
        db = get_database()
        
        lake_id = request.args.get("lake_id", 141)
        try:
            lake_id = int(lake_id)
        except:
            lake_id = 141
        
        # MongoDB'den debug bilgilerini al
        collections_info = {}
        for collection_name in ['lakes', 'predictions', 'water_quality_measurements', 'news']:
            count = db[collection_name].count_documents({})
            collections_info[collection_name] = count
        
        # Belirli göl için örnek veri
        lake_predictions = list(db['predictions'].find({'lake_id': lake_id}).limit(5))
        
        return jsonify({
            "database": {
                "type": "mongodb",
                "collections": collections_info
            },
            "lake_specific": {
                "lake_id": lake_id,
                "sample_predictions": lake_predictions
            },
            "summary": {
                "available_lakes": list(db['predictions'].distinct('lake_id')),
                "total_predictions": db['predictions'].count_documents({}),
                "date_range": {
                    "min": "2018-01-01",
                    "max": "2024-12-31"
                }
            }
        })
    except Exception as e:
        return jsonify({
            "error": str(e)[:100],
            "timestamp": datetime.now().isoformat()
        }), 500

@system_bp.route("/api/health", methods=["GET"])
def health_check():
    """Sağlık kontrolü endpoint'i"""
    try:
        # MongoDB bağlantısını test et
        db = get_database()
        db.admin.command('ping')
        
        # Veri koleksiyonlarını kontrol et
        collections_status = {}
        required_collections = ['lakes', 'predictions', 'water_quality_measurements', 'news']
        
        for collection_name in required_collections:
            try:
                count = db[collection_name].count_documents({})
                collections_status[collection_name] = f"{count} documents"
            except Exception as e:
                collections_status[collection_name] = f"error: {str(e)[:50]}"
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "mongodb": "connected",
                "database": "operational"
            },
            "collections": collections_status,
            "version": "1.0.0"
        }
        
        return jsonify(health_status), 200
        
    except Exception as e:
        health_status = {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "mongodb": "disconnected",
                "database": "error"
            },
            "error": str(e)[:100],
            "version": "1.0.0"
        }
        return jsonify(health_status), 503

@system_bp.route("/api/reload", methods=["POST"])
def reload_data():
    """Verileri yeniden yükle (development/maintenance için)"""
    try:
        success = load_data()
        if success:
            predictions = get_predictions()
            return jsonify({
                "status": "success",
                "message": "Veriler başarıyla yeniden yüklendi",
                "timestamp": datetime.now().isoformat(),
                "data_summary": {
                    "predictions_shape": list(predictions.shape) if predictions is not None else None,
                    "metrics_count": len(get_metrics()),
                    "models_count": len(get_models()),
                    "lake_data_points": get_lake_data_points()
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Veri yeniden yükleme başarısız",
                "timestamp": datetime.now().isoformat()
            }), 500
    except Exception as e:
        log_error(f"Reload error: {e}")
        return jsonify({
            "status": "error",
            "message": f"Yeniden yükleme hatası: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500

@system_bp.errorhandler(404)
def not_found(error):
    """404 hata işleyici"""
    return jsonify({
        "error": "Endpoint bulunamadı",
        "message": "API dokümantasyonu için ana sayfayı (/) ziyaret edin",
        "timestamp": datetime.now().isoformat()
    }), 404

@system_bp.errorhandler(500)
def internal_error(error):
    """500 hata işleyici"""
    return jsonify({
        "error": "İç sunucu hatası",
        "message": "Beklenmeyen bir hata oluştu",
        "timestamp": datetime.now().isoformat()
    }), 500
