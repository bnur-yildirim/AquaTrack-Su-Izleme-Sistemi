#!/usr/bin/env python3
"""
Database veri durumunu kontrol etmek için script
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(__file__))

from database import get_client, get_db
from data_loader_mongodb import get_lake_predictions, get_lakes

def check_database_data():
    """Database'deki veri durumunu kontrol et"""
    print("Database veri durumunu kontrol ediliyor...")
    
    try:
        # Database bağlantısı
        client = get_client()
        db = get_db(client)
        
        # Lakes collection
        lakes_count = db["lakes"].count_documents({})
        print(f"Lakes: {lakes_count} gol")
        
        # Water quantity observations
        obs_count = db["water_quantity_observations"].count_documents({})
        print(f"Water Quantity Observations: {obs_count} gozlem")
        
        # Predictions
        pred_count = db["predictions"].count_documents({})
        print(f"Predictions: {pred_count} tahmin")
        
        # Model prediction history
        pred_history_count = db["model_prediction_history"].count_documents({})
        print(f"Model Prediction History: {pred_history_count} tahmin")
        
        # Lake bilgilerini al
        LAKE_INFO = get_lakes()
        print(f"LAKE_INFO: {len(LAKE_INFO)} gol")
        
        # Her göl için veri durumunu kontrol et
        for lake_key, lake_info in LAKE_INFO.items():
            lake_id = lake_info["id"]
            lake_name = lake_info["name"]
            
            print(f"\n{lake_name} (ID: {lake_id}):")
            
            # Observations
            obs_count = db["water_quantity_observations"].count_documents({"lake_id": lake_id})
            print(f"  - Observations: {obs_count}")
            
            # Predictions
            pred_count = db["predictions"].count_documents({"lake_id": lake_id})
            print(f"  - Predictions: {pred_count}")
            
            # Model prediction history
            pred_history_count = db["model_prediction_history"].count_documents({"lake_id": lake_id})
            print(f"  - Model Prediction History: {pred_history_count}")
            
            # get_lake_predictions ile test et
            try:
                lake_data = get_lake_predictions(lake_id)
                if lake_data is not None and not lake_data.empty:
                    print(f"  - get_lake_predictions: {len(lake_data)} kayıt")
                    print(f"  - Date range: {lake_data['date'].min()} to {lake_data['date'].max()}")
                    
                    # target_water_area_m2 kontrolü
                    valid_targets = lake_data.dropna(subset=['target_water_area_m2'])
                    print(f"  - Valid targets: {len(valid_targets)}")
                    
                    if len(valid_targets) > 0:
                        print(f"  - Target range: {valid_targets['target_water_area_m2'].min():.0f} - {valid_targets['target_water_area_m2'].max():.0f} m²")
                else:
                    print(f"  - get_lake_predictions: No data")
            except Exception as e:
                print(f"  - get_lake_predictions error: {e}")
        
        # Örnek veri göster
        print(f"\nOrnek observation verisi:")
        sample_obs = list(db["water_quantity_observations"].find().limit(3))
        for obs in sample_obs:
            print(f"  - Lake ID: {obs['lake_id']}, Date: {obs['date']}, Area: {obs['water_area_m2']} m2")
        
        print(f"\nOrnek prediction verisi:")
        sample_pred = list(db["predictions"].find().limit(3))
        for pred in sample_pred:
            print(f"  - Lake ID: {pred['lake_id']}, Date: {pred['date']}, Outputs: {pred.get('outputs', {})}")
        
        print(f"\nOrnek model prediction history verisi:")
        sample_pred_history = list(db["model_prediction_history"].find().limit(3))
        for pred in sample_pred_history:
            print(f"  - Lake ID: {pred['lake_id']}, Date: {pred['date']}, Model: {pred.get('model_id', 'N/A')}, Horizon: {pred.get('horizon', 'N/A')}")
            
    except Exception as e:
        print(f"Database kontrol hatasi: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_database_data()
