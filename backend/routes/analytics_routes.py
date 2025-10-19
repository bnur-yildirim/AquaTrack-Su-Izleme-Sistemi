"""
Model Analitik ve Değerlendirme API Route'ları
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import traceback

from data_loader import get_lake_predictions, get_predictions
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
        # Göl verilerini al
        lake_data = get_lake_predictions(lake_numeric_id)
        
        if lake_data is None or lake_data.empty:
            return jsonify({
                "lake_id": lake_key or str(lake_numeric_id),
                "error": "Veri bulunamadı"
            }), 404
        
        # Gerçek ve tahmin değerlerini al
        if 'target_water_area_m2' not in lake_data.columns or 'predicted_water_area' not in lake_data.columns:
            return jsonify({
                "lake_id": lake_key or str(lake_numeric_id),
                "error": "Tahmin verileri bulunamadı"
            }), 404
        
        # Geçerli verileri filtrele
        valid_data = lake_data.dropna(subset=['target_water_area_m2', 'predicted_water_area'])
        
        if len(valid_data) == 0:
            return jsonify({
                "lake_id": lake_key or str(lake_numeric_id),
                "error": "Geçerli tahmin verisi bulunamadı"
            }), 404
        
        y_true = valid_data['target_water_area_m2'].values
        y_pred = valid_data['predicted_water_area'].values
        
        # Göl büyüklüğü bilgisi (km²)
        lake_area_km2 = get_lake_area_km2(lake_numeric_id)
        
        # Normalize edilmiş metrikleri hesapla
        metrics = calculate_normalized_metrics(y_true, y_pred, lake_area_km2)
        
        # Ek analizler
        analysis = {
            "data_summary": {
                "total_predictions": len(valid_data),
                "date_range": {
                    "start": valid_data['date'].min().strftime('%Y-%m-%d'),
                    "end": valid_data['date'].max().strftime('%Y-%m-%d')
                },
                "lake_area_km2": lake_area_km2
            },
            "prediction_quality": {
                "excellent": metrics.get('Success_Rate', 0) >= 90,
                "good": 80 <= metrics.get('Success_Rate', 0) < 90,
                "fair": 70 <= metrics.get('Success_Rate', 0) < 80,
                "poor": metrics.get('Success_Rate', 0) < 70
            },
            "recommendations": generate_recommendations(metrics, lake_area_km2)
        }
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "metrics": metrics,
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
        all_predictions = get_predictions()
        
        if all_predictions is None or all_predictions.empty:
            return jsonify({"error": "Veri bulunamadı"}), 404
        
        # Her göl için metrikleri hesapla
        lake_comparisons = []
        
        for lake_id in all_predictions['lake_id'].unique():
            lake_data = all_predictions[all_predictions['lake_id'] == lake_id]
            
            # Geçerli verileri filtrele
            valid_data = lake_data.dropna(subset=['target_water_area_m2', 'predicted_water_area'])
            
            if len(valid_data) == 0:
                continue
            
            y_true = valid_data['target_water_area_m2'].values
            y_pred = valid_data['predicted_water_area'].values
            
            lake_area_km2 = get_lake_area_km2(lake_id)
            metrics = calculate_normalized_metrics(y_true, y_pred, lake_area_km2)
            
            lake_key = KEY_BY_ID.get(lake_id, f"lake_{lake_id}")
            lake_name = LAKE_INFO.get(lake_key, {"name": f"Lake {lake_id}"}).get("name")
            
            lake_comparisons.append({
                "lake_id": lake_id,
                "lake_key": lake_key,
                "lake_name": lake_name,
                "lake_area_km2": lake_area_km2,
                "metrics": metrics,
                "data_points": len(valid_data)
            })
        
        # Performansa göre sırala
        lake_comparisons.sort(key=lambda x: x['metrics'].get('Success_Rate', 0), reverse=True)
        
        # Genel istatistikler
        all_success_rates = [lc['metrics'].get('Success_Rate', 0) for lc in lake_comparisons]
        all_wmape = [lc['metrics'].get('WMAPE', 0) for lc in lake_comparisons]
        
        summary = {
            "total_lakes": len(lake_comparisons),
            "average_success_rate": round(np.mean(all_success_rates), 2),
            "best_performing_lake": lake_comparisons[0] if lake_comparisons else None,
            "worst_performing_lake": lake_comparisons[-1] if lake_comparisons else None,
            "average_wmape": round(np.mean(all_wmape), 2)
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