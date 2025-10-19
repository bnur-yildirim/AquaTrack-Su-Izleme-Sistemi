"""
Detaylı Analitik API Endpoint'leri
- Göl bazında metrikler
- Mevsimsel analiz
- Model performans karşılaştırma
"""

from flask import Blueprint, jsonify, request
import json
import os
from pathlib import Path

detailed_analytics_bp = Blueprint('detailed_analytics', __name__)

MODELS_DIR = Path(__file__).parent.parent / 'models'

@detailed_analytics_bp.route("/api/analytics/lake-performance", methods=["GET"])
def get_lake_performance():
    """Göl bazında performans metrikleri"""
    try:
        # Tüm horizon'ların metadata'sını oku
        lake_performance = {}
        
        for horizon in [1, 2, 3]:
            metadata_path = MODELS_DIR / f"metadata_H{horizon}_improved.json"
            
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    
                lake_metrics = metadata.get('lake_metrics', {})
                
                for lake_id, metrics in lake_metrics.items():
                    if lake_id not in lake_performance:
                        lake_performance[lake_id] = {
                            'lake_name': metrics['lake_name'],
                            'horizons': {}
                        }
                    
                    lake_performance[lake_id]['horizons'][f'H{horizon}'] = {
                        'wmape': metrics['wmape'],
                        'r2': metrics['r2'],
                        'mae': metrics['mae'],
                        'samples': metrics['samples']
                    }
        
        return jsonify({
            'status': 'success',
            'data': lake_performance
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@detailed_analytics_bp.route("/api/analytics/seasonal-performance", methods=["GET"])
def get_seasonal_performance():
    """Mevsimsel performans metrikleri"""
    try:
        seasonal_performance = {}
        
        for horizon in [1, 2, 3]:
            metadata_path = MODELS_DIR / f"metadata_H{horizon}_improved.json"
            
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    
                seasonal_metrics = metadata.get('seasonal_metrics', {})
                
                seasonal_performance[f'H{horizon}'] = seasonal_metrics
        
        return jsonify({
            'status': 'success',
            'data': seasonal_performance
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@detailed_analytics_bp.route("/api/analytics/model-comparison", methods=["GET"])
def get_model_comparison():
    """Model performans karşılaştırması (Old vs Improved)"""
    try:
        comparison = {
            'old_model': {},
            'improved_model': {}
        }
        
        # Old model metrikleri
        old_path = MODELS_DIR / "metrics_summary_optuna.json"
        if old_path.exists():
            with open(old_path, 'r') as f:
                old_metrics = json.load(f)
                comparison['old_model'] = old_metrics
        
        # Improved model metrikleri
        for horizon in [1, 2, 3]:
            improved_path = MODELS_DIR / f"metadata_H{horizon}_improved.json"
            if improved_path.exists():
                with open(improved_path, 'r') as f:
                    metadata = json.load(f)
                    comparison['improved_model'][f'H{horizon}'] = metadata.get('metrics', {})
        
        return jsonify({
            'status': 'success',
            'data': comparison
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@detailed_analytics_bp.route("/api/analytics/feature-importance", methods=["GET"])
def get_feature_importance():
    """Feature importance bilgileri"""
    try:
        horizon = int(request.args.get('horizon', 1))
        
        metadata_path = MODELS_DIR / f"metadata_H{horizon}_improved.json"
        
        if not metadata_path.exists():
            return jsonify({
                'status': 'error',
                'message': 'Model metadata not found'
            }), 404
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        selected_features = metadata.get('selected_features', [])
        
        return jsonify({
            'status': 'success',
            'horizon': horizon,
            'features': selected_features,
            'count': len(selected_features)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@detailed_analytics_bp.route("/api/analytics/training-summary", methods=["GET"])
def get_training_summary():
    """Eğitim özeti"""
    try:
        summary_path = MODELS_DIR / "training_summary_improved.json"
        
        if not summary_path.exists():
            return jsonify({
                'status': 'error',
                'message': 'Training summary not found'
            }), 404
        
        with open(summary_path, 'r') as f:
            summary = json.load(f)
        
        return jsonify({
            'status': 'success',
            'data': summary
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@detailed_analytics_bp.route("/api/analytics/overfitting-check", methods=["GET"])
def check_overfitting():
    """Overfitting kontrolü"""
    try:
        overfitting_status = {}
        
        for horizon in [1, 2, 3]:
            metadata_path = MODELS_DIR / f"metadata_H{horizon}_improved.json"
            
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                
                metrics = metadata.get('metrics', {})
                overfitting_gap = metrics.get('overfitting_gap', 0)
                
                # Overfitting değerlendirmesi
                if overfitting_gap > 0.1:
                    status = 'high_risk'
                    message = 'Yüksek overfitting riski'
                elif overfitting_gap > 0.05:
                    status = 'medium_risk'
                    message = 'Orta seviye overfitting riski'
                else:
                    status = 'low_risk'
                    message = 'Düşük overfitting riski'
                
                overfitting_status[f'H{horizon}'] = {
                    'gap': overfitting_gap,
                    'status': status,
                    'message': message,
                    'train_r2': metrics.get('train_r2'),
                    'val_r2': metrics.get('val_r2'),
                    'test_r2': metrics.get('test_r2')
                }
        
        return jsonify({
            'status': 'success',
            'data': overfitting_status
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

