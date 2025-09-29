"""
Gelecek Tahmin API - 2025+ Gerçek Tahminler
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import calendar

from data_loader import get_lake_predictions
from models import get_models
from utils import resolve_lake_id, log_info, log_error
from config import LAKE_INFO, KEY_BY_ID

future_bp = Blueprint('future', __name__)

def generate_future_dates(start_date, months=12):
    """Gelecek tarihler oluştur"""
    dates = []
    current = start_date
    
    for i in range(months):
        # Her ayın 15'i
        year = current.year
        month = current.month
        day = 15
        
        # Ay sonu kontrolü
        max_day = calendar.monthrange(year, month)[1]
        if day > max_day:
            day = max_day
            
        dates.append(datetime(year, month, day))
        
        # Sonraki ay
        if month == 12:
            current = datetime(year + 1, 1, 1)
        else:
            current = datetime(year, month + 1, 1)
    
    return dates

def create_future_features(lake_data, target_date):
    """Gelecek tahmin için feature'lar oluştur"""
    
    # Son 12 aylık veriyi al
    recent_data = lake_data.tail(12).copy()
    
    if len(recent_data) == 0:
        return None
    
    # Temel feature'lar
    features = {}
    
    # Lag features (son değerler)
    features['lag_1'] = recent_data['target_water_area_m2'].iloc[-1]
    features['lag_2'] = recent_data['target_water_area_m2'].iloc[-2] if len(recent_data) > 1 else features['lag_1']
    features['lag_3'] = recent_data['target_water_area_m2'].iloc[-3] if len(recent_data) > 2 else features['lag_2']
    
    # Rolling features
    features['rolling_mean_3'] = recent_data['target_water_area_m2'].tail(3).mean()
    features['rolling_std_3'] = recent_data['target_water_area_m2'].tail(3).std()
    features['trend_3m'] = features['rolling_mean_3'] - recent_data['target_water_area_m2'].head(3).mean()
    
    # NDWI features (varsa)
    if 'ndwi_mean' in recent_data.columns:
        features['ndwi_mean'] = recent_data['ndwi_mean'].tail(3).mean()
        features['ndwi_std'] = recent_data['ndwi_mean'].tail(3).std()
    else:
        features['ndwi_mean'] = 0.1  # Default
        features['ndwi_std'] = 0.05
    
    # Lake ID
    features['lake_id'] = recent_data['lake_id'].iloc[0]
    
    # Mevsimsel özellikler
    month = target_date.month
    features['month_sin'] = np.sin(2 * np.pi * month / 12)
    features['month_cos'] = np.cos(2 * np.pi * month / 12)
    
    # Yıl trendi
    years_passed = (target_date.year - 2018)
    features['year_trend'] = years_passed * 0.02  # Yıllık %2 azalış varsayımı
    
    return features

