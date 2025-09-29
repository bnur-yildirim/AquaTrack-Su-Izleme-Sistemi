"""
Su Kalitesi API Route'ları
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

from utils import resolve_lake_id, calculate_quality_score
from data_loader_mongodb import get_data_loader, get_lakes

quality_bp = Blueprint('quality', __name__)

@quality_bp.route("/api/quality/status", methods=["GET"])
def quality_status():
    """Su kalitesi model durumu"""
    LAKE_INFO = get_lakes()
    return jsonify({
        "status": "development",
        "message": "Su kalitesi modeli geliştirme aşamasında",
        "available_lakes": list(LAKE_INFO.keys()),
        "timestamp": datetime.now().isoformat(),
        "features": ["pH", "Turbidite", "Çözünmüş Oksijen", "Sıcaklık", "Nitrat"]
    })

@quality_bp.route("/api/quality/forecast", methods=["GET"])
def quality_forecast():
    """Su kalitesi tahmini (placeholder)"""
    lake_id_param = request.args.get("lake_id", "van")
    
    # Load lakes and resolve lake
    LAKE_INFO = get_lakes()
    KEY_BY_ID = {info["id"]: key for key, info in LAKE_INFO.items()}
    lake_key, lake_numeric_id = resolve_lake_id(lake_id_param, LAKE_INFO, KEY_BY_ID)
    
    if lake_numeric_id is None:
        return jsonify({"error": "Göl bulunamadı"}), 404
    
    # Get quality parameters from MongoDB
    data_loader = get_data_loader()
    quality_params = data_loader.get_water_quality_parameters(lake_numeric_id)
    current_params = quality_params.get(lake_numeric_id, {
        "pH": 8.0, "Turbidite": 2.5, "Çözünmüş_Oksijen": 8.0, "Sıcaklık": 17.0, "Nitrat": 0.7
    })
    
    # Get quality trends from MongoDB
    quality_trends = data_loader.get_system_config("quality_trends")
    trends = quality_trends.get("quality_trends", {
        "pH": -0.05, "Turbidite": 0.1, "Çözünmüş_Oksijen": -0.1, "Sıcaklık": 0.5, "Nitrat": 0.02
    })
    
    # 3 aylık tahmin (basit trend)
    next_3months = []
    for month in range(1, 4):
        monthly_params = {}
        for param, value in current_params.items():
            trend = trends.get(param, 0)
            monthly_params[param] = round(value + (trend * month), 2)
        next_3months.append(monthly_params)
    
    return jsonify({
        "lake_id": lake_key or str(lake_numeric_id),
        "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
        "parameters": list(current_params.keys()),
        "current": current_params,
        "next_3months": next_3months,
        "quality_score": calculate_quality_score(current_params),
        "timestamp": datetime.now().isoformat(),
        "status": "simulated",
        "note": "Bu veriler simülasyon amaçlı örnek değerlerdir"
    })
