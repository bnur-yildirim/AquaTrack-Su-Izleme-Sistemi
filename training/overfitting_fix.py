#!/usr/bin/env python3
"""
OVERFITTING DÜZELTME - SU MİKTARI
Güçlü regularization ve robust modeller
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
import xgboost as xgb
from catboost import CatBoostRegressor
import warnings
warnings.filterwarnings('ignore')

def fix_water_quantity_overfitting():
    """Su miktarı overfitting düzeltme"""
    print("=" * 60)
    print("SU MİKTARI - OVERFITTING DÜZELTME")
    print("=" * 60)
    
    # Veriyi yükle
    train_df = pd.read_parquet('water_quantity/output/train_combined.parquet')
    val_df = pd.read_parquet('water_quantity/output/val_combined.parquet')
    test_df = pd.read_parquet('water_quantity/output/test_combined.parquet')
    
    # Feature hazırlama
    def prepare_features(df):
        df = df.copy()
        target_col = "target_water_area_m2"
        
        # Lag features
        for lag in [1, 2, 3]:
            df[f'lag_{lag}'] = df.groupby('lake_id')[target_col].shift(lag)
        
        # Rolling features
        df['rolling_mean_3'] = df.groupby('lake_id')[target_col].shift(1).rolling(3, min_periods=1).mean()
        df['rolling_std_3'] = df.groupby('lake_id')[target_col].shift(1).rolling(3, min_periods=1).std()
        df['trend_3m'] = df['rolling_mean_3'] - df['rolling_mean_3'].shift(3)
        
        # NDWI features
        if 'ndwi' in df.columns:
            df['ndwi_mean'] = df.groupby('lake_id')['ndwi'].shift(1).rolling(3, min_periods=1).mean()
            df['ndwi_std'] = df.groupby('lake_id')['ndwi'].shift(1).rolling(3, min_periods=1).std()
        else:
            df['ndwi_mean'] = 0
            df['ndwi_std'] = 0
        
        # Eksik değerleri doldur
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
    
    print(f"Features: {len(feature_cols)}")
    print(f"Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
    
    # Farklı scaler'lar dene
    scalers = {
        'Standard': StandardScaler(),
        'Robust': RobustScaler()
    }
    
    # Overfitting düzeltme modelleri
    models = {
        # Linear models with strong regularization
        'Ridge (α=10)': Ridge(alpha=10.0, random_state=42),
        'Ridge (α=100)': Ridge(alpha=100.0, random_state=42),
        'Lasso (α=1)': Lasso(alpha=1.0, random_state=42, max_iter=2000),
        'Lasso (α=10)': Lasso(alpha=10.0, random_state=42, max_iter=2000),
        'ElasticNet (α=1)': ElasticNet(alpha=1.0, l1_ratio=0.5, random_state=42, max_iter=2000),
        
        # Tree models with strong regularization
        'RF (Conservative)': RandomForestRegressor(
            n_estimators=50, max_depth=4, min_samples_split=20,
            min_samples_leaf=10, max_features='sqrt', random_state=42
        ),
        'GB (Conservative)': GradientBoostingRegressor(
            n_estimators=50, max_depth=4, learning_rate=0.05,
            min_samples_split=20, min_samples_leaf=10, subsample=0.8, random_state=42
        ),
        
        # XGBoost with strong regularization
        'XGBoost (Heavy Reg)': xgb.XGBRegressor(
            n_estimators=100, max_depth=3, learning_rate=0.05,
            subsample=0.7, colsample_bytree=0.7,
            reg_alpha=1.0, reg_lambda=1.0, random_state=42
        ),
        
        # CatBoost with strong regularization
        'CatBoost (Heavy Reg)': CatBoostRegressor(
            iterations=100, depth=3, learning_rate=0.05,
            subsample=0.7, reg_lambda=1.0, random_seed=42, verbose=False
        )
    }
    
    results = {}
    
    for scaler_name, scaler in scalers.items():
        print(f"\n{scaler_name} Scaler ile:")
        print("-" * 40)
        
        # Scale data
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)
        X_test_scaled = scaler.transform(X_test)
        
        for name, model in models.items():
            print(f"\n{name}:")
            
            # Model eğit
            model.fit(X_train_scaled, y_train)
            
            # Train metrics
            train_pred = model.predict(X_train_scaled)
            train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
            train_r2 = r2_score(y_train, train_pred)
            train_mae = mean_absolute_error(y_train, train_pred)
            
            # Validation metrics
            val_pred = model.predict(X_val_scaled)
            val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
            val_r2 = r2_score(y_val, val_pred)
            val_mae = mean_absolute_error(y_val, val_pred)
            
            # Test metrics
            test_pred = model.predict(X_test_scaled)
            test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
            test_r2 = r2_score(y_test, test_pred)
            test_mae = mean_absolute_error(y_test, test_pred)
            
            # Overfitting gap
            overfitting_gap = train_rmse - val_rmse
            
            # Model stability (coefficient of variation)
            if hasattr(model, 'feature_importances_'):
                feature_std = np.std(model.feature_importances_)
                feature_mean = np.mean(model.feature_importances_)
                stability = feature_mean / (feature_std + 1e-8)
            else:
                stability = 0
            
            results[f"{scaler_name}_{name}"] = {
                'scaler': scaler_name,
                'model': name,
                'train_rmse': train_rmse,
                'val_rmse': val_rmse,
                'test_rmse': test_rmse,
                'train_r2': train_r2,
                'val_r2': val_r2,
                'test_r2': test_r2,
                'train_mae': train_mae,
                'val_mae': val_mae,
                'test_mae': test_mae,
                'overfitting_gap': overfitting_gap,
                'stability': stability
            }
            
            print(f"  Train: RMSE={train_rmse:.0f}, R²={train_r2:.4f}, MAE={train_mae:.0f}")
            print(f"  Val:   RMSE={val_rmse:.0f}, R²={val_r2:.4f}, MAE={val_mae:.0f}")
            print(f"  Test:  RMSE={test_rmse:.0f}, R²={test_r2:.4f}, MAE={test_mae:.0f}")
            print(f"  Overfit Gap: {overfitting_gap:.0f}")
            print(f"  Stability: {stability:.2f}")
            
            # Overfitting assessment
            if abs(overfitting_gap) < 5000000:  # 5M m²
                print("  ✅ İyi generalizasyon")
            elif overfitting_gap < -20000000:  # Val RMSE çok yüksek
                print("  ❌ Overfitting")
            else:
                print("  ⚠️  Hafif overfitting")
    
    return results

def visualize_overfitting_fix(results):
    """Overfitting düzeltme sonuçlarını görselleştir"""
    print("\n" + "=" * 60)
    print("OVERFITTING DÜZELTME - GÖRSELLEŞTİRME")
    print("=" * 60)
    
    # DataFrame oluştur
    df_results = pd.DataFrame(results).T
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. RMSE Comparison
    models = df_results['model'].unique()
    scalers = df_results['scaler'].unique()
    
    x = np.arange(len(models))
    width = 0.35
    
    for i, scaler in enumerate(scalers):
        scaler_data = df_results[df_results['scaler'] == scaler]
        val_rmses = [scaler_data[scaler_data['model'] == m]['val_rmse'].iloc[0] for m in models]
        ax1.bar(x + i*width, val_rmses, width, label=f'{scaler} Scaler', alpha=0.8)
    
    ax1.set_xlabel('Model')
    ax1.set_ylabel('Validation RMSE')
    ax1.set_title('Validation RMSE by Model and Scaler')
    ax1.set_xticks(x + width/2)
    ax1.set_xticklabels(models, rotation=45, ha='right')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # 2. Overfitting Gap
    for i, scaler in enumerate(scalers):
        scaler_data = df_results[df_results['scaler'] == scaler]
        gaps = [scaler_data[scaler_data['model'] == m]['overfitting_gap'].iloc[0] for m in models]
        colors = ['green' if abs(gap) < 5000000 else 'orange' if abs(gap) < 20000000 else 'red' for gap in gaps]
        ax2.bar(x + i*width, gaps, width, label=f'{scaler} Scaler', alpha=0.8, color=colors)
    
    ax2.set_xlabel('Model')
    ax2.set_ylabel('Overfitting Gap (Train RMSE - Val RMSE)')
    ax2.set_title('Overfitting Gap by Model')
    ax2.set_xticks(x + width/2)
    ax2.set_xticklabels(models, rotation=45, ha='right')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    ax2.axhline(y=-20000000, color='red', linestyle='--', alpha=0.7, label='Overfitting Threshold')
    ax2.legend()
    
    # 3. R² Score
    for i, scaler in enumerate(scalers):
        scaler_data = df_results[df_results['scaler'] == scaler]
        r2_scores = [scaler_data[scaler_data['model'] == m]['val_r2'].iloc[0] for m in models]
        ax3.bar(x + i*width, r2_scores, width, label=f'{scaler} Scaler', alpha=0.8)
    
    ax3.set_xlabel('Model')
    ax3.set_ylabel('Validation R²')
    ax3.set_title('Validation R² by Model')
    ax3.set_xticks(x + width/2)
    ax3.set_xticklabels(models, rotation=45, ha='right')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # 4. Model Stability
    for i, scaler in enumerate(scalers):
        scaler_data = df_results[df_results['scaler'] == scaler]
        stabilities = [scaler_data[scaler_data['model'] == m]['stability'].iloc[0] for m in models]
        ax4.bar(x + i*width, stabilities, width, label=f'{scaler} Scaler', alpha=0.8)
    
    ax4.set_xlabel('Model')
    ax4.set_ylabel('Stability Score')
    ax4.set_title('Model Stability by Model')
    ax4.set_xticks(x + width/2)
    ax4.set_xticklabels(models, rotation=45, ha='right')
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('data/overfitting_fix_analysis.png', dpi=300, bbox_inches='tight')
    print("✅ Görsel kaydedildi: data/overfitting_fix_analysis.png")
    plt.show()

def recommend_best_model(results):
    """En iyi modeli öner"""
    print("\n" + "=" * 60)
    print("EN İYİ MODEL ÖNERİSİ")
    print("=" * 60)
    
    df_results = pd.DataFrame(results).T
    
    # Overfitting gap'i minimize eden modeller
    df_results['overfitting_abs'] = df_results['overfitting_gap'].abs()
    
    # Skor hesaplama (düşük RMSE, yüksek R², düşük overfitting)
    df_results['score'] = (
        df_results['val_r2'] * 0.4 +  # R² weight
        (1 - df_results['val_rmse'] / df_results['val_rmse'].max()) * 0.3 +  # RMSE weight
        (1 - df_results['overfitting_abs'] / df_results['overfitting_abs'].max()) * 0.3  # Overfitting weight
    ).astype(float)
    
    # En iyi modeller
    best_models = df_results.nlargest(5, 'score')
    
    print("TOP 5 MODELS:")
    for i, (idx, row) in enumerate(best_models.iterrows(), 1):
        print(f"\n{i}. {row['scaler']} - {row['model']}")
        print(f"   Val RMSE: {row['val_rmse']:.0f}")
        print(f"   Val R²:   {row['val_r2']:.4f}")
        print(f"   Overfit:  {row['overfitting_gap']:.0f}")
        print(f"   Score:    {row['score']:.4f}")
    
    # En iyi model
    best_model = best_models.iloc[0]
    print(f"\n🏆 EN İYİ MODEL: {best_model['scaler']} - {best_model['model']}")
    print(f"   Bu model en iyi generalizasyon ve performans dengesini sağlıyor!")
    
    return best_model

def main():
    """Ana fonksiyon"""
    print("\n" + "⚖️" * 30)
    print("OVERFITTING DÜZELTME - SU MİKTARI")
    print("⚖️" * 30 + "\n")
    
    # Overfitting düzeltme
    results = fix_water_quantity_overfitting()
    
    # Görselleştirme
    visualize_overfitting_fix(results)
    
    # En iyi model önerisi
    best_model = recommend_best_model(results)
    
    print("\n" + "=" * 60)
    print("✅ OVERFITTING DÜZELTME TAMAMLANDI!")
    print("=" * 60)
    
    return results, best_model

if __name__ == "__main__":
    results, best_model = main()
