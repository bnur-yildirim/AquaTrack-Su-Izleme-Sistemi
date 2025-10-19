"""
Su Rengi ve Kalite API Route'ları
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from data_loader import get_lake_predictions
from utils import resolve_lake_id, log_error
from config import LAKE_INFO, KEY_BY_ID

color_bp = Blueprint('color', __name__)

@color_bp.route("/api/color/features", methods=["GET"])
def get_color_features():
    """Göl rengi ve kalite feature'larını döndür"""
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
        
        # Gerçek spektral bantlardan renk hesapla
        selected_data = calculate_real_color_features(lake_data)
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "color_features": selected_data,
            "last_update": "2024-11-19"
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Renk feature hatası: {str(e)}")
        return jsonify({"error": "Renk analizi başarısız"}), 500

def calculate_real_color_features(lake_data):
    """Gelişmiş su rengi feature'ları - B5 ve B11 bantları ile genişletilmiş"""
    
    # Gerekli bantları kontrol et
    required_bands = ['b2_mean', 'b3_mean', 'b4_mean']
    missing_bands = [band for band in required_bands if band not in lake_data.columns]
    
    if missing_bands:
        return {
            "error": f"Eksik spektral bantlar: {missing_bands}",
            "water_type": "Bilinmiyor",
            "water_clarity": 0,
            "turbidity": 0,
            "blue_green_ratio": 0,
            "color_score": 0
        }
    
    # Son 30 kayıttan ortalama al (güncel durum)
    recent_data = lake_data.tail(30)
    
    # Spektral bant ortalamaları
    b2_avg = recent_data['b2_mean'].mean()  # Mavi
    b3_avg = recent_data['b3_mean'].mean()  # Yeşil  
    b4_avg = recent_data['b4_mean'].mean()  # Kırmızı
    b8_avg = recent_data['b8_mean'].mean() if 'b8_mean' in recent_data.columns else b4_avg
    
    # B5 ve B11 bantları (su kalitesi için önemli)
    b5_avg = recent_data['b5_mean'].mean() if 'b5_mean' in recent_data.columns else b4_avg
    b11_avg = recent_data['b11_mean'].mean() if 'b11_mean' in recent_data.columns else b8_avg
    
    # Gelişmiş renk indeksleri hesapla
    
    # 1. Su Berraklığı (Blue/Green ratio)
    water_clarity = b2_avg / (b3_avg + 0.001) if b3_avg > 0 else 1.0
    
    # 2. Bulanıklık (Red/Blue ratio) 
    turbidity = b4_avg / (b2_avg + 0.001) if b2_avg > 0 else 1.0
    
    # 3. Mavi/Yeşil oranı
    blue_green_ratio = b2_avg / (b3_avg + 0.001) if b3_avg > 0 else 1.0
    
    # 4. NDWI (Normalized Difference Water Index)
    ndwi = (b3_avg - b8_avg) / (b3_avg + b8_avg + 0.001) if (b3_avg + b8_avg) > 0 else 0
    
    # 5. True Color Index (genel renk)
    true_color_index = (b4_avg + b3_avg + b2_avg) / 3
    
    # 6. Chlorophyll Index (alg yoğunluğu)
    chlorophyll_index = (b8_avg - b4_avg) / (b8_avg + b4_avg + 0.001) if (b8_avg + b4_avg) > 0 else 0
    
    # 7. YENİ: B5 ve B11 ile gelişmiş indeksler
    # Sediment indeksi (B11/B4)
    sediment_index = b11_avg / (b4_avg + 0.001) if b4_avg > 0 else 1.0
    
    # Organik madde indeksi (B5/B11)
    organic_matter_index = b5_avg / (b11_avg + 0.001) if b11_avg > 0 else 1.0
    
    # Gelişmiş bulanıklık (B11 tabanlı)
    enhanced_turbidity = b11_avg / (b3_avg + 0.001) if b3_avg > 0 else 1.0
    
    # Klorofil-a indeksi (B5 tabanlı)
    chlorophyll_a_index = (b5_avg - b4_avg) / (b5_avg + b4_avg + 0.001) if (b5_avg + b4_avg) > 0 else 0
    
    # Su tipini belirle (gelişmiş spektral analiz)
    if water_clarity > 1.2 and turbidity < 0.8 and enhanced_turbidity < 1.2:
        water_type = "Çok Berrak"
    elif water_clarity > 1.0 and turbidity < 1.0 and enhanced_turbidity < 1.5:
        water_type = "Berrak"
    elif turbidity > 1.5 or enhanced_turbidity > 2.0:
        water_type = "Bulanık"
    elif chlorophyll_index > 0.3 or chlorophyll_a_index > 0.2:
        water_type = "Algli"
    elif organic_matter_index > 1.5:
        water_type = "Organik Madde Yüksek"
    elif sediment_index > 1.8:
        water_type = "Sedimentli"
    elif ndwi < 0.1:
        water_type = "Tuzlu/Mineralli"
    else:
        water_type = "Normal"
    
    # Gelişmiş kalite skoru hesapla (0-100)
    clarity_score = min(water_clarity * 20, 25)           # Max 25 puan
    turbidity_score = max(25 - turbidity * 10, 0)        # Max 25 puan
    enhanced_turbidity_score = max(20 - enhanced_turbidity * 8, 0)  # Max 20 puan
    ndwi_score = min((ndwi + 1) * 12, 15)               # Max 15 puan
    chlorophyll_score = max(15 - chlorophyll_a_index * 30, 0)  # Max 15 puan
    
    color_score = clarity_score + turbidity_score + enhanced_turbidity_score + ndwi_score + chlorophyll_score
    
    return {
        "water_type": water_type,
        "water_clarity": round(water_clarity, 2),
        "turbidity": round(turbidity, 2),
        "enhanced_turbidity": round(enhanced_turbidity, 2),
        "blue_green_ratio": round(blue_green_ratio, 2),
        "color_score": round(color_score, 1),
        "ndwi": round(ndwi, 3),
        "chlorophyll_index": round(chlorophyll_index, 3),
        "chlorophyll_a_index": round(chlorophyll_a_index, 3),
        "sediment_index": round(sediment_index, 2),
        "organic_matter_index": round(organic_matter_index, 2),
        "true_color_index": round(true_color_index, 1),
        "spectral_bands": {
            "blue_avg": round(b2_avg, 1),
            "green_avg": round(b3_avg, 1),
            "red_avg": round(b4_avg, 1),
            "nir_avg": round(b8_avg, 1),
            "b5_avg": round(b5_avg, 1),
            "b11_avg": round(b11_avg, 1)
        },
        "data_points": len(recent_data),
        "calculation_method": "Gelişmiş spektral analiz (B5/B11 dahil)",
        "quality_indicators": {
            "clarity_level": "Yüksek" if water_clarity > 1.1 else "Orta" if water_clarity > 0.9 else "Düşük",
            "turbidity_level": "Düşük" if turbidity < 1.0 else "Orta" if turbidity < 1.5 else "Yüksek",
            "algae_risk": "Yüksek" if chlorophyll_a_index > 0.3 else "Orta" if chlorophyll_a_index > 0.1 else "Düşük",
            "sediment_risk": "Yüksek" if sediment_index > 2.0 else "Orta" if sediment_index > 1.5 else "Düşük"
        }
    }
