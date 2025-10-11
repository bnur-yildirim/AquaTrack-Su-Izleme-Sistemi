#!/usr/bin/env python3
"""
En iyi modelleri tut, gereksizleri sil
"""

import os
from pathlib import Path
import shutil

def cleanup_models():
    """Model dosyalarını temizle"""
    print("=" * 60)
    print("MODEL TEMİZLİĞİ")
    print("=" * 60)
    
    # TUTULACAK MODELLER
    keep_models = {
        # Su Kalitesi - En İyi
        'models/kmeans_water_quality.pkl',  # Unsupervised (gerçek)
        'models/scaler_water_quality.pkl',
        'models/phase3_no_leakage_best_model.pkl',  # En gerçekçi supervised
        'models/phase3_no_leakage_scaler.pkl',
        'models/water_quality_phase1_model.pth',  # Deep learning base
        
        # Su Miktarı - En İyi (CatBoost Optuna)
        'water_quantity/output/models_optuna/catboost_H1_optuna.pkl',
        'water_quantity/output/models_optuna/catboost_H2_optuna.pkl',
        'water_quantity/output/models_optuna/catboost_H3_optuna.pkl',
    }
    
    # SİLİNECEK MODELLER
    delete_models = [
        'models/water_quality_phase2_model.pth',  # %70 accuracy (data leakage)
        'models/water_quality_phase2_improved_model.pth',  # %8.5 accuracy (başarısız)
        'models/phase3_best_ensemble_model.pkl',  # SMOTE (data leakage)
        'models/phase3_scaler.pkl',
        'models/phase3_real_data_best_model.pkl',  # Data leakage var
        'models/phase3_real_data_scaler.pkl',
    ]
    
    print("\n🗑️  SİLİNECEK MODELLER:")
    for model in delete_models:
        if Path(model).exists():
            size = Path(model).stat().st_size / 1024 / 1024
            print(f"  ❌ {model} ({size:.2f} MB)")
            os.remove(model)
        else:
            print(f"  ⚠️  {model} (zaten yok)")
    
    print("\n✅ TUTULAN MODELLER:")
    for model in keep_models:
        if Path(model).exists():
            size = Path(model).stat().st_size / 1024 / 1024
            print(f"  ✅ {model} ({size:.2f} MB)")
        else:
            print(f"  ⚠️  {model} (bulunamadı)")

def cleanup_logs():
    """Log dosyalarını temizle"""
    print("\n" + "=" * 60)
    print("LOG TEMİZLİĞİ")
    print("=" * 60)
    
    # TUTULACAK LOGLAR
    keep_logs = {
        'data/phase1_training.log',  # Phase 1 (önemli)
        'data/phase3_no_leakage_training.log',  # En gerçekçi sonuç
        'data/lake_processing.log',  # Veri işleme
    }
    
    # SİLİNECEK LOGLAR
    delete_logs = [
        'data/phase2_training.log',
        'data/phase2_improved_training.log',
        'data/phase3_ensemble_training.log',
        'data/phase3_real_data_training.log',
    ]
    
    print("\n🗑️  SİLİNECEK LOGLAR:")
    for log in delete_logs:
        if Path(log).exists():
            size = Path(log).stat().st_size / 1024
            print(f"  ❌ {log} ({size:.1f} KB)")
            os.remove(log)
        else:
            print(f"  ⚠️  {log} (zaten yok)")
    
    print("\n✅ TUTULAN LOGLAR:")
    for log in keep_logs:
        if Path(log).exists():
            size = Path(log).stat().st_size / 1024
            print(f"  ✅ {log} ({size:.1f} KB)")
        else:
            print(f"  ⚠️  {log} (bulunamadı)")

