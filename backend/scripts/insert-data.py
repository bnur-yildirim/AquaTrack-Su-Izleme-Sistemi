from models import Lake
from database import insert_lake, get_client, get_db

# --------------------------
# Lake info dictionary
# --------------------------
LAKE_INFO = {
    "tuz": {
        "id": 140,
        "name": "Tuz Gölü",
        "lat": 40.0,
        "lng": 30.0,
        "area_km2": 1500,
        "basin": "İç Anadolu",
        "altitude_m": 905,
        "extra_info": {"tuzluluk": "çok yüksek"},
    },
    "van": {
        "id": 141,
        "name": "Van Gölü",
        "lat": 38.4942,
        "lng": 43.3832,
        "area_km2": 3755,
        "basin": "Doğu Anadolu",
        "altitude_m": 1640,
        "extra_info": {"göl_türü": "soda gölü"},
    },
    "ulubat": {
        "id": 1321,
        "name": "Ulubat Gölü",
        "lat": 40.1833,
        "lng": 28.9833,
        "area_km2": 136,
        "basin": "Marmara",
        "altitude_m": 2,
        "extra_info": {"ramsar_sahası": "evet"},
    },
    "egridir": {
        "id": 1340,
        "name": "Eğirdir Gölü",
        "lat": 39.0,
        "lng": 32.0,
        "area_km2": 482,
        "basin": "Akdeniz",
        "altitude_m": 917,
        "extra_info": {"not": "önemli içme suyu kaynağı"},
    },
    "burdur": {
        "id": 1342,
        "name": "Burdur Gölü",
        "lat": 37.7167,
        "lng": 30.2833,
        "area_km2": 250,
        "basin": "Akdeniz",
        "altitude_m": 845,
        "extra_info": {"tuzluluk": "orta"},
    },
    "sapanca": {
        "id": 14510,
        "name": "Sapanca Gölü",
        "lat": 40.7167,
        "lng": 30.2667,
        "area_km2": 45,
        "basin": "Marmara",
        "altitude_m": 36,
        "extra_info": {"kullanım": "içme suyu kaynağı"},
    },
    "salda": {
        "id": 14741,
        "name": "Salda Gölü",
        "lat": 37.5500,
        "lng": 29.6833,
        "area_km2": 44,
        "basin": "Akdeniz",
        "altitude_m": 1165,
        "extra_info": {"takma_ad": "Türkiye Maldivleri"},
    },
}

# --------------------------
# Insert all lakes
# --------------------------
db = get_db(get_client())

for key, info in LAKE_INFO.items():
    lake = Lake(
        lake_id=info["id"],
        name=info["name"],
        location={"lat": info["lat"], "lon": info["lng"]},
        area_km2=info.get("area_km2"),  # km²
        basin=info.get("basin"),  # Havza adı
        altitude_m=info.get("altitude_m"),  # Rakım
        extra_info=info.get("extra_info", {}),  # Diğer bilgiler
    )
    insert_lake(db, lake)
    print(f"✅ Inserted/updated lake: {lake.name} (id={lake.lake_id})")

print("🎉 All lakes inserted successfully")
