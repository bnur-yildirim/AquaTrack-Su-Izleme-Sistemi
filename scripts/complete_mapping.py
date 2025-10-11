#!/usr/bin/env python3
"""
Tüm gölleri TIF dosyaları ile eşleştirme - Geliştirilmiş versiyon
"""

import pandas as pd
import os
from pathlib import Path
import numpy as np

def find_all_tif_files():
    """Tüm TIF dosyalarını bul"""
    print("Tum TIF dosyalari bulunuyor...")
    
    tif_files = []
    lake_dirs = ['gol_van', 'gol_tuz', 'gol_burdur', 'gol_egridir', 'gol_ulubat', 'gol_sapanca', 'gol_salda']
    
    for lake_dir in lake_dirs:
        lake_path = Path(f'data/{lake_dir}')
        if lake_path.exists():
            print(f"{lake_dir} klasoru taranıyor...")
            
            # Tüm alt klasörleri tara
            for root, dirs, files in os.walk(lake_path):
                for file in files:
                    if file.endswith('.tif'):
                        tif_files.append({
                            'file_path': os.path.join(root, file),
                            'lake_dir': lake_dir,
                            'filename': file,
                            'file_size': os.path.getsize(os.path.join(root, file))
                        })
    
    tif_df = pd.DataFrame(tif_files)
    print(f"Toplam TIF dosyasi: {len(tif_df)}")
    
    if len(tif_df) > 0:
        print(f"Gol dagilimi:")
        print(tif_df['lake_dir'].value_counts())
        
        # Dosya türlerini analiz et
        tif_df['band_type'] = tif_df['filename'].apply(lambda x: x.split('.')[0].split('_')[-1] if '_' in x else 'unknown')
        tif_df['is_rgb'] = tif_df['filename'].str.contains('image')
        tif_df['is_swir'] = tif_df['filename'].str.contains('B5_B11')
        tif_df['is_ndwi'] = tif_df['filename'].str.contains('ndwi', case=False)
        
        return tif_df
    else:
        print("TIF dosyasi bulunamadi!")
        return pd.DataFrame()

