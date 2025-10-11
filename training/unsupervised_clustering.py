#!/usr/bin/env python3
"""
UNSUPERVISED LEARNING - Su Kalitesi Clustering
Etiket OLMADAN doğal grupları bul!
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import warnings
warnings.filterwarnings('ignore')

def load_real_spectral_data():
    """Gerçek spektral verileri yükle"""
    print("=" * 60)
    print("GERÇEK UYDU VERİLERİNİ YÜKLEME")
    print("=" * 60)
    
    df = pd.read_csv('data/water_quality/b5_b11_combined_features.csv')
    print(f"Toplam ölçüm: {len(df)}")
    print(f"Göller: {df['lake_name'].unique()}")
    print(f"Tarih aralığı: {df['date'].min()} - {df['date'].max()}")
    
    return df

def explore_features(df):
    """Özellikleri keşfet"""
    print("\n" + "=" * 60)
    print("VERİ KEŞFİ")
    print("=" * 60)
    
    features = ['ndwi_mean', 'wri_mean', 'chl_a_mean', 'turbidity_mean']
    
    print("\nÖzellik İstatistikleri:")
    print(df[features].describe())
    
    # Korelasyon
    print("\nKorelasyon:")
    corr = df[features].corr()
    print(corr)
    
    return features

def apply_kmeans_clustering(df, features, n_clusters=4):
    """K-Means Clustering - Doğal grupları bul"""
    print("\n" + "=" * 60)
    print(f"K-MEANS CLUSTERING ({n_clusters} grup)")
    print("=" * 60)
    
    # Veriyi hazırla
    X = df[features].values
    
    # Normalize et (ÖNEMLİ!)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # K-Means uygula
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X_scaled)
    
    # Cluster'ları ekle
    df['cluster'] = clusters
    
    # Her cluster'ı analiz et
    print("\nCLUSTER ANALİZİ:")
    print("=" * 60)
    
    for i in range(n_clusters):
        cluster_data = df[df['cluster'] == i]
        print(f"\n🔵 CLUSTER {i}: {len(cluster_data)} örnek ({len(cluster_data)/len(df)*100:.1f}%)")
        print(f"   Göller: {cluster_data['lake_name'].value_counts().to_dict()}")
        print("\n   Ortalama Değerler:")
        for feat in features:
            mean_val = cluster_data[feat].mean()
            std_val = cluster_data[feat].std()
            print(f"   - {feat:20s}: {mean_val:8.2f} (±{std_val:.2f})")
        
        # YORUMLAMA
        ndwi = cluster_data['ndwi_mean'].mean()
        turb = cluster_data['turbidity_mean'].mean()
        chl = cluster_data['chl_a_mean'].mean()
        
        interpretation = ""
        if ndwi > 5 and turb < 2:
            interpretation = "✅ ÇOK TEMİZ SULAR"
        elif ndwi > 2 and turb < 5:
            interpretation = "✅ TEMİZ SULAR"
        elif chl > 1500:
            interpretation = "🟡 ALG PATLAMASI (Chlorophyll-a yüksek)"
        elif turb > 10:
            interpretation = "🔴 ÇOK BULANIK"
        elif turb > 5:
            interpretation = "🟡 BULANIK"
        else:
            interpretation = "🟢 ORTA KALİTE"
        
        print(f"\n   💡 YORUM: {interpretation}")
    
    return df, clusters, scaler, kmeans

def visualize_clusters(df, features):
    """Cluster'ları görselleştir"""
    print("\n" + "=" * 60)
    print("GÖRSELLEŞTİRME")
    print("=" * 60)
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    # 1. NDWI vs Turbidity
    ax = axes[0, 0]
    for cluster in df['cluster'].unique():
        cluster_data = df[df['cluster'] == cluster]
        ax.scatter(cluster_data['ndwi_mean'], cluster_data['turbidity_mean'], 
                  label=f'Cluster {cluster}', alpha=0.6, s=50)
    ax.set_xlabel('NDWI Mean', fontsize=12)
    ax.set_ylabel('Turbidity Mean', fontsize=12)
    ax.set_title('NDWI vs Turbidity (Cluster\'lara Göre)', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # 2. WRI vs Chlorophyll-a
    ax = axes[0, 1]
    for cluster in df['cluster'].unique():
        cluster_data = df[df['cluster'] == cluster]
        ax.scatter(cluster_data['wri_mean'], cluster_data['chl_a_mean'], 
                  label=f'Cluster {cluster}', alpha=0.6, s=50)
    ax.set_xlabel('WRI Mean', fontsize=12)
    ax.set_ylabel('Chlorophyll-a Mean', fontsize=12)
    ax.set_title('WRI vs Chlorophyll-a (Cluster\'lara Göre)', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # 3. Cluster Sizes
    ax = axes[0, 2]
    cluster_counts = df['cluster'].value_counts().sort_index()
    colors = plt.cm.viridis(np.linspace(0, 1, len(cluster_counts)))
    ax.bar(cluster_counts.index, cluster_counts.values, color=colors, alpha=0.8)
    ax.set_xlabel('Cluster', fontsize=12)
    ax.set_ylabel('Örnek Sayısı', fontsize=12)
    ax.set_title('Cluster Boyutları', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3, axis='y')
    
    # 4. Lake Distribution per Cluster
    ax = axes[1, 0]
    lake_cluster = pd.crosstab(df['cluster'], df['lake_name'])
    lake_cluster.plot(kind='bar', stacked=True, ax=ax, colormap='tab10')
    ax.set_xlabel('Cluster', fontsize=12)
    ax.set_ylabel('Örnek Sayısı', fontsize=12)
    ax.set_title('Her Cluster\'da Hangi Göller Var?', fontsize=14, fontweight='bold')
    ax.legend(title='Göl', bbox_to_anchor=(1.05, 1), loc='upper left')
    ax.grid(True, alpha=0.3, axis='y')
    
    # 5. Feature Heatmap per Cluster
    ax = axes[1, 1]
    cluster_means = df.groupby('cluster')[features].mean()
    # Normalize for better visualization
    cluster_means_norm = (cluster_means - cluster_means.min()) / (cluster_means.max() - cluster_means.min())
    sns.heatmap(cluster_means_norm.T, annot=True, fmt='.2f', cmap='YlOrRd', ax=ax, cbar_kws={'label': 'Normalized Value'})
    ax.set_xlabel('Cluster', fontsize=12)
    ax.set_ylabel('Özellik', fontsize=12)
    ax.set_title('Her Cluster\'ın Özellikleri (Normalize)', fontsize=14, fontweight='bold')
    
    # 6. PCA - 2D projection
    ax = axes[1, 2]
    X = df[features].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    
    for cluster in df['cluster'].unique():
        mask = df['cluster'] == cluster
        ax.scatter(X_pca[mask, 0], X_pca[mask, 1], 
                  label=f'Cluster {cluster}', alpha=0.6, s=50)
    ax.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}%)', fontsize=12)
    ax.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}%)', fontsize=12)
    ax.set_title('PCA - 2D Projeksiyon', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('data/unsupervised_clustering_analysis.png', dpi=300, bbox_inches='tight')
    print("✅ Görsel kaydedildi: data/unsupervised_clustering_analysis.png")
    plt.show()

def save_results(df, kmeans, scaler):
    """Sonuçları kaydet"""
    print("\n" + "=" * 60)
    print("SONUÇLARI KAYDETME")
    print("=" * 60)
    
    # Cluster'lı veriyi kaydet
    df.to_csv('data/clustered_water_quality.csv', index=False)
    print("✅ Cluster'lı veri: data/clustered_water_quality.csv")
    
    # Model'i kaydet
    import pickle
    with open('models/kmeans_water_quality.pkl', 'wb') as f:
        pickle.dump(kmeans, f)
    with open('models/scaler_water_quality.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    print("✅ Model: models/kmeans_water_quality.pkl")
    
    # Özet rapor
    summary = {
        'total_samples': len(df),
        'n_clusters': len(df['cluster'].unique()),
        'cluster_distribution': df['cluster'].value_counts().to_dict(),
        'cluster_interpretations': {}
    }
    
    for i in df['cluster'].unique():
        cluster_data = df[df['cluster'] == i]
        summary['cluster_interpretations'][f'cluster_{i}'] = {
            'size': len(cluster_data),
            'percentage': len(cluster_data) / len(df) * 100,
            'avg_ndwi': float(cluster_data['ndwi_mean'].mean()),
            'avg_turbidity': float(cluster_data['turbidity_mean'].mean()),
            'avg_chl_a': float(cluster_data['chl_a_mean'].mean()),
            'lakes': cluster_data['lake_name'].value_counts().to_dict()
        }
    
    import json
    with open('data/unsupervised_clustering_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    print("✅ Özet: data/unsupervised_clustering_summary.json")

def main():
    """Ana fonksiyon"""
    print("\n" + "🔬" * 30)
    print("UNSUPERVISED LEARNING - SU KALİTESİ CLUSTERİNG")
    print("ETİKET OLMADAN DOĞAL GRUPLARI BUL!")
    print("🔬" * 30 + "\n")
    
    # 1. Veriyi yükle
    df = load_real_spectral_data()
    
    # 2. Özellikleri keşfet
    features = explore_features(df)
    
    # 3. Clustering uygula
    df, clusters, scaler, kmeans = apply_kmeans_clustering(df, features, n_clusters=4)
    
    # 4. Görselleştir
    visualize_clusters(df, features)
    
    # 5. Sonuçları kaydet
    save_results(df, kmeans, scaler)
    
    print("\n" + "=" * 60)
    print("✅ UNSUPERVISED LEARNING TAMAMLANDI!")
    print("=" * 60)
    print("\n💡 ŞİMDİ NE OLDU?")
    print("   1. Model verilerİ 4 DOĞAL GRUBA ayırdı")
    print("   2. ETİKET kullanmadı - sadece patternleri buldu")
    print("   3. Sen şimdi bu grupları YORUMLUYORSUN:")
    print("      - Hangi grup 'temiz sular'?")
    print("      - Hangi grup 'kirli sular'?")
    print("      - Hangi grup 'alg patlaması'?")
    print("\n   Bu, gerçek dünyada nasıl çalışır!")
    print("=" * 60 + "\n")
    
    return df, kmeans, scaler

if __name__ == "__main__":
    df, kmeans, scaler = main()

