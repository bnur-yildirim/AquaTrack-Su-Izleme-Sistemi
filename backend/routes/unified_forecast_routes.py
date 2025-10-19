"""
Birleştirilmiş Tahmin API Route'ları
Tek dosyadan tüm veriyi sunar - duplikasyon yok
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import traceback
import os

from security.input_validation import InputValidator, ValidationError
from security.error_handler import SecureErrorHandler, secure_endpoint_wrapper
from security.rate_limiter import rate_limit
from config import LAKE_INFO

unified_forecast_bp = Blueprint('unified_forecast', __name__)

# Global veri yükleme
UNIFIED_DATA = None
DATA_LOADED = False

def load_unified_data():
    """Birleştirilmiş veriyi yükle"""
    global UNIFIED_DATA, DATA_LOADED
    
    if DATA_LOADED:
        return UNIFIED_DATA
    
    try:
        # Backend root'tan çalıştığı için backend/ prefix ekle
        import sys
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_file = os.path.join(backend_dir, 'models', 'all_predictions_final.parquet')
        if not os.path.exists(data_file):
            raise FileNotFoundError(f"Unified data file not found: {data_file}")
        
        UNIFIED_DATA = pd.read_parquet(data_file)
        UNIFIED_DATA['date'] = pd.to_datetime(UNIFIED_DATA['date'])
        DATA_LOADED = True
        
        print(f"[SUCCESS] Unified data loaded: {len(UNIFIED_DATA)} records")
        return UNIFIED_DATA
        
    except Exception as e:
        print(f"[ERROR] Error loading unified data: {e}")
        return None

@unified_forecast_bp.route("/api/unified/forecast", methods=["GET"])
@rate_limit('forecast')
@secure_endpoint_wrapper
def unified_forecast():
    """Birleştirilmiş tahmin endpoint'i - tek dosyadan tüm veri"""
    try:
        lake_id_param = request.args.get("lake_id", "van")
        horizon_param = request.args.get("horizon", "H1")  # H1, H2, H3
        
        # Input validation
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        horizon = InputValidator.validate_horizon(horizon_param)
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
    # Veriyi yükle
    data = load_unified_data()
    if data is None:
        return SecureErrorHandler.handle_not_found_error("Veri dosyası")
    
    # Göl verilerini filtrele
    lake_data = data[data['lake_id'] == lake_numeric_id].copy()
    if lake_data.empty:
        return jsonify({
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "records": [],
            "count": 0,
            "status": "no_data"
        })
    
    # Horizon filtreleme
    if horizon:
        lake_data = lake_data[lake_data['H'] == int(horizon[1])]  # H1 -> 1
    
    # Veri kategorileri
    historical_data = lake_data[lake_data['date'].dt.year < 2024]
    test_data = lake_data[lake_data['date'].dt.year == 2024]
    
    # Yıllık özet
    years = list(range(2018, 2026))
    actual_areas = []
    predicted_areas = []
    
    for year in years:
        year_data = lake_data[lake_data['date'].dt.year == year]
        
        if not year_data.empty:
            # Gerçek değerler (her zaman var)
            actual_avg = year_data['target_water_area_m2'].mean()
            actual_avg = None if pd.isna(actual_avg) or actual_avg < 1000 else float(actual_avg)
            
            # Tahmin değerleri - sadece 2025+ için
            if year >= 2025:
                pred_avg = year_data['predicted_water_area'].mean()
                pred_avg = None if pd.isna(pred_avg) or pred_avg < 1000 else float(pred_avg)
            else:
                # 2018-2024: Sadece gerçek değerler, tahmin yok
                pred_avg = None
        else:
            actual_avg = None
            pred_avg = None
        
        actual_areas.append(actual_avg)
        predicted_areas.append(pred_avg)
    
    # Gelecek tahminleri (2025+ için gerçek tahminler)
    future_predictions = []
    if not test_data.empty:
        # Son gerçek değeri al (2024)
        last_actual = test_data['target_water_area_m2'].iloc[-1]
        if not pd.isna(last_actual) and last_actual > 0:
            # Basit trend hesaplama
            recent_data = test_data.tail(6)  # Son 6 ay
            if len(recent_data) >= 3:
                trend = (recent_data['target_water_area_m2'].iloc[-1] - recent_data['target_water_area_m2'].iloc[0]) / len(recent_data)
                for i in range(1, 4):  # 3 ay gelecek
                    future_pred = last_actual + (trend * i)
                    future_predictions.append(max(future_pred, last_actual * 0.8))  # Min %80
            else:
                # Yeterli veri yoksa sabit
                for i in range(1, 4):
                    future_predictions.append(last_actual * 0.95)
        else:
            # Gerçek veri yoksa varsayılan
            for i in range(1, 4):
                future_predictions.append(100000000)  # 100 km² varsayılan
    
    # Değişim oranı
    valid_actuals = [a for a in actual_areas if a is not None and a > 0]
    if valid_actuals and future_predictions:
        last_actual = valid_actuals[-1]
        change_percent = ((future_predictions[0] - last_actual) / last_actual) * 100
    else:
        change_percent = 0.0
    
    # Güven seviyesi
    confidence_levels = {
        'H1': {'level': 'high', 'description': '1 ay sonra - Yüksek güven'},
        'H2': {'level': 'medium', 'description': '2 ay sonra - Orta güven'},
        'H3': {'level': 'low', 'description': '3 ay sonra - Düşük güven'}
    }
    
    confidence = confidence_levels.get(horizon, {'level': 'unknown', 'description': 'Bilinmeyen'})
    
    result = {
        "lake_id": lake_key,
        "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
        "coordinates": {
            "lat": LAKE_INFO.get(lake_key, {}).get("lat"),
            "lng": LAKE_INFO.get(lake_key, {}).get("lng")
        },
        "horizon": horizon,
        "confidence": confidence,
        "years": years,
        "actual": actual_areas,
        "predicted": predicted_areas,
        "future_predictions": future_predictions,
        "change_percent": float(change_percent),
        "last_update": datetime.now().isoformat(),
        "data_points": {
            "historical": len(historical_data),
            "test": len(test_data),
            "total": len(lake_data)
        },
        "status": "success"
    }
    
    return jsonify(result)

