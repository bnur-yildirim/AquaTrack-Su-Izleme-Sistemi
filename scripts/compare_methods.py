#!/usr/bin/env python3
"""
3 farklı yöntemi karşılaştırma ve grafik gösterme
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

def load_datasets():
    """Veri setlerini yükle"""
    print("Veri setleri yukleniyor...")
    
    datasets = {
        'balanced': pd.read_csv('data/balanced_tif_mapping.csv'),
        'weighted': pd.read_csv('data/weighted_tif_mapping.csv'),
        'stratified': pd.read_csv('data/stratified_tif_mapping.csv')
    }
    
    for name, df in datasets.items():
        print(f"{name}: {len(df)} kayit")
        print(f"  Gol dagilimi: {df['lake_name'].nunique()} gol")
        print(f"  Kalite sinifi: {df['quality_label'].nunique()} sinif")
    
    return datasets

def create_synthetic_features(df):
    """Sentetik özellikler oluştur"""
    print("Sentetik ozellikler olusturuluyor...")
    
    # Dosya boyutu özelliği
    df['file_size_log'] = np.log1p(df['file_size'])
    
    # Göl ID'si
    lake_mapping = {
        'gol_van': 1, 'gol_tuz': 2, 'gol_burdur': 3, 
        'gol_egridir': 4, 'gol_ulubat': 5, 'gol_sapanca': 6, 'gol_salda': 7
    }
    df['lake_id'] = df['lake_name'].map(lake_mapping)
    
    # Kalite skoru özelliği
    df['quality_score'] = df['quality_score']
    
    # Rastgele özellikler (gerçek TIF verilerini simüle et)
    np.random.seed(42)
    df['spectral_band1'] = np.random.normal(0.5, 0.2, len(df))
    df['spectral_band2'] = np.random.normal(0.3, 0.15, len(df))
    df['spectral_band3'] = np.random.normal(0.4, 0.18, len(df))
    df['ndwi_simulated'] = np.random.normal(0.6, 0.3, len(df))
    df['wri_simulated'] = np.random.normal(1.2, 0.4, len(df))
    
    return df

def train_models(datasets):
    """Modelleri eğit"""
    print("\nModeller egitiliyor...")
    
    results = {}
    
    for dataset_name, df in datasets.items():
        print(f"\n{dataset_name} veri seti ile egitim...")
        
        # Özellikler oluştur
        df = create_synthetic_features(df)
        
        # Özellikler ve hedef
        feature_cols = ['file_size_log', 'lake_id', 'quality_score', 
                        'spectral_band1', 'spectral_band2', 'spectral_band3',
                        'ndwi_simulated', 'wri_simulated']
        
        X = df[feature_cols]
        y = df['quality_label']
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Modeller
        models = {
            'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'SVM': SVC(random_state=42),
            'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000)
        }
        
        dataset_results = {}
        
        for model_name, model in models.items():
            print(f"  {model_name} egitiliyor...")
            
            # Eğitim
            model.fit(X_train, y_train)
            
            # Tahmin
            y_pred = model.predict(X_test)
            
            # Metrikler
            accuracy = accuracy_score(y_test, y_pred)
            
            dataset_results[model_name] = {
                'accuracy': accuracy,
                'y_test': y_test,
                'y_pred': y_pred,
                'model': model
            }
            
            print(f"    Accuracy: {accuracy:.3f}")
        
        results[dataset_name] = dataset_results
    
    return results

def create_comparison_plots(results):
    """Karşılaştırma grafikleri oluştur"""
    print("\nKarsilastirma grafikleri olusturuluyor...")
    
    # 1. Accuracy karşılaştırması
    plt.figure(figsize=(15, 10))
    
    # Accuracy bar plot
    plt.subplot(2, 3, 1)
    accuracy_data = []
    for dataset_name, dataset_results in results.items():
        for model_name, model_results in dataset_results.items():
            accuracy_data.append({
                'Dataset': dataset_name,
                'Model': model_name,
                'Accuracy': model_results['accuracy']
            })
    
    accuracy_df = pd.DataFrame(accuracy_data)
    
    sns.barplot(data=accuracy_df, x='Dataset', y='Accuracy', hue='Model')
    plt.title('Model Accuracy Karşılaştırması')
    plt.xticks(rotation=45)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    
    # 2. Confusion Matrix (Random Forest)
    plt.subplot(2, 3, 2)
    rf_results = results['balanced']['Random Forest']
    cm = confusion_matrix(rf_results['y_test'], rf_results['y_pred'])
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title('Random Forest - Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    
    # 3. Dataset size comparison
    plt.subplot(2, 3, 3)
    dataset_sizes = [len(pd.read_csv(f'data/{name}_tif_mapping.csv')) 
                    for name in ['balanced', 'weighted', 'stratified']]
    dataset_names = ['Balanced', 'Weighted', 'Stratified']
    
    plt.bar(dataset_names, dataset_sizes, color=['skyblue', 'lightgreen', 'lightcoral'])
    plt.title('Veri Seti Boyutları')
    plt.ylabel('Kayıt Sayısı')
    plt.xticks(rotation=45)
    
    # 4. Model performance heatmap
    plt.subplot(2, 3, 4)
    pivot_data = accuracy_df.pivot(index='Model', columns='Dataset', values='Accuracy')
    sns.heatmap(pivot_data, annot=True, fmt='.3f', cmap='YlOrRd')
    plt.title('Model Performance Heatmap')
    
    # 5. Quality distribution
    plt.subplot(2, 3, 5)
    balanced_df = pd.read_csv('data/balanced_tif_mapping.csv')
    quality_dist = balanced_df['quality_label'].value_counts()
    plt.pie(quality_dist.values, labels=quality_dist.index, autopct='%1.1f%%')
    plt.title('Kalite Dağılımı (Balanced)')
    
    # 6. Lake distribution
    plt.subplot(2, 3, 6)
    lake_dist = balanced_df['lake_name'].value_counts()
    plt.bar(range(len(lake_dist)), lake_dist.values, color='lightblue')
    plt.title('Göl Dağılımı (Balanced)')
    plt.xlabel('Göller')
    plt.ylabel('Kayıt Sayısı')
    plt.xticks(range(len(lake_dist)), lake_dist.index, rotation=45)
    
    plt.tight_layout()
    plt.savefig('data/method_comparison.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return accuracy_df

def create_detailed_analysis(results):
    """Detaylı analiz oluştur"""
    print("\nDetayli analiz olusturuluyor...")
    
    analysis = {}
    
    for dataset_name, dataset_results in results.items():
        print(f"\n{dataset_name} detayli analiz:")
        
        dataset_analysis = {
            'best_model': None,
            'best_accuracy': 0,
            'model_performances': {}
        }
        
        for model_name, model_results in dataset_results.items():
            accuracy = model_results['accuracy']
            dataset_analysis['model_performances'][model_name] = accuracy
            
            if accuracy > dataset_analysis['best_accuracy']:
                dataset_analysis['best_accuracy'] = accuracy
                dataset_analysis['best_model'] = model_name
            
            print(f"  {model_name}: {accuracy:.3f}")
        
        print(f"  En iyi model: {dataset_analysis['best_model']} ({dataset_analysis['best_accuracy']:.3f})")
        analysis[dataset_name] = dataset_analysis
    
    return analysis

def create_recommendations(analysis):
    """Öneriler oluştur"""
    print("\nOneriler olusturuluyor...")
    
    recommendations = {
        "1. En İyi Performans": {},
        "2. Veri Seti Önerisi": {},
        "3. Model Önerisi": {},
        "4. Pratik Uygulama": {}
    }
    
    # En iyi performans
    best_overall = 0
    best_combination = None
    
    for dataset_name, dataset_analysis in analysis.items():
        if dataset_analysis['best_accuracy'] > best_overall:
            best_overall = dataset_analysis['best_accuracy']
            best_combination = (dataset_name, dataset_analysis['best_model'])
    
    recommendations["1. En İyi Performans"] = {
        "Veri Seti": best_combination[0],
        "Model": best_combination[1],
        "Accuracy": f"{best_overall:.3f}"
    }
    
    # Veri seti önerisi
    recommendations["2. Veri Seti Önerisi"] = {
        "Küçük Veri": "Balanced (12,054 kayıt) - Dengeli",
        "Büyük Veri": "Weighted (371,607 kayıt) - Ağırlıklı",
        "Orta Veri": "Stratified (211,236 kayıt) - Katmanlı"
    }
    
    # Model önerisi
    recommendations["3. Model Önerisi"] = {
        "Hızlı": "Logistic Regression",
        "Dengeli": "Random Forest",
        "Karmaşık": "SVM"
    }
    
    # Pratik uygulama
    recommendations["4. Pratik Uygulama"] = {
        "Başlangıç": "Balanced + Random Forest",
        "Gelişmiş": "Weighted + Ensemble",
        "Üretim": "Stratified + Cross-validation"
    }
    
    return recommendations

def main():
    """Ana fonksiyon"""
    print("3 farkli yontem karsilastirmasi")
    print("=" * 50)
    
    # Veri setlerini yükle
    datasets = load_datasets()
    
    # Modelleri eğit
    results = train_models(datasets)
    
    # Karşılaştırma grafikleri
    accuracy_df = create_comparison_plots(results)
    
    # Detaylı analiz
    analysis = create_detailed_analysis(results)
    
    # Öneriler
    recommendations = create_recommendations(analysis)
    
    print("\n" + "=" * 50)
    print("SONUCLAR:")
    for category, recs in recommendations.items():
        print(f"\n{category}:")
        for key, value in recs.items():
            print(f"  {key}: {value}")
    print("=" * 50)
    
    return results, analysis, recommendations

if __name__ == "__main__":
    results, analysis, recommendations = main()
