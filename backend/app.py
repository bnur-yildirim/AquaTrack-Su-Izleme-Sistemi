from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)

# Model yolları - backend klasöründen başlayarak
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "water_quantity", "output", "models_optuna")
METRICS = {}
PREDICTIONS = None
LAKE_DATA_POINTS = {}

def load_data():
    """Verileri yükle"""
    try:
        # Metrikleri yükle
        metrics_path = os.path.join(MODEL_DIR, r"C:\Users\glylm\Desktop\proje_aqua\water_quantity\output\models_optuna\metrics_summary_optuna.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as f:
                global METRICS
                METRICS = json.load(f)
        
        # Tahminleri yükle
        predictions_path = os.path.join(MODEL_DIR, r"C:\Users\glylm\Desktop\proje_aqua\water_quantity\output\models_optuna\all_predictions_optuna.parquet")
        if os.path.exists(predictions_path):
            global PREDICTIONS
            PREDICTIONS = pd.read_parquet(predictions_path)
            
            # Debug: Veri yapısını kontrol et
            print(f"Tahmin verisi yüklendi: {PREDICTIONS.shape}")
            print(f"Kolonlar: {list(PREDICTIONS.columns)}")
            print(f"İlk 5 satır:")
            print(PREDICTIONS.head())
            print(f"Lake IDs: {sorted(PREDICTIONS['lake_id'].unique())}")
            
            # Veri kapsamı: lake_id bazında satır sayısı
            try:
                counts = PREDICTIONS.groupby('lake_id').size()
                global LAKE_DATA_POINTS
                LAKE_DATA_POINTS = counts.to_dict()
                print(f"Lake data points: {LAKE_DATA_POINTS}")
            except Exception as e:
                print(f"Lake data points error: {e}")
                LAKE_DATA_POINTS = {}
        
        print(f"Metrikler yüklendi: {list(METRICS.keys())}")
        return True
    except Exception as e:
        print(f"Veri yükleme hatası: {e}")
        return False

# Uygulama başlatılırken verileri yükle
load_data()

# Göl bilgileri - eğitim sonuçlarına göre
LAKE_INFO = {
    "tuz": {"id": 140, "name": "Tuz Gölü", "lat": 40.0, "lng": 30.0},
    "van": {"id": 141, "name": "Van Gölü", "lat": 38.4942, "lng": 43.3832},
    "ulubat": {"id": 1321, "name": "Ulubat Gölü", "lat": 40.1833, "lng": 28.9833},
    "egridir": {"id": 1340, "name": "Eğridir Gölü", "lat": 39.0, "lng": 32.0},
    "burdur": {"id": 1342, "name": "Burdur Gölü", "lat": 37.7167, "lng": 30.2833},
    "sapanca": {"id": 14510, "name": "Sapanca Gölü", "lat": 40.7167, "lng": 30.2667},
    "salda": {"id": 14741, "name": "Salda Gölü", "lat": 37.5500, "lng": 29.6833}
}

# Numeric ID'den anahtara hızlı erişim
KEY_BY_ID = {info["id"]: key for key, info in LAKE_INFO.items()}

def get_lake_predictions(lake_id):
    """Belirli bir göl için tahmin verilerini getir"""
    if PREDICTIONS is None:
        print(f"PREDICTIONS None - lake_id: {lake_id}")
        return None
    
    try:
        # Lake ID'ye göre filtrele
        lake_data = PREDICTIONS[PREDICTIONS['lake_id'] == lake_id].copy()
        print(f"Lake {lake_id} filtered data: {lake_data.shape}")
        
        if lake_data.empty:
            print(f"No data found for lake_id: {lake_id}")
            return None
        
        # Tarihe göre sırala
        if 'date' in lake_data.columns:
            lake_data['date'] = pd.to_datetime(lake_data['date'])
            lake_data = lake_data.sort_values('date')
            print(f"Date range: {lake_data['date'].min()} to {lake_data['date'].max()}")
        
        # Veri değerlerini kontrol et
        if 'predicted_water_area' in lake_data.columns:
            print(f"Predicted water area stats: min={lake_data['predicted_water_area'].min():.2f}, max={lake_data['predicted_water_area'].max():.2f}, mean={lake_data['predicted_water_area'].mean():.2f}")
        
        if 'target_water_area_m2' in lake_data.columns:
            print(f"Target water area stats: min={lake_data['target_water_area_m2'].min():.2f}, max={lake_data['target_water_area_m2'].max():.2f}, mean={lake_data['target_water_area_m2'].mean():.2f}")
        
        return lake_data
    except Exception as e:
        print(f"Lake data error: {e}")
        return None

@app.route("/api/forecast", methods=["GET"])
def forecast():
    lake_id_param = request.args.get("lake_id", "van")
    print(f"Forecast request for lake_id: {lake_id_param}")
    
    # Hem anahtar hem numeric ID destekle
    lake_key = None
    lake_numeric_id = None
    if isinstance(lake_id_param, str) and lake_id_param.isdigit():
        lake_numeric_id = int(lake_id_param)
        lake_key = KEY_BY_ID.get(lake_numeric_id)
    else:
        lake_key = lake_id_param.lower()  # Küçük harfe çevir
        if lake_key in LAKE_INFO:
            lake_numeric_id = LAKE_INFO[lake_key]["id"]
    
    print(f"Resolved: lake_key={lake_key}, lake_numeric_id={lake_numeric_id}")
    
    if lake_numeric_id is None:
        return jsonify({"error": f"Göl bulunamadı: {lake_id_param}"}), 404
    
    try:
        lake_data = get_lake_predictions(lake_numeric_id)
        
        if lake_data is None or lake_data.empty:
            # Eğer veri yoksa örnek veri döndür
            print(f"No data available for lake {lake_numeric_id}, returning sample data")
            return jsonify({
                "lake_id": lake_key or str(lake_numeric_id),
                "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
                "years": list(range(2018, 2026)),  # 2018-2024 geçmiş, 2025 tahmin
                "actual": [120000000, 115000000, 110000000, 108000000, 105000000, 100000000, 95000000, None],  # m2 cinsinden
                "predicted": [None, None, None, None, None, None, None, 90000000],
                "predictions_3months": [90000000, 85000000, 80000000],
                "change_percent": -5.3,
                "last_update": datetime.now().isoformat(),
                "note": "Örnek veri - gerçek model verisi yüklenemedi"
            })
        
        # Gerçek verileri hazırla
        current_date = datetime.now()
        
        # Date kolonunu kontrol et ve dönüştür
        if 'date' in lake_data.columns:
            lake_data['date'] = pd.to_datetime(lake_data['date'])
            lake_data['year'] = lake_data['date'].dt.year
        
        # Yıllık ortalama su alanları hesapla
        years = list(range(2018, 2026))
        actual_areas = []
        predicted_areas = []
        
        for year in years:
            year_data = lake_data[lake_data['year'] == year] if 'year' in lake_data.columns else pd.DataFrame()
            
            if not year_data.empty:
                # Gerçek değerler (target)
                if 'target_water_area_m2' in year_data.columns:
                    actual_avg = year_data['target_water_area_m2'].mean()
                    # Sıfır veya çok küçük değerleri kontrol et
                    if actual_avg < 1000:  # 1000 m2'den küçükse
                        actual_avg = actual_avg * 1000000 if actual_avg > 0 else None  # Million ile çarp
                    actual_areas.append(actual_avg)
                else:
                    actual_areas.append(None)
                
                # Tahmin değerleri
                if 'predicted_water_area' in year_data.columns:
                    pred_avg = year_data['predicted_water_area'].mean()
                    # Sıfır veya çok küçük değerleri kontrol et
                    if pred_avg < 1000:  # 1000 m2'den küçükse
                        pred_avg = pred_avg * 1000000 if pred_avg > 0 else None  # Million ile çarp
                    predicted_areas.append(pred_avg)
                else:
                    predicted_areas.append(None)
            else:
                actual_areas.append(None)
                predicted_areas.append(None)
        
        # Son 3 ay tahminleri - en son tahmin değerinden başla
        predictions_3months = []
        latest_data = lake_data.tail(1)
        
        if not latest_data.empty and 'predicted_water_area' in latest_data.columns:
            last_pred = latest_data['predicted_water_area'].iloc[0]
            # Küçük değer kontrolü
            if last_pred < 1000 and last_pred > 0:
                last_pred = last_pred * 1000000
            
            if last_pred and last_pred > 0:
                # Hafif azalış trendi
                predictions_3months = [
                    last_pred * 0.98,  # 1 ay sonra %2 azalış
                    last_pred * 0.95,  # 2 ay sonra %5 azalış  
                    last_pred * 0.92   # 3 ay sonra %8 azalış
                ]
            else:
                predictions_3months = [90000000, 85000000, 80000000]
        else:
            predictions_3months = [90000000, 85000000, 80000000]
        
        # Değişim oranı hesapla
        valid_actuals = [a for a in actual_areas if a is not None and a > 0]
        if valid_actuals and predictions_3months[0] > 0:
            last_actual = valid_actuals[-1]
            next_prediction = predictions_3months[0]
            change_percent = ((next_prediction - last_actual) / last_actual) * 100
        else:
            change_percent = -5.3
        
        # 2025 için sadece tahmin değeri
        display_predicted = [None] * (len(years) - 1) + [predictions_3months[0]]
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "years": years,
            "actual": actual_areas,
            "predicted": display_predicted,
            "predictions_3months": predictions_3months,
            "change_percent": change_percent,
            "last_update": current_date.isoformat(),
            "model_metrics": METRICS,
            "data_points": len(lake_data)
        }
        
        print(f"Result summary for {lake_key}: actual_areas={[f'{a/1000000:.1f}M' if a else None for a in actual_areas]}")
        return jsonify(result)
        
    except Exception as e:
        print(f"Forecast error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Tahmin hatası: {str(e)}"}), 500

