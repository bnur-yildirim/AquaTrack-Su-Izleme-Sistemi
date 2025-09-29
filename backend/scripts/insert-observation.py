import pandas as pd
from models import WaterQuantityObservation
from database import get_client, get_db, insert_water_quantity_observation

# --------------------------
# Load Data
# --------------------------
parquet_path = r"C:\Users\Beyza\Workspace\aquatrack\water-quantity\output\preprocessed\all_lakes_features.parquet"
df = pd.read_parquet(parquet_path)

# Connect to DB
db = get_db(get_client())

# --------------------------
# Insert observations
# --------------------------
inserted_count = 0
for _, row in df.iterrows():
    try:
        # convert date -> unix ms
        date_val = row["date"]
        if isinstance(date_val, pd.Timestamp):
            date_val = int(date_val.timestamp() * 1000)
        else:
            date_val = int(date_val)

        obs = WaterQuantityObservation(
            lake_id=int(row["lake_id"]),
            date=date_val,
            water_area_m2=float(row["water_area_m2"]),
            valid_pixel_ratio=float(row["valid_pixel_ratio"]),
            cloud_pct=float(row["cloud_pct"]),
            num_tiles=int(row["num_tiles"]),
            missing_flag=int(row["missing_flag"]),
            features={
                k: float(row[k])
                for k in row.index
                if k
                not in [
                    "lake_id",
                    "date",
                    "water_area_m2",
                    "valid_pixel_ratio",
                    "cloud_pct",
                    "num_tiles",
                    "missing_flag",
                    "lake_name",
                ]
            },
            lake_name=row["lake_name"],
        )

        insert_water_quantity_observation(db, obs)
        inserted_count += 1
    except Exception as e:
        print(
            f"⚠️ Skipped row {row.get('lake_id', '?')} at date {row.get('date', '?')}: {e}"
        )


print(f"✅ Inserted {inserted_count} observations into MongoDB")