def create_spectral_labels_from_tif():
    """TIF dosyalarından spektral etiketler oluştur"""
    print("\nTIF dosyalarindan spektral etiketler olusturuluyor...")
    
    try:
        # TIF dosyalarını yükle
        tif_df = find_all_tif_files()
        if tif_df.empty:
            return pd.DataFrame()
        
        # Mevcut spektral veriyi yükle
        spectral_df = pd.read_csv('data/b5_b11_combined_features.csv')
        print(f"Spektral veri: {len(spectral_df)} kayit")
        
        # Göl adı eşleştirme
        lake_mapping = {
            'gol_van': 'Van Gölü',
            'gol_tuz': 'Tuz Gölü', 
            'gol_burdur': 'Burdur Gölü',
            'gol_egridir': 'Eğridir Gölü',
            'gol_ulubat': 'Ulubat Gölü',
            'gol_sapanca': 'Sapanca Gölü',
            'gol_salda': 'Salda Gölü'
        }
        
        labels = []
        matched_count = 0
        
        for idx, tif_row in tif_df.iterrows():
            if idx % 1000 == 0:
                print(f"Isleniyor: {idx}/{len(tif_df)}")
            
            # Dosya adından tarihi çıkar (farklı formatları dene)
            filename = tif_row['filename']
            date_str = None
            
            # Format 1: 20180120_tile10_image.B2.tif
            if filename.startswith('20') and len(filename) >= 8:
                date_str = filename[:8]
            # Format 2: Diğer formatlar için
            else:
                # Dosya adından sayıları çıkar
                import re
                numbers = re.findall(r'\d{8}', filename)
                if numbers:
                    date_str = numbers[0]
            
            if date_str:
                date_formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                
                # Göl adını eşleştir
                lake_name = lake_mapping.get(tif_row['lake_dir'], tif_row['lake_dir'])
                
                # Spektral veri bul
                matching_spectral = spectral_df[
                    (spectral_df['lake_name'] == lake_name) & 
                    (spectral_df['date'] == date_formatted)
                ]
                
                if not matching_spectral.empty:
                    spectral_row = matching_spectral.iloc[0]
                    
                    # Kalite skoru hesapla
                    ndwi = spectral_row['ndwi_mean']
                    wri = spectral_row['wri_mean']
                    chl_a = spectral_row['chl_a_mean']
                    turbidity = spectral_row['turbidity_mean']
                    
                    quality_score = 0
                    
                    # NDWI skoru
                    if ndwi > 0.7:
                        quality_score += 0.3
                    elif ndwi > 0.4:
                        quality_score += 0.2
                    elif ndwi > 0.1:
                        quality_score += 0.1
                    
                    # WRI skoru
                    if wri > 1.5:
                        quality_score += 0.3
                    elif wri > 1.0:
                        quality_score += 0.2
                    elif wri > 0.5:
                        quality_score += 0.1
                    
                    # Chl-a skoru
                    if chl_a < 0.1:
                        quality_score += 0.2
                    elif chl_a < 0.3:
                        quality_score += 0.1
                    else:
                        quality_score += 0.05
                    
                    # Turbidity skoru
                    if turbidity < 0.5:
                        quality_score += 0.2
                    elif turbidity < 1.0:
                        quality_score += 0.1
                    else:
                        quality_score += 0.05
                    
                    # Etiket atama
                    if quality_score >= 0.8:
                        quality_label = 'excellent'
                    elif quality_score >= 0.6:
                        quality_label = 'good'
                    elif quality_score >= 0.4:
                        quality_label = 'fair'
                    elif quality_score >= 0.2:
                        quality_label = 'poor'
                    else:
                        quality_label = 'critical'
                    
                    labels.append({
                        'file_path': tif_row['file_path'],
                        'filename': tif_row['filename'],
                        'lake_name': lake_name,
                        'date': date_formatted,
                        'quality_label': quality_label,
                        'quality_score': quality_score,
                        'ndwi_mean': ndwi,
                        'wri_mean': wri,
                        'chl_a_mean': chl_a,
                        'turbidity_mean': turbidity,
                        'band_type': tif_row['band_type'],
                        'is_rgb': tif_row['is_rgb'],
                        'is_swir': tif_row['is_swir'],
                        'is_ndwi': tif_row['is_ndwi']
                    })
                    matched_count += 1
        
        labels_df = pd.DataFrame(labels)
        
        print(f"Eslesen dosya: {matched_count}/{len(tif_df)} ({matched_count/len(tif_df)*100:.1f}%)")
        
        if not labels_df.empty:
            print(f"Kalite dagilimi:")
            print(labels_df['quality_label'].value_counts())
            print(f"Gol dagilimi:")
            print(labels_df['lake_name'].value_counts())
        
        return labels_df
        
    except Exception as e:
        print(f"Hata: {e}")
        return pd.DataFrame()

def split_complete_dataset():
    """Tam veri setini böl"""
    print("\nTam veri seti bolunuyor...")
    
    try:
        labels_df = create_spectral_labels_from_tif()
        
        if labels_df.empty:
            print("Etiket verisi bulunamadi!")
            return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()
        
        # Zaman bazlı split
        labels_df['date'] = pd.to_datetime(labels_df['date'])
        labels_df = labels_df.sort_values('date')
        
        # 2018-2021: Train, 2022: Validation, 2023-2024: Test
        train_df = labels_df[labels_df['date'].dt.year <= 2021]
        val_df = labels_df[labels_df['date'].dt.year == 2022]
        test_df = labels_df[labels_df['date'].dt.year >= 2023]
        
        print(f"Train: {len(train_df)} kayit")
        print(f"Validation: {len(val_df)} kayit")
        print(f"Test: {len(test_df)} kayit")
        
        # Dosyalara kaydet
        train_df.to_csv('data/complete_train_dataset.csv', index=False)
        val_df.to_csv('data/complete_val_dataset.csv', index=False)
        test_df.to_csv('data/complete_test_dataset.csv', index=False)
        
        print("Tam veri seti bolumleri kaydedildi")
        
        return train_df, val_df, test_df
        
    except Exception as e:
        print(f"Hata: {e}")
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

def main():
    """Ana fonksiyon"""
    print("Tum golleri TIF dosyalari ile eslestirme...")
    print("=" * 60)
    
    # Tam veri setini oluştur
    train_df, val_df, test_df = split_complete_dataset()
    
    if not train_df.empty:
        print(f"\nSonuc:")
        print(f"Toplam eslesen dosya: {len(train_df) + len(val_df) + len(test_df)}")
        print(f"Gol dagilimi:")
        all_df = pd.concat([train_df, val_df, test_df])
        print(all_df['lake_name'].value_counts())
        print(f"Kalite dagilimi:")
        print(all_df['quality_label'].value_counts())
    else:
        print("Eslestirme yapilamadi!")

if __name__ == "__main__":
    main()
