"""
Yardımcı fonksiyonlar
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime

def log_info(message):
    """Bilgi mesajlarını logla"""
    print(f"[INFO] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {message}")

def log_error(message):
    """Hata mesajlarını logla"""
    print(f"[ERROR] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {message}")

def calculate_normalized_metrics(y_true, y_pred):
    """Normalize edilmiş başarı metrikleri hesapla"""
    # Null değerleri filtrele
    mask = ~(np.isnan(y_true) | np.isnan(y_pred))
    y_true_clean = y_true[mask]
    y_pred_clean = y_pred[mask]
    
    if len(y_true_clean) == 0:
        return {}
    
    # MAPE (Mean Absolute Percentage Error) - sıfır değerleri filtrele
    # Çok küçük değerleri filtrele (MAPE için problemli)
    min_threshold = np.percentile(y_true_clean[y_true_clean > 0], 5) if len(y_true_clean[y_true_clean > 0]) > 0 else 1000000
    valid_for_mape = (y_true_clean >= min_threshold) & (y_true_clean > 0)
    
    if valid_for_mape.sum() > 0:
        mape = np.mean(np.abs((y_true_clean[valid_for_mape] - y_pred_clean[valid_for_mape]) / y_true_clean[valid_for_mape])) * 100
    else:
        mape = np.nan
    
    # WMAPE (Weighted Mean Absolute Percentage Error)
    wmape = np.sum(np.abs(y_true_clean - y_pred_clean)) / np.sum(y_true_clean) * 100
    
    # NRMSE (Normalized Root Mean Square Error)
    rmse = np.sqrt(np.mean((y_true_clean - y_pred_clean) ** 2))
    nrmse = rmse / np.mean(y_true_clean) * 100
    
    # CV-RMSE (Coefficient of Variation RMSE)
    cv_rmse = rmse / np.mean(y_true_clean) * 100
    
    # R² (Coefficient of Determination)
    ss_res = np.sum((y_true_clean - y_pred_clean) ** 2)
    ss_tot = np.sum((y_true_clean - np.mean(y_true_clean)) ** 2)
    r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    
    return {
        'MAPE': round(mape, 2),
        'WMAPE': round(wmape, 2), 
        'NRMSE': round(nrmse, 2),
        'CV_RMSE': round(cv_rmse, 2),
        'R2': round(r2, 4),
        'sample_count': len(y_true_clean)
    }

def clean_dataframe_for_json(df):
    """DataFrame'i JSON serileştirilebilir hale getir"""
    df_clean = df.copy()
    
    # NaN değerleri None ile değiştir
    df_clean = df_clean.replace({np.nan: None})
    df_clean = df_clean.where(pd.notna(df_clean), None)
    
    # Datetime sütunları string'e çevir
    for col in df_clean.columns:
        if pd.api.types.is_datetime64_any_dtype(df_clean[col]):
            df_clean[col] = df_clean[col].dt.strftime('%Y-%m-%d')
        elif df_clean[col].dtype.kind in ('i', 'u', 'f'):  # Numeric types
            df_clean[col] = df_clean[col].apply(
                lambda x: None if pd.isna(x) or x is np.nan else float(x) if not pd.isna(x) else None
            )
    
    return df_clean

def load_metrics_file(file_path):
    """Metrikleri yükle (JSON veya CSV)"""
    try:
        if file_path.endswith('.json'):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        elif file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
            # CSV'den dict'e çevir
            metrics_dict = {}
            for _, row in df.iterrows():
                key = row.get('metric', row.get('model', 'unknown'))
                metrics_dict[key] = {col: val for col, val in row.items() if col not in ['metric', 'model']}
            return metrics_dict
    except Exception as e:
        log_error(f"Metrik yükleme hatası: {e}")
        return {}

def resolve_lake_id(lake_id_param, lake_info, key_by_id):
    """Lake ID parametresini çözümle ve numeric ID ile key döndür"""
    lake_key = None
    lake_numeric_id = None

    if isinstance(lake_id_param, str) and lake_id_param.isdigit():
        lake_numeric_id = int(lake_id_param)
        lake_key = key_by_id.get(lake_numeric_id)
        return lake_key, lake_numeric_id

    # Normalize string variants (diacritics and suffixes)
    def normalize(s):
        repl = (
            ("ğ", "g"), ("ü", "u"), ("ş", "s"), ("ı", "i"), ("ö", "o"), ("ç", "c"),
            ("Ğ", "g"), ("Ü", "u"), ("Ş", "s"), ("İ", "i"), ("Ö", "o"), ("Ç", "c"),
        )
        out = s.strip().lower()
        for a, b in repl:
            out = out.replace(a, b)
        out = out.replace(" gölü", "_golu").replace("golu", "_golu").replace(" ", "_")
        if not out.endswith("_golu") and out + "_golu" in lake_info:
            out = out + "_golu"
        return out

    cand = normalize(str(lake_id_param))
    if cand in lake_info:
        lake_key = cand
        lake_numeric_id = lake_info[cand]["id"]
        return lake_key, lake_numeric_id

    # Try without suffix
    if cand.endswith("_golu"):
        base = cand[:-5]
        for key in lake_info.keys():
            if key.startswith(base):
                lake_key = key
                lake_numeric_id = lake_info[key]["id"]
                return lake_key, lake_numeric_id

    return lake_key, lake_numeric_id

