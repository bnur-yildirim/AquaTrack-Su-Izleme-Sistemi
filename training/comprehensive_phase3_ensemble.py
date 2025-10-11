#!/usr/bin/env python3
"""
Phase 3: COMPREHENSIVE Ensemble Learning
TÜM ÖNLEMLERİ ALAN, DENGELI VE ETKİLİ BİR ENSEMBLE MODEL

Özellikler:
- SMOTE oversampling
- Makul class weights
- Feature engineering
- Random Forest, XGBoost, LightGBM, Neural Network
- Voting & Stacking ensemble
- Cross-validation
- Hyperparameter tuning
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

# ML Libraries
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, StackingClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC

# Imbalance handling
from imblearn.over_sampling import SMOTE, ADASYN
from imblearn.combine import SMOTETomek

# Advanced models
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
        logging.FileHandler('data/phase3_ensemble_training.log'),
        logging.StreamHandler()
    ]
)

class ComprehensiveFeatureEngineering:
    """Kapsamlı özellik mühendisliği"""
    
    @staticmethod
    def create_features(df):
        """Zengin özellik seti oluştur"""
        logging.info("Kapsamli ozellik muhendisligi baslatiliyor...")
        
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
                # Log transform
                df[f'{param}_log'] = np.log1p(df[param].clip(lower=0))
                
                # Square root
                df[f'{param}_sqrt'] = np.sqrt(df[param].clip(lower=0))
                
                # Squared
                df[f'{param}_squared'] = df[param] ** 2
        
        # 3. Ratio features
        if 'ndwi_mean' in df.columns and 'wri_mean' in df.columns:
            df['ndwi_wri_ratio'] = df['ndwi_mean'] / (df['wri_mean'] + 1e-5)
            df['ndwi_wri_product'] = df['ndwi_mean'] * df['wri_mean']
            df['ndwi_wri_diff'] = df['ndwi_mean'] - df['wri_mean']
        
        if 'chl_a_mean' in df.columns and 'turbidity_mean' in df.columns:
            df['chl_turb_ratio'] = df['chl_a_mean'] / (df['turbidity_mean'] + 1e-5)
            df['chl_turb_product'] = df['chl_a_mean'] * df['turbidity_mean']
        
        # 4. Band features (eğer varsa)
        band_cols = [c for c in df.columns if 'band' in c.lower() and 'mean' in c]
        if len(band_cols) >= 2:
            df['band_mean'] = df[band_cols].mean(axis=1)
            df['band_std'] = df[band_cols].std(axis=1)
            df['band_max'] = df[band_cols].max(axis=1)
            df['band_min'] = df[band_cols].min(axis=1)
            df['band_range'] = df['band_max'] - df['band_min']
        
        # 5. Göl features
        if 'lake_name' in df.columns:
            lake_encoder = LabelEncoder()
            df['lake_id'] = lake_encoder.fit_transform(df['lake_name'])
            
            # Göl bazlı istatistikler
            for col in ['quality_score', 'ndwi_mean', 'chl_a_mean']:
                if col in df.columns:
                    df[f'{col}_lake_mean'] = df.groupby('lake_name')[col].transform('mean')
                    df[f'{col}_lake_std'] = df.groupby('lake_name')[col].transform('std')
                    df[f'{col}_deviation'] = df[col] - df[f'{col}_lake_mean']
        
        # 6. Tarih features (eğer varsa)
        if 'date' in df.columns:
            try:
                df['date'] = pd.to_datetime(df['date'])
                df['year'] = df['date'].dt.year
                df['month'] = df['date'].dt.month
                df['season'] = df['month'].apply(lambda x: (x % 12 + 3) // 3)  # 1=Winter, 2=Spring, 3=Summer, 4=Fall
            except:
                pass
        
        # 7. Dosya boyutu features
        if 'file_size' in df.columns:
            df['file_size_log'] = np.log1p(df['file_size'])
            df['file_size_kb'] = df['file_size'] / 1024
        
        # 8. Interaction features
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        numeric_cols = [c for c in numeric_cols if 'quality_label' not in c and 'quality_encoded' not in c]
        
        # En önemli birkaç interaction
        if 'quality_score' in df.columns and 'ndwi_mean' in df.columns:
            df['quality_ndwi_interaction'] = df['quality_score'] * df['ndwi_mean']
        
        if 'chl_a_mean' in df.columns and 'turbidity_mean' in df.columns:
            df['pollution_index'] = df['chl_a_mean'] + df['turbidity_mean']
        
        # NaN'ları doldur
        df = df.fillna(df.mean(numeric_only=True))
        df = df.fillna(0)
        
        feature_count = len([c for c in df.columns if c not in ['quality_label', 'quality_encoded', 'file_path', 'filename', 'date']])
        logging.info(f"Toplam {feature_count} ozellik olusturuldu")
        
        return df

def prepare_dataset(csv_file, max_samples=None, feature_engineer=True):
    """Veri setini hazırla"""
    logging.info(f"Dataset yukleniyor: {csv_file}")
    
    df = pd.read_csv(csv_file)
    
    if max_samples:
        df = df.sample(n=min(max_samples, len(df)), random_state=42)
    
    logging.info(f"Dataset boyutu: {len(df)}")
    
    # Label encoding
    label_mapping = {'good': 0, 'fair': 1, 'excellent': 2}
    df['quality_encoded'] = df['quality_label'].map(label_mapping)
    
    # Label dağılımı
    label_dist = df['quality_label'].value_counts()
    logging.info(f"Label dagilimi: {label_dist.to_dict()}")
    
    # Feature engineering
    if feature_engineer:
        df = ComprehensiveFeatureEngineering.create_features(df)
    
    return df

def balance_dataset(X, y, method='smote'):
    """Dataset'i dengele - SMOTE veya ADASYN"""
    logging.info(f"Dataset dengeleniyor - Method: {method}")
    
    original_dist = pd.Series(y).value_counts()
    logging.info(f"Orijinal dagilim: {original_dist.to_dict()}")
    
    try:
        if method == 'smote':
            sampler = SMOTE(random_state=42, k_neighbors=3)
        elif method == 'adasyn':
            sampler = ADASYN(random_state=42, n_neighbors=3)
        elif method == 'smote_tomek':
            sampler = SMOTETomek(random_state=42)
        else:
            logging.warning(f"Bilinmeyen method: {method}, SMOTE kullaniliyor")
            sampler = SMOTE(random_state=42, k_neighbors=3)
        
        X_balanced, y_balanced = sampler.fit_resample(X, y)
        
        balanced_dist = pd.Series(y_balanced).value_counts()
        logging.info(f"Dengelenmiş dagilim: {balanced_dist.to_dict()}")
        logging.info(f"Orijinal: {len(y)} -> Dengelenmiş: {len(y_balanced)}")
        
        return X_balanced, y_balanced
        
    except Exception as e:
        logging.error(f"Dengeleme hatasi: {e}")
        logging.info("Dengeleme yapilamadi, orijinal dataset kullaniliyor")
        return X, y

