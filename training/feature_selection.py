#!/usr/bin/env python3
"""
FEATURE SELECTION
Gereksiz özellikleri kaldır ve en iyi feature setini bul
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.feature_selection import (
    SelectKBest, f_classif, f_regression, mutual_info_classif, mutual_info_regression,
    RFE, SelectFromModel
)
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score
import warnings
warnings.filterwarnings('ignore')

def feature_selection_water_quality():
    """Su kalitesi için feature selection"""
    print("=" * 60)
    print("FEATURE SELECTION - SU KALİTESİ")
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
    
    print(f"Original features: {len(feature_cols)}")
    print(f"Features: {feature_cols}")
    
    # 1. UNIVARIATE FEATURE SELECTION
    print("\n" + "=" * 60)
    print("1. UNIVARIATE FEATURE SELECTION")
    print("=" * 60)
    
    # F-score
    f_selector = SelectKBest(score_func=f_classif, k='all')
    f_selector.fit(X_train_scaled, y_train_encoded)
    f_scores = f_selector.scores_
    
    # Mutual Information
    mi_selector = SelectKBest(score_func=mutual_info_classif, k='all')
    mi_selector.fit(X_train_scaled, y_train_encoded)
    mi_scores = mi_selector.scores_
    
    # Feature importance DataFrame
    feature_importance_df = pd.DataFrame({
        'feature': feature_cols,
        'f_score': f_scores,
        'mi_score': mi_scores
    })
    
    # Normalize scores
    feature_importance_df['f_score_norm'] = feature_importance_df['f_score'] / feature_importance_df['f_score'].max()
    feature_importance_df['mi_score_norm'] = feature_importance_df['mi_score'] / feature_importance_df['mi_score'].max()
    feature_importance_df['combined_score'] = (feature_importance_df['f_score_norm'] + feature_importance_df['mi_score_norm']) / 2
    
    feature_importance_df = feature_importance_df.sort_values('combined_score', ascending=False)
    
    print("Feature Importance (Univariate):")
    print(feature_importance_df)
    
    # 2. RECURSIVE FEATURE ELIMINATION
    print("\n" + "=" * 60)
    print("2. RECURSIVE FEATURE ELIMINATION")
    print("=" * 60)
    
    # RFE with Random Forest
    rf_rfe = RandomForestClassifier(n_estimators=100, random_state=42)
    rfe_selector = RFE(estimator=rf_rfe, n_features_to_select=5, step=1)
    rfe_selector.fit(X_train_scaled, y_train_encoded)
    
    rfe_features = [feature_cols[i] for i in range(len(feature_cols)) if rfe_selector.support_[i]]
    print(f"RFE selected features: {rfe_features}")
    
    # 3. MODEL-BASED FEATURE SELECTION
    print("\n" + "=" * 60)
    print("3. MODEL-BASED FEATURE SELECTION")
    print("=" * 60)
    
    # Random Forest Feature Importance
    rf_selector = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_selector.fit(X_train_scaled, y_train_encoded)
    
    rf_importance_df = pd.DataFrame({
        'feature': feature_cols,
        'importance': rf_selector.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("Random Forest Feature Importance:")
    print(rf_importance_df)
    
    # SelectFromModel
    sfm_selector = SelectFromModel(rf_selector, threshold='median')
    sfm_selector.fit(X_train_scaled, y_train_encoded)
    sfm_features = [feature_cols[i] for i in range(len(feature_cols)) if sfm_selector.get_support()[i]]
    print(f"SelectFromModel selected features: {sfm_features}")
    
    # 4. FEATURE SELECTION PERFORMANCE TEST
    print("\n" + "=" * 60)
    print("4. FEATURE SELECTION PERFORMANCE TEST")
    print("=" * 60)
    
    # Farklı feature setleri test et
    feature_sets = {
        'All Features': feature_cols,
        'Top 3 Combined': feature_importance_df.head(3)['feature'].tolist(),
        'Top 5 Combined': feature_importance_df.head(5)['feature'].tolist(),
        'RFE Selected': rfe_features,
        'SelectFromModel': sfm_features,
        'Top 2 RF': rf_importance_df.head(2)['feature'].tolist()
    }
    
    performance_results = {}
    
    for set_name, features in feature_sets.items():
        if len(features) == 0:
            continue
            
        print(f"\n{set_name} ({len(features)} features):")
        print(f"Features: {features}")
        
        # Feature indices
        feature_indices = [feature_cols.index(f) for f in features]
        
        # Subset data
        X_train_subset = X_train_scaled[:, feature_indices]
        X_val_subset = X_val_scaled[:, feature_indices]
        X_test_subset = X_test_scaled[:, feature_indices]
        
        # Model eğit
        rf = RandomForestClassifier(n_estimators=100, random_state=42)
        rf.fit(X_train_subset, y_train_encoded)
        
        # Performance
        train_acc = rf.score(X_train_subset, y_train_encoded)
        val_acc = rf.score(X_val_subset, y_val_encoded)
        test_acc = rf.score(X_test_subset, y_test_encoded)
        
        # Cross-validation
        cv_scores = cross_val_score(rf, X_train_subset, y_train_encoded, cv=5)
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
        
        overfitting_gap = train_acc - val_acc
        
        performance_results[set_name] = {
            'features': features,
            'n_features': len(features),
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
            print("  ⚠️  Overfitting!")
        elif overfitting_gap < 0.02:
            print("  ✅ İyi generalizasyon")
        else:
            print("  ⚠️  Hafif overfitting")
    
    # 5. VISUALIZATION
    visualize_feature_selection_results(feature_importance_df, performance_results)
    
    return performance_results, feature_importance_df

def feature_selection_water_quantity():
    """Su miktarı için feature selection"""
    print("\n" + "=" * 60)
    print("FEATURE SELECTION - SU MİKTARI")
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
    
    print(f"Original features: {len(feature_cols)}")
    
    # Feature selection methods
    # 1. F-score
    f_selector = SelectKBest(score_func=f_regression, k='all')
    f_selector.fit(X_train_scaled, y_train)
    f_scores = f_selector.scores_
    
    # 2. Mutual Information
    mi_selector = SelectKBest(score_func=mutual_info_regression, k='all')
    mi_selector.fit(X_train_scaled, y_train)
    mi_scores = mi_selector.scores_
    
    # 3. Random Forest Importance
    rf_selector = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_selector.fit(X_train_scaled, y_train)
    rf_importances = rf_selector.feature_importances_
    
    # Feature importance DataFrame
    feature_importance_df = pd.DataFrame({
        'feature': feature_cols,
        'f_score': f_scores,
        'mi_score': mi_scores,
        'rf_importance': rf_importances
    })
    
    # Normalize scores
    for col in ['f_score', 'mi_score', 'rf_importance']:
        feature_importance_df[f'{col}_norm'] = feature_importance_df[col] / feature_importance_df[col].max()
    
    feature_importance_df['combined_score'] = (
        feature_importance_df['f_score_norm'] + 
        feature_importance_df['mi_score_norm'] + 
        feature_importance_df['rf_importance_norm']
    ) / 3
    
    feature_importance_df = feature_importance_df.sort_values('combined_score', ascending=False)
    
    print("Top 10 Feature Importance:")
    print(feature_importance_df.head(10))
    
    # Performance test with different feature sets
    feature_sets = {
        'All Features': feature_cols,
        'Top 10 Combined': feature_importance_df.head(10)['feature'].tolist(),
        'Top 5 Combined': feature_importance_df.head(5)['feature'].tolist(),
        'Top 3 Combined': feature_importance_df.head(3)['feature'].tolist(),
        'Top RF': feature_importance_df.head(5)['feature'].tolist()
    }
    
    performance_results = {}
    
    for set_name, features in feature_sets.items():
        if len(features) == 0:
            continue
            
        print(f"\n{set_name} ({len(features)} features):")
        
        # Feature indices
        feature_indices = [feature_cols.index(f) for f in features]
        
        # Subset data
        X_train_subset = X_train_scaled[:, feature_indices]
        X_val_subset = X_val_scaled[:, feature_indices]
        X_test_subset = X_test_scaled[:, feature_indices]
        
        # Model eğit
        rf = RandomForestRegressor(n_estimators=100, random_state=42)
        rf.fit(X_train_subset, y_train)
        
        # Predictions
        train_pred = rf.predict(X_train_subset)
        val_pred = rf.predict(X_val_subset)
        test_pred = rf.predict(X_test_subset)
        
        # Metrics
        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
        
        train_r2 = r2_score(y_train, train_pred)
        val_r2 = r2_score(y_val, val_pred)
        test_r2 = r2_score(y_test, test_pred)
        
        overfitting_gap = train_rmse - val_rmse
        
        performance_results[set_name] = {
            'features': features,
            'n_features': len(features),
            'train_rmse': train_rmse,
            'val_rmse': val_rmse,
            'test_rmse': test_rmse,
            'train_r2': train_r2,
            'val_r2': val_r2,
            'test_r2': test_r2,
            'overfitting_gap': overfitting_gap
        }
        
        print(f"  Train RMSE: {train_rmse:.0f}, R²: {train_r2:.4f}")
        print(f"  Val RMSE:   {val_rmse:.0f}, R²: {val_r2:.4f}")
        print(f"  Test RMSE:  {test_rmse:.0f}, R²: {test_r2:.4f}")
        print(f"  Overfit Gap: {overfitting_gap:.0f}")
        
        if abs(overfitting_gap) < 10000000:
            print("  ✅ İyi generalizasyon")
        elif overfitting_gap < -20000000:
            print("  ❌ Overfitting")
        else:
            print("  ⚠️  Hafif overfitting")
    
    return performance_results, feature_importance_df

def visualize_feature_selection_results(feature_importance_df, performance_results):
    """Feature selection sonuçlarını görselleştir"""
    print("\n" + "=" * 60)
    print("FEATURE SELECTION GÖRSELLEŞTİRME")
    print("=" * 60)
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. Feature Importance
    top_features = feature_importance_df.head(10)
    ax1.barh(range(len(top_features)), top_features['combined_score'], alpha=0.7)
    ax1.set_yticks(range(len(top_features)))
    ax1.set_yticklabels(top_features['feature'])
    ax1.set_xlabel('Combined Score')
    ax1.set_title('Top 10 Feature Importance')
    ax1.grid(True, alpha=0.3)
    
    # 2. Performance by Number of Features
    set_names = list(performance_results.keys())
    n_features = [performance_results[name]['n_features'] for name in set_names]
    val_scores = [performance_results[name]['val_acc'] if 'val_acc' in performance_results[name] 
                  else performance_results[name]['val_r2'] for name in set_names]
    
    ax2.scatter(n_features, val_scores, s=100, alpha=0.7)
    for i, name in enumerate(set_names):
        ax2.annotate(name, (n_features[i], val_scores[i]), xytext=(5, 5), 
                    textcoords='offset points', fontsize=8)
    ax2.set_xlabel('Number of Features')
    ax2.set_ylabel('Validation Score')
    ax2.set_title('Performance vs Number of Features')
    ax2.grid(True, alpha=0.3)
    
    # 3. Overfitting Analysis
    overfitting_gaps = []
    for name in set_names:
        gap = performance_results[name]['overfitting_gap']
        if 'val_acc' in performance_results[name]:  # Classification
            gap = gap * 1000  # Scale for visualization
        overfitting_gaps.append(gap)
    
    colors = ['green' if abs(gap) < 1000 else 'orange' if abs(gap) < 5000 else 'red' for gap in overfitting_gaps]
    ax3.bar(set_names, overfitting_gaps, color=colors, alpha=0.7)
    ax3.set_ylabel('Overfitting Gap (Scaled)')
    ax3.set_title('Overfitting Analysis')
    ax3.tick_params(axis='x', rotation=45)
    ax3.grid(True, alpha=0.3)
    ax3.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    
    # 4. Feature Score Comparison
    score_columns = [col for col in feature_importance_df.columns if '_norm' in col]
    if score_columns:
        top_5_features = feature_importance_df.head(5)
        x = np.arange(len(top_5_features))
        width = 0.25
        
        for i, col in enumerate(score_columns):
            ax4.bar(x + i*width, top_5_features[col], width, 
                   label=col.replace('_norm', ''), alpha=0.8)
        
        ax4.set_xlabel('Features')
        ax4.set_ylabel('Normalized Score')
        ax4.set_title('Feature Score Comparison (Top 5)')
        ax4.set_xticks(x + width)
        ax4.set_xticklabels(top_5_features['feature'], rotation=45, ha='right')
        ax4.legend()
        ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('data/feature_selection_analysis.png', dpi=300, bbox_inches='tight')
    print("✅ Görsel kaydedildi: data/feature_selection_analysis.png")
    plt.show()

def recommend_best_feature_set(performance_results):
    """En iyi feature setini öner"""
    print("\n" + "=" * 60)
    print("EN İYİ FEATURE SET ÖNERİSİ")
    print("=" * 60)
    
    # Score hesaplama
    for name, results in performance_results.items():
        if 'val_acc' in results:  # Classification
            score = results['val_acc'] * 0.4 + (1 - abs(results['overfitting_gap'])) * 0.3 + (1 / results['n_features']) * 0.3
        else:  # Regression
            score = results['val_r2'] * 0.4 + (1 - abs(results['overfitting_gap']) / 100000000) * 0.3 + (1 / results['n_features']) * 0.3
        
        performance_results[name]['score'] = score
    
    # En iyi feature setleri
    sorted_results = sorted(performance_results.items(), key=lambda x: x[1]['score'], reverse=True)
    
    print("TOP 3 FEATURE SETS:")
    for i, (name, results) in enumerate(sorted_results[:3], 1):
        print(f"\n{i}. {name} ({results['n_features']} features)")
        print(f"   Score: {results['score']:.4f}")
        print(f"   Features: {results['features']}")
        
        if 'val_acc' in results:
            print(f"   Val Acc: {results['val_acc']:.4f}")
        else:
            print(f"   Val R²: {results['val_r2']:.4f}")
        
        print(f"   Overfit Gap: {results['overfitting_gap']:.4f}")
    
    best_set = sorted_results[0]
    print(f"\n🏆 EN İYİ FEATURE SET: {best_set[0]}")
    print(f"   Bu feature set en iyi performans ve generalizasyon dengesini sağlıyor!")
    
    return best_set

def main():
    """Ana fonksiyon"""
    print("\n" + "📊" * 30)
    print("FEATURE SELECTION")
    print("📊" * 30 + "\n")
    
    # Su kalitesi feature selection
    quality_results, quality_importance = feature_selection_water_quality()
    
    # Su miktarı feature selection
    quantity_results, quantity_importance = feature_selection_water_quantity()
    
    # En iyi feature setleri
    best_quality = recommend_best_feature_set(quality_results)
    best_quantity = recommend_best_feature_set(quantity_results)
    
    print("\n" + "=" * 60)
    print("✅ FEATURE SELECTION TAMAMLANDI!")
    print("=" * 60)
    
    return quality_results, quantity_results, best_quality, best_quantity

if __name__ == "__main__":
    quality_results, quantity_results, best_quality, best_quantity = main()
