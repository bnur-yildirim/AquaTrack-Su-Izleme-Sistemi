"""
Tekdüze Normalize Edilmiş Metrik API'leri
Göl büyüklüğünden bağımsız başarı metrikleri
"""

from flask import Blueprint, jsonify, request
import json
import os
from pathlib import Path
from database import get_database
from database.queries import DatabaseQueries

unified_metrics_bp = Blueprint('unified_metrics', __name__)

MODELS_DIR = Path(__file__).parent.parent / 'models'

@unified_metrics_bp.route("/api/metrics/unified", methods=["GET"])
def get_unified_metrics():
    """Tekdüze normalize edilmiş metrikler"""
    try:
        metrics_path = MODELS_DIR / "unified_normalized_metrics.json"
        
        if not metrics_path.exists():
            return jsonify({
                'status': 'error',
                'message': 'Unified metrics not found. Run calculate_unified_metrics.py first'
            }), 404
        
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
        
        return jsonify({
            'status': 'success',
            'data': metrics
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@unified_metrics_bp.route("/api/metrics/unified/lake/<lake_id>", methods=["GET"])
def get_lake_unified_metrics(lake_id):
    """Belirli bir göl için tüm horizon'ların unified metrikleri"""
    try:
        metrics_path = MODELS_DIR / "unified_normalized_metrics.json"
        
        if not metrics_path.exists():
            return jsonify({
                'status': 'error',
                'message': 'Unified metrics not found'
            }), 404
        
        with open(metrics_path, 'r') as f:
            all_metrics = json.load(f)
        
        lake_data = {}
        for horizon, lakes in all_metrics.items():
            if str(lake_id) in lakes:
                lake_data[horizon] = lakes[str(lake_id)]
        
        if not lake_data:
            return jsonify({
                'status': 'error',
                'message': f'No data found for lake {lake_id}'
            }), 404
        
        return jsonify({
            'status': 'success',
            'lake_id': lake_id,
            'data': lake_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@unified_metrics_bp.route("/api/metrics/unified/summary", methods=["GET"])
def get_unified_summary():
    """Genel özet - tüm göller ve horizon'lar"""
    try:
        db = get_database()
        queries = DatabaseQueries()
        
        # MongoDB'den model metadata'yı al
        model_metadata = queries.get_model_metadata()
        
        if not model_metadata:
            return jsonify({
                'status': 'error',
                'message': 'Model metadata not found'
            }), 404
        
        summary = {}
        
        # Her horizon için özet hesapla
        for horizon in ['H1', 'H2', 'H3']:
            horizon_models = [m for m in model_metadata if horizon in m['model_name']]
            
            if horizon_models:
                # Gerçek performans metriklerini al
                r2_scores = []
                wmape_scores = []
                
                for model in horizon_models:
                    performance_metrics = model.get('performance_metrics', {})
                    r2 = performance_metrics.get('test_r2', performance_metrics.get('r2', 0))
                    wmape = performance_metrics.get('test_wmape', performance_metrics.get('wmape', 0))
                    
                    r2_scores.append(r2)
                    wmape_scores.append(wmape)
                
                if r2_scores:
                    summary[horizon] = {
                        'total_lakes': len(r2_scores),
                        'excellent': sum(1 for r2 in r2_scores if r2 >= 0.99),
                        'good': sum(1 for r2 in r2_scores if 0.95 <= r2 < 0.99),
                        'fair': sum(1 for r2 in r2_scores if 0.90 <= r2 < 0.95),
                        'poor': sum(1 for r2 in r2_scores if r2 < 0.90),
                        'avg_wmape': round(sum(wmape_scores) / len(wmape_scores), 2),
                        'avg_score': round(sum(r2_scores) / len(r2_scores), 4),  # R² değeri olarak
                        'limited_data_lakes': 0  # MongoDB'de sınırlı veri kontrolü yok
                    }
        
        return jsonify({
            'status': 'success',
            'data': summary
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@unified_metrics_bp.route("/api/metrics/reliability-ranking", methods=["GET"])
def get_reliability_ranking():
    """Gölleri güvenilirliğe göre sırala"""
    try:
        horizon = int(request.args.get('horizon', 1))
        
        metrics_path = MODELS_DIR / "unified_normalized_metrics.json"
        
        if not metrics_path.exists():
            return jsonify({
                'status': 'error',
                'message': 'Unified metrics not found'
            }), 404
        
        with open(metrics_path, 'r') as f:
            all_metrics = json.load(f)
        
        horizon_key = f'H{horizon}'
        if horizon_key not in all_metrics:
            return jsonify({
                'status': 'error',
                'message': f'Horizon {horizon} not found'
            }), 404
        
        lakes = all_metrics[horizon_key]
        
        # Unified score'a göre sırala
        ranked = sorted(
            lakes.items(),
            key=lambda x: x[1]['unified_score'],
            reverse=True
        )
        
        ranking = []
        for rank, (lake_id, lake_data) in enumerate(ranked, 1):
            ranking.append({
                'rank': rank,
                'lake_id': lake_id,
                'lake_name': lake_data['lake_name'],
                'score': lake_data['unified_score'],
                'reliability': lake_data['reliability'],
                'wmape': lake_data['wmape'],
                'r2': lake_data['r2'],
                'data_quality': lake_data['data_quality']
            })
        
        return jsonify({
            'status': 'success',
            'horizon': horizon,
            'ranking': ranking
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@unified_metrics_bp.route("/api/metrics/improved-ranking", methods=["GET"])
def get_improved_ranking():
    """İyileştirilmiş modellerden göl performansını çek"""
    try:
        horizon = int(request.args.get('horizon', 1))
        
        db = get_database()
        queries = DatabaseQueries()
        
        # MongoDB'den model metadata'yı al
        model_metadata = queries.get_model_metadata()
        
        if not model_metadata:
            return jsonify({
                'status': 'error',
                'message': 'Model metadata not found'
            }), 404
        
        # Belirli horizon için model bul
        horizon_model = None
        for model in model_metadata:
            if f'H{horizon}' in model['model_name']:
                horizon_model = model
                break
        
        if not horizon_model:
            return jsonify({
                'status': 'error',
                'message': f'Horizon {horizon} model not found'
            }), 404
        
        # Performance metrics'den göl verilerini al
        performance_metrics = horizon_model.get('performance_metrics', {})
        
        # MongoDB'den göl bilgilerini al
        lakes_data = queries.get_all_lakes()
        lake_info = {str(lake['lake_id']): lake['name'] for lake in lakes_data}
        
        # İyileştirilmiş gölleri belirle (sınırlı veri gölleri)
        improved_lakes = ['14741', '14510', '1321']  # Salda, Sapanca, Ulubat
        
        ranking = []
        
        # MongoDB'den göl performans verilerini al
        lake_performance_data = list(db['lake_performance_metrics'].find({'horizon': f'H{horizon}'}))
        
        for lake_perf in lake_performance_data:
            lake_id = str(lake_perf['lake_id'])
            lake_name = lake_perf['lake_name']
            perf_metrics = lake_perf.get('performance_metrics', {})
            
            # Gerçek göl bazlı R² değerini kullan
            r2 = perf_metrics.get('r2', 0)
            r2_percent = r2 * 100 if r2 > 0 else 0  # Negatif R² değerlerini 0 olarak göster
            
            # WMAPE değeri
            wmape = perf_metrics.get('wmape', 0)
            
            # MAE değeri
            mae = perf_metrics.get('mae', 0)
            
            # Samples sayısı
            samples = perf_metrics.get('samples', 0)
            
            ranking.append({
                'rank': len(ranking) + 1,
                'lake_id': lake_id,
                'lake_name': lake_name,
                'r2': r2_percent,
                'wmape': wmape,
                'mae': mae,
                'samples': samples,
                'improved': lake_id in improved_lakes,
                'reliability': 'Excellent' if r2_percent > 95 else 'Good' if r2_percent > 85 else 'Fair'
            })
        
        # R² skoruna göre sırala
        ranking.sort(key=lambda x: x['r2'], reverse=True)
        
        # Rank'ları güncelle
        for i, item in enumerate(ranking):
            item['rank'] = i + 1
        
        return jsonify({
            'status': 'success',
            'horizon': horizon,
            'ranking': ranking
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

