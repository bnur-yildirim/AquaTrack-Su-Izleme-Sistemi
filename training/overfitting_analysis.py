#!/usr/bin/env python3
"""
OVERFITTING ANALİZİ VE MODEL İYİLEŞTİRME
Su kalitesi ve su miktarı modellerini kontrol et
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

def analyze_water_quality_overfitting():
    """Su kalitesi modellerinde overfitting analizi"""
    print("=" * 60)
    print("SU KALİTESİ - OVERFITTING ANALİZİ")
    print("=" * 60)
    
    # Veriyi yükle
    train_df = pd.read_csv('data/complete_train_dataset.csv')
    val_df = pd.read_csv('data/complete_val_dataset.csv')
    test_df = pd.read_csv('data/complete_test_dataset.csv')
    
    print(f"Train: {train_df.shape}, Val: {val_df.shape}, Test: {test_df.shape}")
    
    # Özellikleri hazırla
    exclude_cols = ['file_path', 'filename', 'lake_name', 'date', 'quality_label', 'quality_score', 'band_type']
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
    
    X_train = train_df[feature_cols]
    y_train = train_df['quality_label']
    X_val = val_df[feature_cols]
    y_val = val_df['quality_label']
    X_test = test_df[feature_cols]
    y_test = test_df['quality_label']
    
    # Normalize
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    # Farklı modelleri test et
    models = {
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, random_state=42),
        'Random Forest (Overfit)': RandomForestClassifier(n_estimators=500, max_depth=20, random_state=42),
        'Gradient Boosting (Overfit)': GradientBoostingClassifier(n_estimators=500, max_depth=10, random_state=42)
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"\n{name} analizi:")
        
        # Model eğit
        model.fit(X_train_scaled, y_train)
        
        # Train accuracy
        train_acc = model.score(X_train_scaled, y_train)
        
        # Validation accuracy
        val_acc = model.score(X_val_scaled, y_val)
        
        # Test accuracy
        test_acc = model.score(X_test_scaled, y_test)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
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
            print("  ⚠️  OVERFITTING TESPİT EDİLDİ!")
        elif overfitting_gap < 0.02:
            print("  ✅ İyi generalizasyon")
        else:
            print("  ⚠️  Hafif overfitting")
    
    # Sonuçları görselleştir
    visualize_overfitting_results(results, 'water_quality')
    
    return results

def analyze_water_quantity_overfitting():
    """Su miktarı modellerinde overfitting analizi"""
    print("\n" + "=" * 60)
    print("SU MİKTARI - OVERFITTING ANALİZİ")
    print("=" * 60)
    
    # Su miktarı verilerini yükle
    train_df = pd.read_parquet('water_quantity/output/train_combined.parquet')
    val_df = pd.read_parquet('water_quantity/output/val_combined.parquet')
    test_df = pd.read_parquet('water_quantity/output/test_combined.parquet')
    
    print(f"Train: {train_df.shape}, Val: {val_df.shape}, Test: {test_df.shape}")
    
    # Feature hazırlama (su miktarı için)
    def prepare_water_quantity_features(df):
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
    
    # Veriyi hazırla
    train_df = prepare_water_quantity_features(train_df)
    val_df = prepare_water_quantity_features(val_df)
    test_df = prepare_water_quantity_features(test_df)
    
    # Feature seçimi
    exclude_cols = ['lake_id', 'date', 'target_water_area_m2']
    feature_cols = []
    for c in train_df.columns:
        if c not in exclude_cols:
            # Numeric sütunları al
            if pd.api.types.is_numeric_dtype(train_df[c]):
                feature_cols.append(c)
    
    X_train = train_df[feature_cols]
    y_train = train_df['target_water_area_m2']
    X_val = val_df[feature_cols]
    y_val = val_df['target_water_area_m2']
    X_test = test_df[feature_cols]
    y_test = test_df['target_water_area_m2']
    
    # Infinity ve NaN değerleri temizle
    for df in [X_train, X_val, X_test]:
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.fillna(0, inplace=True)
    
    # Normalize
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    # Regression modelleri
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    
    models = {
        'Linear Regression': LinearRegression(),
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
        'Random Forest (Overfit)': RandomForestRegressor(n_estimators=500, max_depth=20, random_state=42),
        'Gradient Boosting (Overfit)': GradientBoostingRegressor(n_estimators=500, max_depth=10, random_state=42)
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"\n{name} analizi:")
        
        # Model eğit
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
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='neg_mean_squared_error')
        cv_rmse = np.sqrt(-cv_scores.mean())
        cv_std = np.sqrt(cv_scores.std())
        
        # Overfitting gap (RMSE difference)
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
        
        if overfitting_gap < -1000000:  # Val RMSE çok daha yüksek
            print("  ⚠️  OVERFITTING TESPİT EDİLDİ!")
        elif abs(overfitting_gap) < 100000:
            print("  ✅ İyi generalizasyon")
        else:
            print("  ⚠️  Hafif overfitting")
    
    # Sonuçları görselleştir
    visualize_overfitting_results(results, 'water_quantity')
    
    return results

def visualize_overfitting_results(results, model_type):
    """Overfitting sonuçlarını görselleştir"""
    print(f"\n{model_type.upper()} - GÖRSELLEŞTİRME")
    print("=" * 60)
    
    if model_type == 'water_quality':
        # Classification metrics
        metrics = ['train_acc', 'val_acc', 'test_acc', 'cv_mean']
        metric_names = ['Train Acc', 'Val Acc', 'Test Acc', 'CV Mean']
    else:
        # Regression metrics
        metrics = ['train_rmse', 'val_rmse', 'test_rmse', 'cv_rmse']
        metric_names = ['Train RMSE', 'Val RMSE', 'Test RMSE', 'CV RMSE']
    
    # DataFrame oluştur
    df_results = pd.DataFrame(results).T
    
    # Plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # 1. Model performance comparison
    x = np.arange(len(results))
    width = 0.2
    
    for i, (metric, name) in enumerate(zip(metrics, metric_names)):
        values = [results[model][metric] for model in results.keys()]
        ax1.bar(x + i*width, values, width, label=name, alpha=0.8)
    
    ax1.set_xlabel('Model')
    ax1.set_ylabel('Performance' if model_type == 'water_quality' else 'RMSE')
    ax1.set_title(f'{model_type.upper()} - Model Performance Comparison')
    ax1.set_xticks(x + width * 1.5)
    ax1.set_xticklabels(results.keys(), rotation=45, ha='right')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # 2. Overfitting gap
    overfitting_gaps = [results[model]['overfitting_gap'] for model in results.keys()]
    colors = ['red' if gap > (0.1 if model_type == 'water_quality' else 1000000) else 'green' for gap in overfitting_gaps]
    
    ax2.bar(results.keys(), overfitting_gaps, color=colors, alpha=0.7)
    ax2.set_xlabel('Model')
    ax2.set_ylabel('Overfitting Gap')
    ax2.set_title(f'{model_type.upper()} - Overfitting Analysis')
    ax2.tick_params(axis='x', rotation=45)
    ax2.grid(True, alpha=0.3)
    ax2.axhline(y=0.1 if model_type == 'water_quality' else 1000000, color='red', linestyle='--', alpha=0.7, label='Overfitting Threshold')
    ax2.legend()
    
    plt.tight_layout()
    plt.savefig(f'data/overfitting_analysis_{model_type}.png', dpi=300, bbox_inches='tight')
    print(f"✅ Görsel kaydedildi: data/overfitting_analysis_{model_type}.png")
    plt.show()

def suggest_improved_models():
    """Daha iyi modeller öner"""
    print("\n" + "=" * 60)
    print("DİHA İYİ MODELLER ÖNERİLERİ")
    print("=" * 60)
    
    suggestions = {
        'Su Kalitesi': [
            '🤖 XGBoost with early stopping',
            '🧠 Neural Network with dropout',
            '🔄 Ensemble with different algorithms',
            '📊 Feature selection with mutual information',
            '⚖️ Class balancing with SMOTE',
            '🎯 Focal loss for imbalanced data',
            '🔄 Cross-validation with time series split'
        ],
        'Su Miktarı': [
            '🤖 CatBoost with Optuna optimization',
            '🧠 LSTM for time series',
            '🔄 Prophet for seasonal patterns',
            '📊 Advanced feature engineering',
            '⚖️ Robust regression methods',
            '🎯 Quantile regression for uncertainty',
            '🔄 Walk-forward validation'
        ]
    }
    
    for category, models in suggestions.items():
        print(f"\n{category}:")
        for model in models:
            print(f"  {model}")

def main():
    """Ana fonksiyon"""
    print("🔍" * 30)
    print("OVERFITTING ANALİZİ VE MODEL İYİLEŞTİRME")
    print("🔍" * 30 + "\n")
    
    # Su kalitesi analizi
    water_quality_results = analyze_water_quality_overfitting()
    
    # Su miktarı analizi
    water_quantity_results = analyze_water_quantity_overfitting()
    
    # Öneriler
    suggest_improved_models()
    
    print("\n" + "=" * 60)
    print("✅ OVERFITTING ANALİZİ TAMAMLANDI!")
    print("=" * 60)
    
    return water_quality_results, water_quantity_results

if __name__ == "__main__":
    water_quality_results, water_quantity_results = main()
