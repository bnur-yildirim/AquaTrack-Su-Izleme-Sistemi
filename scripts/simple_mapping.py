#!/usr/bin/env python3
"""
Basit TIF dosya eşleştirme
"""

import pandas as pd
import os
from pathlib import Path

def create_simple_mapping():
    """Basit eşleştirme oluştur"""
    print("Basit TIF eslestirme olusturuluyor...")
    
    # Spektral veriyi yükle
    spectral_df = pd.read_csv('data/b5_b11_combined_features.csv')
    print(f"Spektral veri: {len(spectral_df)} kayit")
    
    # TIF dosyalarını tara
    tif_files = []
    lake_dirs = ['gol_van', 'gol_tuz', 'gol_burdur', 'gol_egridir', 'gol_ulubat', 'gol_sapanca', 'gol_salda']
    
    for lake_dir in lake_dirs:
        lake_path = Path(f'data/{lake_dir}')
        if lake_path.exists():
            print(f"{lake_dir} taranıyor...")
            
            # Tüm alt klasörleri tara
            for root, dirs, files in os.walk(lake_path):
                for file in files:
                    if file.endswith('.tif'):
                        tif_files.append({
                            'file_path': os.path.join(root, file),
                            'lake_dir': lake_dir,
                            'filename': file
                        })
    
    tif_df = pd.DataFrame(tif_files)
    print(f"Toplam TIF dosyasi: {len(tif_df)}")
    
    # Göl dağılımı
    print("Gol dagilimi:")
    print(tif_df['lake_dir'].value_counts())
    
    # Basit etiket oluştur
    labels = []
    for idx, tif_row in tif_df.iterrows():
        if idx % 10000 == 0:
            print(f"Isleniyor: {idx}/{len(tif_df)}")
        
        # Basit kalite skoru (rastgele)
        import random
        quality_score = random.uniform(0.2, 0.9)
        
        if quality_score >= 0.8:
            quality_label = 'excellent'
        elif quality_score >= 0.6:
            quality_label = 'good'
        elif quality_score >= 0.4:
            quality_label = 'fair'
        else:
            quality_label = 'poor'
        
        labels.append({
            'file_path': tif_row['file_path'],
            'filename': tif_row['filename'],
            'lake_name': tif_row['lake_dir'],
            'quality_label': quality_label,
            'quality_score': quality_score
        })
    
    labels_df = pd.DataFrame(labels)
    
    # Dosyaya kaydet
    labels_df.to_csv('data/simple_tif_mapping.csv', index=False)
    print(f"Basit eslestirme kaydedildi: {len(labels_df)} kayit")
    
    return labels_df

def main():
    """Ana fonksiyon"""
    print("Basit TIF eslestirme...")
    print("=" * 40)
    
    labels_df = create_simple_mapping()
    
    if not labels_df.empty:
        print(f"\nSonuc:")
        print(f"Toplam dosya: {len(labels_df)}")
        print(f"Gol dagilimi:")
        print(labels_df['lake_name'].value_counts())
        print(f"Kalite dagilimi:")
        print(labels_df['quality_label'].value_counts())

if __name__ == "__main__":
    main()
