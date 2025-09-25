"""
Su Kalitesi API Route'ları
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

from utils import resolve_lake_id, calculate_quality_score
from config import LAKE_INFO, KEY_BY_ID, LAKE_QUALITY_PARAMS, QUALITY_TRENDS

quality_bp = Blueprint('quality', __name__)

@quality_bp.route("/api/quality/status", methods=["GET"])
def quality_status():
    """Su kalitesi model durumu"""
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
    
    # Lake ID'yi çözümle
    lake_key, lake_numeric_id = resolve_lake_id(lake_id_param, LAKE_INFO, KEY_BY_ID)
    
    if lake_numeric_id is None:
        return jsonify({"error": "Göl bulunamadı"}), 404
    
    current_params = LAKE_QUALITY_PARAMS.get(lake_numeric_id, {
        "pH": 8.0, "Turbidite": 2.5, "Çözünmüş_Oksijen": 8.0, "Sıcaklık": 17.0, "Nitrat": 0.7
    })
    
    # 3 aylık tahmin (basit trend)
    next_3months = []
    for month in range(1, 4):
        monthly_params = {}
        for param, value in current_params.items():
            trend = QUALITY_TRENDS.get(param, 0)
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
