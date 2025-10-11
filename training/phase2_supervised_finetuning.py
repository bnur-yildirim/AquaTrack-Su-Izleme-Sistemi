#!/usr/bin/env python3
"""
Phase 2: Supervised Fine-tuning
12,054 dengeli kayıt ile su kalitesi sınıflandırma
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
import warnings
warnings.filterwarnings('ignore')

def load_balanced_dataset():
    """Dengeli veri setini yükle"""
    print("Phase 2: Supervised Fine-tuning baslatiliyor...")
    print("Dengeli veri seti yukleniyor...")
    
    df = pd.read_csv('data/balanced_tif_mapping.csv')
    print(f"Dengeli veri seti: {len(df)} kayit")
    
    return df

def create_features(df):
    """Özellikler oluştur"""
    print("Ozellikler olusturuluyor...")
    
    # Dosya boyutu özelliği
    df['file_size_log'] = np.log1p(df['file_size'])
    
    # Göl ID'si
    lake_mapping = {
        'gol_van': 1, 'gol_tuz': 2, 'gol_burdur': 3, 
        'gol_egridir': 4, 'gol_ulubat': 5, 'gol_sapanca': 6, 'gol_salda': 7
    }
    df['lake_id'] = df['lake_name'].map(lake_mapping)
    
    # Kalite skoru
    df['quality_score'] = df['quality_score']
    
    # Rastgele spektral özellikler (gerçek TIF verilerini simüle et)
    np.random.seed(42)
    df['spectral_band1'] = np.random.normal(0.5, 0.2, len(df))
    df['spectral_band2'] = np.random.normal(0.3, 0.15, len(df))
    df['spectral_band3'] = np.random.normal(0.4, 0.18, len(df))
    df['ndwi_simulated'] = np.random.normal(0.6, 0.3, len(df))
    df['wri_simulated'] = np.random.normal(1.2, 0.4, len(df))
    df['chl_a_simulated'] = np.random.normal(0.2, 0.1, len(df))
    df['turbidity_simulated'] = np.random.normal(0.8, 0.3, len(df))
    
    # Göl bazlı özellikler
    for lake in df['lake_name'].unique():
        lake_mask = df['lake_name'] == lake
        df.loc[lake_mask, 'lake_spectral_mean'] = df.loc[lake_mask, 'spectral_band1'].mean()
        df.loc[lake_mask, 'lake_ndwi_mean'] = df.loc[lake_mask, 'ndwi_simulated'].mean()
    
    return df

def train_models(df):
    """Modelleri eğit"""
    print("Modeller egitiliyor...")
    
    # Özellikler ve hedef
    feature_cols = ['file_size_log', 'lake_id', 'quality_score', 
                    'spectral_band1', 'spectral_band2', 'spectral_band3',
                    'ndwi_simulated', 'wri_simulated', 'chl_a_simulated', 
                    'turbidity_simulated', 'lake_spectral_mean', 'lake_ndwi_mean']
    
    X = df[feature_cols]
    y = df['quality_label']
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Özellikleri normalize et
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Modeller
    models = {
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'SVM': SVC(random_state=42, probability=True),
        'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000)
    }
    
    results = {}
    
    for model_name, model in models.items():
        print(f"  {model_name} egitiliyor...")
        
        # Eğitim
        if model_name == 'SVM':
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            y_pred_proba = model.predict_proba(X_test_scaled)
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)
        
        # Metrikler
        accuracy = accuracy_score(y_test, y_pred)
        
        # Cross-validation
        if model_name == 'SVM':
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
        else:
            cv_scores = cross_val_score(model, X_train, y_train, cv=5)
        
        results[model_name] = {
            'model': model,
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'y_test': y_test,
            'y_pred': y_pred,
            'y_pred_proba': y_pred_proba
        }
        
        print(f"    Accuracy: {accuracy:.3f}")
        print(f"    CV Score: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
    
    return results, X_train, X_test, y_train, y_test

def create_phase2_visualization(df, results):
    """Phase 2 görselleştirmesi"""
    print("Phase 2 gorselleştirmesi olusturuluyor...")
    
    plt.figure(figsize=(15, 12))
    
    # 1. Model accuracy karşılaştırması
    plt.subplot(3, 3, 1)
    model_names = list(results.keys())
    accuracies = [results[name]['accuracy'] for name in model_names]
    cv_means = [results[name]['cv_mean'] for name in model_names]
    cv_stds = [results[name]['cv_std'] for name in model_names]
    
    x = np.arange(len(model_names))
    width = 0.35
    
    plt.bar(x - width/2, accuracies, width, label='Test Accuracy', alpha=0.8)
    plt.bar(x + width/2, cv_means, width, label='CV Mean', alpha=0.8)
    plt.errorbar(x + width/2, cv_means, yerr=cv_stds, fmt='none', color='black')
    
    plt.title('Model Performance Karşılaştırması')
    plt.xlabel('Modeller')
    plt.ylabel('Accuracy')
    plt.xticks(x, model_names, rotation=45)
    plt.legend()
    
    # 2. Confusion Matrix (Random Forest)
    plt.subplot(3, 3, 2)
    rf_results = results['Random Forest']
    cm = confusion_matrix(rf_results['y_test'], rf_results['y_pred'])
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Random Forest - Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    
    # 3. Kalite dağılımı
    plt.subplot(3, 3, 3)
    quality_dist = df['quality_label'].value_counts()
    plt.pie(quality_dist.values, labels=quality_dist.index, autopct='%1.1f%%')
    plt.title('Kalite Dağılımı')
    
    # 4. Göl dağılımı
    plt.subplot(3, 3, 4)
    lake_dist = df['lake_name'].value_counts()
    plt.bar(range(len(lake_dist)), lake_dist.values, color='lightblue')
    plt.title('Göl Dağılımı')
    plt.xlabel('Göller')
    plt.ylabel('Kayıt Sayısı')
    plt.xticks(range(len(lake_dist)), lake_dist.index, rotation=45)
    
    # 5. Feature importance (Random Forest)
    plt.subplot(3, 3, 5)
    rf_model = results['Random Forest']['model']
    feature_names = ['file_size_log', 'lake_id', 'quality_score', 
                     'spectral_band1', 'spectral_band2', 'spectral_band3',
                     'ndwi_simulated', 'wri_simulated', 'chl_a_simulated', 
                     'turbidity_simulated', 'lake_spectral_mean', 'lake_ndwi_mean']
    
    importances = rf_model.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    plt.bar(range(len(importances)), importances[indices])
    plt.title('Feature Importance')
    plt.xlabel('Features')
    plt.ylabel('Importance')
    plt.xticks(range(len(importances)), [feature_names[i] for i in indices], rotation=45)
    
    # 6. Prediction confidence
    plt.subplot(3, 3, 6)
    rf_proba = results['Random Forest']['y_pred_proba']
    max_proba = np.max(rf_proba, axis=1)
    plt.hist(max_proba, bins=20, alpha=0.7, color='green')
    plt.title('Prediction Confidence')
    plt.xlabel('Max Probability')
    plt.ylabel('Frequency')
    
    # 7. Cross-validation scores
    plt.subplot(3, 3, 7)
    cv_data = []
    for model_name in model_names:
        cv_data.append(results[model_name]['cv_mean'])
    
    plt.bar(model_names, cv_data, color='orange', alpha=0.7)
    plt.title('Cross-Validation Scores')
    plt.xlabel('Modeller')
    plt.ylabel('CV Score')
    plt.xticks(rotation=45)
    
    # 8. Quality score dağılımı
    plt.subplot(3, 3, 8)
    plt.hist(df['quality_score'], bins=20, alpha=0.7, color='purple')
    plt.title('Quality Score Dağılımı')
    plt.xlabel('Quality Score')
    plt.ylabel('Frequency')
    
    # 9. Lake vs Quality heatmap
    plt.subplot(3, 3, 9)
    lake_quality = pd.crosstab(df['lake_name'], df['quality_label'])
    sns.heatmap(lake_quality, annot=True, fmt='d', cmap='YlOrRd')
    plt.title('Göl vs Kalite')
    plt.xlabel('Kalite')
    plt.ylabel('Göl')
    
    plt.tight_layout()
    plt.savefig('data/phase2_supervised_finetuning.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return True

def save_phase2_results(df, results):
    """Phase 2 sonuçlarını kaydet"""
    print("Phase 2 sonuclari kaydediliyor...")
    
    # Model performansları
    performance_data = []
    for model_name, model_results in results.items():
        performance_data.append({
            'model': model_name,
            'accuracy': model_results['accuracy'],
            'cv_mean': model_results['cv_mean'],
            'cv_std': model_results['cv_std']
        })
    
    performance_df = pd.DataFrame(performance_data)
    performance_df.to_csv('data/phase2_model_performance.csv', index=False)
    
    # Tahmin sonuçları
    predictions_data = []
    for model_name, model_results in results.items():
        for i, (true_label, pred_label) in enumerate(zip(model_results['y_test'], model_results['y_pred'])):
            predictions_data.append({
                'model': model_name,
                'true_label': true_label,
                'pred_label': pred_label,
                'correct': true_label == pred_label
            })
    
    predictions_df = pd.DataFrame(predictions_data)
    predictions_df.to_csv('data/phase2_predictions.csv', index=False)
    
    # Özet rapor
    import json
    summary = {
        'total_samples': len(df),
        'lakes': df['lake_name'].nunique(),
        'quality_classes': df['quality_label'].nunique(),
        'best_model': max(results.keys(), key=lambda x: results[x]['accuracy']),
        'best_accuracy': max([results[name]['accuracy'] for name in results.keys()]),
        'model_performances': {name: results[name]['accuracy'] for name in results.keys()}
    }
    
    with open('data/phase2_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("Phase 2 sonuclari kaydedildi:")
    print(f"  - phase2_model_performance.csv: Model performansları")
    print(f"  - phase2_predictions.csv: Tahmin sonuçları")
    print(f"  - phase2_summary.json: Özet rapor")
    
    return summary

def main():
    """Phase 2 ana fonksiyon"""
    print("=" * 60)
    print("PHASE 2: SUPERVISED FINE-TUNING")
    print("=" * 60)
    
    # 1. Dengeli veri setini yükle
    df = load_balanced_dataset()
    
    # 2. Özellikler oluştur
    df = create_features(df)
    
    # 3. Modelleri eğit
    results, X_train, X_test, y_train, y_test = train_models(df)
    
    # 4. Görselleştirme
    create_phase2_visualization(df, results)
    
    # 5. Sonuçları kaydet
    summary = save_phase2_results(df, results)
    
    print("\n" + "=" * 60)
    print("PHASE 2 TAMAMLANDI!")
    print(f"Toplam ornek: {summary['total_samples']}")
    print(f"Gol sayisi: {summary['lakes']}")
    print(f"Kalite sinifi: {summary['quality_classes']}")
    print(f"En iyi model: {summary['best_model']}")
    print(f"En iyi accuracy: {summary['best_accuracy']:.3f}")
    print("=" * 60)
    
    return df, results

if __name__ == "__main__":
    df, results = main()
