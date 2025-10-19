"""
Forecast (Tahmin) API Route'ları
2018-2024 gerçek veri için optimize edilmiş
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime
import traceback
import json
import os

from database_data_loader import get_lake_predictions, get_metrics
from utils import resolve_lake_id, calculate_future_predictions, clean_dataframe_for_json, log_error, log_info
from config import LAKE_INFO, KEY_BY_ID, BACKEND_MODELS_DIR
from database import get_database
from database.queries import DatabaseQueries
from models import get_improved_prediction, get_lake_performance_metrics

# Güvenlik modüllerini import et
from security.input_validation import InputValidator, ValidationError
from security.error_handler import SecureErrorHandler, secure_endpoint_wrapper
from security.rate_limiter import rate_limit

forecast_bp = Blueprint('forecast', __name__)

def get_mongodb_data(lake_numeric_id):
    """MongoDB'den göl verilerini çek"""
    try:
        db = get_database()
        
        # Water quantity observations (gerçek veriler)
        observations = db["water_quantity_observations"]
        lake_observations = list(observations.find(
            {"lake_id": lake_numeric_id},
            {"date": 1, "water_area_m2": 1, "_id": 0}
        ).sort("date", 1))
        
        # Water quantity predictions (tahminler) - model_prediction_history'den
        predictions = db["model_prediction_history"]
        lake_predictions = list(predictions.find(
            {"lake_id": lake_numeric_id, "prediction_type": "water_quantity"},
            {"date": 1, "outputs": 1, "model_id": 1, "_id": 0}
        ).sort("date", 1))
        
        return {
            "observations": lake_observations,
            "predictions": lake_predictions
        }
        
    except Exception as e:
        log_error(f"MongoDB veri çekme hatası: {e}")
        return {"observations": [], "predictions": []}

def format_mongodb_response(lake_key, lake_numeric_id, mongodb_data):
    """MongoDB verilerini API formatına dönüştür"""
    observations = mongodb_data["observations"]
    predictions = mongodb_data["predictions"]
    
    if not observations and not predictions:
        return {
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "years": list(range(2018, 2025)),
            "actual": [],
            "predicted": [],
            "predictions_3months": [],
            "change_percent": 0,
            "last_update": datetime.now().isoformat(),
            "status": "no_data"
        }
    
    # Verileri tarih sırasına göre sırala
    all_dates = set()
    if observations:
        for obs in observations:
            date = obs["date"]
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            all_dates.add(date)
    if predictions:
        for pred in predictions:
            date = pred["date"]
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            all_dates.add(date)
    
    sorted_dates = sorted(list(all_dates))
    
    # Yılları ve değerleri hazırla
    years = []
    actual = []
    predicted = []
    
    for date in sorted_dates:
        year = date.year if isinstance(date, datetime) else int(str(date)[:4])
        years.append(year)
        
        # Gerçek değer
        obs_value = None
        for obs in observations:
            obs_date = obs["date"]
            if isinstance(obs_date, str):
                obs_date = datetime.fromisoformat(obs_date.replace('Z', '+00:00'))
            
            if obs_date == date:
                obs_value = obs.get("water_area_m2", 0)  # Zaten m² cinsinden
                break
        actual.append(obs_value)
        
        # Tahmin değeri - model_prediction_history'den
        pred_value = None
        for pred in predictions:
            pred_date = pred["date"]
            if isinstance(pred_date, str):
                pred_date = datetime.fromisoformat(pred_date.replace('Z', '+00:00'))
            
            if pred_date == date:
                # outputs alanından tahmin değerini al
                outputs = pred.get("outputs", {})
                if isinstance(outputs, dict):
                    # H1, H2, H3 horizonlarından birini al
                    pred_value = outputs.get("H1", outputs.get("H2", outputs.get("H3", 0)))
                elif isinstance(outputs, (int, float)):
                    pred_value = outputs
                else:
                    pred_value = 0
                
                # m²'ye çevir (eğer km² ise)
                if pred_value and pred_value < 1000000:  # km² ise m²'ye çevir
                    pred_value = pred_value * 1e6
                break
        predicted.append(pred_value)
    
    # Değişim yüzdesini hesapla
    change_percent = 0
    if len(actual) >= 2:
        first_val = actual[0] if actual[0] is not None else 0
        last_val = actual[-1] if actual[-1] is not None else 0
        if first_val > 0:
            change_percent = ((last_val - first_val) / first_val) * 100
    
    # 3 aylık tahminler (son 3 ay)
    predictions_3months = predicted[-3:] if len(predicted) >= 3 else predicted
    
    return {
        "lake_id": lake_key,
        "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
        "years": years,
        "actual": actual,
        "predicted": predicted,
        "predictions_3months": predictions_3months,
        "change_percent": change_percent,
        "data_points": len([a for a in actual if a is not None]),
        "last_update": datetime.now().isoformat(),
        "status": "success"
    }

