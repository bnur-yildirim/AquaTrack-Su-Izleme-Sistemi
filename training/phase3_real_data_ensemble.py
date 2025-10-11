#!/usr/bin/env python3
"""
Phase 3: REAL DATA Ensemble Learning
SMOTE OLMADAN - Sadece gerçek verilerle test
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

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, StackingClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

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
        logging.FileHandler('data/phase3_real_data_training.log'),
        logging.StreamHandler()
    ]
)

class RealFeatureEngineering:
    """Gerçek veri için özellik mühendisliği"""
    
    @staticmethod
    def create_features(df):
        """Zengin özellik seti oluştur"""
        logging.info("Feature engineering baslatiliyor...")
        
        df = df.copy()
        
        # 1. Temel özellikler
        if 'quality_score' in df.columns:
            df['quality_score_squared'] = df['quality_score'] ** 2
            df['quality_score_log'] = np.log1p(df['quality_score'])
            df['quality_score_sqrt'] = np.sqrt(df['quality_score'])
        
        # 2. Su kalitesi parametreleri
        water_params = ['ndwi_mean', 'wri_mean', 'chl_a_mean', 'turbidity_mean']
        for param in water_params:
            if param in df.columns:
                df[f'{param}_log'] = np.log1p(df[param].clip(lower=0))
                df[f'{param}_sqrt'] = np.sqrt(df[param].clip(lower=0))
                df[f'{param}_squared'] = df[param] ** 2
        
        # 3. Ratio features
        if 'ndwi_mean' in df.columns and 'wri_mean' in df.columns:
            df['ndwi_wri_ratio'] = df['ndwi_mean'] / (df['wri_mean'] + 1e-5)
            df['ndwi_wri_product'] = df['ndwi_mean'] * df['wri_mean']
            df['ndwi_wri_diff'] = df['ndwi_mean'] - df['wri_mean']
        
        if 'chl_a_mean' in df.columns and 'turbidity_mean' in df.columns:
            df['chl_turb_ratio'] = df['chl_a_mean'] / (df['turbidity_mean'] + 1e-5)
            df['chl_turb_product'] = df['chl_a_mean'] * df['turbidity_mean']
            df['pollution_index'] = df['chl_a_mean'] + df['turbidity_mean']
        
        # 4. Göl features
        if 'lake_name' in df.columns:
            lake_encoder = LabelEncoder()
            df['lake_id'] = lake_encoder.fit_transform(df['lake_name'])
            
            for col in ['quality_score', 'ndwi_mean', 'chl_a_mean']:
                if col in df.columns:
                    df[f'{col}_lake_mean'] = df.groupby('lake_name')[col].transform('mean')
                    df[f'{col}_lake_std'] = df.groupby('lake_name')[col].transform('std')
                    df[f'{col}_deviation'] = df[col] - df[f'{col}_lake_mean']
        
        # 5. Dosya boyutu
        if 'file_size' in df.columns:
            df['file_size_log'] = np.log1p(df['file_size'])
        
        # NaN'ları doldur
        df = df.fillna(df.mean(numeric_only=True))
        df = df.fillna(0)
        
        feature_count = len([c for c in df.columns if c not in ['quality_label', 'quality_encoded', 'file_path', 'filename', 'date']])
        logging.info(f"Toplam {feature_count} ozellik olusturuldu")
        
        return df

def prepare_dataset(csv_file, max_samples=None):
    """Veri setini hazırla"""
    logging.info(f"Dataset yukleniyor: {csv_file}")
    
    df = pd.read_csv(csv_file)
    
    if max_samples:
        # Stratified sampling - her sınıftan orantılı al
        label_col = 'quality_label'
        if label_col in df.columns:
            df = df.groupby(label_col, group_keys=False).apply(
                lambda x: x.sample(n=min(len(x), int(max_samples * len(x) / len(df))), random_state=42)
            )
        else:
            df = df.sample(n=min(max_samples, len(df)), random_state=42)
    
    logging.info(f"Dataset boyutu: {len(df)}")
    
    # Label encoding
    label_mapping = {'good': 0, 'fair': 1, 'excellent': 2}
    df['quality_encoded'] = df['quality_label'].map(label_mapping)
    
    label_dist = df['quality_label'].value_counts()
    logging.info(f"Label dagilimi: {label_dist.to_dict()}")
    
    # Feature engineering
    df = RealFeatureEngineering.create_features(df)
    
    return df

def train_models_with_class_weights(X_train, y_train, X_val, y_val):
    """Gerçek veri ile modelleri eğit - MAKUL class weights"""
    logging.info("=" * 60)
    logging.info("MODELLER EĞİTİLİYOR (GERÇEK VERİ - SMOTE YOK)")
    logging.info("=" * 60)
    
    # Class weights hesapla - makul şekilde
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
    
    models['Random Forest'] = rf
    results['Random Forest'] = {'accuracy': rf_acc, 'f1_score': rf_f1}
    logging.info(f"   Random Forest - Acc: {rf_acc:.4f}, F1: {rf_f1:.4f}")
    
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
        # Sample weights
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
    
    # 5. Ensemble - Voting (XGBoost ve LightGBM hariç - uyumluluk için)
    logging.info("5. Voting Ensemble olusturuluyor...")
    voting_estimators = [(name, model) for name, model in models.items() 
                         if name not in ['XGBoost', 'LightGBM']]
    
    if len(voting_estimators) >= 2:
        voting_clf = VotingClassifier(
            estimators=voting_estimators,
            voting='soft',
            n_jobs=-1
        )
        voting_clf.fit(X_train, y_train)
        voting_pred = voting_clf.predict(X_val)
        voting_acc = accuracy_score(y_val, voting_pred)
        voting_f1 = f1_score(y_val, voting_pred, average='weighted')
        
        models['Voting Ensemble'] = voting_clf
        results['Voting Ensemble'] = {'accuracy': voting_acc, 'f1_score': voting_f1}
        logging.info(f"   Voting Ensemble - Acc: {voting_acc:.4f}, F1: {voting_f1:.4f}")
    
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
    logging.info(f"  Accuracy: {accuracy:.4f}")
    logging.info(f"  F1 Score: {f1:.4f}")
    logging.info(f"  Per-class Acc: {class_acc}")
    logging.info(f"\nConfusion Matrix:\n{cm}")
    
    return {
        'accuracy': accuracy,
        'f1_score': f1,
        'class_accuracy': class_acc,
        'classification_report': report,
        'confusion_matrix': cm.tolist()
    }

def main():
    """Ana fonksiyon - GERÇEK VERİ"""
    start_time = time.time()
    
    logging.info("=" * 60)
    logging.info("PHASE 3: REAL DATA ENSEMBLE (SMOTE YOK)")
    logging.info("=" * 60)
    
    # 1. Veri yükleme - TÜM VERİ
    logging.info("\n1. ADIM: Gercek Veri Yukleme")
    train_df = prepare_dataset('data/complete_train_dataset.csv', max_samples=None)  # TÜM VERİ
    val_df = prepare_dataset('data/complete_val_dataset.csv', max_samples=None)
    test_df = prepare_dataset('data/complete_test_dataset.csv', max_samples=None)
    
    # Feature columns
    exclude_cols = ['quality_label', 'quality_encoded', 'file_path', 'filename', 'date', 'lake_name', 'band_type']
    
    feature_cols = []
    for c in train_df.columns:
        if c not in exclude_cols:
            if train_df[c].dtype == bool:
                train_df[c] = train_df[c].astype(int)
                val_df[c] = val_df[c].astype(int)
                test_df[c] = test_df[c].astype(int)
                feature_cols.append(c)
            elif pd.api.types.is_numeric_dtype(train_df[c]):
                feature_cols.append(c)
    
    X_train = train_df[feature_cols].values
    y_train = train_df['quality_encoded'].values
    
    X_val = val_df[feature_cols].values
    y_val = val_df['quality_encoded'].values
    
    X_test = test_df[feature_cols].values
    y_test = test_df['quality_encoded'].values
    
    logging.info(f"Ozellik sayisi: {len(feature_cols)}")
    logging.info(f"Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
    
    # 2. Feature scaling
    logging.info("\n2. ADIM: Feature Scaling")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    # 3. Modelleri eğit - SMOTE YOK, gerçek veri
    logging.info("\n3. ADIM: Modelleri Egitme (GERCEK VERI)")
    models, val_results = train_models_with_class_weights(X_train_scaled, y_train, X_val_scaled, y_val)
    
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
        'phase': 'Phase 3: Real Data Ensemble (NO SMOTE)',
        'approach': 'Real data only with balanced class weights',
        'dataset_info': {
            'train': len(train_df),
            'val': len(val_df),
            'test': len(test_df),
            'num_features': len(feature_cols),
            'smote_used': False
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
    
    with open('data/phase3_real_data_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Model'i kaydet
    import pickle
    best_model = models[best_test_model]
    with open('models/phase3_real_data_best_model.pkl', 'wb') as f:
        pickle.dump(best_model, f)
    
    with open('models/phase3_real_data_scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    
    # Final rapor
    logging.info("\n" + "=" * 60)
    logging.info("PHASE 3 REAL DATA TAMAMLANDI!")
    logging.info("=" * 60)
    logging.info(f"Toplam sure: {total_time:.1f} saniye ({total_time/60:.1f} dakika)")
    logging.info(f"\nEN IYI TEST MODEL: {best_test_model}")
    logging.info(f"  Test Accuracy: {test_results[best_test_model]['accuracy']:.4f}")
    logging.info(f"  Test F1 Score: {test_results[best_test_model]['f1_score']:.4f}")
    logging.info(f"  Class Accuracy:")
    for cls, acc in test_results[best_test_model]['class_accuracy'].items():
        logging.info(f"    {cls}: {acc:.4f}")
    logging.info(f"\nModel kaydedildi: models/phase3_real_data_best_model.pkl")
    logging.info("=" * 60)
    
    return models, val_results, test_results

if __name__ == "__main__":
    models, val_results, test_results = main()

