"""
Veri yükleme modülü
"""

import os
import pandas as pd
import traceback
from utils import log_info, log_error, load_metrics_file
from config import BACKEND_MODELS_DIR

# Global değişkenler
METRICS = {}
PREDICTIONS = None
LAKE_DATA_POINTS = {}

def find_data_files():
    """Veri dosyalarını bul"""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    candidate_dirs = [
        BACKEND_MODELS_DIR,
        os.path.join(base_dir, "water_quantity", "output"),
        os.path.join(base_dir, "output"),
        os.path.join(os.path.dirname(__file__), "data"),
        os.path.dirname(__file__)
    ]
    
    data_files = {}
    for data_dir in candidate_dirs:
        if not os.path.exists(data_dir):
            continue
            
        # Parquet dosyaları (enhanced öncelikli)
        for file_name in ["all_predictions_enhanced.parquet", "all_predictions_final.parquet", "all_predictions_optuna.parquet"]:
            file_path = os.path.join(data_dir, file_name)
            if os.path.exists(file_path):
                data_files["predictions"] = file_path
                log_info(f"Predictions dosyası bulundu: {file_path}")
                break
        
        # Train/Val/Test dosyaları - ATLA (predictions dosyası hepsini içeriyor)
        # for prefix in ["train", "val", "test"]:
        #     file_name = f"{prefix}_combined.parquet"
        #     file_path = os.path.join(data_dir, file_name)
        #     if os.path.exists(file_path):
        #         data_files[prefix] = file_path
        
        # Metrik dosyaları
        for file_name in ["metrics_summary_optuna.json", "metrics_summary_final.json"]:
            file_path = os.path.join(data_dir, file_name)
            if os.path.exists(file_path):
                data_files["metrics"] = file_path
                break
        
        # CSV metrik dosyası da kontrol et
        for file_name in ["metrics_summary_final.csv", "metrics_summary_optuna.csv"]:
            file_path = os.path.join(data_dir, file_name)
            if os.path.exists(file_path) and "metrics" not in data_files:
                data_files["metrics_csv"] = file_path
    
    return data_files

def load_data():
    """Tüm verileri yükle"""
    global METRICS, PREDICTIONS, LAKE_DATA_POINTS
    
    log_info("Veri yükleme başlıyor...")
    data_files = find_data_files()
    log_info(f"Bulunan dosyalar: {data_files}")
    
    # Metrikleri yükle
    if "metrics" in data_files:
        METRICS = load_metrics_file(data_files["metrics"])
        log_info(f"JSON metrikler yüklendi: {list(METRICS.keys())}")
    elif "metrics_csv" in data_files:
        METRICS = load_metrics_file(data_files["metrics_csv"])
        log_info(f"CSV metrikler yüklendi: {list(METRICS.keys())}")
    
    # Ana tahmin verilerini yükle
    all_dataframes = []
    
    try:
        # Ana predictions dosyası - Optuna optimize versiyonu kullan
        if "predictions" in data_files:
            # Optuna dosyasını dene (en iyi performans)
            optuna_file = data_files["predictions"].replace("final", "optuna")
            if os.path.exists(optuna_file):
                pred_df = pd.read_parquet(optuna_file)
                log_info(f"🎯 Optuna optimize dosyası yüklendi: {optuna_file}")
            else:
                pred_df = pd.read_parquet(data_files["predictions"])
                log_info(f"📊 Final dosyası yüklendi: {data_files['predictions']}")
            required_cols = ['lake_id', 'date', 'target_water_area_m2']
            optional_cols = ['predicted_water_area', 'prediction']
            
            # Basit veri yükleme - tüm sütunları al
            log_info(f"Tüm veri yükleniyor: {pred_df.shape}")
            
            # Tahmin sütununu standardize et
            if 'predicted_water_area' not in pred_df.columns and 'prediction' in pred_df.columns:
                pred_df['predicted_water_area'] = pred_df['prediction']
            all_dataframes.append(pred_df)
            log_info(f"Ana predictions yüklendi: {pred_df.shape}")
        
        # Train/Val/Test verilerini YÜKLEME - çünkü predictions dosyası zaten hepsini içeriyor
        # Bu kısım kapatıldı çünkü predictions dosyası tüm veriyi içeriyor
        log_info("Train/Val/Test verileri atlandı - predictions dosyası tüm veriyi içeriyor")
        
        # Tüm verileri birleştir
        if all_dataframes:
            PREDICTIONS = pd.concat(all_dataframes, ignore_index=True)
            
            # Tarih sütununu işle
            PREDICTIONS['date'] = pd.to_datetime(PREDICTIONS['date'])
            
            # Duplicate'leri temizle
            PREDICTIONS = PREDICTIONS.drop_duplicates(
                subset=['lake_id', 'date'], 
                keep='last'
            )
            
            # Sırala
            PREDICTIONS = PREDICTIONS.sort_values(['lake_id', 'date']).reset_index(drop=True)
            
            # Veri noktalarını say
            LAKE_DATA_POINTS = PREDICTIONS.groupby('lake_id').size().to_dict()
            
            log_info(f"Toplam veri yüklendi: {PREDICTIONS.shape}")
            log_info(f"Göl ID'leri: {sorted(PREDICTIONS['lake_id'].unique())}")
            log_info(f"Tarih aralığı: {PREDICTIONS['date'].min()} - {PREDICTIONS['date'].max()}")
            log_info(f"Göl veri noktaları: {LAKE_DATA_POINTS}")
            
        return len(all_dataframes) > 0
        
    except Exception as e:
        log_error(f"Veri yükleme hatası: {e}")
        traceback.print_exc()
        return False

def get_lake_predictions(lake_id):
    """Belirli bir göl için tahmin verilerini getir"""
    if PREDICTIONS is None:
        log_error(f"PREDICTIONS None - lake_id: {lake_id}")
        return None
    
    try:
        # Lake ID'ye göre filtrele
        lake_data = PREDICTIONS[PREDICTIONS['lake_id'] == lake_id].copy()
        
        if lake_data.empty:
            log_error(f"Lake {lake_id} için veri bulunamadı")
            return None
        
        # Tarihe göre sırala
        lake_data = lake_data.sort_values('date')
        
        log_info(f"Lake {lake_id} - {lake_data.shape[0]} kayıt, "
                f"tarih aralığı: {lake_data['date'].min()} - {lake_data['date'].max()}")
        
        return lake_data
        
    except Exception as e:
        log_error(f"Lake data hatası: {e}")
        return None

def get_predictions():
    """Global predictions verisini döndür"""
    return PREDICTIONS

def get_metrics():
    """Global metrics verisini döndür"""
    return METRICS

def get_lake_data_points():
    """Göl veri noktalarını döndür"""
    return LAKE_DATA_POINTS