@forecast_bp.route("/api/forecast", methods=["GET"])
def forecast():
    """Göl su miktarı tahmini endpoint'i - MongoDB'den veri çekme"""
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
    # MongoDB'den veri çek
    try:
        mongodb_data = get_mongodb_data(lake_numeric_id)
        response = format_mongodb_response(lake_key, lake_numeric_id, mongodb_data)
        
        # Eğer MongoDB'de veri varsa, direkt döndür
        if response["status"] == "success":
            return jsonify(response)
        
        # Eğer MongoDB'de veri yoksa, fallback olarak parquet dosyasından çek
        log_info(f"MongoDB'de {lake_key} için veri bulunamadı, parquet dosyasından çekiliyor...")
        
    except Exception as e:
        log_error(f"MongoDB bağlantı hatası: {e}")
        log_info(f"Parquet dosyasından veri çekiliyor...")
    
    # Parquet fallback
    parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
    if not os.path.exists(parquet_path):
        return jsonify({
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "years": list(range(2018, 2025)),
            "actual": [],
            "predicted": [],
            "predictions_3months": [],
            "change_percent": 0,
            "last_update": datetime.now().isoformat(),
            "status": "no_data"
        })
    
    df = pd.read_parquet(parquet_path)
    lake_data = df[df['lake_id'] == lake_numeric_id].copy()
    
    if lake_data is None or lake_data.empty:
        return jsonify({
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "years": list(range(2018, 2025)),
            "actual": [],
            "predicted": [],
            "predictions_3months": [],
            "change_percent": 0,
            "last_update": datetime.now().isoformat(),
            "status": "no_data"
        })
    
    # Tarih sütununu düzelt
    if 'date' in lake_data.columns:
        lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
        lake_data = lake_data[lake_data['date'].notna()].copy()
        lake_data['year'] = lake_data['date'].dt.year
    else:
        return jsonify({
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "years": list(range(2018, 2025)),
            "actual": [],
            "predicted": [],
            "predictions_3months": [],
            "change_percent": 0,
            "last_update": datetime.now().isoformat(),
            "status": "no_data"
        })
    
    years = list(range(2018, 2025))
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
            
            # Tahmin değerleri - H=1 (1 ay horizon) kullan
            if 'predicted_water_area' in year_data.columns and 'H' in year_data.columns:
                h1_data = year_data[year_data['H'] == 1]
                if not h1_data.empty:
                    pred_avg = h1_data['predicted_water_area'].mean()
                    pred_avg = None if pd.isna(pred_avg) or pred_avg < 1000 else float(pred_avg)
                else:
                    # H=1 yoksa tüm horizon'ların ortalamasını al
                    pred_avg = year_data['predicted_water_area'].mean()
                    pred_avg = None if pd.isna(pred_avg) or pred_avg < 1000 else float(pred_avg)
            elif 'predicted_water_area' in year_data.columns:
                pred_avg = year_data['predicted_water_area'].mean()
                pred_avg = None if pd.isna(pred_avg) or pred_avg < 1000 else float(pred_avg)
            else:
                pred_avg = None
            predicted_areas.append(pred_avg)
        else:
            actual_areas.append(None)
            predicted_areas.append(None)
    
    # 3 aylık tahminler için trend hesapla
    valid_actuals = [a for a in actual_areas if a is not None and a > 0]
    if len(valid_actuals) >= 2:
        last_actual = valid_actuals[-1]
        prev_actual = valid_actuals[-2]
        trend = (last_actual - prev_actual) / prev_actual
        
        predictions_3months = [
            last_actual * (1 + trend * 0.5),
            last_actual * (1 + trend * 1.0),
            last_actual * (1 + trend * 1.5)
        ]
        
        change_percent = ((predictions_3months[0] - last_actual) / last_actual) * 100
    else:
        predictions_3months = [0, 0, 0]
        change_percent = 0.0
    
    # Yeni unified metrics'ten model performansını al
    unified_metrics_path = os.path.join(BACKEND_MODELS_DIR, 'unified_normalized_metrics.json')
    model_metrics = {}
    
    try:
        with open(unified_metrics_path, 'r', encoding='utf-8') as f:
            unified_metrics = json.load(f)
            h1_metrics = unified_metrics.get('H1', {}).get(str(lake_numeric_id), {})
            if h1_metrics:
                model_metrics = {
                    'r2': h1_metrics.get('r2', 0),
                    'wmape': h1_metrics.get('wmape', 0),
                    'unified_score': h1_metrics.get('unified_score', 0),
                    'reliability': h1_metrics.get('reliability', 'Unknown'),
                    'data_quality': h1_metrics.get('data_quality', 'Unknown')
                }
    except Exception as e:
        log_error(f"Unified metrics okuma hatası: {e}")
        model_metrics = {'r2': 0, 'wmape': 0, 'unified_score': 0, 'reliability': 'Unknown'}
    
    result = {
        "lake_id": lake_key,
        "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
        "coordinates": {
            "lat": LAKE_INFO.get(lake_key, {}).get("lat"),
            "lng": LAKE_INFO.get(lake_key, {}).get("lng")
        },
        "years": years,
        "actual": actual_areas,
        "predicted": predicted_areas,
        "predictions_3months": predictions_3months,
        "change_percent": float(change_percent),
        "last_update": datetime.now().isoformat(),
        "model_metrics": model_metrics,
        "data_points": len(lake_data),
        "status": "success"
    }
    
    return jsonify(result)

