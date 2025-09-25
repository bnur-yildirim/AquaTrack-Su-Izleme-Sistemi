"""
Forecast (Tahmin) API Route'ları
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import traceback

from data_loader import get_lake_predictions, get_metrics
from utils import resolve_lake_id, calculate_future_predictions, clean_dataframe_for_json, log_error
from config import LAKE_INFO, KEY_BY_ID

forecast_bp = Blueprint('forecast', __name__)

@forecast_bp.route("/api/forecast", methods=["GET"])
def forecast():
    """Göl su miktarı tahmini endpoint'i"""
    lake_id_param = request.args.get("lake_id", "van")
    
    # Lake ID'yi çözümle
    lake_key, lake_numeric_id = resolve_lake_id(lake_id_param, LAKE_INFO, KEY_BY_ID)
    
    if lake_numeric_id is None:
        return jsonify({"error": f"Göl bulunamadı: {lake_id_param}"}), 404
    
    try:
        lake_data = get_lake_predictions(lake_numeric_id)
        
        if lake_data is None or lake_data.empty:
            # Örnek veri döndür
            return jsonify({
                "lake_id": lake_key or str(lake_numeric_id),
                "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
                "years": list(range(2018, 2026)),
                "actual": [120000000, 115000000, 110000000, 108000000, 105000000, 100000000, 95000000, None],
                "predicted": [None, None, None, None, None, None, None, 90000000],
                "predictions_3months": [90000000, 85000000, 80000000],
                "change_percent": -5.3,
                "last_update": datetime.now().isoformat(),
                "status": "no_data"
            })
        
        # Yıllık veriler hazırla
        lake_data['year'] = lake_data['date'].dt.year
        years = list(range(2018, 2026))
        actual_areas = []
        predicted_areas = []
        
        for year in years:
            year_data = lake_data[lake_data['year'] == year]
            
            if not year_data.empty:
                # Gerçek değerler
                if 'target_water_area_m2' in year_data.columns:
                    actual_avg = year_data['target_water_area_m2'].mean()
                    actual_avg = None if pd.isna(actual_avg) or actual_avg < 1000 else float(actual_avg)
                else:
                    actual_avg = None
                actual_areas.append(actual_avg)
                
                # Tahmin değerleri
                if 'predicted_water_area' in year_data.columns:
                    pred_avg = year_data['predicted_water_area'].mean()
                    pred_avg = None if pd.isna(pred_avg) or pred_avg < 1000 else float(pred_avg)
                else:
                    pred_avg = None
                predicted_areas.append(pred_avg)
            else:
                actual_areas.append(None)
                predicted_areas.append(None)
        
        # Gelecek 3 ay tahminleri
        predictions_3months = calculate_future_predictions(lake_data, 3)
        
        # Değişim oranı hesapla
        valid_actuals = [a for a in actual_areas if a is not None and a > 0]
        if valid_actuals and predictions_3months[0] > 0:
            last_actual = valid_actuals[-1]
            change_percent = ((predictions_3months[0] - last_actual) / last_actual) * 100
        else:
            change_percent = -5.3
        
        # 2025 için sadece ilk tahmin değeri
        display_predicted = [None] * (len(years) - 1) + [predictions_3months[0]]
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "coordinates": {
                "lat": LAKE_INFO.get(lake_key, {}).get("lat"),
                "lng": LAKE_INFO.get(lake_key, {}).get("lng")
            },
            "years": years,
            "actual": actual_areas,
            "predicted": display_predicted,
            "predictions_3months": predictions_3months,
            "change_percent": float(change_percent),
            "last_update": datetime.now().isoformat(),
            "model_metrics": get_metrics(),
            "data_points": len(lake_data),
            "status": "success"
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Forecast hatası: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Tahmin hatası: {str(e)}"}), 500

@forecast_bp.route("/api/forecast/timeseries", methods=["GET"])
def forecast_timeseries():
    """Belirli bir göl için tüm zaman serisini döndürür"""
    lake_id_param = request.args.get("lake_id", "van")
    limit = request.args.get("limit", "1000")
    
    try:
        limit = int(limit)
        limit = max(1, min(limit, 5000))  # 1-5000 arası sınırla
    except:
        limit = 1000
    
    # Lake ID'yi çözümle
    lake_key, lake_numeric_id = resolve_lake_id(lake_id_param, LAKE_INFO, KEY_BY_ID)
    
    if lake_numeric_id is None:
        return jsonify({"error": f"Göl bulunamadı: {lake_id_param}"}), 404
    
    try:
        lake_data = get_lake_predictions(lake_numeric_id)
        
        if lake_data is None or lake_data.empty:
            return jsonify({
                "lake_id": lake_key or str(lake_numeric_id),
                "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
                "records": [],
                "count": 0,
                "status": "no_data"
            })
        
        # Son N kayıtla sınırla
        if len(lake_data) > limit:
            lake_data = lake_data.tail(limit)
        
        # JSON için temizle
        output_data = clean_dataframe_for_json(lake_data)
        
        return jsonify({
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "count": len(output_data),
            "records": output_data.to_dict("records"),
            "status": "success"
        })
        
    except Exception as e:
        log_error(f"Timeseries hatası: {str(e)}")
        return jsonify({"error": f"Zaman serisi hatası: {str(e)}"}), 500
