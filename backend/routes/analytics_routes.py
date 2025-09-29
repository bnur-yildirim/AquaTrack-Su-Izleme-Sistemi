"""
Analytics API Route'ları
"""

from flask import Blueprint, jsonify
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

from data_loader_mongodb import get_lake_predictions, get_data_loader, get_lakes
from utils import resolve_lake_id, get_seasonal_factor, get_season_name, log_error

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route("/api/analytics/lake/<lake_id>/overview", methods=["GET"])
def lake_analytics_overview(lake_id):
    """Göl için genel analitik veriler"""
    try:
        LAKE_INFO = get_lakes()
        KEY_BY_ID = {info["id"]: key for key, info in LAKE_INFO.items()}
        # Lake ID'yi çözümle
        lake_key, lake_numeric_id = resolve_lake_id(lake_id, LAKE_INFO, KEY_BY_ID)
        
        if lake_numeric_id is None:
            return jsonify({"error": "Göl bulunamadı"}), 404
        
        lake_data = get_lake_predictions(lake_numeric_id)
        
        if lake_data is None or lake_data.empty:
            return jsonify({"error": "Veri bulunamadı"}), 404
        
        # Zaman serisi verileri
        lake_data_sorted = lake_data.sort_values('date')
        
        # Temel istatistikler
        area_stats = lake_data_sorted['target_water_area_m2'].describe()
        
        # Trend analizi (basit)
        if len(lake_data_sorted) > 12:
            recent_data = lake_data_sorted.tail(12)
            older_data = lake_data_sorted.head(12)
            
            recent_avg = recent_data['target_water_area_m2'].mean()
            older_avg = older_data['target_water_area_m2'].mean()
            trend = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
        else:
            trend = 0
        
        # Mevsimsel analiz
        lake_data_sorted['month'] = lake_data_sorted['date'].dt.month
        seasonal_avg = lake_data_sorted.groupby('month')['target_water_area_m2'].mean()
        
        # Varyasyon analizi
        cv = (area_stats['std'] / area_stats['mean'] * 100) if area_stats['mean'] > 0 else 0
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "overview": {
                "total_records": len(lake_data),
                "date_range": {
                    "start": lake_data_sorted['date'].min().isoformat(),
                    "end": lake_data_sorted['date'].max().isoformat(),
                    "span_days": (lake_data_sorted['date'].max() - lake_data_sorted['date'].min()).days
                },
                "area_statistics": {
                    "mean": float(area_stats['mean']),
                    "std": float(area_stats['std']),
                    "min": float(area_stats['min']),
                    "max": float(area_stats['max']),
                    "coefficient_of_variation": float(cv)
                },
                "trend_analysis": {
                    "trend_percentage": float(trend),
                    "trend_direction": "increasing" if trend > 2 else ("decreasing" if trend < -2 else "stable")
                },
                "seasonal_pattern": {
                    month: float(value) for month, value in seasonal_avg.items()
                }
            },
            "chart_data": {
                "timeseries": [
                    {
                        "date": row['date'].isoformat(),
                        "area": float(row['target_water_area_m2']),
                        "month": int(row['month'])
                    }
                    for _, row in lake_data_sorted.iterrows()
                ],
                "seasonal_averages": [
                    {"month": int(month), "average_area": float(avg)}
                    for month, avg in seasonal_avg.items()
                ]
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Analytics overview error: {e}")
        return jsonify({"error": f"Analitik hata: {str(e)}"}), 500

@analytics_bp.route("/api/analytics/lake/<lake_id>/quality", methods=["GET"])
def lake_quality_analytics(lake_id):
    """Göl için su kalitesi analitik verileri"""
    try:
        LAKE_INFO = get_lakes()
        KEY_BY_ID = {info["id"]: key for key, info in LAKE_INFO.items()}
        # Lake ID'yi çözümle
        lake_key, lake_numeric_id = resolve_lake_id(lake_id, LAKE_INFO, KEY_BY_ID)
        
        if lake_numeric_id is None:
            return jsonify({"error": "Göl bulunamadı"}), 404
        
        # Su kalitesi verilerini simüle et (gerçek veri olmadığı için)
        random.seed(lake_numeric_id)  # Tutarlı sonuçlar için
        
        # Son 2 yıl için aylık veri
        end_date = datetime.now()
        start_date = end_date - timedelta(days=730)
        
        quality_data = []
        current_date = start_date
        
        while current_date <= end_date:
            # Göl tipine göre temel kalite - MongoDB'den al
            data_loader = get_data_loader()
            quality_scores = data_loader.get_quality_scores(lake_numeric_id)
            base_quality = quality_scores.get(lake_numeric_id, 60)
            
            # Mevsimsel varyasyon
            month = current_date.month
            seasonal_factor = get_seasonal_factor(month)
            
            # Random varyasyon
            noise = random.uniform(-8, 8)
            
            quality_score = base_quality * seasonal_factor + noise
            quality_score = max(0, min(100, quality_score))
            
            # Su kalitesi bileşenleri
            turbidity = max(0, min(100, 100 - quality_score + random.uniform(-10, 10)))
            clarity = max(0, min(100, quality_score + random.uniform(-5, 5)))
            chlorophyll = max(0, min(50, 25 + random.uniform(-10, 10)))
            
            quality_data.append({
                "date": current_date.isoformat(),
                "quality_score": round(quality_score, 1),
                "turbidity": round(turbidity, 1),
                "clarity": round(clarity, 1),
                "chlorophyll": round(chlorophyll, 1),
                "month": month,
                "season": get_season_name(month)
            })
            
            current_date += timedelta(days=30)  # Aylık veri
        
        # Mevsimsel ortalamalar
        df_quality = pd.DataFrame(quality_data)
        seasonal_avg = df_quality.groupby('season')['quality_score'].mean()
        
        # Trend analizi
        if len(quality_data) > 12:
            recent_avg = df_quality.tail(6)['quality_score'].mean()
            older_avg = df_quality.head(6)['quality_score'].mean()
            trend = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
        else:
            trend = 0
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "quality_overview": {
                "current_score": quality_data[-1]["quality_score"],
                "average_score": round(df_quality['quality_score'].mean(), 1),
                "trend_percentage": round(trend, 1),
                "trend_direction": "iyileşiyor" if trend > 2 else ("kötüleşiyor" if trend < -2 else "stabil"),
                "data_points": len(quality_data)
            },
            "parameters": {
                "turbidity": {
                    "current": quality_data[-1]["turbidity"],
                    "average": round(df_quality['turbidity'].mean(), 1),
                    "status": "düşük" if quality_data[-1]["turbidity"] < 30 else ("orta" if quality_data[-1]["turbidity"] < 60 else "yüksek")
                },
                "clarity": {
                    "current": quality_data[-1]["clarity"],
                    "average": round(df_quality['clarity'].mean(), 1),
                    "status": "yüksek" if quality_data[-1]["clarity"] > 70 else ("orta" if quality_data[-1]["clarity"] > 40 else "düşük")
                },
                "chlorophyll": {
                    "current": quality_data[-1]["chlorophyll"],
                    "average": round(df_quality['chlorophyll'].mean(), 1),
                    "status": "normal" if quality_data[-1]["chlorophyll"] < 30 else "yüksek"
                }
            },
            "chart_data": {
                "timeseries": quality_data,
                "seasonal_averages": [
                    {"season": season, "average_quality": round(avg, 1)}
                    for season, avg in seasonal_avg.items()
                ],
                "parameter_distribution": {
                    "turbidity_ranges": {
                        "düşük": len(df_quality[df_quality['turbidity'] < 30]),
                        "orta": len(df_quality[(df_quality['turbidity'] >= 30) & (df_quality['turbidity'] < 60)]),
                        "yüksek": len(df_quality[df_quality['turbidity'] >= 60])
                    },
                    "quality_ranges": {
                        "zayıf": len(df_quality[df_quality['quality_score'] < 40]),
                        "orta": len(df_quality[(df_quality['quality_score'] >= 40) & (df_quality['quality_score'] < 70)]),
                        "iyi": len(df_quality[df_quality['quality_score'] >= 70])
                    }
                }
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Quality analytics error: {e}")
        return jsonify({"error": f"Su kalitesi analitik hata: {str(e)}"}), 500

@analytics_bp.route("/api/analytics/lake/<lake_id>/spectral", methods=["GET"])
def lake_spectral_analytics(lake_id):
    """Göl için spektral analiz verileri"""
    try:
        # Lake ID'yi çözümle
        lake_key, lake_numeric_id = resolve_lake_id(lake_id, LAKE_INFO, KEY_BY_ID)
        
        if lake_numeric_id is None:
            return jsonify({"error": "Göl bulunamadı"}), 404
        
        # Spektral veriler simüle et (gerçek veri olmadığı için)
        random.seed(lake_numeric_id + 100)
        
        # MongoDB'den spektral profilleri al
        data_loader = get_data_loader()
        spectral_profiles = data_loader.get_spectral_profiles(lake_numeric_id)
        base_profile = spectral_profiles.get(lake_numeric_id, {
            "B2": 0.06, "B3": 0.09, "B4": 0.08, "B5": 0.18, "B8": 0.42, "B11": 0.22
        })
        
        # Zaman serisi spektral veriler
        spectral_timeseries = []
        
        for i in range(24):  # Son 24 ay
            month_data = {}
            for band, base_value in base_profile.items():
                # Mevsimsel varyasyon
                seasonal_factor = 1 + 0.1 * np.sin(2 * np.pi * i / 12)
                # Random noise
                noise = random.uniform(-0.02, 0.02)
                value = base_value * seasonal_factor + noise
                month_data[f"band_{band.lower()}"] = round(max(0, value), 4)
            
            # Su kalitesi indeksleri
            b3 = month_data["band_b3"]
            b8 = month_data["band_b8"]
            b4 = month_data["band_b4"]
            b5 = month_data.get("band_b5", 0.2)
            b11 = month_data.get("band_b11", 0.2)
            
            month_data.update({
                "date": (datetime.now() - timedelta(days=30*(23-i))).isoformat(),
                "ndwi": round((b3 - b8) / (b3 + b8 + 1e-8), 4),
                "ndvi": round((b8 - b4) / (b8 + b4 + 1e-8), 4),
                "wci": round(b5 / (b11 + 1e-8), 4) if b5 > 0 and b11 > 0 else None,
                "clarity_index": round(month_data["band_b2"] / (b4 + 1e-8), 4)
            })
            
            spectral_timeseries.append(month_data)
        
        # Spektral indeks istatistikleri
        df_spectral = pd.DataFrame(spectral_timeseries)
        
        result = {
            "lake_id": lake_key or str(lake_numeric_id),
            "lake_name": LAKE_INFO.get(lake_key, {"name": f"Lake {lake_numeric_id}"}).get("name"),
            "spectral_profile": base_profile,
            "indices_statistics": {
                "ndwi": {
                    "mean": round(df_spectral['ndwi'].mean(), 4),
                    "std": round(df_spectral['ndwi'].std(), 4),
                    "current": df_spectral['ndwi'].iloc[-1]
                },
                "ndvi": {
                    "mean": round(df_spectral['ndvi'].mean(), 4),
                    "std": round(df_spectral['ndvi'].std(), 4),
                    "current": df_spectral['ndvi'].iloc[-1]
                }
            },
            "chart_data": {
                "spectral_timeseries": spectral_timeseries,
                "band_correlations": {
                    "B3_B8": round(df_spectral['band_b3'].corr(df_spectral['band_b8']), 3),
                    "B4_B8": round(df_spectral['band_b4'].corr(df_spectral['band_b8']), 3),
                    "NDWI_quality": round(df_spectral['ndwi'].corr(df_spectral['clarity_index']), 3)
                }
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Spectral analytics error: {e}")
        return jsonify({"error": f"Spektral analitik hata: {str(e)}"}), 500

@analytics_bp.route("/api/analytics/comparison", methods=["GET"])
def lakes_comparison():
    """Göller arası karşılaştırma analitik verileri"""
    try:
        comparison_data = []
        
        LAKE_INFO = get_lakes()
        for lake_key, lake_info in LAKE_INFO.items():
            lake_id = lake_info["id"]
            lake_data = get_lake_predictions(lake_id)
            
            if lake_data is not None and not lake_data.empty:
                # Temel istatistikler
                area_stats = lake_data['target_water_area_m2'].describe()
                
                # Stabilite (CV)
                cv = (area_stats['std'] / area_stats['mean'] * 100) if area_stats['mean'] > 0 else 0
                
                # Trend
                if len(lake_data) > 12:
                    recent_avg = lake_data.tail(6)['target_water_area_m2'].mean()
                    older_avg = lake_data.head(6)['target_water_area_m2'].mean()
                    trend = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
                else:
                    trend = 0
                
                comparison_data.append({
                    "lake_id": lake_key,
                    "lake_name": lake_info["name"],
                    "coordinates": {"lat": lake_info["lat"], "lng": lake_info["lng"]},
                    "statistics": {
                        "mean_area": float(area_stats['mean']),
                        "area_km2": float(area_stats['mean'] / 1e6),  # m² to km²
                        "coefficient_of_variation": round(cv, 1),
                        "trend_percentage": round(trend, 1),
                        "data_points": len(lake_data),
                        "date_range": {
                            "start": lake_data['date'].min().isoformat(),
                            "end": lake_data['date'].max().isoformat()
                        }
                    },
                    "classification": {
                        "size": "büyük" if area_stats['mean'] > 1e9 else ("orta" if area_stats['mean'] > 1e8 else "küçük"),
                        "stability": "stabil" if cv < 15 else ("değişken" if cv < 30 else "çok değişken"),
                        "trend": "artan" if trend > 5 else ("azalan" if trend < -5 else "stabil")
                    }
                })
        
        result = {
            "comparison_data": comparison_data,
            "summary": {
                "total_lakes": len(comparison_data),
                "average_cv": round(np.mean([lake["statistics"]["coefficient_of_variation"] for lake in comparison_data]), 1),
                "lakes_with_positive_trend": len([lake for lake in comparison_data if lake["statistics"]["trend_percentage"] > 2]),
                "lakes_with_negative_trend": len([lake for lake in comparison_data if lake["statistics"]["trend_percentage"] < -2])
            },
            "chart_data": {
                "size_vs_stability": [
                    {
                        "lake_name": lake["lake_name"],
                        "area_km2": lake["statistics"]["area_km2"],
                        "cv": lake["statistics"]["coefficient_of_variation"],
                        "trend": lake["statistics"]["trend_percentage"]
                    }
                    for lake in comparison_data
                ],
                "geographic_distribution": [
                    {
                        "lake_name": lake["lake_name"],
                        "lat": lake["coordinates"]["lat"],
                        "lng": lake["coordinates"]["lng"],
                        "quality_score": 75 + lake["statistics"]["trend_percentage"]  # Simulated quality
                    }
                    for lake in comparison_data
                ]
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Comparison analytics error: {e}")
        return jsonify({"error": f"Karşılaştırma analitik hata: {str(e)}"}), 500