@app.route("/api/lakes", methods=["GET"])
def get_lakes():
    """Tüm göllerin listesini döndür"""
    return jsonify({
        "lakes": LAKE_INFO,
        "by_id": KEY_BY_ID,
        "total_count": len(LAKE_INFO),
        "data_points": LAKE_DATA_POINTS
    })

@app.route("/api/status", methods=["GET"])
def status():
    """API durumu ve model bilgileri"""
    return jsonify({
        "status": "active",
        "metrics_available": list(METRICS.keys()),
        "predictions_loaded": PREDICTIONS is not None,
        "predictions_shape": PREDICTIONS.shape if PREDICTIONS is not None else None,
        "available_lakes": list(LAKE_INFO.keys()),
        "available_lake_ids": list(PREDICTIONS['lake_id'].unique()) if PREDICTIONS is not None else [],
        "timestamp": datetime.now().isoformat()
    })

@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """Model metriklerini döndür"""
    return jsonify(METRICS)

@app.route("/api/debug", methods=["GET"])
def debug_data():
    """Debug endpoint - veri yapısını kontrol etmek için"""
    if PREDICTIONS is None:
        return jsonify({"error": "No predictions loaded"})
    
    lake_id = request.args.get("lake_id", 141)  # Van Gölü default
    try:
        lake_id = int(lake_id)
    except:
        pass
    
    lake_data = PREDICTIONS[PREDICTIONS['lake_id'] == lake_id].copy()
    
    debug_info = {
        "total_predictions_shape": PREDICTIONS.shape,
        "total_columns": list(PREDICTIONS.columns),
        "lake_data_shape": lake_data.shape,
        "lake_data_sample": lake_data.head().to_dict('records') if not lake_data.empty else [],
        "unique_lake_ids": sorted(PREDICTIONS['lake_id'].unique()),
        "date_range": {
            "min": str(PREDICTIONS['date'].min()) if 'date' in PREDICTIONS.columns else None,
            "max": str(PREDICTIONS['date'].max()) if 'date' in PREDICTIONS.columns else None
        } if 'date' in PREDICTIONS.columns else None,
        "value_stats": {
            "predicted_water_area": {
                "min": float(PREDICTIONS['predicted_water_area'].min()),
                "max": float(PREDICTIONS['predicted_water_area'].max()),
                "mean": float(PREDICTIONS['predicted_water_area'].mean())
            } if 'predicted_water_area' in PREDICTIONS.columns else None,
            "target_water_area_m2": {
                "min": float(PREDICTIONS['target_water_area_m2'].min()),
                "max": float(PREDICTIONS['target_water_area_m2'].max()),
                "mean": float(PREDICTIONS['target_water_area_m2'].mean())
            } if 'target_water_area_m2' in PREDICTIONS.columns else None
        }
    }
    
    return jsonify(debug_info)

