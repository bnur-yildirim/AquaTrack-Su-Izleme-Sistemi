"""
Model Analitik ve Değerlendirme API Route'ları
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import traceback

from database_data_loader import DatabaseDataLoader
from database.queries import DatabaseQueries
from database import get_database
from utils import resolve_lake_id, calculate_normalized_metrics, log_error, log_info
from config import LAKE_INFO, KEY_BY_ID

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route("/api/analytics/model-performance", methods=["GET"])
def model_performance():
    """Model performans analizi - normalize edilmiş metrikler"""
    lake_id_param = request.args.get("lake_id", "van")
    
    # Lake ID'yi çözümle
    lake_key, lake_numeric_id = resolve_lake_id(lake_id_param, LAKE_INFO, KEY_BY_ID)
    
    if lake_numeric_id is None:
        return jsonify({"error": f"Göl bulunamadı: {lake_id_param}"}), 404
    
    try:
        # MongoDB'den model metadata'yı al
        db = get_database()
        queries = DatabaseQueries()
        
        model_metadata = queries.get_model_metadata()
        
        # Model performans metriklerini hazırla
        performance_data = []
        
        for model in model_metadata:
            model_name = model['model_name']
            performance_metrics = model.get('performance_metrics', {})
            
            performance_data.append({
                'model_name': model_name,
                'mae': performance_metrics.get('test_mae', performance_metrics.get('mae', 0)),
                'rmse': performance_metrics.get('test_rmse', performance_metrics.get('rmse', 0)),
                'r2': performance_metrics.get('test_r2', performance_metrics.get('r2', 0)),
                'wmape': performance_metrics.get('test_wmape', performance_metrics.get('wmape', 0)),
                'training_date': model.get('training_date', ''),
                'version': model.get('version', '1.0')
            })
        
        # Göl bilgisi
        lake_info = LAKE_INFO.get(lake_key, {})
        lake_area_km2 = lake_info.get('area_km2', 0)
        
        # Model performans analizi
        analysis = {
            "total_models": len(performance_data),
            "lake_area_km2": lake_area_km2,
            "best_model": max(performance_data, key=lambda x: x['r2']) if performance_data else None,
            "worst_model": min(performance_data, key=lambda x: x['wmape']) if performance_data else None
        }
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "models": performance_data,
            "analysis": analysis,
            "timestamp": datetime.now().isoformat(),
            "status": "success"
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Model performans analizi hatası: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Analiz hatası: {str(e)}"}), 500

@analytics_bp.route("/api/analytics/compare-lakes", methods=["GET"])
def compare_lakes():
    """Farklı göller arası model performans karşılaştırması"""
    try:
        # MongoDB'den model metadata'yı al
        db = get_database()
        queries = DatabaseQueries()
        
        model_metadata = queries.get_model_metadata()
        
        if not model_metadata:
            return jsonify({"error": "Model verisi bulunamadı"}), 404
        
        # Göl karşılaştırması için basit bir yapı oluştur
        lake_comparisons = []
        
        # Her göl için model performansını al
        for lake_key, lake_info in LAKE_INFO.items():
            lake_id = lake_info.get('id')
            lake_name = lake_info.get('name', f'Göl {lake_id}')
            lake_area = lake_info.get('area_km2', 0)
            
            # Bu göl için model performansını filtrele
            lake_models = []
            for model in model_metadata:
                # Model adında göl ID'si varsa veya genel model ise ekle
                if str(lake_id) in model['model_name'] or 'H1' in model['model_name']:
                    lake_models.append({
                        'model_name': model['model_name'],
                        'performance': model.get('performance_metrics', {})
                    })
            
            lake_comparisons.append({
                "lake_id": lake_id,
                "lake_key": lake_key,
                "lake_name": lake_name,
                "area_km2": lake_area,
                "models": lake_models
            })
        
        # Genel istatistikler
        summary = {
            "total_lakes": len(lake_comparisons),
            "total_models": len(model_metadata),
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify({
            "comparisons": lake_comparisons,
            "summary": summary,
            "timestamp": datetime.now().isoformat(),
            "status": "success"
        })
        
    except Exception as e:
        log_error(f"Göl karşılaştırma hatası: {str(e)}")
        return jsonify({"error": f"Karşılaştırma hatası: {str(e)}"}), 500

def get_lake_area_km2(lake_id):
    """Göl alanını km² cinsinden döndür"""
    # Göl alanları (yaklaşık değerler)
    lake_areas = {
        140: 1664,    # Tuz Gölü
        141: 3755,    # Van Gölü  
        1321: 135,    # Ulubat Gölü
        1340: 482,    # Eğridir Gölü
        1342: 250,    # Burdur Gölü
        14510: 47,    # Sapanca Gölü
        14741: 45     # Salda Gölü
    }
    return lake_areas.get(lake_id, 100)  # Default 100 km²

def generate_recommendations(metrics, lake_area_km2):
    """Model performansına göre öneriler oluştur"""
    recommendations = []
    
    success_rate = metrics.get('Success_Rate', 0)
    wmape = metrics.get('WMAPE', 0)
    r2 = metrics.get('R2', 0)
    
    if success_rate < 70:
        recommendations.append("Model performansı düşük - daha fazla veri toplama önerilir")
    
    if wmape > 20:
        recommendations.append("Yüksek hata oranı - feature engineering iyileştirilebilir")
    
    if r2 < 0.5:
        recommendations.append("Düşük R² değeri - model karmaşıklığı artırılabilir")
    
    if lake_area_km2 < 50:
        recommendations.append("Küçük göl - daha hassas ölçümler gerekebilir")
    elif lake_area_km2 > 1000:
        recommendations.append("Büyük göl - bölgesel analiz önerilir")
    
    if success_rate > 90:
        recommendations.append("Mükemmel performans - model production'a hazır")
    
    return recommendations