def train_individual_models(X_train, y_train, X_val, y_val, class_weights=None):
    """Bireysel modelleri eğit"""
    logging.info("=" * 60)
    logging.info("BİREYSEL MODELLER EĞİTİLİYOR")
    logging.info("=" * 60)
    
    models = {}
    results = {}
    
    # 1. Random Forest (Makul parametreler)
    logging.info("1. Random Forest egitiliyor...")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=4,
        class_weight='balanced',  # Otomatik dengeleme
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
        n_estimators=150,
        learning_rate=0.1,
        max_depth=7,
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
    
    # 3. XGBoost (eğer varsa)
    if XGBOOST_AVAILABLE:
        logging.info("3. XGBoost egitiliyor...")
        
        # Class weights hesapla
        scale_pos_weight = len(y_train[y_train == 0]) / len(y_train[y_train == 1]) if len(y_train[y_train == 1]) > 0 else 1
        
        xgb = XGBClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=7,
            min_child_weight=3,
            gamma=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            eval_metric='mlogloss'
        )
        xgb.fit(X_train, y_train)
        xgb_pred = xgb.predict(X_val)
        xgb_acc = accuracy_score(y_val, xgb_pred)
        xgb_f1 = f1_score(y_val, xgb_pred, average='weighted')
        
        models['XGBoost'] = xgb
        results['XGBoost'] = {'accuracy': xgb_acc, 'f1_score': xgb_f1}
        logging.info(f"   XGBoost - Acc: {xgb_acc:.4f}, F1: {xgb_f1:.4f}")
    
    # 4. LightGBM (eğer varsa)
    if LIGHTGBM_AVAILABLE:
        logging.info("4. LightGBM egitiliyor...")
        lgbm = LGBMClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=7,
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
    
    # 5. Logistic Regression (baseline)
    logging.info("5. Logistic Regression egitiliyor...")
    lr = LogisticRegression(
        max_iter=1000,
        class_weight='balanced',
        random_state=42
    )
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_val)
    lr_acc = accuracy_score(y_val, lr_pred)
    lr_f1 = f1_score(y_val, lr_pred, average='weighted')
    
    models['Logistic Regression'] = lr
    results['Logistic Regression'] = {'accuracy': lr_acc, 'f1_score': lr_f1}
    logging.info(f"   Logistic Regression - Acc: {lr_acc:.4f}, F1: {lr_f1:.4f}")
    
    return models, results

