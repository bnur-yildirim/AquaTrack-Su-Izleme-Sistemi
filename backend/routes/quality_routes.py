"""
Su Kalitesi API Route'ları - K-Means Clustering
Unsupervised learning ile su kalitesi analizi
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import pandas as pd
import numpy as np
import traceback
import sys
import os

# Veri kaynakları konfigürasyonunu import et
from data_sources_config import WATER_QUALITY_DATA, APP_CONFIG

from models import predict_water_quality_cluster, WATER_QUALITY_MODELS
from utils import log_info, log_error, resolve_lake_id
from database import get_client, get_db
from config import LAKE_INFO

quality_bp = Blueprint('quality', __name__)


@quality_bp.route("/api/quality/status", methods=["GET"])
def quality_status():
    """Su kalitesi model durumu"""
    models_loaded = len(WATER_QUALITY_MODELS) > 0
    
    return jsonify({
        "status": "active" if models_loaded else "unavailable",
        "models_loaded": models_loaded,
        "available_models": list(WATER_QUALITY_MODELS.keys()),
        "model_type": "K-Means Clustering (Unsupervised)",
        "clusters": 4,
        "features": ["NDWI", "WRI", "Chlorophyll-a", "Turbidity"],
        "timestamp": datetime.now().isoformat()
    })


@quality_bp.route("/api/quality/predict", methods=["POST"])
def predict_quality():
    """
    Su kalitesi cluster tahmini
    
    Body: {
        "ndwi_mean": 5.26,
        "wri_mean": 1206.05,
        "chl_a_mean": 1212.66,
        "turbidity_mean": 0.54
    }
    
    Returns: {
        "cluster": 0,
        "interpretation": "Normal su kalitesi",
        "confidence": 0.95,
        "similar_lakes": ["Burdur", "Tuz"],
        "features": {...}
    }
    """
    try:
        data = request.json
        
        # Required fields
        required = ['ndwi_mean', 'wri_mean', 'chl_a_mean', 'turbidity_mean']
        for field in required:
            if field not in data:
                return jsonify({
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Predict cluster
        result = predict_water_quality_cluster(
            ndwi=data['ndwi_mean'],
            wri=data['wri_mean'],
            chl_a=data['chl_a_mean'],
            turbidity=data['turbidity_mean']
        )
        
        if 'error' in result:
            return jsonify(result), 500
        
        return jsonify(result)
        
    except Exception as e:
        log_error(f"Quality prediction error: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@quality_bp.route("/api/quality/lake/<lake_key>/cluster", methods=["GET"])
def get_lake_quality_cluster(lake_key):
    """
    Göl için son cluster durumu
    
    Returns cluster history from CSV data
    """
    try:
        log_info(f"Getting cluster data for lake: {lake_key}")
        
        # Lake ID çözümle - direkt int veya resolve
        try:
            lake_numeric_id = int(lake_key)
            log_info(f"Lake ID as integer: {lake_numeric_id}")
        except ValueError:
            from config import KEY_BY_ID
            _, lake_numeric_id = resolve_lake_id(lake_key, LAKE_INFO, KEY_BY_ID)
            log_info(f"Lake ID resolved: {lake_numeric_id}")
        
        if not lake_numeric_id:
            log_error(f"Invalid lake ID: {lake_key}")
            return jsonify({'error': 'Invalid lake ID'}), 400
        
        # Load clustered data from CSV
        try:
            # Path to water quality data in Docker container
            csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                   'water_quality', 'data', 'clustered_water_quality.csv')
            log_info(f"Loading CSV from: {csv_path}")
            log_info(f"CSV file exists: {os.path.exists(csv_path)}")
            
            clustered_df = pd.read_csv(csv_path)
            log_info(f"CSV loaded successfully, shape: {clustered_df.shape}")
            
            # Lake name mapping
            lake_names = {
                '140': 'Tuz Gölü',
                '141': 'Van Gölü',
                '1321': 'Ulubat Gölü',
                '1340': 'Eğirdir Gölü',
                '1342': 'Burdur Gölü',
                '14510': 'Sapanca Gölü',
                '14741': 'Salda Gölü'
            }
            
            lake_name = lake_names.get(str(lake_numeric_id))
            log_info(f"Lake name for ID {lake_numeric_id}: {lake_name}")
            
            if not lake_name:
                log_error(f"Lake not found for ID: {lake_numeric_id}")
                return jsonify({'error': 'Lake not found'}), 404
            
            # Filter by lake
            lake_data = clustered_df[clustered_df['lake_name'] == lake_name]
            log_info(f"Lake data records found: {len(lake_data)}")
            
            if lake_data.empty:
                return jsonify({
                    'lake_id': lake_key,
                    'lake_name': lake_name,
                    'cluster_history': [],
                    'current_cluster': None,
                    'message': 'No data available'
                })
            
            # Son cluster
            latest = lake_data.iloc[-1]
            current_cluster = int(latest['cluster'])
            
            # Cluster history - Sadece aylık ortalama al (veri boyutunu küçültmek için)
            # Tarih sütununu datetime'a çevir
            lake_data['date_parsed'] = pd.to_datetime(lake_data['date'])
            lake_data['year_month'] = lake_data['date_parsed'].dt.to_period('M')
            
            # Aylık ortalamalar
            monthly_data = lake_data.groupby('year_month').agg({
                'cluster': lambda x: x.mode()[0] if len(x) > 0 else 0,  # En sık görülen cluster
                'ndwi_mean': 'mean',
                'wri_mean': 'mean',
                'chl_a_mean': 'mean',
                'turbidity_mean': 'mean'
            }).reset_index()
            
            cluster_history = []
            for _, row in monthly_data.iterrows():
                cluster_history.append({
                    'date': str(row['year_month']),  # "2024-01" formatında
                    'cluster': int(row['cluster']),
                    'ndwi': float(row['ndwi_mean']),
                    'wri': float(row['wri_mean']),
                    'chl_a': float(row['chl_a_mean']),
                    'turbidity': float(row['turbidity_mean'])
                })
            
            # Cluster interpretation
            result = predict_water_quality_cluster(
                latest['ndwi_mean'],
                latest['wri_mean'],
                latest['chl_a_mean'],
                latest['turbidity_mean']
            )
            
            # No MongoDB connection to close
            
            return jsonify({
                'lake_id': lake_numeric_id,
                'lake_name': lake_name,
                'current_cluster': current_cluster,
                'interpretation': result.get('interpretation'),
                'confidence': result.get('confidence'),
                'similar_lakes': result.get('similar_lakes'),
                'history': cluster_history,  # Aylık ortalamalar (2018-2024)
                'total_records': len(cluster_history),
                'total_raw_measurements': len(lake_data),  # Ham ölçüm sayısı
                'features': result.get('features'),
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            log_error(f"Clustered data read error: {e}")
            log_error(f"Clustered data read error details: {traceback.format_exc()}")
            return jsonify({'error': 'Data not available', 'details': str(e)}), 500
        
    except Exception as e:
        log_error(f"Lake quality cluster error: {e}")
        log_error(f"Lake quality cluster error details: {traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@quality_bp.route("/api/quality/all-lakes", methods=["GET"])
def get_all_lakes_quality():
    """
    Tüm göllerin mevcut su kalitesi durumu
    """
    try:
        # Path to water quality data in Docker container
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               'water_quality', 'data', 'clustered_water_quality.csv')
        clustered_df = pd.read_csv(csv_path)
        
        # Her göl için son durum
        lake_names = clustered_df['lake_name'].unique()
        all_lakes = []
        
        for lake_name in lake_names:
            lake_data = clustered_df[clustered_df['lake_name'] == lake_name]
            latest = lake_data.iloc[-1]
            
            # Cluster prediction
            try:
                result = predict_water_quality_cluster(
                    float(latest['ndwi_mean']),
                    float(latest['wri_mean']),
                    float(latest['chl_a_mean']),
                    float(latest['turbidity_mean'])
                )
            except Exception as pred_error:
                log_error(f"Prediction error for {lake_name}: {pred_error}")
                result = {'interpretation': 'Error', 'confidence': 0.0}
            
            all_lakes.append({
                'lake_name': lake_name,
                'cluster': int(latest['cluster']),
                'interpretation': result.get('interpretation', 'Unknown'),
                'confidence': result.get('confidence', 0.0),
                'similar_lakes': result.get('similar_lakes', []),
                'last_measurement': latest['date'] if 'date' in latest else None,
                'ndwi': float(latest['ndwi_mean']),
                'wri': float(latest['wri_mean']),
                'chl_a': float(latest['chl_a_mean']),
                'turbidity': float(latest['turbidity_mean'])
            })
        
        return jsonify({
            'lakes': all_lakes,
            'total_lakes': len(all_lakes),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        log_error(f"All lakes quality error: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@quality_bp.route("/api/quality/matrix-analysis", methods=["GET"])
def get_matrix_analysis():
    """
    Tüm göllerin yıllara göre cluster analizi - Matrix görünümü için
    """
    try:
        # Konfigürasyondan CSV dosya yolunu al
        csv_path = WATER_QUALITY_DATA["clustered_csv"]
        if not csv_path.exists():
            return jsonify({
                'status': 'error',
                'message': f'CSV dosyası bulunamadı: {csv_path}'
            }), 404
        
        clustered_df = pd.read_csv(csv_path)
        
        # Yıl ekle
        clustered_df['year'] = pd.to_datetime(clustered_df['date']).dt.year
        
        # Matrix data
        matrix_data = []
        lakes = sorted(clustered_df['lake_name'].unique())
        years = sorted(clustered_df['year'].unique())
        
        for lake in lakes:
            lake_data = clustered_df[clustered_df['lake_name'] == lake]
            
            for year in years:
                year_data = lake_data[lake_data['year'] == year]
                
                if len(year_data) > 0:
                    # Yıl için ortalamalar
                    avg_ndwi = float(year_data['ndwi_mean'].mean())
                    avg_chl_a = float(year_data['chl_a_mean'].mean())
                    avg_turbidity = float(year_data['turbidity_mean'].mean())
                    
                    # Dominant cluster
                    dominant = year_data['cluster'].mode()[0] if len(year_data) > 0 else 0
                    
                    matrix_data.append({
                        'lake': lake,
                        'year': int(year),
                        'cluster': int(dominant),
                        'ndwi': round(avg_ndwi, 2),
                        'chl_a': round(avg_chl_a, 2),
                        'turbidity': round(avg_turbidity, 2),
                        'measurements': len(year_data)
                    })
        
        return jsonify({
            'status': 'success',
            'matrix_data': matrix_data,
            'lakes': lakes,
            'years': [int(y) for y in years],
            'total_entries': len(matrix_data)
        })
        
    except Exception as e:
        log_error(f"Matrix analysis error: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@quality_bp.route("/api/quality/all-data", methods=["GET"])
def get_all_quality_data():
    """
    TÜM ham su kalitesi verileri (filtreleme yok)
    2,775 kayıt - Tüm göller, tüm tarihler
    """
    try:
        # Path to water quality data in Docker container
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               'water_quality', 'data', 'clustered_water_quality.csv')
        
        clustered_df = pd.read_csv(csv_path)
        
        # Veriyi formatla
        all_data = []
        for _, row in clustered_df.iterrows():
            all_data.append({
                'lake': row['lake_name'],
                'date': row['date'],
                'year': int(row['year']) if 'year' in row else pd.to_datetime(row['date']).year,
                'month': int(row['month']) if 'month' in row else pd.to_datetime(row['date']).month,
                'cluster': int(row['cluster']),
                'ndwi': float(row['ndwi_mean']),
                'wri': float(row['wri_mean']),
                'chl_a': float(row['chl_a_mean']),
                'turbidity': float(row['turbidity_mean']),
                'confidence': float(row['confidence']) if 'confidence' in row else 0.0
            })
        
        return jsonify({
            'status': 'success',
            'total_records': len(all_data),
            'data': all_data,
            'lakes': sorted(clustered_df['lake_name'].unique().tolist()),
            'date_range': {
                'start': clustered_df['date'].min(),
                'end': clustered_df['date'].max()
            }
        })
        
    except Exception as e:
        log_error(f"All data error: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@quality_bp.route("/api/quality/yearly-cluster-distribution", methods=["GET"])
def get_yearly_cluster_distribution():
    """
    Yıllara göre cluster dağılımı - Yıllara Göre Cluster Dağılımı grafiği için
    """
    try:
        # Path to water quality data in Docker container
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               'water_quality', 'data', 'clustered_water_quality.csv')
        
        clustered_df = pd.read_csv(csv_path)
        
        # Yıl ekle
        clustered_df['year'] = pd.to_datetime(clustered_df['date']).dt.year
        
        # Yıllara göre cluster dağılımı
        yearly_distribution = []
        years = sorted(clustered_df['year'].unique())
        
        for year in years:
            year_data = clustered_df[clustered_df['year'] == year]
            
            # Her cluster için sayım
            cluster_counts = year_data['cluster'].value_counts().to_dict()
            
            # Tüm cluster'lar için (0-3)
            cluster_distribution = {}
            for cluster_id in range(4):
                count = cluster_counts.get(cluster_id, 0)
                percentage = (count / len(year_data)) * 100 if len(year_data) > 0 else 0
                
                cluster_distribution[f'cluster_{cluster_id}'] = {
                    'count': int(count),
                    'percentage': round(percentage, 1)
                }
            
            yearly_distribution.append({
                'year': int(year),
                'total_measurements': len(year_data),
                'distribution': cluster_distribution
            })
        
        return jsonify({
            'status': 'success',
            'yearly_distribution': yearly_distribution,
            'years': [int(y) for y in years],
            'total_years': len(years)
        })
        
    except Exception as e:
        log_error(f"Yearly cluster distribution error: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@quality_bp.route("/api/quality/predict-3-months", methods=["GET"])
def predict_3_months():
    """
    Gelecek 3 ay için su kalitesi tahmini
    Basit Linear Regression kullanarak trend analizi
    """
    try:
        # Path to water quality data in Docker container
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               'water_quality', 'data', 'clustered_water_quality.csv')
        
        clustered_df = pd.read_csv(csv_path)
        clustered_df['date'] = pd.to_datetime(clustered_df['date'])
        
        # Son 12 aylık veriyi al (her göl için)
        predictions = []
        lakes = clustered_df['lake_name'].unique()
        
        for lake in lakes:
            lake_data = clustered_df[clustered_df['lake_name'] == lake].copy()
            lake_data = lake_data.sort_values('date')
            
            # Son 6 ay (daha hızlı hesaplama)
            last_6_months = lake_data.tail(6)
            
            if len(last_6_months) < 3:
                continue
            
            # Parametreler için basit linear trend
            params = ['ndwi_mean', 'wri_mean', 'chl_a_mean', 'turbidity_mean']
            predicted_params = {}
            
            for param in params:
                values = last_6_months[param].values
                X = np.arange(len(values)).reshape(-1, 1)
                y = values
                
                # Linear regression (basit trend)
                from sklearn.linear_model import LinearRegression
                model = LinearRegression()
                model.fit(X, y)
                
                # 3 ay ilerisi tahmin
                future_X = np.array([[len(values)], [len(values)+1], [len(values)+2]])
                predicted = model.predict(future_X)
                
                predicted_params[param] = [float(p) for p in predicted]
            
            # Son tarihi bul
            last_date = lake_data['date'].max()
            
            # 3 aylık tahminler
            for i in range(3):
                # Tahmin edilen tarihi hesapla (yaklaşık aylık)
                predicted_date = last_date + pd.DateOffset(months=i+1)
                
                # Cluster tahmini
                pred_result = predict_water_quality_cluster(
                    predicted_params['ndwi_mean'][i],
                    predicted_params['wri_mean'][i],
                    predicted_params['chl_a_mean'][i],
                    predicted_params['turbidity_mean'][i]
                )
                
                predictions.append({
                    'lake': lake,
                    'month': i + 1,  # 1, 2, 3 ay sonra
                    'date': predicted_date.strftime('%Y-%m'),
                    'predicted_ndwi': round(predicted_params['ndwi_mean'][i], 3),
                    'predicted_wri': round(predicted_params['wri_mean'][i], 3),
                    'predicted_chl_a': round(predicted_params['chl_a_mean'][i], 3),
                    'predicted_turbidity': round(predicted_params['turbidity_mean'][i], 3),
                    'predicted_cluster': pred_result.get('cluster', 0),
                    'interpretation': pred_result.get('interpretation', 'Unknown'),
                    'confidence': pred_result.get('confidence', 0.0)
                })
        
        return jsonify({
            'status': 'success',
            'predictions': predictions,
            'total_predictions': len(predictions),
            'method': 'Linear Regression Trend Analysis',
            'forecast_horizon': '3 months',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        log_error(f"3-month prediction error: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@quality_bp.route("/api/quality/clusters/info", methods=["GET"])
def get_clusters_info():
    """
    Cluster bilgileri ve yorumlamaları
    """
    return jsonify({
        'clusters': [
            {
                'id': 0,
                'name': 'Normal Su Kalitesi',
                'description': 'Standart su kalitesi parametreleri. Düşük turbidity, orta seviye NDWI.',
                'percentage': 93.0,
                'example_lakes': ['Burdur', 'Tuz', 'Ulubat', 'Eğirdir'],
                'color': '#28a745',
                'status': 'good'
            },
            {
                'id': 1,
                'name': 'Alg Patlaması Riski',
                'description': 'Yüksek Chlorophyll-a konsantrasyonu. Alg patlaması riski var.',
                'percentage': 0.6,
                'example_lakes': ['Salda'],
                'color': '#dc3545',
                'status': 'warning'
            },
            {
                'id': 2,
                'name': 'Tuzlu Su',
                'description': 'Tuzlu göl özellikleri. Yüksek WRI değerleri.',
                'percentage': 1.3,
                'example_lakes': ['Tuz'],
                'color': '#ffc107',
                'status': 'info'
            },
            {
                'id': 3,
                'name': 'Özel Coğrafi Durum',
                'description': 'Van Gölü gibi özel coğrafi özelliklere sahip göller.',
                'percentage': 5.1,
                'example_lakes': ['Van', 'Salda'],
                'color': '#17a2b8',
                'status': 'info'
            }
        ],
        'total_clusters': 4,
        'method': 'K-Means Unsupervised Learning',
        'features': ['NDWI', 'WRI', 'Chlorophyll-a', 'Turbidity']
    })