# --- Su Kalitesi (placeholder) ---
@app.route("/api/quality/status", methods=["GET"])
def quality_status():
    return jsonify({
        "status": "pending",
        "message": "Su kalitesi modeli henüz eğitiliyor",
        "available_lakes": list(LAKE_INFO.keys()),
        "timestamp": datetime.now().isoformat()
    })

@app.route("/api/quality/forecast", methods=["GET"])
def quality_forecast():
    lake_id_param = request.args.get("lake_id", "van")
    lake_key = None
    lake_numeric_id = None
    if isinstance(lake_id_param, str) and lake_id_param.isdigit():
        lake_numeric_id = int(lake_id_param)
        lake_key = KEY_BY_ID.get(lake_numeric_id)
    else:
        lake_key = lake_id_param.lower()
        if lake_key in LAKE_INFO:
            lake_numeric_id = LAKE_INFO[lake_key]["id"]

    if lake_numeric_id is None:
        return jsonify({"error": "Göl bulunamadı"}), 404

    # Placeholder çıktı (örnek değerler)
    return jsonify({
        "lake_id": lake_key or str(lake_numeric_id),
        "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
        "parameters": ["pH", "Turbidite", "Çözünmüş Oksijen"],
        "current": {"pH": 8.2, "Turbidite": 3.1, "Çözünmüş Oksijen": 7.5},
        "next_3months": [
            {"pH": 8.1, "Turbidite": 3.3, "Çözünmüş Oksijen": 7.4},
            {"pH": 8.0, "Turbidite": 3.5, "Çözünmüş Oksijen": 7.3},
            {"pH": 7.9, "Turbidite": 3.6, "Çözünmüş Oksijen": 7.2}
        ],
        "note": "Örnek su kalitesi tahminleri - model entegre edilecek"
    })

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)