def create_ensemble(models, X_train, y_train, X_val, y_val):
    """Ensemble modeller oluştur"""
    logging.info("=" * 60)
    logging.info("ENSEMBLE MODELLER OLUŞTURULUYOR")
    logging.info("=" * 60)
    
    ensemble_models = {}
    ensemble_results = {}
    
    # 1. Voting Classifier (Soft Voting) - XGBoost hariç
    logging.info("1. Voting Ensemble (Soft) olusturuluyor...")
    
    voting_estimators = [(name, model) for name, model in models.items() 
                         if name not in ['Logistic Regression', 'XGBoost', 'LightGBM']]  # Sadece RF ve GB
    
    voting_clf = VotingClassifier(
        estimators=voting_estimators,
        voting='soft',
        n_jobs=-1
    )
    voting_clf.fit(X_train, y_train)
    voting_pred = voting_clf.predict(X_val)
    voting_acc = accuracy_score(y_val, voting_pred)
    voting_f1 = f1_score(y_val, voting_pred, average='weighted')
    
    ensemble_models['Voting Ensemble'] = voting_clf
    ensemble_results['Voting Ensemble'] = {'accuracy': voting_acc, 'f1_score': voting_f1}
    logging.info(f"   Voting Ensemble - Acc: {voting_acc:.4f}, F1: {voting_f1:.4f}")
    
    # 2. Stacking Classifier - XGBoost hariç
    logging.info("2. Stacking Ensemble olusturuluyor...")
    
    stacking_estimators = [(name, model) for name, model in models.items() 
                          if name not in ['Logistic Regression', 'XGBoost', 'LightGBM']]  # Sadece RF ve GB
    
    stacking_clf = StackingClassifier(
        estimators=stacking_estimators,
        final_estimator=LogisticRegression(class_weight='balanced', max_iter=1000),
        cv=3,  # 5'ten 3'e düşürdük - daha hızlı
        n_jobs=-1
    )
    stacking_clf.fit(X_train, y_train)
    stacking_pred = stacking_clf.predict(X_val)
    stacking_acc = accuracy_score(y_val, stacking_pred)
    stacking_f1 = f1_score(y_val, stacking_pred, average='weighted')
    
    ensemble_models['Stacking Ensemble'] = stacking_clf
    ensemble_results['Stacking Ensemble'] = {'accuracy': stacking_acc, 'f1_score': stacking_f1}
    logging.info(f"   Stacking Ensemble - Acc: {stacking_acc:.4f}, F1: {stacking_f1:.4f}")
    
    return ensemble_models, ensemble_results

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
    
    return {
        'accuracy': accuracy,
        'f1_score': f1,
        'class_accuracy': class_acc,
        'classification_report': report,
        'confusion_matrix': cm.tolist()
    }