@forecast_bp.route("/api/forecast/detail/<lake_id>", methods=["GET"])
def forecast_detail(lake_id):
    try:
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id)
        
        # Yeni eğitilmiş modellerden veri al
        parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
        if not os.path.exists(parquet_path):
            return SecureErrorHandler.handle_not_found_error("Göl verisi")
        
        df = pd.read_parquet(parquet_path)
        lake_data = df[df['lake_id'] == lake_numeric_id].copy()
        
        if lake_data is None or lake_data.empty:
            return SecureErrorHandler.handle_not_found_error("Göl verisi")
        
        # Tarih sütununu düzelt
        if 'date' in lake_data.columns:
            lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
            lake_data = lake_data[lake_data['date'].notna()].copy()
            lake_data = lake_data.sort_values('date').copy()
            lake_data['year'] = lake_data['date'].dt.year
        else:
            return SecureErrorHandler.handle_not_found_error("Tarih verisi")
        
        yearly_summary = []
        
        for year in range(2018, 2025):
            year_data = lake_data[lake_data['year'] == year]
            if not year_data.empty:
                actual_mean = float(year_data['target_water_area_m2'].mean()) if 'target_water_area_m2' in year_data.columns else None
                predicted_mean = float(year_data['predicted_water_area'].mean()) if 'predicted_water_area' in year_data.columns else None
                
                yearly_summary.append({
                    'year': int(year),
                    'actual': actual_mean if pd.notna(actual_mean) else None,
                    'predicted': predicted_mean if pd.notna(predicted_mean) else None
                })
        
        monthly_data = []
        for _, row in lake_data.iterrows():
            monthly_data.append({
                'date': row['date'].isoformat(),
                'actual': float(row['target_water_area_m2']) if pd.notna(row.get('target_water_area_m2')) else None,
                'predicted': float(row['predicted_water_area']) if pd.notna(row.get('predicted_water_area')) else None,
                'year': int(row['year']),
                'month': int(row['date'].month)
            })
        
        lake_data['month'] = lake_data['date'].dt.month
        lake_data['season'] = lake_data['month'].apply(lambda m: 
            'Kış' if m in [12,1,2] else 
            'İlkbahar' if m in [3,4,5] else 
            'Yaz' if m in [6,7,8] else 'Sonbahar'
        )
        
        seasonal_summary = []
        for season in ['Kış', 'İlkbahar', 'Yaz', 'Sonbahar']:
            season_data = lake_data[lake_data['season'] == season]
            if not season_data.empty:
                seasonal_summary.append({
                    'season': season,
                    'actual': float(season_data['target_water_area_m2'].mean()) if 'target_water_area_m2' in season_data.columns else None,
                    'predicted': float(season_data['predicted_water_area'].mean()) if 'predicted_water_area' in season_data.columns else None
                })
        
        # Yeni unified metrics'ten model performansını al
        unified_metrics_path = os.path.join(BACKEND_MODELS_DIR, 'unified_normalized_metrics.json')
        lake_metrics = {}
        
        try:
            with open(unified_metrics_path, 'r', encoding='utf-8') as f:
                unified_metrics = json.load(f)
                h1_metrics = unified_metrics.get('H1', {}).get(str(lake_numeric_id), {})
                if h1_metrics:
                    lake_metrics = {
                        'r2': h1_metrics.get('r2', 0),
                        'wmape': h1_metrics.get('wmape', 0),
                        'unified_score': h1_metrics.get('unified_score', 0),
                        'reliability': h1_metrics.get('reliability', 'Unknown'),
                        'data_quality': h1_metrics.get('data_quality', 'Unknown'),
                        'samples': h1_metrics.get('samples', 0)
                    }
        except Exception as e:
            log_error(f"Unified metrics okuma hatası: {e}")
            lake_metrics = {}
        
        result = {
            'lake_id': lake_key,
            'lake_name': LAKE_INFO.get(lake_key, {}).get('name', lake_key.upper()),
            'yearly_summary': yearly_summary,
            'monthly_data': monthly_data,
            'seasonal_summary': seasonal_summary,
            'metrics': lake_metrics,
            'total_records': len(lake_data),
            'date_range': {
                'start': lake_data['date'].min().isoformat(),
                'end': lake_data['date'].max().isoformat()
            },
            'status': 'success'
        }
        
        return jsonify(result)
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    except Exception as e:
        log_error(f"Detail endpoint error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e), "status": "error"}), 500

@forecast_bp.route("/api/forecast/debug", methods=["GET"])
@rate_limit('debug')
@secure_endpoint_wrapper
def forecast_debug():
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
    # Yeni eğitilmiş modellerden veri al
    parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
    if not os.path.exists(parquet_path):
        return SecureErrorHandler.handle_not_found_error("Veri")
    
    df = pd.read_parquet(parquet_path)
    lake_data = df[df['lake_id'] == lake_numeric_id].copy()
    
    if lake_data is None or lake_data.empty:
        return SecureErrorHandler.handle_not_found_error("Veri")
    
    # Tarih sütununu düzelt
    if 'date' in lake_data.columns:
        lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
        lake_data = lake_data[lake_data['date'].notna()].copy()
    
    debug_info = {
        "lake_id": lake_numeric_id,
        "lake_key": lake_key,
        "data_shape": lake_data.shape,
        "columns": list(lake_data.columns),
        "date_range": {
            "start": str(lake_data['date'].min()) if 'date' in lake_data.columns else "No date column",
            "end": str(lake_data['date'].max()) if 'date' in lake_data.columns else "No date column"
        },
        "horizon_analysis": {
            "available_H": lake_data['H'].unique().tolist() if 'H' in lake_data.columns else "No H column",
            "H1_count": int((lake_data['H'] == 1).sum()) if 'H' in lake_data.columns else 0,
            "H2_count": int((lake_data['H'] == 2).sum()) if 'H' in lake_data.columns else 0,
            "H3_count": int((lake_data['H'] == 3).sum()) if 'H' in lake_data.columns else 0
        },
        "sample_data": lake_data.head(5).to_dict('records'),
        "target_water_area_stats": {
            "mean": float(lake_data['target_water_area_m2'].mean()) if 'target_water_area_m2' in lake_data.columns else None,
            "min": float(lake_data['target_water_area_m2'].min()) if 'target_water_area_m2' in lake_data.columns else None,
            "max": float(lake_data['target_water_area_m2'].max()) if 'target_water_area_m2' in lake_data.columns else None,
            "count": int(lake_data['target_water_area_m2'].count()) if 'target_water_area_m2' in lake_data.columns else 0
        },
        "predicted_water_area_stats": {
            "mean": float(lake_data['predicted_water_area'].mean()) if 'predicted_water_area' in lake_data.columns else None,
            "min": float(lake_data['predicted_water_area'].min()) if 'predicted_water_area' in lake_data.columns else None,
            "max": float(lake_data['predicted_water_area'].max()) if 'predicted_water_area' in lake_data.columns else None,
            "count": int(lake_data['predicted_water_area'].count()) if 'predicted_water_area' in lake_data.columns else 0
        },
        "unified_metrics": {}
    }
    
    # Unified metrics bilgisi ekle
    try:
        queries = DatabaseQueries()
        model_metadata = queries.get_model_metadata()
        unified_metrics = {}
        for model in model_metadata:
            unified_metrics[model['model_name']] = model['performance_metrics']
            h1_metrics = unified_metrics.get('H1', {}).get(str(lake_numeric_id), {})
            if h1_metrics:
                debug_info["unified_metrics"] = h1_metrics
    except Exception as e:
        debug_info["unified_metrics"] = {"error": str(e)}
    
    return jsonify(debug_info)

@forecast_bp.route("/api/forecast/timeseries", methods=["GET"])
def forecast_timeseries():
    try:
        lake_id_param = request.args.get("lake_id", "van")
        limit_param = request.args.get("limit", "1000")
        
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        limit = InputValidator.validate_limit(limit_param)
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
    # Yeni eğitilmiş modellerden veri al
    parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
    if not os.path.exists(parquet_path):
        return jsonify({
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "records": [],
            "count": 0,
            "status": "no_data"
        })
    
    df = pd.read_parquet(parquet_path)
    lake_data = df[df['lake_id'] == lake_numeric_id].copy()
    
    if lake_data is None or lake_data.empty:
        return jsonify({
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "records": [],
            "count": 0,
            "status": "no_data"
        })
    
    # Tarih sütununu düzelt
    if 'date' in lake_data.columns:
        lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
        lake_data = lake_data[lake_data['date'].notna()].copy()
        lake_data = lake_data.sort_values('date')
    
    if len(lake_data) > limit:
        lake_data = lake_data.tail(limit)
    
    output_data = clean_dataframe_for_json(lake_data)
    
    return jsonify({
        "lake_id": lake_key,
        "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
        "count": len(output_data),
        "records": output_data.to_dict("records"),
        "status": "success"
    })

@forecast_bp.route("/api/forecast/metrics/normalized", methods=["GET"])
def get_normalized_metrics():
    try:
        # Yeni unified metrics dosyasını kullan
        unified_metrics_path = os.path.join(BACKEND_MODELS_DIR, 'unified_normalized_metrics.json')
        
        if not os.path.exists(unified_metrics_path):
            return jsonify({
                "lake_metrics": {},
                "status": "no_metrics_file"
            })
        
        with open(unified_metrics_path, 'r', encoding='utf-8') as f:
            unified_metrics = json.load(f)
        
        # H1 (1 ay horizon) metriklerini döndür
        h1_metrics = unified_metrics.get('H1', {})
        
        # Lake ID'leri string'e çevir
        lake_metrics = {}
        for lake_id, metrics in h1_metrics.items():
            lake_metrics[lake_id] = {
                "wmape": metrics.get('wmape', 0),
                "r2": metrics.get('r2', 0),
                "unified_score": metrics.get('unified_score', 0),
                "reliability": metrics.get('reliability', 'Unknown'),
                "data_quality": metrics.get('data_quality', 'Unknown'),
                "sample_size": metrics.get('samples', 0)
            }
        
        return jsonify({
            "lake_metrics": lake_metrics,
            "status": "success"
        })
        
    except Exception as e:
        log_error(f"Normalized metrics error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500


@forecast_bp.route("/api/forecast/compare-all", methods=["GET"])
def compare_all_lakes():
    try:
        parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
        if not os.path.exists(parquet_path):
            return jsonify({
                'lakes': [],
                'total_lakes': 0,
                'status': 'no_data'
            })
        
        df = pd.read_parquet(parquet_path)
        
        # Yeni unified metrics dosyasını kullan
        unified_metrics_path = os.path.join(BACKEND_MODELS_DIR, 'unified_normalized_metrics.json')
        unified_metrics = {}
        
        try:
            with open(unified_metrics_path, 'r', encoding='utf-8') as f:
                unified_metrics = json.load(f)
        except Exception as e:
            log_error(f"Unified metrics okuma hatası: {e}")
        
        comparison_data = []
        
        for lake_id in df['lake_id'].unique():
            lake_data = df[df['lake_id'] == lake_id]
            lake_key = KEY_BY_ID.get(lake_id, str(lake_id))
            lake_info = LAKE_INFO.get(lake_key, {})
            
            # Tarih sütununu düzelt
            if 'date' in lake_data.columns:
                lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
                lake_data = lake_data[lake_data['date'].notna()].copy()
                lake_data = lake_data.sort_values('date')
            
            latest_area = lake_data['target_water_area_m2'].dropna().iloc[-1] if len(lake_data['target_water_area_m2'].dropna()) > 0 else None
            avg_area = lake_data['target_water_area_m2'].mean()
            
            recent = lake_data.tail(12)['target_water_area_m2'].mean()
            previous = lake_data.iloc[-24:-12]['target_water_area_m2'].mean() if len(lake_data) >= 24 else recent
            trend_pct = ((recent - previous) / previous * 100) if previous > 0 else 0
            
            # Yeni unified metrics'ten bilgi al
            h1_metrics = unified_metrics.get('H1', {}).get(str(lake_id), {})
            
            comparison_data.append({
                'lake_id': lake_key,
                'lake_name': lake_info.get('name', lake_key.upper()),
                'latest_area': float(latest_area) if latest_area else None,
                'avg_area': float(avg_area) if not pd.isna(avg_area) else None,
                'trend_percent': float(trend_pct),
                'wmape': h1_metrics.get('wmape', None),
                'r2': h1_metrics.get('r2', None),
                'unified_score': h1_metrics.get('unified_score', None),
                'reliability': h1_metrics.get('reliability', 'Unknown'),
                'data_quality': h1_metrics.get('data_quality', 'Unknown'),
                'data_points': len(lake_data)
            })
        
        # Unified score'a göre sırala (yüksek = iyi)
        comparison_data.sort(key=lambda x: x['unified_score'] if x['unified_score'] else 0, reverse=True)
        
        return jsonify({
            'lakes': comparison_data,
            'total_lakes': len(comparison_data),
            'status': 'success'
        })
        
    except Exception as e:
        log_error(f"Compare all lakes error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500


@forecast_bp.route("/api/forecast/improved-prediction/<lake_id>", methods=["GET"])
@rate_limit('forecast')
def get_improved_prediction_endpoint(lake_id):
    """İyileştirilmiş göl tahmini döndür"""
    try:
        lake_numeric_id = resolve_lake_id(lake_id)
        if not lake_numeric_id:
            return jsonify({'status': 'error', 'message': 'Geçersiz göl ID'}), 400
        
        log_info(f"🔮 {lake_id} için iyileştirilmiş tahmin başlatılıyor...")
        
        # Örnek model tahmini (gerçek uygulamada model'den gelecek)
        model_prediction = 1000000  # m²
        baseline_seasonal = 950000  # m²
        
        # İyileştirilmiş tahmin al
        improved_result = get_improved_prediction(lake_numeric_id, model_prediction, baseline_seasonal)
        
        # Göl performans metrikleri
        performance_metrics = get_lake_performance_metrics(lake_numeric_id)
        
        return jsonify({
            'status': 'success',
            'lake_id': lake_numeric_id,
            'lake_name': LAKE_INFO.get(lake_id, {}).get('name', f'Göl {lake_numeric_id}'),
            'improved_prediction': improved_result,
            'performance_metrics': performance_metrics,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        log_error(f"İyileştirilmiş tahmin hatası: {e}")
        return jsonify({
            'status': 'error',
            'message': 'İyileştirilmiş tahmin alınamadı',
            'error': str(e)
        }), 500


@forecast_bp.route("/api/forecast/trend-analysis", methods=["GET"])
def trend_analysis():
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
        # MongoDB'den veri çek
        try:
            db = get_database()
            
            # Gerçek gözlem verilerini al
            observations = db["water_quantity_observations"]
            lake_observations = list(observations.find(
                {"lake_id": lake_numeric_id},
                {"date": 1, "water_area_m2": 1, "_id": 0}
            ).sort("date", 1))
            
            if not lake_observations:
                return jsonify({"status": "no_data"})
            
            # Verileri DataFrame'e çevir
            data = []
            for obs in lake_observations:
                date = obs["date"]
                if isinstance(date, str):
                    date = datetime.fromisoformat(date.replace('Z', '+00:00'))
                
                data.append({
                    'date': date,
                    'water_area_m2': obs.get("water_area_m2", 0)
                })
            
            lake_data = pd.DataFrame(data)
            lake_data['year'] = lake_data['date'].dt.year
            
        except Exception as e:
            log_error(f"MongoDB trend analysis hatası: {e}")
            # Fallback: Parquet dosyasından
            parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
            if not os.path.exists(parquet_path):
                return jsonify({"status": "no_data"})
            
            df = pd.read_parquet(parquet_path)
            lake_data = df[df['lake_id'] == lake_numeric_id].copy()
            
            if lake_data is None or lake_data.empty:
                return jsonify({"status": "no_data"})
            
            lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
            lake_data = lake_data[lake_data['date'].notna()].copy()
            lake_data = lake_data.sort_values('date').copy()
            lake_data['year'] = lake_data['date'].dt.year
        
        # Sütun adını kontrol et
        area_column = 'water_area_m2' if 'water_area_m2' in lake_data.columns else 'target_water_area_m2'
        yearly = lake_data.groupby('year')[area_column].mean().reset_index()
        
        if len(yearly) < 2:
            return jsonify({"status": "insufficient_data"})
        
        X = yearly['year'].values
        y = yearly[area_column].values
        
        A = np.vstack([X, np.ones(len(X))]).T
        trend_slope, trend_intercept = np.linalg.lstsq(A, y, rcond=None)[0]
        
        future_years = [2025, 2026, 2027]
        projections = []
        
        for year in future_years:
            projected_value = trend_slope * year + trend_intercept
            projections.append({
                'year': year,
                'projected_area': float(projected_value),
                'confidence': 'medium'
            })
        
        yearly_change = (trend_slope / y.mean()) * 100
        trend_direction = 'artış' if trend_slope > 0 else 'azalış'
        
        return jsonify({
            'lake_id': lake_key,
            'lake_name': LAKE_INFO.get(lake_key, {}).get('name'),
            'trend_slope': float(trend_slope),
            'yearly_change_percent': float(yearly_change),
            'trend_direction': trend_direction,
            'projections': projections,
            'historical_years': yearly['year'].tolist(),
            'historical_values': yearly[area_column].tolist(),
            'status': 'success'
        })
        
    except Exception as e:
        log_error(f"Trend analysis error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500

@forecast_bp.route("/api/forecast/future", methods=["GET"])
def future_forecast():
    """Gelecek tahminleri - MongoDB'den"""
    try:
        lake_id_param = request.args.get("lake_id", "van")
        months = int(request.args.get("months", 6))
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
        # MongoDB'den veri çek
        try:
            db = get_database()
            
            # Model prediction history'den gelecek tahminleri al
            predictions = db["model_prediction_history"]
            future_predictions = list(predictions.find(
                {"lake_id": lake_numeric_id, "prediction_type": "water_quantity"},
                {"date": 1, "outputs": 1, "horizon": 1, "_id": 0}
            ).sort("date", -1).limit(months))
            
            if not future_predictions:
                return jsonify({"status": "no_data", "predictions": []})
            
            # Tahminleri formatla
            formatted_predictions = []
            for pred in future_predictions:
                outputs = pred.get("outputs", {})
                if isinstance(outputs, dict):
                    # H1, H2, H3 horizonlarından uygun olanı al
                    horizon = pred.get("horizon", "H1")
                    predicted_value = outputs.get(horizon, outputs.get("H1", 0))
                else:
                    predicted_value = outputs if isinstance(outputs, (int, float)) else 0
                
                formatted_predictions.append({
                    "date": pred["date"].isoformat() if hasattr(pred["date"], 'isoformat') else str(pred["date"]),
                    "predicted_area_m2": float(predicted_value),
                    "horizon": pred.get("horizon", "H1")
                })
            
            return jsonify({
                "status": "success",
                "lake_id": lake_key,
                "predictions": formatted_predictions,
                "months": months
            })
            
        except Exception as e:
            log_error(f"MongoDB future forecast hatası: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500
            
    except Exception as e:
        log_error(f"Future forecast error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500

@forecast_bp.route("/api/forecast/risk-levels", methods=["GET"])
def risk_levels():
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
        # Yeni eğitilmiş modellerden veri al
        parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
        if not os.path.exists(parquet_path):
            return jsonify({"status": "no_data"})
        
        df = pd.read_parquet(parquet_path)
        lake_data = df[df['lake_id'] == lake_numeric_id].copy()
        
        if lake_data is None or lake_data.empty:
            return jsonify({"status": "no_data"})
        
        values = lake_data['target_water_area_m2'].dropna()
        
        if len(values) == 0:
            return jsonify({"status": "no_valid_data"})
        
        mean_val = float(values.mean())
        std_val = float(values.std())
        min_val = float(values.min())
        max_val = float(values.max())
        current_val = float(values.iloc[-1])
        
        critical_low = mean_val - (2 * std_val)
        warning_low = mean_val - std_val
        warning_high = mean_val + std_val
        critical_high = mean_val + (2 * std_val)
        
        if current_val < critical_low:
            risk_level = 'critical_low'
            risk_color = 'red'
            risk_text = 'KRİTİK DÜŞÜK'
        elif current_val < warning_low:
            risk_level = 'warning_low'
            risk_color = 'orange'
            risk_text = 'DİKKAT (Düşük)'
        elif current_val > critical_high:
            risk_level = 'critical_high'
            risk_color = 'red'
            risk_text = 'KRİTİK YÜKSEK'
        elif current_val > warning_high:
            risk_level = 'warning_high'
            risk_color = 'orange'
            risk_text = 'DİKKAT (Yüksek)'
        else:
            risk_level = 'normal'
            risk_color = 'green'
            risk_text = 'NORMAL'
        
        percentile = float((values < current_val).sum() / len(values) * 100)
        
        return jsonify({
            'lake_id': lake_key,
            'lake_name': LAKE_INFO.get(lake_key, {}).get('name'),
            'current_value': current_val,
            'risk_level': risk_level,
            'risk_color': risk_color,
            'risk_text': risk_text,
            'percentile': percentile,
            'thresholds': {
                'critical_low': critical_low,
                'warning_low': warning_low,
                'mean': mean_val,
                'warning_high': warning_high,
                'critical_high': critical_high,
                'min': min_val,
                'max': max_val
            },
            'status': 'success'
        })
        
    except Exception as e:
        log_error(f"Risk levels error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500


@forecast_bp.route("/api/forecast/data-quality", methods=["GET"])
def data_quality():
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
        # Yeni eğitilmiş modellerden veri al
        parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
        if not os.path.exists(parquet_path):
            return jsonify({
                "lake_id": lake_key,
                "message": "Veri dosyası bulunamadı",
                "status": "no_data"
            })
        
        df = pd.read_parquet(parquet_path)
        lake_data = df[df['lake_id'] == lake_numeric_id].copy()
        
        if lake_data.empty:
            return jsonify({
                "lake_id": lake_key,
                "message": "Bu göl için veri yok",
                "status": "no_data"
            })
        
        # Tarih sütununu düzelt
        if 'date' in lake_data.columns:
            lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
            lake_data = lake_data[lake_data['date'].notna()].copy()
            lake_data['year_month'] = lake_data['date'].dt.to_period('M').astype(str)
        else:
            return jsonify({
                "lake_id": lake_key,
                "message": "Tarih verisi bulunamadı",
                "status": "no_date_data"
            })
        
        # Bulut verisi varsa kullan, yoksa genel veri kalitesi hesapla
        if 'cloud_pct' in lake_data.columns:
            monthly_quality = []
            for ym, group in lake_data.groupby('year_month'):
                avg_cloud = float(group['cloud_pct'].mean())
                quality_score = 100 - avg_cloud
                
                # Daha gerçekçi kalite eşikleri
                if avg_cloud <= 10:
                    quality_level = 'excellent'
                elif avg_cloud <= 25:
                    quality_level = 'good'
                elif avg_cloud <= 50:
                    quality_level = 'fair'
                else:
                    quality_level = 'poor'
                
                monthly_quality.append({
                    'month': ym,
                    'cloud_percent': avg_cloud,
                    'quality_score': quality_score,
                    'quality_level': quality_level,
                    'samples': len(group)
                })
            
            overall_cloud = float(lake_data['cloud_pct'].mean())
            overall_quality = 100 - overall_cloud
        else:
            # Bulut verisi yoksa genel veri kalitesi hesapla
            monthly_quality = []
            for ym, group in lake_data.groupby('year_month'):
                # Veri noktası sayısına göre kalite hesapla
                samples = len(group)
                if samples >= 10:
                    quality_level = 'excellent'
                    quality_score = 95
                elif samples >= 5:
                    quality_level = 'good'
                    quality_score = 80
                elif samples >= 2:
                    quality_level = 'fair'
                    quality_score = 60
                else:
                    quality_level = 'poor'
                    quality_score = 30
                
                monthly_quality.append({
                    'month': ym,
                    'cloud_percent': 0,  # Bulut verisi yok
                    'quality_score': quality_score,
                    'quality_level': quality_level,
                    'samples': samples
                })
            
            overall_cloud = 0
            overall_quality = float(np.mean([q['quality_score'] for q in monthly_quality]))
        
        return jsonify({
            'lake_id': lake_key,
            'lake_name': LAKE_INFO.get(lake_key, {}).get('name'),
            'overall_cloud_percent': overall_cloud,
            'overall_quality_score': overall_quality,
            'monthly_quality': monthly_quality,
            'total_samples': len(lake_data),
            'status': 'success'
        })
        
    except Exception as e:
        log_error(f"Data quality error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500


@forecast_bp.route("/api/forecast/unified", methods=["GET"])
def unified_forecast():
    """
    Tek endpoint - tüm veriyi birleştirilmiş şekilde döndürür
    - Geçmiş veriler (2018-2024): actual + H1/H2/H3 tahminleri
    - Gelecek tahminleri (2025-2027): H1/H2/H3
    - Model metrikleri
    - Mevsimsel analiz
    - Trend analizi
    """
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
        # Parquet dosyasından veri çek
        parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
        log_info(f"Unified forecast - Parquet path: {parquet_path}")
        log_info(f"Unified forecast - File exists: {os.path.exists(parquet_path)}")
        
        if not os.path.exists(parquet_path):
            log_error(f"Unified forecast - Parquet file not found: {parquet_path}")
            return jsonify({"status": "no_data", "message": "Veri dosyası bulunamadı"}), 404
        
        df = pd.read_parquet(parquet_path)
        log_info(f"Unified forecast - Data loaded, shape: {df.shape}")
        
        lake_data = df[df['lake_id'] == lake_numeric_id].copy()
        log_info(f"Unified forecast - Lake data for {lake_key} (ID: {lake_numeric_id}), records: {len(lake_data)}")
        
        if lake_data.empty:
            log_error(f"Unified forecast - No data found for lake {lake_key} (ID: {lake_numeric_id})")
            return jsonify({"status": "no_data", "message": "Göl verisi bulunamadı"}), 404
        
        # Tarih sütununu düzelt
        lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
        lake_data = lake_data[lake_data['date'].notna()].copy()
        lake_data = lake_data.sort_values('date')
        lake_data['year'] = lake_data['date'].dt.year
        lake_data['month'] = lake_data['date'].dt.month
        
        # 1. GEÇMİŞ VERİLER (2018-2024)
        historical_data = lake_data[lake_data['year'] <= 2024].copy()
        
        years = []
        actual = []
        predicted_h1 = []
        predicted_h2 = []
        predicted_h3 = []
        
        for year in range(2018, 2025):
            year_data = historical_data[historical_data['year'] == year]
            years.append(year)
            
            # Gerçek değer
            if 'target_water_area_m2' in year_data.columns:
                actual_val = year_data['target_water_area_m2'].mean()
                actual.append(float(actual_val) if pd.notna(actual_val) and actual_val > 1000 else None)
            else:
                actual.append(None)
            
            # H1, H2, H3 tahminleri
            for h_val, h_list in [(1, predicted_h1), (2, predicted_h2), (3, predicted_h3)]:
                h_data = year_data[year_data['H'] == h_val] if 'H' in year_data.columns else pd.DataFrame()
                if not h_data.empty and 'predicted_water_area' in h_data.columns:
                    pred_val = h_data['predicted_water_area'].mean()
                    h_list.append(float(pred_val) if pd.notna(pred_val) and pred_val > 1000 else None)
                else:
                    h_list.append(None)
        
        # 2. GELECEK TAHMİNLERİ (2025-2027) - GERÇEK MODEL KULLAN
        from models import predict_future
        
        future_years = [2025, 2026, 2027]
        future_h1 = []
        future_h2 = []
        future_h3 = []
        
        # Model ile tahmin yap
        model_predictions = predict_future(lake_numeric_id, months_ahead=3)
        
        # Trend hesaplama (her durumda gerekli)
        valid_actuals = [a for a in actual if a is not None and a > 0]
        if len(valid_actuals) >= 2:
            last_actual = valid_actuals[-1]
            prev_actual = valid_actuals[-2]
            trend = (last_actual - prev_actual) / prev_actual
        else:
            trend = 0
        
        base_value = valid_actuals[-1] if valid_actuals else 0
        
        if model_predictions and all(model_predictions.values()):
            # Model başarılı - gerçek tahminleri kullan
            for i in range(3):
                future_h1.append(model_predictions.get('H1'))
                future_h2.append(model_predictions.get('H2'))
                future_h3.append(model_predictions.get('H3'))
        else:
            # Model başarısız - trend fallback
            for i in range(1, 4):
                h1_val = base_value * (1 + trend * i * 0.5)
                h2_val = base_value * (1 + trend * i * 0.4)
                h3_val = base_value * (1 + trend * i * 0.3)
                
                future_h1.append(float(h1_val) if h1_val > 0 else None)
                future_h2.append(float(h2_val) if h2_val > 0 else None)
                future_h3.append(float(h3_val) if h3_val > 0 else None)
        
        # 3. MEVSIMSEL ANALİZ
        monthly_avg = {}
        for month in range(1, 13):
            month_data = historical_data[historical_data['month'] == month]
            if not month_data.empty and 'target_water_area_m2' in month_data.columns:
                avg_val = month_data['target_water_area_m2'].mean()
                monthly_avg[month] = float(avg_val) if pd.notna(avg_val) else None
            else:
                monthly_avg[month] = None
        
        months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        seasonal_values = [monthly_avg.get(i+1) for i in range(12)]
        
        # 4. TREND ANALİZİ
        yearly_change = trend * 100 if trend else 0
        trend_direction = 'artış' if trend > 0 else 'azalış' if trend < 0 else 'sabit'
        
        # 5. MODEL METRİKLERİ
        unified_metrics_path = os.path.join(BACKEND_MODELS_DIR, 'unified_normalized_metrics.json')
        metrics = {}
        try:
            with open(unified_metrics_path, 'r', encoding='utf-8') as f:
                unified_metrics = json.load(f)
                h1_metrics = unified_metrics.get('H1', {}).get(str(lake_numeric_id), {})
                if h1_metrics:
                    metrics = {
                        'r2': h1_metrics.get('r2', 0),
                        'wmape': h1_metrics.get('wmape', 0),
                        'unified_score': h1_metrics.get('unified_score', 0),
                        'reliability': h1_metrics.get('reliability', 'Unknown')
                    }
        except:
            metrics = {'r2': 0, 'wmape': 0, 'unified_score': 0, 'reliability': 'Unknown'}
        
        # UNIFIED RESPONSE
        return jsonify({
            "status": "success",
            "lake_id": lake_key,
            "lake_name": LAKE_INFO.get(lake_key, {}).get('name', lake_key.upper()),
            
            "historical": {
                "years": years,
                "actual": actual,
                "predicted_h1": predicted_h1,
                "predicted_h2": predicted_h2,
                "predicted_h3": predicted_h3
            },
            
            "future": {
                "years": future_years,
                "predicted_h1": future_h1,
                "predicted_h2": future_h2,
                "predicted_h3": future_h3
            },
            
            "metrics": metrics,
            
            "seasonal": {
                "months": months,
                "values": seasonal_values
            },
            
            "trend": {
                "yearly_change_percent": float(yearly_change),
                "direction": trend_direction,
                "last_actual": float(base_value) if base_value else None
            },
            
            "data_points": len(historical_data)
        })
        
    except ValidationError as e:
        log_error(f"Unified forecast validation error: {str(e)}")
        return SecureErrorHandler.handle_validation_error(str(e))
    except Exception as e:
        log_error(f"Unified forecast error: {str(e)}")
        log_error(f"Unified forecast error type: {type(e).__name__}")
        log_error(f"Unified forecast error details: {traceback.format_exc()}")
        return jsonify({"error": str(e), "status": "error", "error_type": type(e).__name__}), 500


@forecast_bp.route("/api/forecast/trend-confidence", methods=["GET"])
def trend_confidence():
    """Trend analizi + güven aralığı"""
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
        # Parquet'ten veri çek
        parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
        if not os.path.exists(parquet_path):
            return jsonify({"status": "no_data"}), 404
        
        df = pd.read_parquet(parquet_path)
        lake_data = df[df['lake_id'] == lake_numeric_id].copy()
        
        if lake_data.empty:
            return jsonify({"status": "no_data"}), 404
        
        lake_data['date'] = pd.to_datetime(lake_data['date'], errors='coerce')
        lake_data = lake_data[lake_data['date'].notna()].copy()
        lake_data = lake_data.sort_values('date')
        lake_data['year'] = lake_data['date'].dt.year
        
        # Yıllık ortalamalar
        yearly = lake_data.groupby('year')['target_water_area_m2'].mean().reset_index()
        
        if len(yearly) < 2:
            return jsonify({"status": "insufficient_data"}), 400
        
        X = yearly['year'].values
        y = yearly['target_water_area_m2'].values
        
        # Linear regression
        A = np.vstack([X, np.ones(len(X))]).T
        trend_slope, trend_intercept = np.linalg.lstsq(A, y, rcond=None)[0]
        
        # Residuals için standart sapma
        predictions = trend_slope * X + trend_intercept
        residuals = y - predictions
        std_error = np.std(residuals)
        
        # Gelecek projeksiyonlar (3 yıl)
        future_years = [2025, 2026, 2027]
        projections = []
        
        for i, year in enumerate(future_years):
            projected = trend_slope * year + trend_intercept
            # Güven aralığı genişliyor (zaman ilerledikçe)
            confidence_margin = std_error * (1 + i * 0.3)
            
            projections.append({
                'year': year,
                'projected_area': float(projected),
                'upper_bound': float(projected + 1.96 * confidence_margin),
                'lower_bound': float(projected - 1.96 * confidence_margin),
                'confidence': 'high' if i == 0 else 'medium'
            })
        
        return jsonify({
            'status': 'success',
            'lake_id': lake_key,
            'lake_name': LAKE_INFO.get(lake_key, {}).get('name'),
            'trend_slope': float(trend_slope),
            'trend_intercept': float(trend_intercept),
            'std_error': float(std_error),
            'historical_years': yearly['year'].tolist(),
            'historical_values': yearly['target_water_area_m2'].tolist(),
            'projections': projections,
            'yearly_change_percent': float((trend_slope / y.mean()) * 100),
            'trend_direction': 'artış' if trend_slope > 0 else 'azalış'
        })
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    except Exception as e:
        log_error(f"Trend confidence error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500


@forecast_bp.route("/api/forecast/horizon-comparison", methods=["GET"])
def horizon_comparison():
    """H1, H2, H3 horizon performans karşılaştırması"""
    try:
        lake_id_param = request.args.get("lake_id", "van")
        lake_key, lake_numeric_id = InputValidator.validate_lake_id(lake_id_param)
        
        # MongoDB'den model metadata'yı al
        db = get_database()
        queries = DatabaseQueries()
        
        model_metadata = queries.get_model_metadata()
        
        if not model_metadata:
            return jsonify({"status": "no_metrics"}), 404
        
        comparison = []
        
        for model in model_metadata:
            model_name = model['model_name']
            performance_metrics = model.get('performance_metrics', {})
            
            # Model adından horizon'u çıkar (H1, H2, H3)
            if 'H1' in model_name:
                horizon = 'H1'
            elif 'H2' in model_name:
                horizon = 'H2'
            elif 'H3' in model_name:
                horizon = 'H3'
            else:
                continue
            
            # MongoDB'den gerçek performans metriklerini al
            r2 = performance_metrics.get('test_r2', performance_metrics.get('r2', 0))
            wmape = performance_metrics.get('test_wmape', performance_metrics.get('wmape', 0))
            
            # Unified score hesapla (R² bazlı)
            unified_score = r2 * 100
            
            # Reliability belirle
            if r2 >= 0.99:
                reliability = "Mükemmel"
            elif r2 >= 0.95:
                reliability = "İyi"
            elif r2 >= 0.90:
                reliability = "Orta"
            else:
                reliability = "Düşük"
            
            comparison.append({
                'horizon': horizon,
                'horizon_name': f'{horizon} ({horizon[1]} Ay)',
                'r2': r2,
                'wmape': wmape,
                'unified_score': unified_score,
                'reliability': reliability,
                'samples': performance_metrics.get('test_samples', 0)
            })
        
        if not comparison:
            return jsonify({"status": "no_data"}), 404
        
        # En iyi performansı belirle
        best_r2 = max(comparison, key=lambda x: x['r2'])
        best_wmape = min(comparison, key=lambda x: x['wmape'])
        
        return jsonify({
            'status': 'success',
            'lake_id': lake_key,
            'lake_name': LAKE_INFO.get(lake_key, {}).get('name'),
            'comparison': comparison,
            'best_horizon': {
                'r2': best_r2['horizon'],
                'wmape': best_wmape['horizon']
            },
            'average_metrics': {
                'r2': sum(c['r2'] for c in comparison) / len(comparison),
                'wmape': sum(c['wmape'] for c in comparison) / len(comparison)
            }
        })
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    except Exception as e:
        log_error(f"Horizon comparison error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500