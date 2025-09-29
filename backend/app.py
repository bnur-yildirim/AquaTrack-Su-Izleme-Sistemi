from flask import Flask, request, jsonify
from flask_cors import CORS # type: ignore
import pandas as pd
import numpy as np
import os
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass
from datetime import datetime, timedelta
import json

app = Flask(__name__)
# Allow all origins for API endpoints; tighten if needed
CORS(app, resources={r"/*": {"origins": "*"}})

# Ensure CORS headers on all responses (including errors and preflight)
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin") or os.getenv("CORS_ORIGINS", "*")
    # Echo specific origin if provided, otherwise fallback to *
    response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
    response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get(
        "Access-Control-Request-Headers", "Content-Type, Authorization"
    )
    response.headers["Access-Control-Allow-Methods"] = request.headers.get(
        "Access-Control-Request-Method", "GET, POST, PUT, DELETE, OPTIONS"
    )
    response.headers["Access-Control-Max-Age"] = "86400"
    return response

# Handle generic CORS preflight
@app.route("/api/<path:unused>", methods=["OPTIONS"])
def cors_preflight(unused):
    return ("", 204)

# Model yolları - doğru path
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# MongoDB data loader
from data_loader_mongodb import get_data_loader, load_data, get_lake_predictions, get_metrics, get_lake_data_points, get_lakes
from routes import register_routes

# Load lake information from database
print("🔄 Loading lake information from database...")
LAKE_INFO = get_lakes()
KEY_BY_ID = {info["id"]: key for key, info in LAKE_INFO.items()}
print(f"✅ Loaded {len(LAKE_INFO)} lakes from database")

# Veri yükleme
print("🔄 MongoDB data loader kullanılıyor...")
data_success = load_data()
print("✅ MongoDB veriler başarıyla yüklendi")

# Register all blueprints
register_routes(app)

# API Routes
@app.route("/")
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
    
    <h4>📈 Analitik API'ler:</h4>
    <ul>
        <li><b>/api/analytics/lake/van/overview</b> - Göl genel analizi</li>
        <li><b>/api/analytics/lake/van/quality</b> - Su kalitesi detaylı analizi</li>
        <li><b>/api/analytics/lake/van/spectral</b> - Spektral analiz verileri</li>
        <li><b>/api/analytics/comparison</b> - Göller arası karşılaştırma</li>
    </ul>
    
    <p><i>🎨 Frontend: http://localhost:8080</i></p>
    <p><i>🗄️ Data Source: MongoDB</i></p>
    """

 

@app.route("/api/forecast", methods=["GET"])
def forecast():
    """Göl su miktarı tahmini endpoint'i"""
    lake_id_param = request.args.get("lake_id", "van")
    
    # Lake ID'yi çözümle
    lake_key = None
    lake_numeric_id = None
    for key, info in LAKE_INFO.items():
        if key == lake_id_param or str(info["id"]) == str(lake_id_param):
            lake_key = key
            lake_numeric_id = info["id"]
            break
    
    if lake_numeric_id is None:
        return jsonify({"error": f"Göl bulunamadı: {lake_id_param}"}), 404
    
    try:
        # MongoDB kullan
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
                "status": "no_data",
                "data_source": "MongoDB"
            })
        
        # Yıllık veriler hazırla
        lake_data['year'] = lake_data['date'].dt.year
        years = sorted(lake_data['year'].unique().tolist())
        actual_areas = []
        predicted_areas = []
        
        for year in years:
            year_data = lake_data[lake_data['year'] == year]
            
            if not year_data.empty:
                # Gerçek değerler
                actual_col = 'target_water_area_m2' if 'target_water_area_m2' in year_data.columns else None
                actual_avg = float(year_data[actual_col].mean()) if actual_col is not None else None
                if actual_avg is not None and (pd.isna(actual_avg) or actual_avg < 0):
                    actual_avg = None
                actual_areas.append(actual_avg)
                
                # Tahmin değerleri
                pred_col = 'predicted_water_area_m2' if 'predicted_water_area_m2' in year_data.columns else None
                pred_avg = float(year_data[pred_col].mean()) if pred_col is not None else None
                if pred_avg is not None and (pd.isna(pred_avg) or pred_avg < 0):
                    pred_avg = None
                predicted_areas.append(pred_avg)
            else:
                actual_areas.append(None)
                predicted_areas.append(None)
        
        # Gelecek 3 ay tahminleri — predicted verisine göre basit projeksiyon
        if predicted_areas and predicted_areas[-1] is not None:
            base = predicted_areas[-1]
        elif actual_areas and actual_areas[-1] is not None:
            base = actual_areas[-1]
        else:
            base = None

        if base is not None:
            predictions_3months = [base * 0.98, base * 0.96, base * 0.94]
            prev = actual_areas[-2] if len(actual_areas) > 1 and actual_areas[-2] else base
            change_percent = ((base - prev) / prev * 100.0) if prev else 0.0
        else:
            predictions_3months = []
            change_percent = 0.0

        # Yıllık predicted dizi: mevcut yıllarda ortalama predicted; yoksa None
        display_predicted = predicted_areas
        
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
            "data_points": len(lake_data),
            "status": "success",
            "data_source": "MongoDB"
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Forecast hatası: {str(e)}")
        return jsonify({"error": f"Tahmin hatası: {str(e)}"}), 500

@app.route("/api/status", methods=["GET"])
def status():
    """API durumu ve sistem bilgileri"""
    data_loader = get_data_loader()
    predictions = data_loader.get_all_predictions()
    metrics = data_loader.get_metrics()
    lake_data_points = data_loader.get_lake_data_points()
    
    return jsonify({
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "data_status": {
            "predictions_loaded": predictions is not None,
            "predictions_shape": list(predictions.shape) if predictions is not None else None,
            "total_records": len(predictions) if predictions is not None else 0,
            "date_range": {
                "min": predictions['date'].min().isoformat() if predictions is not None else None,
                "max": predictions['date'].max().isoformat() if predictions is not None else None
            } if predictions is not None else None
        },
        "metrics": {
            "available": list(metrics.keys()),
            "count": len(metrics)
        },
        "lakes": {
            "available_lakes": list(LAKE_INFO.keys()),
            "available_lake_ids": sorted(predictions['lake_id'].unique().tolist()) if predictions is not None else [],
            "total_lakes": len(LAKE_INFO)
        },
        "data_source": "MongoDB"
    })

@app.route("/api/metrics", methods=["GET"])
def get_metrics_endpoint():
    """Model metriklerini döndür"""
    data_loader = get_data_loader()
    metrics = data_loader.get_metrics()
    
    return jsonify({
        "metrics": metrics,
        "loaded_at": datetime.now().isoformat(),
        "available_metrics": list(metrics.keys()),
        "data_source": "MongoDB"
    })

if __name__ == "__main__":
    print("🚀 AquaTrack API başlatılıyor...")
    print("📊 Data Source: MongoDB")
    print(f"📁 Model Directory: {MODEL_DIR}")
    
    # Uygulamayı çalıştır
    app.run(
        debug=os.getenv("FLASK_DEBUG") == "1",
        host=os.getenv("FLASK_HOST"),
        port=int(os.getenv("FLASK_PORT")),
        threaded=True
    )