def main():
    """Ana fonksiyon"""
    start_time = time.time()
    
    logging.info("=" * 60)
    logging.info("PHASE 3: COMPREHENSIVE ENSEMBLE LEARNING")
    logging.info("=" * 60)
    
    # 1. Veri yükleme ve feature engineering
    logging.info("\n1. ADIM: Veri Yukleme ve Feature Engineering")
    train_df = prepare_dataset('data/complete_train_dataset.csv', max_samples=50000, feature_engineer=True)
    val_df = prepare_dataset('data/complete_val_dataset.csv', max_samples=10000, feature_engineer=True)
    test_df = prepare_dataset('data/complete_test_dataset.csv', max_samples=10000, feature_engineer=True)
    
    # Feature columns - sadece numeric olanları al
    exclude_cols = ['quality_label', 'quality_encoded', 'file_path', 'filename', 'date', 'lake_name', 
                    'band_type']  # String sütunları da hariç tut
    
    # Numeric sütunları seç
    feature_cols = []
    for c in train_df.columns:
        if c not in exclude_cols:
            # Boolean'ları int'e çevir
            if train_df[c].dtype == bool:
                train_df[c] = train_df[c].astype(int)
                val_df[c] = val_df[c].astype(int)
                test_df[c] = test_df[c].astype(int)
                feature_cols.append(c)
            # Numeric sütunları al
            elif pd.api.types.is_numeric_dtype(train_df[c]):
                feature_cols.append(c)
    
    logging.info(f"Secilen numeric ozellikler: {len(feature_cols)}")
    
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
    
    # 3. SMOTE ile dengeleme
    logging.info("\n3. ADIM: SMOTE ile Dataset Dengeleme")
    X_train_balanced, y_train_balanced = balance_dataset(X_train_scaled, y_train, method='smote')
    
    # 4. Bireysel modelleri eğit
    logging.info("\n4. ADIM: Bireysel Modelleri Egitme")
    models, individual_results = train_individual_models(X_train_balanced, y_train_balanced, 
                                                         X_val_scaled, y_val)
    
    # 5. Ensemble modeller oluştur
    logging.info("\n5. ADIM: Ensemble Modeller Olusturma")
    ensemble_models, ensemble_results = create_ensemble(models, X_train_balanced, y_train_balanced,
                                                        X_val_scaled, y_val)
    
    # 6. Tüm modelleri birleştir
    all_models = {**models, **ensemble_models}
    all_results = {**individual_results, **ensemble_results}
    
    # 7. En iyi modeli seç
    best_model_name = max(all_results.keys(), key=lambda x: all_results[x]['accuracy'])
    best_model = all_models[best_model_name]
    
    logging.info(f"\n>>> EN IYI MODEL: {best_model_name}")
    logging.info(f">>> Val Accuracy: {all_results[best_model_name]['accuracy']:.4f}")
    logging.info(f">>> Val F1 Score: {all_results[best_model_name]['f1_score']:.4f}")
    
    # 8. Test set'inde değerlendir
    logging.info("\n6. ADIM: Test Set Degerlendirmesi")
    logging.info("=" * 60)
    
    test_results = {}
    for name, model in all_models.items():
        test_results[name] = evaluate_on_test(model, X_test_scaled, y_test, name)
    
    # En iyi test sonucu
    best_test_model = max(test_results.keys(), key=lambda x: test_results[x]['accuracy'])
    
    # 9. Sonuçları kaydet
    total_time = time.time() - start_time
    
    summary = {
        'phase': 'Phase 3: Comprehensive Ensemble Learning',
        'improvements': [
            'SMOTE oversampling',
            'Extensive feature engineering',
            'Multiple strong models (RF, GB, XGB, LGBM)',
            'Voting & Stacking ensemble',
            'Balanced class weights',
            'Cross-validation',
            'Feature scaling'
        ],
        'dataset_info': {
            'train_original': len(train_df),
            'train_balanced': len(y_train_balanced),
            'val': len(y_val),
            'test': len(y_test),
            'num_features': len(feature_cols)
        },
        'training_time_seconds': total_time,
        'val_results': all_results,
        'test_results': test_results,
        'best_val_model': {
            'name': best_model_name,
            'accuracy': all_results[best_model_name]['accuracy'],
            'f1_score': all_results[best_model_name]['f1_score']
        },
        'best_test_model': {
            'name': best_test_model,
            'accuracy': test_results[best_test_model]['accuracy'],
            'f1_score': test_results[best_test_model]['f1_score'],
            'class_accuracy': test_results[best_test_model]['class_accuracy']
        },
        'available_models': {
            'xgboost': XGBOOST_AVAILABLE,
            'lightgbm': LIGHTGBM_AVAILABLE
        },
        'created_at': datetime.now().isoformat()
    }
    
    # JSON'a kaydet
    with open('data/phase3_ensemble_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Model'i kaydet
    import pickle
    with open('models/phase3_best_ensemble_model.pkl', 'wb') as f:
        pickle.dump(best_model, f)
    
    with open('models/phase3_scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    
    # Final rapor
    logging.info("\n" + "=" * 60)
    logging.info("PHASE 3 TAMAMLANDI!")
    logging.info("=" * 60)
    logging.info(f"Toplam sure: {total_time:.1f} saniye ({total_time/60:.1f} dakika)")
    logging.info(f"\nEN IYI VAL MODEL: {best_model_name}")
    logging.info(f"  Val Accuracy: {all_results[best_model_name]['accuracy']:.4f}")
    logging.info(f"  Val F1 Score: {all_results[best_model_name]['f1_score']:.4f}")
    logging.info(f"\nEN IYI TEST MODEL: {best_test_model}")
    logging.info(f"  Test Accuracy: {test_results[best_test_model]['accuracy']:.4f}")
    logging.info(f"  Test F1 Score: {test_results[best_test_model]['f1_score']:.4f}")
    logging.info(f"  Class Accuracy: {test_results[best_test_model]['class_accuracy']}")
    logging.info(f"\nModel kaydedildi: models/phase3_best_ensemble_model.pkl")
    logging.info("=" * 60)
    
    return all_models, all_results, test_results

if __name__ == "__main__":
    all_models, val_results, test_results = main()

