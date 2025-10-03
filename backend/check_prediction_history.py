#!/usr/bin/env python3
"""
Model prediction history collection'ındaki veri yapısını kontrol et
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(__file__))

from database import get_client, get_db

def check_prediction_history():
    """Model prediction history collection'ını kontrol et"""
    print("Model prediction history collection kontrol ediliyor...")
    
    try:
        # Database bağlantısı
        client = get_client()
        db = get_db(client)
        
        # Model prediction history collection
        pred_history_count = db["model_prediction_history"].count_documents({})
        print(f"Model Prediction History: {pred_history_count} tahmin")
        
        # Örnek veri göster
        print(f"\nOrnek model prediction history verisi:")
        sample_pred = list(db["model_prediction_history"].find().limit(5))
        for i, pred in enumerate(sample_pred):
            print(f"\n{i+1}. Tahmin:")
            print(f"  - Lake ID: {pred.get('lake_id', 'N/A')}")
            print(f"  - Date: {pred.get('date', 'N/A')}")
            print(f"  - Model ID: {pred.get('model_id', 'N/A')}")
            print(f"  - Horizon: {pred.get('horizon', 'N/A')}")
            print(f"  - Prediction Type: {pred.get('prediction_type', 'N/A')}")
            print(f"  - Outputs: {pred.get('outputs', {})}")
            print(f"  - Keys: {list(pred.keys())}")
        
        # Van Gölü için özel kontrol
        print(f"\nVan Golu (ID: 141) icin tahminler:")
        van_predictions = list(db["model_prediction_history"].find({"lake_id": 141}).limit(3))
        for pred in van_predictions:
            print(f"  - Date: {pred.get('date', 'N/A')}")
            print(f"  - Outputs: {pred.get('outputs', {})}")
            if 'outputs' in pred and isinstance(pred['outputs'], dict):
                for key, value in pred['outputs'].items():
                    print(f"    - {key}: {value}")
        
        # Tarih aralığını kontrol et
        print(f"\nTarih araligi kontrol:")
        date_range = db["model_prediction_history"].aggregate([
            {
                "$group": {
                    "_id": None,
                    "min_date": {"$min": "$date"},
                    "max_date": {"$max": "$date"}
                }
            }
        ])
        for result in date_range:
            print(f"  - Min Date: {result['min_date']}")
            print(f"  - Max Date: {result['max_date']}")
            
    except Exception as e:
        print(f"Model prediction history kontrol hatasi: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_prediction_history()