@unified_forecast_bp.route("/api/unified/timeseries", methods=["GET"])
@rate_limit('forecast')
@secure_endpoint_wrapper
def unified_timeseries():
    """Birleştirilmiş zaman serisi endpoint'i"""
    try:
        lake_id_param = request.args.get("lake_id", "van")
        horizon_param = request.args.get("horizon", "H1")
        limit_param = request.args.get("limit", "1000")
        
        # Input validation
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        horizon = InputValidator.validate_horizon(horizon_param)
        limit = InputValidator.validate_limit(limit_param)
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
    # Veriyi yükle
    data = load_unified_data()
    if data is None:
        return SecureErrorHandler.handle_not_found_error("Veri dosyası")
    
    # Göl ve horizon filtreleme
    lake_data = data[
        (data['lake_id'] == lake_numeric_id) & 
        (data['H'] == int(horizon[1]))
    ].copy()
    
    if lake_data.empty:
        return jsonify({
            "lake_id": lake_key,
            "horizon": horizon,
            "records": [],
            "count": 0,
            "status": "no_data"
        })
    
    # Son N kayıtla sınırla
    if len(lake_data) > limit:
        lake_data = lake_data.tail(limit)
    
    # JSON için temizle
    output_data = lake_data.copy()
    output_data['date'] = output_data['date'].dt.strftime('%Y-%m-%d')
    
    return jsonify({
        "lake_id": lake_key,
        "horizon": horizon,
        "count": len(output_data),
        "records": output_data.to_dict("records"),
        "status": "success"
    })

@unified_forecast_bp.route("/api/unified/compare", methods=["GET"])
@rate_limit('forecast')
@secure_endpoint_wrapper
def unified_compare():
    """Horizon karşılaştırma endpoint'i"""
    try:
        lake_id_param = request.args.get("lake_id", "van")
        
        # Input validation
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
    # Veriyi yükle
    data = load_unified_data()
    if data is None:
        return SecureErrorHandler.handle_not_found_error("Veri dosyası")
    
    # Göl verilerini filtrele
    lake_data = data[data['lake_id'] == lake_numeric_id].copy()
    if lake_data.empty:
        return jsonify({
            "lake_id": lake_key,
            "comparison": {},
            "status": "no_data"
        })
    
    # Horizon karşılaştırması
    comparison = {}
    for horizon in ['H1', 'H2', 'H3']:
        h_data = lake_data[lake_data['H'] == int(horizon[1])]
        
        if not h_data.empty:
            # Performans metrikleri
            valid_data = h_data.dropna(subset=['target_water_area_m2', 'predicted_water_area'])
            
            if len(valid_data) > 0:
                actual = valid_data['target_water_area_m2']
                predicted = valid_data['predicted_water_area']
                
                # MAPE hesaplama
                mape = np.mean(np.abs((actual - predicted) / actual)) * 100
                
                # R² hesaplama
                ss_res = np.sum((actual - predicted) ** 2)
                ss_tot = np.sum((actual - np.mean(actual)) ** 2)
                r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
                
                comparison[horizon] = {
                    "mape": float(mape),
                    "r2": float(r2),
                    "sample_count": len(valid_data),
                    "confidence": {
                        'H1': 'high',
                        'H2': 'medium', 
                        'H3': 'low'
                    }.get(horizon, 'unknown')
                }
    
    return jsonify({
        "lake_id": lake_key,
        "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
        "comparison": comparison,
        "status": "success"
    })
