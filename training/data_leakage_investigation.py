#!/usr/bin/env python3
"""
DATA LEAKAGE İNCELEMESİ
Su kalitesi verilerinde gizli data leakage araştırması
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import cross_val_score
import warnings
warnings.filterwarnings('ignore')

def investigate_data_leakage():
    """Data leakage detaylı incelemesi"""
    print("=" * 60)
    print("DATA LEAKAGE İNCELEMESİ")
    print("=" * 60)
    
    # Veriyi yükle
    train_df = pd.read_csv('data/complete_train_dataset.csv')
    val_df = pd.read_csv('data/complete_val_dataset.csv')
    test_df = pd.read_csv('data/complete_test_dataset.csv')
    
    print(f"Train: {train_df.shape}, Val: {val_df.shape}, Test: {test_df.shape}")
    
    # 1. FEATURE ANALYSIS
    print("\n" + "=" * 60)
    print("1. FEATURE ANALYSIS")
    print("=" * 60)
    
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
    
    print(f"Feature columns: {feature_cols}")
    
    # 2. TARGET DISTRIBUTION
    print("\n" + "=" * 60)
    print("2. TARGET DISTRIBUTION")
    print("=" * 60)
    
    print("Train target distribution:")
    print(train_df['quality_label'].value_counts(normalize=True))
    print("\nVal target distribution:")
    print(val_df['quality_label'].value_counts(normalize=True))
    print("\nTest target distribution:")
    print(test_df['quality_label'].value_counts(normalize=True))
    
    # 3. FEATURE-TARGET CORRELATION
    print("\n" + "=" * 60)
    print("3. FEATURE-TARGET CORRELATION")
    print("=" * 60)
    
    # Quality score ile correlation
    if 'quality_score' in train_df.columns:
        print("Quality Score vs Quality Label:")
        # Label encoding for correlation
        le = LabelEncoder()
        quality_label_encoded = le.fit_transform(train_df['quality_label'])
        correlation_df = pd.DataFrame({
            'quality_score': train_df['quality_score'],
            'quality_label_encoded': quality_label_encoded
        })
        correlation = correlation_df.corr()
        print(correlation)
        
        # Quality score dağılımı
        print("\nQuality Score by Label:")
        for label in train_df['quality_label'].unique():
            label_data = train_df[train_df['quality_label'] == label]['quality_score']
            print(f"{label}: mean={label_data.mean():.3f}, std={label_data.std():.3f}, min={label_data.min():.3f}, max={label_data.max():.3f}")
    
    # 4. FEATURE IMPORTANCE ANALYSIS
    print("\n" + "=" * 60)
    print("4. FEATURE IMPORTANCE ANALYSIS")
    print("=" * 60)
    
    X_train = train_df[feature_cols]
    y_train = train_df['quality_label']
    
    # Random Forest ile feature importance
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': rf.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("Feature Importance:")
    print(feature_importance)
    
    # 5. SINGLE FEATURE PERFORMANCE
    print("\n" + "=" * 60)
    print("5. SINGLE FEATURE PERFORMANCE")
    print("=" * 60)
    
    single_feature_results = {}
    
    for feature in feature_cols:
        # Sadece bu feature ile model eğit
        X_single = train_df[[feature]]
        X_val_single = val_df[[feature]]
        X_test_single = test_df[[feature]]
        
        # Normalize
        scaler = StandardScaler()
        X_single_scaled = scaler.fit_transform(X_single)
        X_val_single_scaled = scaler.transform(X_val_single)
        X_test_single_scaled = scaler.transform(X_test_single)
        
        # Model eğit
        rf_single = RandomForestClassifier(n_estimators=50, random_state=42)
        rf_single.fit(X_single_scaled, y_train)
        
        # Performance
        train_acc = rf_single.score(X_single_scaled, y_train)
        val_acc = rf_single.score(X_val_single_scaled, val_df['quality_label'])
        test_acc = rf_single.score(X_test_single_scaled, test_df['quality_label'])
        
        single_feature_results[feature] = {
            'train_acc': train_acc,
            'val_acc': val_acc,
            'test_acc': test_acc
        }
        
        print(f"{feature:20s}: Train={train_acc:.4f}, Val={val_acc:.4f}, Test={test_acc:.4f}")
    
    # 6. SUSPICIOUS FEATURES
    print("\n" + "=" * 60)
    print("6. SUSPICIOUS FEATURES (High Performance)")
    print("=" * 60)
    
    suspicious_features = []
    for feature, results in single_feature_results.items():
        if results['train_acc'] > 0.95 and results['val_acc'] > 0.95:
            suspicious_features.append(feature)
            print(f"⚠️  SUSPICIOUS: {feature} - Train: {results['train_acc']:.4f}, Val: {results['val_acc']:.4f}")
    
    # 7. DATA LEAKAGE DETECTION
    print("\n" + "=" * 60)
    print("7. DATA LEAKAGE DETECTION")
    print("=" * 60)
    
    # Quality score varsa ve çok yüksek performance veriyorsa
    if 'quality_score' in feature_cols:
        quality_score_perf = single_feature_results.get('quality_score', {})
        if quality_score_perf.get('train_acc', 0) > 0.95:
            print("🚨 DATA LEAKAGE DETECTED: quality_score feature!")
            print("   Quality score is a direct numerical representation of quality_label")
            print("   This creates perfect correlation and artificial 100% accuracy")
    
    # Diğer şüpheli feature'lar
    for feature in suspicious_features:
        if feature != 'quality_score':
            print(f"⚠️  POTENTIAL LEAKAGE: {feature}")
    
    # 8. VISUALIZATION
    visualize_data_leakage_analysis(feature_importance, single_feature_results, suspicious_features)
    
    return suspicious_features, single_feature_results

def visualize_data_leakage_analysis(feature_importance, single_feature_results, suspicious_features):
    """Data leakage analizini görselleştir"""
    print("\n" + "=" * 60)
    print("8. DATA LEAKAGE VISUALIZATION")
    print("=" * 60)
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. Feature Importance
    top_features = feature_importance.head(10)
    ax1.barh(range(len(top_features)), top_features['importance'], alpha=0.7)
    ax1.set_yticks(range(len(top_features)))
    ax1.set_yticklabels(top_features['feature'])
    ax1.set_xlabel('Feature Importance')
    ax1.set_title('Top 10 Feature Importance')
    ax1.grid(True, alpha=0.3)
    
    # 2. Single Feature Performance
    features = list(single_feature_results.keys())
    train_accs = [single_feature_results[f]['train_acc'] for f in features]
    val_accs = [single_feature_results[f]['val_acc'] for f in features]
    test_accs = [single_feature_results[f]['test_acc'] for f in features]
    
    x = np.arange(len(features))
    width = 0.25
    
    ax2.bar(x - width, train_accs, width, label='Train', alpha=0.8)
    ax2.bar(x, val_accs, width, label='Val', alpha=0.8)
    ax2.bar(x + width, test_accs, width, label='Test', alpha=0.8)
    ax2.set_xlabel('Feature')
    ax2.set_ylabel('Accuracy')
    ax2.set_title('Single Feature Performance')
    ax2.set_xticks(x)
    ax2.set_xticklabels(features, rotation=45, ha='right')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Suspicious Features Highlight
    colors = ['red' if f in suspicious_features else 'blue' for f in features]
    ax3.bar(features, val_accs, color=colors, alpha=0.7)
    ax3.set_xlabel('Feature')
    ax3.set_ylabel('Validation Accuracy')
    ax3.set_title('Suspicious Features (Red = High Performance)')
    ax3.tick_params(axis='x', rotation=45)
    ax3.grid(True, alpha=0.3)
    ax3.axhline(y=0.95, color='red', linestyle='--', alpha=0.7, label='Suspicious Threshold')
    ax3.legend()
    
    # 4. Performance Distribution
    all_accs = train_accs + val_accs + test_accs
    ax4.hist(all_accs, bins=20, alpha=0.7, color='purple')
    ax4.set_xlabel('Accuracy')
    ax4.set_ylabel('Frequency')
    ax4.set_title('Performance Distribution')
    ax4.axvline(x=0.95, color='red', linestyle='--', alpha=0.7, label='Suspicious Threshold')
    ax4.grid(True, alpha=0.3)
    ax4.legend()
    
    plt.tight_layout()
    plt.savefig('data/data_leakage_analysis.png', dpi=300, bbox_inches='tight')
    print("✅ Görsel kaydedildi: data/data_leakage_analysis.png")
    plt.show()

def clean_data_leakage(suspicious_features):
    """Data leakage temizleme önerileri"""
    print("\n" + "=" * 60)
    print("9. DATA LEAKAGE CLEANING RECOMMENDATIONS")
    print("=" * 60)
    
    if 'quality_score' in suspicious_features:
        print("🚨 CRITICAL: Remove 'quality_score' feature!")
        print("   - quality_score is a direct numerical representation of quality_label")
        print("   - This creates perfect correlation and artificial accuracy")
        print("   - Solution: Exclude quality_score from feature set")
    
    print("\n📋 RECOMMENDED ACTIONS:")
    print("1. Remove quality_score from features")
    print("2. Investigate other suspicious features")
    print("3. Use only spectral features (NDWI, WRI, Chl-a, Turbidity)")
    print("4. Re-run models without leaked features")
    print("5. Compare performance before/after cleaning")
    
    return suspicious_features

def main():
    """Ana fonksiyon"""
    print("\n" + "🔍" * 30)
    print("DATA LEAKAGE İNCELEMESİ")
    print("🔍" * 30 + "\n")
    
    # Data leakage incelemesi
    suspicious_features, single_feature_results = investigate_data_leakage()
    
    # Temizleme önerileri
    clean_features = clean_data_leakage(suspicious_features)
    
    print("\n" + "=" * 60)
    print("✅ DATA LEAKAGE İNCELEMESİ TAMAMLANDI!")
    print("=" * 60)
    
    return suspicious_features, single_feature_results

if __name__ == "__main__":
    suspicious_features, single_feature_results = main()
