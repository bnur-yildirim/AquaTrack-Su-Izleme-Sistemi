#!/usr/bin/env python3
"""
Populate lakes collection with lake information
"""

import os
import sys
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

from database import get_client, get_db, insert_lake
from models import Lake

def populate_lakes():
    """Populate the lakes collection with lake information"""
    print("🔄 Populating lakes collection...")
    
    # Lake information from the hardcoded data
    lakes_data = [
        {
            "lake_id": 140,
            "name": "Tuz Gölü",
            "location": {"lat": 40.0, "lon": 30.0},
            "area_km2": 1500.0,
            "basin": "İç Anadolu",
            "altitude_m": 905.0,
            "extra_info": {"tuzluluk": "çok yüksek", "tip": "tuz gölü"}
        },
        {
            "lake_id": 141,
            "name": "Van Gölü",
            "location": {"lat": 38.4942, "lon": 43.3832},
            "area_km2": 3755.0,
            "basin": "Doğu Anadolu",
            "altitude_m": 1646.0,
            "extra_info": {"tuzluluk": "yüksek", "tip": "soda gölü"}
        },
        {
            "lake_id": 1321,
            "name": "Ulubat Gölü",
            "location": {"lat": 40.1833, "lon": 28.9833},
            "area_km2": 135.0,
            "basin": "Marmara",
            "altitude_m": 5.0,
            "extra_info": {"tuzluluk": "düşük", "tip": "tatlı su"}
        },
        {
            "lake_id": 1340,
            "name": "Eğridir Gölü",
            "location": {"lat": 39.0, "lon": 32.0},
            "area_km2": 482.0,
            "basin": "Akdeniz",
            "altitude_m": 916.0,
            "extra_info": {"tuzluluk": "düşük", "tip": "tatlı su"}
        },
        {
            "lake_id": 1342,
            "name": "Burdur Gölü",
            "location": {"lat": 37.7167, "lon": 30.2833},
            "area_km2": 250.0,
            "basin": "Akdeniz",
            "altitude_m": 845.0,
            "extra_info": {"tuzluluk": "yüksek", "tip": "tuzlu su"}
        },
        {
            "lake_id": 14510,
            "name": "Sapanca Gölü",
            "location": {"lat": 40.7167, "lon": 30.2667},
            "area_km2": 45.0,
            "basin": "Marmara",
            "altitude_m": 30.0,
            "extra_info": {"tuzluluk": "düşük", "tip": "tatlı su"}
        },
        {
            "lake_id": 14741,
            "name": "Salda Gölü",
            "location": {"lat": 37.5500, "lon": 29.6833},
            "area_km2": 45.0,
            "basin": "Akdeniz",
            "altitude_m": 1139.0,
            "extra_info": {"tuzluluk": "yüksek", "tip": "soda gölü", "özellik": "Mars benzeri"}
        }
    ]
    
    try:
        # Connect to MongoDB
        client = get_client()
        db = get_db(client)
        
        # Insert lakes
        inserted_count = 0
        for lake_data in lakes_data:
            lake = Lake(**lake_data)
            insert_lake(db, lake)
            print(f"✅ Inserted lake: {lake.name} (ID: {lake.lake_id})")
            inserted_count += 1
        
        client.close()
        print(f"\n🎉 Successfully inserted {inserted_count} lakes into the database!")
        return True
        
    except Exception as e:
        print(f"❌ Error populating lakes: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = populate_lakes()
    if success:
        print("\n✅ Lakes collection populated successfully!")
    else:
        print("\n❌ Failed to populate lakes collection.")
        sys.exit(1)