def calculate_future_predictions(lake_data, months=3):
    """Gerçek model tahminlerini kullanarak gelecek aylar için tahmin hesapla"""
    if lake_data is None or lake_data.empty:
        return [90000000.0, 85000000.0, 80000000.0]  # Default değerler
    
    # En son tarihlerdeki model tahminlerini al
    if 'predicted_water_area' in lake_data.columns and 'date' in lake_data.columns:
        # Tarihe göre sırala ve en son tahminleri al
        lake_data_sorted = lake_data.sort_values('date')
        recent_predictions = lake_data_sorted['predicted_water_area'].dropna().tail(months * 2)  # Daha fazla veri al
        
        if len(recent_predictions) >= months:
            # Son N ayın gerçek model tahminlerini döndür
            return recent_predictions.tail(months).tolist()
        elif len(recent_predictions) > 0:
            # Yeteri kadar tahmin yoksa, mevcut olanları kullan ve trend ile tamamla
            last_value = recent_predictions.iloc[-1]
            predictions = recent_predictions.tolist()
            
            # Eksik ayları trend ile tamamla
            if len(recent_predictions) >= 2:
                trend = (recent_predictions.iloc[-1] - recent_predictions.iloc[-2]) / recent_predictions.iloc[-2]
                trend = max(-0.05, min(0.05, trend))  # Konservatif trend
            else:
                trend = 0.0
            
            current_value = last_value
            for i in range(len(predictions), months):
                current_value = current_value * (1 + trend * (0.9 ** i))  # Trend azalır
                predictions.append(float(current_value))
            
            return predictions[:months]
    
    # Fallback: target_water_area_m2 kullan
    if 'target_water_area_m2' in lake_data.columns:
        valid_targets = lake_data.dropna(subset=['target_water_area_m2'])
        if not valid_targets.empty:
            last_values = valid_targets['target_water_area_m2'].tail(3).tolist()
            if len(last_values) >= 2:
                trend = (last_values[-1] - last_values[-2]) / last_values[-2]
                trend = max(-0.03, min(0.03, trend))
            else:
                trend = -0.01
            
            predictions = []
            current_value = last_values[-1]
            for i in range(months):
                current_value = current_value * (1 + trend * (0.95 ** i))
                predictions.append(float(current_value))
            
            return predictions
    
    # Son çare: default değerler
    return [90000000.0, 85000000.0, 80000000.0]

def get_seasonal_factor(month):
    """Mevsimsel faktör döndür (1-12 ay için)"""
    seasonal_factors = {
        1: 0.9, 2: 0.85, 3: 0.95, 4: 1.1, 5: 1.15, 6: 1.2,
        7: 1.1, 8: 1.05, 9: 1.0, 10: 0.95, 11: 0.9, 12: 0.85
    }
    return seasonal_factors.get(month, 1.0)

def get_season_name(month):
    """Ay numarasından mevsim adını döndür"""
    seasons = ["Kış", "Kış", "İlkbahar", "İlkbahar", "İlkbahar", 
              "Yaz", "Yaz", "Yaz", "Sonbahar", "Sonbahar", "Sonbahar", "Kış"]
    return seasons[month-1] if 1 <= month <= 12 else "Bilinmiyor"

def calculate_quality_score(params):
    """Su kalitesi parametrelerinden genel skor hesapla"""
    if not params:
        return 50.0
    
    score_components = []
    
    # pH optimum 8
    if "pH" in params:
        ph_score = (8.5 - abs(params["pH"] - 8)) / 8.5 * 25
        score_components.append(max(0, ph_score))
    
    # Düşük turbidite iyi
    if "Turbidite" in params:
        turbidity_score = (5 - min(params["Turbidite"], 5)) / 5 * 25
        score_components.append(max(0, turbidity_score))
    
    # Yüksek DO iyi
    if "Çözünmüş_Oksijen" in params:
        do_score = min(params["Çözünmüş_Oksijen"], 10) / 10 * 25
        score_components.append(max(0, do_score))
    
    # Optimum sıcaklık 17°C
    if "Sıcaklık" in params:
        temp_score = 25 - abs(params["Sıcaklık"] - 17) / 17 * 25
        score_components.append(max(0, temp_score))
    
    # Düşük nitrat iyi
    if "Nitrat" in params:
        nitrat_score = (2 - min(params["Nitrat"], 2)) / 2 * 25
        score_components.append(max(0, nitrat_score))
    
    return round(sum(score_components), 1) if score_components else 50.0
