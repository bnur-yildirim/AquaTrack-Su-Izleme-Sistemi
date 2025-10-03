#!/usr/bin/env python3
"""
all_predictions_final.parquet dosyasındaki tahminlerin tarih aralığını kontrol et
"""

import os
import sys
import pandas as pd
from pathlib import Path

# Add backend to path
sys.path.append(os.path.dirname(__file__))

def check_predictions_parquet():
    """all_predictions_final.parquet dosyasını kontrol et"""
    print("all_predictions_final.parquet dosyasi kontrol ediliyor...")
    
    try:
        # Parquet dosyasının yolu
        parquet_path = Path("models/all_predictions_final.parquet")
        
        if not parquet_path.exists():
            print(f"Dosya bulunamadi: {parquet_path}")
            return
        
        # Parquet dosyasını oku
        df = pd.read_parquet(parquet_path)
        print(f"Toplam kayit sayisi: {len(df)}")
        print(f"Kolonlar: {list(df.columns)}")
        
        # Tarih aralığını kontrol et
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            print(f"Tarih araligi: {df['date'].min()} to {df['date'].max()}")
            
            # Yıllara göre dağılım
            yearly_counts = df['date'].dt.year.value_counts().sort_index()
            print(f"\nYillara gore tahmin sayilari:")
            for year, count in yearly_counts.items():
                print(f"  {year}: {count} tahmin")
        
        # Göl ID'lerine göre dağılım
        if 'lake_id' in df.columns:
            lake_counts = df['lake_id'].value_counts().sort_index()
            print(f"\nGollere gore tahmin sayilari:")
            for lake_id, count in lake_counts.items():
                print(f"  Lake ID {lake_id}: {count} tahmin")
        
        # Horizon'lara göre dağılım
        if 'H' in df.columns:
            horizon_counts = df['H'].value_counts().sort_index()
            print(f"\nHorizon'lara gore tahmin sayilari:")
            for horizon, count in horizon_counts.items():
                print(f"  H{horizon}: {count} tahmin")
        
        # Örnek veri göster
        print(f"\nOrnek tahmin verisi:")
        sample_data = df.head(5)
        for _, row in sample_data.iterrows():
            print(f"  - Lake ID: {row.get('lake_id', 'N/A')}, Date: {row.get('date', 'N/A')}, H: {row.get('H', 'N/A')}, Predicted: {row.get('predicted_water_area_m2', 'N/A')}")
            
    except Exception as e:
        print(f"Parquet kontrol hatasi: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_predictions_parquet()