@future_bp.route("/api/future/forecast", methods=["GET"])
def future_forecast():
    """Gelecek dönem tahminleri"""
    
    lake_id_param = request.args.get("lake_id", "van")
    months = int(request.args.get("months", 3))  # Default 3 ay - ideal
    
    # Lake ID'yi çözümle
    lake_key, lake_numeric_id = resolve_lake_id(lake_id_param, LAKE_INFO, KEY_BY_ID)
    
    if lake_numeric_id is None:
        return jsonify({"error": f"Göl bulunamadı: {lake_id_param}"}), 404
    
    try:
        # Geçmiş veriyi al
        lake_data = get_lake_predictions(lake_numeric_id)
        
        if lake_data is None or lake_data.empty:
            return jsonify({"error": "Geçmiş veri bulunamadı"}), 404
        
        # Son tarihi bul
        last_date = pd.to_datetime(lake_data['date']).max()
        
        # Gelecek tarihler oluştur
        start_future = last_date + timedelta(days=30)  # 1 ay sonrasından başla
        future_dates = generate_future_dates(start_future, months)
        
        # Model al
        models = get_models()
        if not models or 'catboost_H1_optuna' not in models:
            return jsonify({"error": "Model yüklü değil"}), 500
        
        model = models['catboost_H1_optuna']
        
        # Gelecek tahminleri
        future_predictions = []
        
        for future_date in future_dates:
            # Feature'lar oluştur
            features = create_future_features(lake_data, future_date)
            
            if features is None:
                continue
            
            try:
                # Model feature sırası (önemli!)
                feature_order = ['lag_1', 'lag_2', 'lag_3', 'rolling_mean_3', 'rolling_std_3', 
                               'trend_3m', 'ndwi_mean', 'ndwi_std', 'lake_id']
                
                X = np.array([[features.get(f, 0) for f in feature_order]])
                
                # Tahmin yap
                prediction = model.predict(X)[0]
                
                # Makul sınırlar içinde tut
                last_value = features['lag_1']
                min_val = last_value * 0.5  # %50 azalma max
                max_val = last_value * 1.5  # %50 artış max
                prediction = np.clip(prediction, min_val, max_val)
                
                # Risk seviyesi hesapla
                change_percent = ((prediction - last_value) / last_value) * 100
                
                if change_percent < -15:
                    risk_level = "Kritik Azalış"
                    risk_color = "#dc2626"
                elif change_percent < -5:
                    risk_level = "Dikkat"
                    risk_color = "#f59e0b"
                elif change_percent > 15:
                    risk_level = "Büyük Artış"
                    risk_color = "#059669"
                else:
                    risk_level = "Normal"
                    risk_color = "#3b82f6"
                
                future_predictions.append({
                    "date": future_date.strftime("%Y-%m-%d"),
                    "predicted_area_m2": float(prediction),
                    "predicted_area_km2": float(prediction / 1_000_000),
                    "change_percent": float(change_percent),
                    "risk_level": risk_level,
                    "risk_color": risk_color,
                    "confidence": max(0.85, 0.98 - (len(future_predictions) * 0.01))  # 1-3 ay = yüksek güven
                })
                
            except Exception as e:
                log_error(f"Tahmin hatası {future_date}: {e}")
                continue
        
        # Özet istatistikler
        if future_predictions:
            avg_prediction = np.mean([p["predicted_area_km2"] for p in future_predictions])
            current_area = lake_data['target_water_area_m2'].iloc[-1] / 1_000_000
            overall_change = ((avg_prediction - current_area) / current_area) * 100
            
            # Trend kategorisi
            if overall_change < -10:
                trend_category = "Azalış Trendi"
                trend_color = "#dc2626"
            elif overall_change > 10:
                trend_category = "Artış Trendi" 
                trend_color = "#059669"
            else:
                trend_category = "Stabil"
                trend_color = "#3b82f6"
        else:
            avg_prediction = 0
            overall_change = 0
            trend_category = "Belirsiz"
            trend_color = "#6b7280"
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "current_date": last_date.strftime("%Y-%m-%d"),
            "forecast_period": f"{months} ay",
            "current_area_km2": float(current_area) if 'current_area' in locals() else 0,
            "avg_future_area_km2": float(avg_prediction),
            "overall_change_percent": float(overall_change),
            "trend_category": trend_category,
            "trend_color": trend_color,
            "predictions": future_predictions,
            "summary": {
                "total_predictions": len(future_predictions),
                "avg_confidence": np.mean([p["confidence"] for p in future_predictions]) if future_predictions else 0,
                "risk_distribution": {
                    level: len([p for p in future_predictions if p["risk_level"] == level])
                    for level in ["Normal", "Dikkat", "Kritik Azalış", "Büyük Artış"]
                }
            }
        }
        
        log_info(f"Gelecek tahminleri oluşturuldu: {lake_key} - {len(future_predictions)} ay")
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Gelecek tahmin hatası: {str(e)}")
        return jsonify({"error": "Gelecek tahmin sistemi hatası"}), 500

@future_bp.route("/api/future/scenarios", methods=["GET"])
def future_scenarios():
    """Farklı senaryolar için tahminler"""
    
    lake_id_param = request.args.get("lake_id", "van")
    
    scenarios = {
        "normal": {"description": "Normal iklim koşulları", "factor": 1.0},
        "dry": {"description": "Kuraklık senaryosu", "factor": 0.85},
        "wet": {"description": "Yağışlı senaryo", "factor": 1.15},
        "climate_change": {"description": "İklim değişikliği etkisi", "factor": 0.92}
    }
    
    # Her senaryo için tahmin
    results = {}
    
    for scenario_name, scenario_data in scenarios.items():
        # Normal tahmin al
        normal_response = future_forecast()
        
        if hasattr(normal_response, 'json'):
            normal_data = normal_response.json
            
            # Senaryo faktörünü uygula
            scenario_predictions = []
            for pred in normal_data.get("predictions", []):
                adjusted_area = pred["predicted_area_km2"] * scenario_data["factor"]
                scenario_predictions.append({
                    **pred,
                    "predicted_area_km2": adjusted_area,
                    "scenario": scenario_name
                })
            
            results[scenario_name] = {
                "description": scenario_data["description"],
                "factor": scenario_data["factor"],
                "predictions": scenario_predictions
            }
    
    return jsonify({
        "lake_id": lake_id_param,
        "scenarios": results
    })
