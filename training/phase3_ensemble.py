#!/usr/bin/env python3
"""
Phase 3: Ensemble Methods
Çoklu model birleştirme ve robust prediction
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, BaggingClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
import warnings
warnings.filterwarnings('ignore')

def load_phase2_results():
    """Phase 2 sonuçlarını yükle"""
    print("Phase 3: Ensemble Methods baslatiliyor...")
    print("Phase 2 sonuclari yukleniyor...")
    
    # Dengeli veri setini yükle
    df = pd.read_csv('data/balanced_tif_mapping.csv')
    
    # Özellikler oluştur
    df['file_size_log'] = np.log1p(df['file_size'])
    
    lake_mapping = {
        'gol_van': 1, 'gol_tuz': 2, 'gol_burdur': 3, 
        'gol_egridir': 4, 'gol_ulubat': 5, 'gol_sapanca': 6, 'gol_salda': 7
    }
    df['lake_id'] = df['lake_name'].map(lake_mapping)
    
    # Rastgele spektral özellikler
    np.random.seed(42)
    df['spectral_band1'] = np.random.normal(0.5, 0.2, len(df))
    df['spectral_band2'] = np.random.normal(0.3, 0.15, len(df))
    df['spectral_band3'] = np.random.normal(0.4, 0.18, len(df))
    df['ndwi_simulated'] = np.random.normal(0.6, 0.3, len(df))
    df['wri_simulated'] = np.random.normal(1.2, 0.4, len(df))
    df['chl_a_simulated'] = np.random.normal(0.2, 0.1, len(df))
    df['turbidity_simulated'] = np.random.normal(0.8, 0.3, len(df))
    
    print(f"Veri seti: {len(df)} kayit")
    
    return df

def create_ensemble_models(df):
    """Ensemble modelleri oluştur"""
    print("Ensemble modelleri olusturuluyor...")
    
    # Özellikler ve hedef
    feature_cols = ['file_size_log', 'lake_id', 'quality_score', 
                    'spectral_band1', 'spectral_band2', 'spectral_band3',
                    'ndwi_simulated', 'wri_simulated', 'chl_a_simulated', 
                    'turbidity_simulated']
    
    X = df[feature_cols]
    y = df['quality_label']
    
    # Train-test split
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Özellikleri normalize et
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Base modeller
    base_models = {
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'SVM': SVC(probability=True, random_state=42),
        'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000)
    }
    
    # Ensemble modelleri
    ensemble_models = {
        'Voting Classifier': VotingClassifier([
            ('rf', base_models['Random Forest']),
            ('svm', base_models['SVM']),
            ('lr', base_models['Logistic Regression'])
        ], voting='soft'),
        
        'Bagging RF': BaggingClassifier(
            RandomForestClassifier(n_estimators=50, random_state=42),
            n_estimators=10, random_state=42
        ),
        
        'Weighted Voting': VotingClassifier([
            ('rf', base_models['Random Forest']),
            ('svm', base_models['SVM']),
            ('lr', base_models['Logistic Regression'])
        ], voting='soft', weights=[0.4, 0.3, 0.3])
    }
    
    # Tüm modelleri birleştir
    all_models = {**base_models, **ensemble_models}
    
    return all_models, X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled

def train_and_evaluate_models(models, X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled):
    """Modelleri eğit ve değerlendir"""
    print("Modeller egitiliyor ve degerlendiriliyor...")
    
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
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        results[model_name] = {
            'model': model,
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'y_test': y_test,
            'y_pred': y_pred,
            'y_pred_proba': y_pred_proba,
            'confusion_matrix': cm
        }
        
        print(f"    Accuracy: {accuracy:.3f}")
        print(f"    CV Score: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
    
    return results

def create_phase3_visualization(results):
    """Phase 3 görselleştirmesi"""
    print("Phase 3 gorselleştirmesi olusturuluyor...")
    
    plt.figure(figsize=(18, 12))
    
    # 1. Model accuracy karşılaştırması
    plt.subplot(3, 4, 1)
    model_names = list(results.keys())
    accuracies = [results[name]['accuracy'] for name in model_names]
    cv_means = [results[name]['cv_mean'] for name in model_names]
    cv_stds = [results[name]['cv_std'] for name in model_names]
    
    x = np.arange(len(model_names))
    width = 0.35
    
    plt.bar(x - width/2, accuracies, width, label='Test Accuracy', alpha=0.8)
    plt.bar(x + width/2, cv_means, width, label='CV Mean', alpha=0.8)
    plt.errorbar(x + width/2, cv_means, yerr=cv_stds, fmt='none', color='black')
    
    plt.title('Ensemble Model Performance')
    plt.xlabel('Modeller')
    plt.ylabel('Accuracy')
    plt.xticks(x, model_names, rotation=45)
    plt.legend()
    
    # 2. Confusion Matrix (Voting Classifier)
    plt.subplot(3, 4, 2)
    voting_results = results['Voting Classifier']
    cm = voting_results['confusion_matrix']
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Voting Classifier - Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    
    # 3. Confusion Matrix (Random Forest)
    plt.subplot(3, 4, 3)
    rf_results = results['Random Forest']
    cm = rf_results['confusion_matrix']
    sns.heatmap(cm, annot=True, fmt='d', cmap='Greens')
    plt.title('Random Forest - Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    
    # 4. Confusion Matrix (SVM)
    plt.subplot(3, 4, 4)
    svm_results = results['SVM']
    cm = svm_results['confusion_matrix']
    sns.heatmap(cm, annot=True, fmt='d', cmap='Reds')
    plt.title('SVM - Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    
    # 5. Accuracy comparison
    plt.subplot(3, 4, 5)
    colors = ['skyblue', 'lightgreen', 'lightcoral', 'gold', 'lightpink', 'lightgray']
    plt.bar(model_names, accuracies, color=colors[:len(model_names)])
    plt.title('Accuracy Karşılaştırması')
    plt.xlabel('Modeller')
    plt.ylabel('Accuracy')
    plt.xticks(rotation=45)
    
    # 6. CV Score comparison
    plt.subplot(3, 4, 6)
    plt.bar(model_names, cv_means, color=colors[:len(model_names)], alpha=0.7)
    plt.errorbar(model_names, cv_means, yerr=cv_stds, fmt='none', color='black')
    plt.title('Cross-Validation Scores')
    plt.xlabel('Modeller')
    plt.ylabel('CV Score')
    plt.xticks(rotation=45)
    
    # 7. Model stability (CV std)
    plt.subplot(3, 4, 7)
    plt.bar(model_names, cv_stds, color=colors[:len(model_names)], alpha=0.7)
    plt.title('Model Stability (CV Std)')
    plt.xlabel('Modeller')
    plt.ylabel('CV Standard Deviation')
    plt.xticks(rotation=45)
    
    # 8. Performance heatmap
    plt.subplot(3, 4, 8)
    performance_data = []
    for name in model_names:
        performance_data.append([results[name]['accuracy'], results[name]['cv_mean']])
    
    performance_array = np.array(performance_data)
    sns.heatmap(performance_array, annot=True, fmt='.3f', 
                xticklabels=['Test', 'CV'], yticklabels=model_names, cmap='YlOrRd')
    plt.title('Performance Heatmap')
    
    # 9. Prediction confidence (Voting Classifier)
    plt.subplot(3, 4, 9)
    voting_proba = results['Voting Classifier']['y_pred_proba']
    max_proba = np.max(voting_proba, axis=1)
    plt.hist(max_proba, bins=20, alpha=0.7, color='purple')
    plt.title('Voting Classifier Confidence')
    plt.xlabel('Max Probability')
    plt.ylabel('Frequency')
    
    # 10. Model comparison radar chart
    plt.subplot(3, 4, 10)
    metrics = ['Accuracy', 'CV Mean', 'Stability']
    voting_metrics = [results['Voting Classifier']['accuracy'], 
                      results['Voting Classifier']['cv_mean'],
                      1 - results['Voting Classifier']['cv_std']]
    rf_metrics = [results['Random Forest']['accuracy'], 
                  results['Random Forest']['cv_mean'],
                  1 - results['Random Forest']['cv_std']]
    
    angles = np.linspace(0, 2 * np.pi, len(metrics), endpoint=False).tolist()
    voting_metrics += voting_metrics[:1]
    rf_metrics += rf_metrics[:1]
    angles += angles[:1]
    
    plt.polar(angles, voting_metrics, 'o-', linewidth=2, label='Voting Classifier')
    plt.polar(angles, rf_metrics, 'o-', linewidth=2, label='Random Forest')
    plt.title('Model Comparison Radar')
    plt.legend()
    
    # 11. Ensemble vs Single models
    plt.subplot(3, 4, 11)
    ensemble_models = ['Voting Classifier', 'Bagging RF', 'Weighted Voting']
    single_models = ['Random Forest', 'SVM', 'Logistic Regression']
    
    ensemble_acc = [results[name]['accuracy'] for name in ensemble_models]
    single_acc = [results[name]['accuracy'] for name in single_models]
    
    x = np.arange(len(ensemble_models))
    width = 0.35
    
    plt.bar(x - width/2, ensemble_acc, width, label='Ensemble', alpha=0.8)
    plt.bar(x + width/2, single_acc, width, label='Single', alpha=0.8)
    
    plt.title('Ensemble vs Single Models')
    plt.xlabel('Model Types')
    plt.ylabel('Accuracy')
    plt.xticks(x, ensemble_models, rotation=45)
    plt.legend()
    
    # 12. Best model selection
    plt.subplot(3, 4, 12)
    best_model = max(results.keys(), key=lambda x: results[x]['accuracy'])
    best_accuracy = results[best_model]['accuracy']
    
    plt.bar(['Best Model'], [best_accuracy], color='gold', alpha=0.8)
    plt.title(f'Best Model: {best_model}')
    plt.ylabel('Accuracy')
    plt.ylim(0, 1)
    
    plt.tight_layout()
    plt.savefig('data/phase3_ensemble_methods.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return True

def save_phase3_results(results):
    """Phase 3 sonuçlarını kaydet"""
    print("Phase 3 sonuclari kaydediliyor...")
    
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
    performance_df.to_csv('data/phase3_ensemble_performance.csv', index=False)
    
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
    predictions_df.to_csv('data/phase3_ensemble_predictions.csv', index=False)
    
    # Özet rapor
    import json
    summary = {
        'total_models': len(results),
        'best_model': max(results.keys(), key=lambda x: results[x]['accuracy']),
        'best_accuracy': max([results[name]['accuracy'] for name in results.keys()]),
        'ensemble_models': ['Voting Classifier', 'Bagging RF', 'Weighted Voting'],
        'single_models': ['Random Forest', 'SVM', 'Logistic Regression'],
        'model_performances': {name: results[name]['accuracy'] for name in results.keys()}
    }
    
    with open('data/phase3_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("Phase 3 sonuclari kaydedildi:")
    print(f"  - phase3_ensemble_performance.csv: Ensemble performansları")
    print(f"  - phase3_ensemble_predictions.csv: Tahmin sonuçları")
    print(f"  - phase3_summary.json: Özet rapor")
    
    return summary

def main():
    """Phase 3 ana fonksiyon"""
    print("=" * 60)
    print("PHASE 3: ENSEMBLE METHODS")
    print("=" * 60)
    
    # 1. Phase 2 sonuçlarını yükle
    df = load_phase2_results()
    
    # 2. Ensemble modelleri oluştur
    models, X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled = create_ensemble_models(df)
    
    # 3. Modelleri eğit ve değerlendir
    results = train_and_evaluate_models(models, X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled)
    
    # 4. Görselleştirme
    create_phase3_visualization(results)
    
    # 5. Sonuçları kaydet
    summary = save_phase3_results(results)
    
    print("\n" + "=" * 60)
    print("PHASE 3 TAMAMLANDI!")
    print(f"Toplam model: {summary['total_models']}")
    print(f"En iyi model: {summary['best_model']}")
    print(f"En iyi accuracy: {summary['best_accuracy']:.3f}")
    print(f"Ensemble modeller: {summary['ensemble_models']}")
    print(f"Single modeller: {summary['single_models']}")
    print("=" * 60)
    
    return df, results

if __name__ == "__main__":
    df, results = main()
