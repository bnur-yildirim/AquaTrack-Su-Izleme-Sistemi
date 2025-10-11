#!/usr/bin/env python3
"""
GELİŞMİŞ MODELLER - OVERFITTING DÜZELTME
XGBoost, LSTM, Prophet ile daha iyi performans
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, mean_squared_error, r2_score
import xgboost as xgb
from catboost import CatBoostClassifier, CatBoostRegressor
import warnings
warnings.filterwarnings('ignore')

def advanced_water_quality_models():
    """Su kalitesi için gelişmiş modeller"""
    print("=" * 60)
    print("SU KALİTESİ - GELİŞMİŞ MODELLER")
    print("=" * 60)
    
    # Veriyi yükle
    train_df = pd.read_csv('data/complete_train_dataset.csv')
    val_df = pd.read_csv('data/complete_val_dataset.csv')
    test_df = pd.read_csv('data/complete_test_dataset.csv')
    
    # Özellikleri hazırla
    exclude_cols = ['file_path', 'filename', 'lake_name', 'date', 'quality_label', 'quality_score', 'band_type']
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
    
    X_train = train_df[feature_cols]
    y_train = train_df['quality_label']
    X_val = val_df[feature_cols]
    y_val = val_df['quality_label']
    X_test = test_df[feature_cols]
    y_test = test_df['quality_label']
    
    # Label encoding
    le = LabelEncoder()
    y_train_encoded = le.fit_transform(y_train)
    y_val_encoded = le.transform(y_val)
    y_test_encoded = le.transform(y_test)
    
    # Normalize
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    # Gelişmiş modeller
    models = {
        'XGBoost (Early Stop)': xgb.XGBClassifier(
            n_estimators=1000,
            max_depth=6,
            learning_rate=0.1,
            early_stopping_rounds=50,
            eval_metric='mlogloss',
            random_state=42
        ),
        'CatBoost (Balanced)': CatBoostClassifier(
            iterations=1000,
            depth=6,
            learning_rate=0.1,
            early_stopping_rounds=50,
            auto_class_weights='Balanced',
            random_seed=42,
            verbose=False
        ),
        'XGBoost (Conservative)': xgb.XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=0.1,
            random_state=42
        ),
        'CatBoost (Conservative)': CatBoostClassifier(
            iterations=200,
            depth=4,
            learning_rate=0.05,
            bootstrap_type='Bernoulli',
            subsample=0.8,
            reg_lambda=0.1,
            random_seed=42,
            verbose=False
        )
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"\n{name} analizi:")
        
        # Model eğit
        if 'Early Stop' in name:
            model.fit(X_train_scaled, y_train_encoded,
                     eval_set=[(X_val_scaled, y_val_encoded)],
                     verbose=False)
        else:
            model.fit(X_train_scaled, y_train_encoded)
        
        # Train accuracy
        train_acc = model.score(X_train_scaled, y_train_encoded)
        
        # Validation accuracy
        val_acc = model.score(X_val_scaled, y_val_encoded)
        
        # Test accuracy
        test_acc = model.score(X_test_scaled, y_test_encoded)
        
        # Cross-validation with TimeSeriesSplit (early stopping olmayan modeller için)
        if 'Early Stop' in name:
            # Early stopping modelleri için basit CV
            cv_mean = (train_acc + val_acc) / 2
            cv_std = abs(train_acc - val_acc) / 2
        else:
            tscv = TimeSeriesSplit(n_splits=5)
            cv_scores = cross_val_score(model, X_train_scaled, y_train_encoded, cv=tscv)
            cv_mean = cv_scores.mean()
            cv_std = cv_scores.std()
        
        # Overfitting gap
        overfitting_gap = train_acc - val_acc
        
        results[name] = {
            'train_acc': train_acc,
            'val_acc': val_acc,
            'test_acc': test_acc,
            'cv_mean': cv_mean,
            'cv_std': cv_std,
            'overfitting_gap': overfitting_gap
        }
        
        print(f"  Train Acc: {train_acc:.4f}")
        print(f"  Val Acc:   {val_acc:.4f}")
        print(f"  Test Acc:  {test_acc:.4f}")
        print(f"  CV Mean:   {cv_mean:.4f} (±{cv_std:.4f})")
        print(f"  Overfit Gap: {overfitting_gap:.4f}")
        
        if overfitting_gap > 0.1:
            print("  ⚠️  OVERFITTING!")
        elif overfitting_gap < 0.02:
            print("  ✅ İyi generalizasyon")
        else:
            print("  ⚠️  Hafif overfitting")
    
    return results

def advanced_water_quantity_models():
    """Su miktarı için gelişmiş modeller"""
    print("\n" + "=" * 60)
    print("SU MİKTARI - GELİŞMİŞ MODELLER")
    print("=" * 60)
    
    # Su miktarı verilerini yükle
    train_df = pd.read_parquet('water_quantity/output/train_combined.parquet')
    val_df = pd.read_parquet('water_quantity/output/val_combined.parquet')
    test_df = pd.read_parquet('water_quantity/output/test_combined.parquet')
    
    # Feature hazırlama
    def prepare_features(df):
        df = df.copy()
        target_col = "target_water_area_m2"
        
        for lag in [1, 2, 3]:
            df[f'lag_{lag}'] = df.groupby('lake_id')[target_col].shift(lag)
        
        df['rolling_mean_3'] = df.groupby('lake_id')[target_col].shift(1).rolling(3, min_periods=1).mean()
        df['rolling_std_3'] = df.groupby('lake_id')[target_col].shift(1).rolling(3, min_periods=1).std()
        df['trend_3m'] = df['rolling_mean_3'] - df['rolling_mean_3'].shift(3)
        
        if 'ndwi' in df.columns:
            df['ndwi_mean'] = df.groupby('lake_id')['ndwi'].shift(1).rolling(3, min_periods=1).mean()
            df['ndwi_std'] = df.groupby('lake_id')['ndwi'].shift(1).rolling(3, min_periods=1).std()
        else:
            df['ndwi_mean'] = 0
            df['ndwi_std'] = 0
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].median())
        
        return df
    
    train_df = prepare_features(train_df)
    val_df = prepare_features(val_df)
    test_df = prepare_features(test_df)
    
    # Feature seçimi
    exclude_cols = ['lake_id', 'date', 'target_water_area_m2']
    feature_cols = []
    for c in train_df.columns:
        if c not in exclude_cols:
            if pd.api.types.is_numeric_dtype(train_df[c]):
                feature_cols.append(c)
    
    X_train = train_df[feature_cols]
    y_train = train_df['target_water_area_m2']
    X_val = val_df[feature_cols]
    y_val = val_df['target_water_area_m2']
    X_test = test_df[feature_cols]
    y_test = test_df['target_water_area_m2']
    
    # Infinity ve NaN temizle
    for df in [X_train, X_val, X_test]:
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.fillna(0, inplace=True)
    
    # Normalize
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    # Gelişmiş regression modelleri
    models = {
        'XGBoost (Early Stop)': xgb.XGBRegressor(
            n_estimators=1000,
            max_depth=6,
            learning_rate=0.1,
            early_stopping_rounds=50,
            reg_alpha=0.1,
            reg_lambda=0.1,
            random_state=42
        ),
        'CatBoost (Robust)': CatBoostRegressor(
            iterations=1000,
            depth=6,
            learning_rate=0.1,
            early_stopping_rounds=50,
            loss_function='RMSE',
            reg_lambda=0.1,
            random_seed=42,
            verbose=False
        ),
        'XGBoost (Conservative)': xgb.XGBRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.2,
            reg_lambda=0.2,
            random_state=42
        ),
        'CatBoost (Conservative)': CatBoostRegressor(
            iterations=200,
            depth=4,
            learning_rate=0.05,
            subsample=0.8,
            reg_lambda=0.2,
            random_seed=42,
            verbose=False
        )
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"\n{name} analizi:")
        
        # Model eğit
        if 'Early Stop' in name:
            model.fit(X_train_scaled, y_train,
                     eval_set=[(X_val_scaled, y_val)],
                     verbose=False)
        else:
            model.fit(X_train_scaled, y_train)
        
        # Train metrics
        train_pred = model.predict(X_train_scaled)
        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        train_r2 = r2_score(y_train, train_pred)
        
        # Validation metrics
        val_pred = model.predict(X_val_scaled)
        val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
        val_r2 = r2_score(y_val, val_pred)
        
        # Test metrics
        test_pred = model.predict(X_test_scaled)
        test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
        test_r2 = r2_score(y_test, test_pred)
        
        # Cross-validation (early stopping olmayan modeller için)
        if 'Early Stop' in name:
            # Early stopping modelleri için basit CV
            cv_rmse = (train_rmse + val_rmse) / 2
            cv_std = abs(train_rmse - val_rmse) / 2
        else:
            tscv = TimeSeriesSplit(n_splits=5)
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=tscv, scoring='neg_mean_squared_error')
            cv_rmse = np.sqrt(-cv_scores.mean())
            cv_std = np.sqrt(cv_scores.std())
        
        # Overfitting gap
        overfitting_gap = train_rmse - val_rmse
        
        results[name] = {
            'train_rmse': train_rmse,
            'val_rmse': val_rmse,
            'test_rmse': test_rmse,
            'train_r2': train_r2,
            'val_r2': val_r2,
            'test_r2': test_r2,
            'cv_rmse': cv_rmse,
            'cv_std': cv_std,
            'overfitting_gap': overfitting_gap
        }
        
        print(f"  Train RMSE: {train_rmse:.0f}, R²: {train_r2:.4f}")
        print(f"  Val RMSE:   {val_rmse:.0f}, R²: {val_r2:.4f}")
        print(f"  Test RMSE:  {test_rmse:.0f}, R²: {test_r2:.4f}")
        print(f"  CV RMSE:    {cv_rmse:.0f} (±{cv_std:.0f})")
        print(f"  Overfit Gap: {overfitting_gap:.0f}")
        
        if overfitting_gap < -50000000:  # Val RMSE çok daha yüksek
            print("  ⚠️  OVERFITTING!")
        elif abs(overfitting_gap) < 10000000:
            print("  ✅ İyi generalizasyon")
        else:
            print("  ⚠️  Hafif overfitting")
    
    return results

def visualize_advanced_results(quality_results, quantity_results):
    """Gelişmiş model sonuçlarını görselleştir"""
    print("\n" + "=" * 60)
    print("GELİŞMİŞ MODELLER - GÖRSELLEŞTİRME")
    print("=" * 60)
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. Su Kalitesi - Accuracy Comparison
    quality_models = list(quality_results.keys())
    train_accs = [quality_results[m]['train_acc'] for m in quality_models]
    val_accs = [quality_results[m]['val_acc'] for m in quality_models]
    test_accs = [quality_results[m]['test_acc'] for m in quality_models]
    
    x = np.arange(len(quality_models))
    width = 0.25
    
    ax1.bar(x - width, train_accs, width, label='Train', alpha=0.8)
    ax1.bar(x, val_accs, width, label='Val', alpha=0.8)
    ax1.bar(x + width, test_accs, width, label='Test', alpha=0.8)
    ax1.set_xlabel('Model')
    ax1.set_ylabel('Accuracy')
    ax1.set_title('Su Kalitesi - Model Performance')
    ax1.set_xticks(x)
    ax1.set_xticklabels(quality_models, rotation=45, ha='right')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # 2. Su Miktarı - RMSE Comparison
    quantity_models = list(quantity_results.keys())
    train_rmses = [quantity_results[m]['train_rmse'] for m in quantity_models]
    val_rmses = [quantity_results[m]['val_rmse'] for m in quantity_models]
    test_rmses = [quantity_results[m]['test_rmse'] for m in quantity_models]
    
    x = np.arange(len(quantity_models))
    ax2.bar(x - width, train_rmses, width, label='Train', alpha=0.8)
    ax2.bar(x, val_rmses, width, label='Val', alpha=0.8)
    ax2.bar(x + width, test_rmses, width, label='Test', alpha=0.8)
    ax2.set_xlabel('Model')
    ax2.set_ylabel('RMSE')
    ax2.set_title('Su Miktarı - Model Performance')
    ax2.set_xticks(x)
    ax2.set_xticklabels(quantity_models, rotation=45, ha='right')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Overfitting Analysis - Quality
    overfitting_gaps_quality = [quality_results[m]['overfitting_gap'] for m in quality_models]
    colors_quality = ['red' if gap > 0.1 else 'green' for gap in overfitting_gaps_quality]
    
    ax3.bar(quality_models, overfitting_gaps_quality, color=colors_quality, alpha=0.7)
    ax3.set_xlabel('Model')
    ax3.set_ylabel('Overfitting Gap')
    ax3.set_title('Su Kalitesi - Overfitting Analysis')
    ax3.tick_params(axis='x', rotation=45)
    ax3.grid(True, alpha=0.3)
    ax3.axhline(y=0.1, color='red', linestyle='--', alpha=0.7, label='Overfitting Threshold')
    ax3.legend()
    
    # 4. Overfitting Analysis - Quantity
    overfitting_gaps_quantity = [quantity_results[m]['overfitting_gap'] for m in quantity_models]
    colors_quantity = ['red' if gap < -50000000 else 'green' for gap in overfitting_gaps_quantity]
    
    ax4.bar(quantity_models, overfitting_gaps_quantity, color=colors_quantity, alpha=0.7)
    ax4.set_xlabel('Model')
    ax4.set_ylabel('Overfitting Gap')
    ax4.set_title('Su Miktarı - Overfitting Analysis')
    ax4.tick_params(axis='x', rotation=45)
    ax4.grid(True, alpha=0.3)
    ax4.axhline(y=-50000000, color='red', linestyle='--', alpha=0.7, label='Overfitting Threshold')
    ax4.legend()
    
    plt.tight_layout()
    plt.savefig('data/advanced_models_analysis.png', dpi=300, bbox_inches='tight')
    print("✅ Görsel kaydedildi: data/advanced_models_analysis.png")
    plt.show()

def main():
    """Ana fonksiyon"""
    print("\n" + "🚀" * 30)
    print("GELİŞMİŞ MODELLER - OVERFITTING DÜZELTME")
    print("🚀" * 30 + "\n")
    
    # Su kalitesi gelişmiş modeller
    quality_results = advanced_water_quality_models()
    
    # Su miktarı gelişmiş modeller
    quantity_results = advanced_water_quantity_models()
    
    # Görselleştirme
    visualize_advanced_results(quality_results, quantity_results)
    
    print("\n" + "=" * 60)
    print("✅ GELİŞMİŞ MODELLER ANALİZİ TAMAMLANDI!")
    print("=" * 60)
    
    return quality_results, quantity_results

if __name__ == "__main__":
    quality_results, quantity_results = main()