def cleanup_data():
    """Gereksiz veri dosyalarını temizle"""
    print("\n" + "=" * 60)
    print("VERİ TEMİZLİĞİ")
    print("=" * 60)
    
    # TUTULACAK VERILER
    keep_data = {
        'data/b5_b11_combined_features.csv',  # Kaynak veri
        'data/complete_train_dataset.csv',
        'data/complete_val_dataset.csv',
        'data/complete_test_dataset.csv',
        'data/clustered_water_quality.csv',  # Unsupervised sonuçları
        'data/unsupervised_clustering_summary.json',
        'data/phase3_no_leakage_summary.json',  # En gerçekçi sonuç
    }
    
    # SİLİNECEK VERILER
    delete_data = [
        'data/water_quality_phase2_summary.json',
        'data/water_quality_phase2_improved_summary.json',
        'data/phase3_ensemble_summary.json',
        'data/phase3_real_data_summary.json',
    ]
    
    print("\n🗑️  SİLİNECEK VERİ DOSYALARI:")
    for data_file in delete_data:
        if Path(data_file).exists():
            size = Path(data_file).stat().st_size / 1024
            print(f"  ❌ {data_file} ({size:.1f} KB)")
            os.remove(data_file)
        else:
            print(f"  ⚠️  {data_file} (zaten yok)")
    
    print("\n✅ TUTULAN VERİ DOSYALARI:")
    for data_file in keep_data:
        if Path(data_file).exists():
            size = Path(data_file).stat().st_size / 1024
            print(f"  ✅ {data_file} ({size:.1f} KB)")

def create_final_summary():
    """Final özet raporu oluştur"""
    print("\n" + "=" * 60)
    print("FİNAL ÖZET RAPORU")
    print("=" * 60)
    
    summary = """
╔════════════════════════════════════════════════════════════════╗
║                    FİNAL PROJE ÖZETİ                          ║
╚════════════════════════════════════════════════════════════════╝

🌊 SU KALİTESİ ANALİZİ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ EN İYİ MODEL: K-Means Clustering (Unsupervised)
   - Veri: 1,911 gerçek uydu ölçümü
   - Sonuç: 4 doğal cluster
   - Yorumlanabilir: Her göl/durum için pattern
   - Dosya: models/kmeans_water_quality.pkl

✅ ALTERNATİF: Phase 3 No Leakage
   - Model: Random Forest / XGBoost
   - Accuracy: %98-99
   - Features: NDWI, WRI, Chl-a, Turbidity (sadece 2-4)
   - Dosya: models/phase3_no_leakage_best_model.pkl

⚠️  UYARI:
   - Etiketler otomatik formülle oluşturulmuş (gerçek değil)
   - Unsupervised yaklaşım daha güvenilir
   - Data leakage riski nedeniyle dikkatli kullanılmalı

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌊 SU MİKTARI ANALİZİ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ EN İYİ MODEL: CatBoost (Optuna Optimized)
   - Veri: 5,919 train / 1,110 val / 1,080 test
   - Performans: Val R² = 0.8859
   - Horizons: H1 (1 ay), H2 (2 ay), H3 (3 ay)
   - Features: 87 (lag, rolling, trend, NDWI, etc.)
   - Dosya: water_quantity/output/models_optuna/

✅ PERFORMANS:
   - H1 (1 ay): MAE = 5.9M m², RMSE = 12.8M m²
   - H2 (2 ay): MAE = 4.6M m², RMSE = 8.0M m²
   - H3 (3 ay): MAE = 5.2M m², RMSE = 9.1M m²

⚠️  UYARI:
   - Hafif overfitting var (-18M gap)
   - Heavy regularization kullanılıyor
   - Time series için optimize edilmiş

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 TOPLAM EĞİTİM SAYISI: 8+ model
📁 FINAL MODEL SAYISI: 6 dosya
💾 Toplam Boyut: ~12 MB
⏱️  Toplam Eğitim Süresi: ~20 saat (Phase 1 dahil)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    print(summary)
    
    # Summary'yi dosyaya kaydet
    with open('FINAL_PROJECT_SUMMARY.md', 'w', encoding='utf-8') as f:
        f.write(summary)
    
    print("\n✅ Final özet kaydedildi: FINAL_PROJECT_SUMMARY.md")

def main():
    """Ana fonksiyon"""
    print("\n" + "🧹" * 30)
    print("PROJE TEMİZLİĞİ VE FİNAL RAPOR")
    print("🧹" * 30 + "\n")
    
    # Model temizliği
    cleanup_models()
    
    # Log temizliği
    cleanup_logs()
    
    # Veri temizliği
    cleanup_data()
    
    # Final özet
    create_final_summary()
    
    print("\n" + "=" * 60)
    print("✅ TEMİZLİK VE FİNAL RAPOR TAMAMLANDI!")
    print("=" * 60)
    print("\n💡 Sonraki adımlar:")
    print("   1. models/ klasöründe sadece en iyi modeller kaldı")
    print("   2. data/ klasöründe gereksiz dosyalar silindi")
    print("   3. FINAL_PROJECT_SUMMARY.md oluşturuldu")
    print("=" * 60)

if __name__ == "__main__":
    main()
