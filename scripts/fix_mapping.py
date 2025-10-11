#!/usr/bin/env python3
"""
Tüm gölleri TIF dosyaları ile eşleştirme
"""

import pandas as pd
import os
from pathlib import Path

def fix_lake_mapping():
    """Tüm gölleri TIF dosyaları ile eşleştir"""
    print("Tum golleri TIF dosyalari ile eslestiriliyor...")
    
    # Spektral veriyi yükle
    spectral_df = pd.read_csv('data/b5_b11_combined_features.csv')
    print(f"Spektral veri: {len(spectral_df)} kayit")
    print(f"Goller: {spectral_df['lake_name'].unique()}")
    
    # TIF dosyalarını tara
    tif_files = []
    lake_dirs = ['gol_van', 'gol_tuz', 'gol_burdur', 'gol_egridir', 'gol_ulubat', 'gol_sapanca', 'gol_salda']
    
    for lake_dir in lake_dirs:
        lake_path = Path(f'data/{lake_dir}')
        if lake_path.exists():
            print(f"{lake_dir} klasoru taranıyor...")
            
            # Yıl klasörlerini tara
            for year_dir in lake_path.iterdir():
                if year_dir.is_dir() and year_dir.name.isdigit():
                    images_dir = year_dir / 'images'
                    if images_dir.exists():
                        # TIF dosyalarını bul
                        for tif_file in images_dir.glob('*.tif'):
                            tif_files.append({
                                'file_path': str(tif_file),
                                'lake_dir': lake_dir,
                                'year': year_dir.name,
                                'filename': tif_file.name,
                                'file_size': tif_file.stat().st_size
                            })
    
    tif_df = pd.DataFrame(tif_files)
    print(f"Toplam TIF dosyasi: {len(tif_df)}")
    
    if len(tif_df) > 0:
        # Dosya türlerini analiz et
        tif_df['band_type'] = tif_df['filename'].apply(lambda x: x.split('.')[0].split('_')[-1])
        tif_df['date'] = tif_df['filename'].apply(lambda x: x.split('_')[0])
        tif_df['tile_id'] = tif_df['filename'].apply(lambda x: x.split('_')[1])
        
        # Bant türlerini ayır
        tif_df['is_rgb'] = tif_df['filename'].str.contains('image')
        tif_df['is_swir'] = tif_df['filename'].str.contains('B5_B11')
        
        print(f"Gol dagilimi:")
        print(tif_df['lake_dir'].value_counts())
        
        return tif_df
    else:
        print("TIF dosyasi bulunamadi!")
        return pd.DataFrame()

def create_improved_mapping():
    """Geliştirilmiş eşleştirme oluştur"""
    print("\nGelistirilmis eslestirme olusturuluyor...")
    
    try:
        # Spektral veriyi yükle
        spectral_df = pd.read_csv('data/b5_b11_combined_features.csv')
        
        # TIF dosyalarını yükle
        tif_df = fix_lake_mapping()
        if tif_df.empty:
            return pd.DataFrame()
        
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
        
        mapping = []
        matched_count = 0
        
        for idx, tif_row in tif_df.iterrows():
            if idx % 1000 == 0:
                print(f"Eslesiyor: {idx}/{len(tif_df)}")
            
            # Dosya adından tarihi çıkar
            date_str = tif_row['filename'].split('_')[0]
            date_formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            
            # Göl adını eşleştir
            lake_name = lake_mapping.get(tif_row['lake_dir'], tif_row['lake_dir'])
            
            # Etiket bul
            matching_label = spectral_df[
                (spectral_df['lake_name'] == lake_name) & 
                (spectral_df['date'] == date_formatted)
            ]
            
            if not matching_label.empty:
                label_row = matching_label.iloc[0]
                mapping.append({
                    'file_path': tif_row['file_path'],
                    'filename': tif_row['filename'],
                    'lake_name': lake_name,
                    'date': date_formatted,
                    'quality_label': 'unknown',  # Geçici
                    'quality_score': 0.5,  # Geçici
                    'ndwi_mean': label_row['ndwi_mean'],
                    'wri_mean': label_row['wri_mean'],
                    'chl_a_mean': label_row['chl_a_mean'],
                    'turbidity_mean': label_row['turbidity_mean'],
                    'band_type': tif_row['band_type'],
                    'is_rgb': tif_row['is_rgb'],
                    'is_swir': tif_row['is_swir']
                })
                matched_count += 1
        
        mapping_df = pd.DataFrame(mapping)
        
        print(f"Eslesen dosya: {matched_count}/{len(tif_df)} ({matched_count/len(tif_df)*100:.1f}%)")
        
        # Dosyaya kaydet
        mapping_df.to_csv('data/improved_tif_mapping.csv', index=False)
        print(f"Gelistirilmis eslestirme kaydedildi: data/improved_tif_mapping.csv")
        
        return mapping_df
        
    except Exception as e:
        print(f"Hata: {e}")
        return pd.DataFrame()

def main():
    """Ana fonksiyon"""
    print("Tum golleri TIF dosyalari ile eslestirme...")
    print("=" * 60)
    
    # Geliştirilmiş eşleştirme oluştur
    mapping_df = create_improved_mapping()
    
    if not mapping_df.empty:
        print(f"\nSonuc:")
        print(f"Toplam eslesen dosya: {len(mapping_df)}")
        print(f"Gol dagilimi:")
        print(mapping_df['lake_name'].value_counts())
        print(f"Tarih araligi: {mapping_df['date'].min()} - {mapping_df['date'].max()}")
    else:
        print("Eslestirme yapilamadi!")

if __name__ == "__main__":
    main()
