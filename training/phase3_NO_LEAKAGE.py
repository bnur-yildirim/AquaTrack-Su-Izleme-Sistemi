#!/usr/bin/env python3
"""
Phase 3: NO DATA LEAKAGE - Gerçek Test
quality_score VE diğer leakage riski olan özellikler ÇIKARILDI
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging
import json
from datetime import datetime
import time
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except:
    XGBOOST_AVAILABLE = False
    
try:
    from lightgbm import LGBMClassifier
    LIGHTGBM_AVAILABLE = True
except:
    LIGHTGBM_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/phase3_no_leakage_training.log'),
        logging.StreamHandler()
    ]
)

def create_clean_features(df):
    """LEAKAGE OLMAYAN özellikler oluştur"""
    logging.info("TEMIZ ozellik muhendisligi baslatiliyor...")
    logging.info("CIKARILAN LEAKAGE OZELLIKLERI: quality_score, quality_score_*, *_quality_*")
    
    df = df.copy()
    
    # Su kalitesi parametreleri - BUNLAR OK (sensör verileri)
    water_params = ['ndwi_mean', 'wri_mean', 'chl_a_mean', 'turbidity_mean']
    
    for param in water_params:
        if param in df.columns:
            # Log transform
            df[f'{param}_log'] = np.log1p(df[param].clip(lower=0))
            
            # Square root
            df[f'{param}_sqrt'] = np.sqrt(df[param].clip(lower=0))
            
            # Squared
            df[f'{param}_squared'] = df[param] ** 2
    
    # Ratio features
    if 'ndwi_mean' in df.columns and 'wri_mean' in df.columns:
        df['ndwi_wri_ratio'] = df['ndwi_mean'] / (df['wri_mean'] + 1e-5)
        df['ndwi_wri_product'] = df['ndwi_mean'] * df['wri_mean']
        df['ndwi_wri_diff'] = df['ndwi_mean'] - df['wri_mean']
    
    if 'chl_a_mean' in df.columns and 'turbidity_mean' in df.columns:
        df['chl_turb_ratio'] = df['chl_a_mean'] / (df['turbidity_mean'] + 1e-5)
        df['chl_turb_product'] = df['chl_a_mean'] * df['turbidity_mean']
        df['pollution_index'] = df['chl_a_mean'] + df['turbidity_mean']
    
    # Göl features
    if 'lake_name' in df.columns:
        lake_encoder = LabelEncoder()
        df['lake_id'] = lake_encoder.fit_transform(df['lake_name'])
        
        # SADECE sensör değerlerinin göl bazlı istatistikleri
        for col in ['ndwi_mean', 'chl_a_mean', 'turbidity_mean']:
            if col in df.columns:
                df[f'{col}_lake_mean'] = df.groupby('lake_name')[col].transform('mean')
                df[f'{col}_lake_std'] = df.groupby('lake_name')[col].transform('std')
                df[f'{col}_deviation'] = df[col] - df[f'{col}_lake_mean']
    
    # Dosya boyutu
    if 'file_size' in df.columns:
        df['file_size_log'] = np.log1p(df['file_size'])
    
    # NaN'ları doldur
    df = df.fillna(df.mean(numeric_only=True))
    df = df.fillna(0)
    
    return df

def prepare_clean_dataset(csv_file, max_samples=None):
    """LEAKAGE OLMADAN veri hazırla"""
    logging.info(f"Dataset yukleniyor: {csv_file}")
    
    df = pd.read_csv(csv_file)
    
    if max_samples:
        df = df.groupby('quality_label', group_keys=False).apply(
            lambda x: x.sample(n=min(len(x), int(max_samples * len(x) / len(df))), random_state=42)
        )
    
    logging.info(f"Dataset boyutu: {len(df)}")
    
    # Label encoding
    label_mapping = {'good': 0, 'fair': 1, 'excellent': 2}
    df['quality_encoded'] = df['quality_label'].map(label_mapping)
    
    label_dist = df['quality_label'].value_counts()
    logging.info(f"Label dagilimi: {label_dist.to_dict()}")
    
    # Feature engineering - LEAKAGE YOK
    df = create_clean_features(df)
    
    return df

def train_models_no_leakage(X_train, y_train, X_val, y_val):
    """LEAKAGE OLMADAN modelleri eğit"""
    logging.info("=" * 60)
    logging.info("MODELLER EĞİTİLİYOR (NO DATA LEAKAGE)")
    logging.info("=" * 60)
    
    # Class weights
    from sklearn.utils.class_weight import compute_class_weight
    classes = np.unique(y_train)
    class_weights_array = compute_class_weight('balanced', classes=classes, y=y_train)
    class_weights_dict = dict(zip(classes, class_weights_array))
    
    logging.info(f"Class weights: {class_weights_dict}")
    
    models = {}
    results = {}
    
    # 1. Random Forest
    logging.info("1. Random Forest egitiliyor...")
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_val)
    rf_acc = accuracy_score(y_val, rf_pred)
    rf_f1 = f1_score(y_val, rf_pred, average='weighted')
    
    # Cross-validation
    cv_scores = cross_val_score(rf, X_train, y_train, cv=5, scoring='accuracy')
    
    models['Random Forest'] = rf
    results['Random Forest'] = {
        'accuracy': rf_acc, 
        'f1_score': rf_f1,
        'cv_mean': cv_scores.mean(),
        'cv_std': cv_scores.std()
    }
    logging.info(f"   Random Forest - Acc: {rf_acc:.4f}, F1: {rf_f1:.4f}, CV: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    
    # 2. Gradient Boosting
    logging.info("2. Gradient Boosting egitiliyor...")
    gb = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=8,
        min_samples_split=10,
        min_samples_leaf=4,
        random_state=42
    )
    gb.fit(X_train, y_train)
    gb_pred = gb.predict(X_val)
    gb_acc = accuracy_score(y_val, gb_pred)
    gb_f1 = f1_score(y_val, gb_pred, average='weighted')
    
    models['Gradient Boosting'] = gb
    results['Gradient Boosting'] = {'accuracy': gb_acc, 'f1_score': gb_f1}
    logging.info(f"   Gradient Boosting - Acc: {gb_acc:.4f}, F1: {gb_f1:.4f}")
    
    # 3. XGBoost
    if XGBOOST_AVAILABLE:
        logging.info("3. XGBoost egitiliyor...")
        xgb = XGBClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=8,
            min_child_weight=3,
            gamma=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric='mlogloss'
        )
        sample_weights = np.array([class_weights_dict[y] for y in y_train])
        xgb.fit(X_train, y_train, sample_weight=sample_weights)
        xgb_pred = xgb.predict(X_val)
        xgb_acc = accuracy_score(y_val, xgb_pred)
        xgb_f1 = f1_score(y_val, xgb_pred, average='weighted')
        
        models['XGBoost'] = xgb
        results['XGBoost'] = {'accuracy': xgb_acc, 'f1_score': xgb_f1}
        logging.info(f"   XGBoost - Acc: {xgb_acc:.4f}, F1: {xgb_f1:.4f}")
    
    # 4. LightGBM
    if LIGHTGBM_AVAILABLE:
        logging.info("4. LightGBM egitiliyor...")
        lgbm = LGBMClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=8,
            num_leaves=31,
            min_child_samples=20,
            class_weight='balanced',
            random_state=42,
            verbose=-1
        )
        lgbm.fit(X_train, y_train)
        lgbm_pred = lgbm.predict(X_val)
        lgbm_acc = accuracy_score(y_val, lgbm_pred)
        lgbm_f1 = f1_score(y_val, lgbm_pred, average='weighted')
        
        models['LightGBM'] = lgbm
        results['LightGBM'] = {'accuracy': lgbm_acc, 'f1_score': lgbm_f1}
        logging.info(f"   LightGBM - Acc: {lgbm_acc:.4f}, F1: {lgbm_f1:.4f}")
    
    return models, results

def evaluate_on_test(model, X_test, y_test, model_name):
    """Test set'inde değerlendir"""
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    label_names = ['good', 'fair', 'excellent']
    report = classification_report(y_test, y_pred, target_names=label_names, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred)
    
    # Per-class accuracy
    class_acc = {}
    for cls in range(3):
        cls_mask = y_test == cls
        if cls_mask.sum() > 0:
            cls_correct = (y_pred[cls_mask] == cls).sum()
            class_acc[label_names[cls]] = cls_correct / cls_mask.sum()
    
    logging.info(f"\n{model_name} - TEST SET SONUCLARI:")
    logging.info(f"  Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    logging.info(f"  F1 Score: {f1:.4f}")
    logging.info(f"  Per-class Acc: {class_acc}")
    logging.info(f"\nConfusion Matrix:")
    logging.info(f"{cm}")
    
    return {
        'accuracy': accuracy,
        'f1_score': f1,
        'class_accuracy': class_acc,
        'classification_report': report,
        'confusion_matrix': cm.tolist()
    }

def main():
    """Ana fonksiyon - NO LEAKAGE"""
    start_time = time.time()
    
    logging.info("=" * 60)
    logging.info("PHASE 3: NO DATA LEAKAGE TEST")
    logging.info("quality_score VE türevleri CIKARILDI")
    logging.info("=" * 60)
    
    # 1. Veri yükleme
    logging.info("\n1. ADIM: Temiz Veri Yukleme (NO LEAKAGE)")
    train_df = prepare_clean_dataset('data/complete_train_dataset.csv', max_samples=None)
    val_df = prepare_clean_dataset('data/complete_val_dataset.csv', max_samples=None)
    test_df = prepare_clean_dataset('data/complete_test_dataset.csv', max_samples=None)
    
    # Feature columns - LEAKAGE OLANLAR ÇIKARILDI
    exclude_cols = [
        'quality_label', 'quality_encoded', 'file_path', 'filename', 'date', 'lake_name', 'band_type',
        'quality_score',  # LEAKAGE!
        'quality_score_squared', 'quality_score_log', 'quality_score_sqrt',  # LEAKAGE türevleri!
    ]
    
    feature_cols = []
    for c in train_df.columns:
        if c not in exclude_cols and 'quality' not in c.lower():  # quality içeren HİÇBİR ŞEY ALMA
            if train_df[c].dtype == bool:
                train_df[c] = train_df[c].astype(int)
                val_df[c] = val_df[c].astype(int)
                test_df[c] = test_df[c].astype(int)
                feature_cols.append(c)
            elif pd.api.types.is_numeric_dtype(train_df[c]):
                feature_cols.append(c)
    
    logging.info(f"TEMIZ ozellik sayisi: {len(feature_cols)}")
    logging.info(f"Ozellikler: {feature_cols[:10]}...")
    
    X_train = train_df[feature_cols].values
    y_train = train_df['quality_encoded'].values
    
    X_val = val_df[feature_cols].values
    y_val = val_df['quality_encoded'].values
    
    X_test = test_df[feature_cols].values
    y_test = test_df['quality_encoded'].values
    
    logging.info(f"Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
    
    # 2. Feature scaling
    logging.info("\n2. ADIM: Feature Scaling")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    # 3. Modelleri eğit
    logging.info("\n3. ADIM: Modelleri Egitme (NO LEAKAGE)")
    models, val_results = train_models_no_leakage(X_train_scaled, y_train, X_val_scaled, y_val)
    
    # 4. Test set'inde değerlendir
    logging.info("\n4. ADIM: Test Set Degerlendirmesi")
    logging.info("=" * 60)
    
    test_results = {}
    for name, model in models.items():
        test_results[name] = evaluate_on_test(model, X_test_scaled, y_test, name)
    
    # En iyi model
    best_test_model = max(test_results.keys(), key=lambda x: test_results[x]['accuracy'])
    
    # 5. Sonuçları kaydet
    total_time = time.time() - start_time
    
    summary = {
        'phase': 'Phase 3: NO DATA LEAKAGE',
        'removed_features': [
            'quality_score (TARGET LEAKAGE!)',
            'quality_score_squared',
            'quality_score_log',
            'quality_score_sqrt'
        ],
        'clean_features': feature_cols,
        'dataset_info': {
            'train': len(train_df),
            'val': len(val_df),
            'test': len(test_df),
            'num_features': len(feature_cols),
            'leakage_removed': True
        },
        'training_time_seconds': total_time,
        'val_results': val_results,
        'test_results': test_results,
        'best_test_model': {
            'name': best_test_model,
            'accuracy': test_results[best_test_model]['accuracy'],
            'f1_score': test_results[best_test_model]['f1_score'],
            'class_accuracy': test_results[best_test_model]['class_accuracy']
        },
        'created_at': datetime.now().isoformat()
    }
    
    with open('data/phase3_no_leakage_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Model'i kaydet
    import pickle
    best_model = models[best_test_model]
    with open('models/phase3_no_leakage_best_model.pkl', 'wb') as f:
        pickle.dump(best_model, f)
    
    with open('models/phase3_no_leakage_scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    
    # Final rapor
    logging.info("\n" + "=" * 60)
    logging.info("PHASE 3 NO LEAKAGE TAMAMLANDI!")
    logging.info("=" * 60)
    logging.info(f"Toplam sure: {total_time:.1f} saniye ({total_time/60:.1f} dakika)")
    logging.info(f"\nEN IYI TEST MODEL: {best_test_model}")
    logging.info(f"  Test Accuracy: {test_results[best_test_model]['accuracy']:.4f} ({test_results[best_test_model]['accuracy']*100:.2f}%)")
    logging.info(f"  Test F1 Score: {test_results[best_test_model]['f1_score']:.4f}")
    logging.info(f"  Class Accuracy:")
    for cls, acc in test_results[best_test_model]['class_accuracy'].items():
        logging.info(f"    {cls}: {acc:.4f} ({acc*100:.1f}%)")
    logging.info(f"\nModel kaydedildi: models/phase3_no_leakage_best_model.pkl")
    logging.info("=" * 60)
    
    return models, val_results, test_results

if __name__ == "__main__":
    models, val_results, test_results = main()

