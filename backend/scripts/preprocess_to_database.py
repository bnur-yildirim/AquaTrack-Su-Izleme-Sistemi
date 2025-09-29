#!/usr/bin/env python3
"""
Database-based preprocessing script that replaces file-based preprocessing
Creates training data directly in MongoDB instead of parquet files
"""

import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sklearn.preprocessing import LabelEncoder

# Add backend to path
sys.path.append(os.path.dirname(__file__))

from database import (
    get_client, get_db, init_collections,
    insert_training_data_batch, insert_label_encoder
)
from models import TrainingData, LabelEncoder as LabelEncoderModel

# Configuration
HORIZONS = [1, 2, 3]  # months ahead to prepare
DATE_COL = "date"


def get_observations_from_db(db, lake_id: int = None) -> pd.DataFrame:
    """Get observations from MongoDB and convert to DataFrame"""
    print("📊 Loading observations from MongoDB...")
    
    query = {}
    if lake_id:
        query["lake_id"] = lake_id
    
    # Get all observations
    observations = list(db["water_quantity_observations"].find(query))
    
    if not observations:
        print("⚠️ No observations found in database")
        return pd.DataFrame()
    
    # Convert to DataFrame
    df = pd.DataFrame(observations)
    
    # Convert date from unix timestamp to datetime
    df['date'] = pd.to_datetime(df['date'], unit='ms')
    
    # Sort by lake_id and date
    df = df.sort_values(['lake_id', 'date']).reset_index(drop=True)
    
    print(f"✅ Loaded {len(df)} observations for {df['lake_id'].nunique()} lakes")
    return df


def basic_impute_per_lake(df: pd.DataFrame, method="ffill_then_median") -> pd.DataFrame:
    """
    Impute features per lake:
      - forward-fill to propagate recent observations
      - then fill any remaining numeric NaNs with median per column
    Note: we NEVER impute targets (water_area_target_*)
    """
    df = df.copy()
    # forward fill per lake
    df = df.groupby("lake_id").apply(lambda g: g.ffill()).reset_index(drop=True)
    # numeric columns median fill
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    # avoid filling target columns
    target_cols = [c for c in df.columns if c.startswith("water_area_target_")]
    num_cols = [c for c in num_cols if c not in target_cols]
    medians = df[num_cols].median()
    df[num_cols] = df[num_cols].fillna(medians)
    # for non-numeric boolean-like cols convert True/False -> int
    bool_cols = df.select_dtypes(include=["bool"]).columns.tolist()
    for b in bool_cols:
        df[b] = df[b].astype(int)
    return df


def encode_lake_id(df: pd.DataFrame, db) -> tuple:
    """Encode lake_id and save encoder to database"""
    le = LabelEncoder()
    df = df.copy()
    df["lake_id_enc"] = le.fit_transform(df["lake_id"].astype(str))
    
    # Save encoder to database
    label_encoder = LabelEncoderModel(
        encoder_name="lake_id_label_encoder",
        classes=le.classes_.tolist()
    )
    insert_label_encoder(db, label_encoder)
    print("✅ Lake ID encoder saved to database")
    
    return df, le


def build_date_aware_supervised(df: pd.DataFrame, horizons=[1, 2, 3]) -> pd.DataFrame:
    """
    For each row (lake, date=t) create one or more supervised rows for each H in horizons:
      - target_date = t + H months
      - find the first actual observation for same lake where date >= target_date
      - set target_water_area_m2 to that observation's water_area_m2
      - also store target_date and H
    Returns: DataFrame with all original features from time t + columns: H, target_date, target_water_area_m2
    """
    df = df.copy().sort_values(["lake_id", DATE_COL]).reset_index(drop=True)
    # make quick lookup: group by lake and keep list of (date, water_area_m2)
    groups = {}
    for lake, g in df.groupby("lake_id"):
        groups[lake] = g[[DATE_COL, "water_area_m2"]].reset_index(drop=True)

    records = []
    for _, row in df.iterrows():
        lake = row["lake_id"]
        t = row[DATE_COL]
        for H in horizons:
            t_target = t + pd.DateOffset(months=H)
            # find first future row for lake with date >= t_target
            g = groups[lake]
            # binary search-like: use boolean indexing (g is small)
            future = g[g[DATE_COL] >= t_target]
            if future.empty:
                target_val = np.nan
                target_date = pd.NaT
            else:
                target_val = float(future.iloc[0]["water_area_m2"])
                target_date = future.iloc[0][DATE_COL]
            rec = row.to_dict()
            rec.update(
                {
                    "H": int(H),
                    "target_date": target_date,
                    "target_water_area_m2": target_val,
                }
            )
            records.append(rec)
    sup = pd.DataFrame.from_records(records)
    # keep date as datetime
    sup[DATE_COL] = pd.to_datetime(sup[DATE_COL])
    sup["target_date"] = pd.to_datetime(sup["target_date"])
    return sup


def add_baselines(supervised_df: pd.DataFrame, df_all: pd.DataFrame) -> pd.DataFrame:
    """
    Adds baseline predictions to supervised_df:
      - baseline_locf = water_area_m2 at time t (last-observation-carried-forward)
      - baseline_seasonal = mean water_area for (lake, year_of_target-1, month_of_target)
    Note: baseline_seasonal looks up the previous year value for the *target month*.
    """
    sup = supervised_df.copy()
    # LOCF prediction = current water_area_m2 at time t
    sup["baseline_locf"] = sup["water_area_m2"]  # value at t

    # prepare seasonal mapping: mean water_area per (lake, year, month)
    df_all = df_all.copy()
    df_all["year"] = df_all[DATE_COL].dt.year
    df_all["month"] = df_all[DATE_COL].dt.month
    grp = (
        df_all.groupby(["lake_id", "year", "month"])["water_area_m2"]
        .mean()
        .rename("mean_area")
        .reset_index()
    )

    # helper dict for quick lookup
    # key = (lake_id, year, month) -> mean_area
    lookup = {
        (row.lake_id, int(row.year), int(row.month)): float(row.mean_area)
        for row in grp.itertuples()
    }

    seasonal_preds = []
    for _, r in sup.iterrows():
        lake = r["lake_id"]
        target_dt = r["target_date"]
        if pd.isna(target_dt):
            seasonal_preds.append(np.nan)
            continue
        key = (lake, int(target_dt.year) - 1, int(target_dt.month))
        seasonal_preds.append(lookup.get(key, np.nan))
    sup["baseline_seasonal"] = seasonal_preds
    return sup


def time_cutoff_split(supervised_df: pd.DataFrame, train_end: str, val_end: str = None):
    """
    Returns train, val, test DataFrames split by date (using row DATE_COL which is time t).
      - train: date < train_end
      - val: train_end <= date < val_end (if val_end provided)
      - test: date >= val_end (if val_end provided) else date >= train_end
    Note: these are global cutoffs applied to the feature timestamp (observation time t).
    """
    sup = supervised_df.copy()
    sup[DATE_COL] = pd.to_datetime(sup[DATE_COL])
    train_end = pd.to_datetime(train_end)
    if val_end is not None:
        val_end = pd.to_datetime(val_end)
    train = sup[sup[DATE_COL] < train_end]
    if val_end is None:
        val = None
        test = sup[sup[DATE_COL] >= train_end]
    else:
        val = sup[(sup[DATE_COL] >= train_end) & (sup[DATE_COL] < val_end)]
        test = sup[sup[DATE_COL] >= val_end]
    return train, val, test


def get_feature_columns(df: pd.DataFrame):
    """Get feature columns excluding targets and metadata"""
    exclude_prefixes = ["water_area_target_", "target_"]
    exclude_cols = ["lake_name", "target_date", "_id", "created_at"]
    exclude_cols += [
        c for c in df.columns if any(c.startswith(p) for p in exclude_prefixes)
    ]
    # Always exclude the explicit target column we will ask for later
    feature_cols = [c for c in df.columns if c not in exclude_cols]
    return feature_cols


def save_training_data_to_db(df: pd.DataFrame, split_type: str, db):
    """Save training data to MongoDB"""
    print(f"💾 Saving {split_type} data to MongoDB...")
    
    training_data_list = []
    feature_cols = get_feature_columns(df)
    
    for _, row in df.iterrows():
        # Extract features
        features = {col: float(row[col]) for col in feature_cols 
                   if col in row and pd.notna(row[col]) and col != 'lake_id'}
        
        training_data = TrainingData(
            lake_id=int(row['lake_id']),
            date=pd.to_datetime(row['date']).date(),
            horizon=int(row.get('H', 1)),
            split_type=split_type,
            features=features,
            target_water_area_m2=float(row.get('target_water_area_m2')) if pd.notna(row.get('target_water_area_m2')) else None,
            target_date=pd.to_datetime(row.get('target_date')).date() if pd.notna(row.get('target_date')) else None,
            baseline_locf=float(row.get('baseline_locf')) if pd.notna(row.get('baseline_locf')) else None,
            baseline_seasonal=float(row.get('baseline_seasonal')) if pd.notna(row.get('baseline_seasonal')) else None,
            lake_id_enc=int(row.get('lake_id_enc')) if pd.notna(row.get('lake_id_enc')) else None
        )
        training_data_list.append(training_data)
    
    # Batch insert
    if training_data_list:
        batch_size = 1000
        total_inserted = 0
        for i in range(0, len(training_data_list), batch_size):
            batch = training_data_list[i:i + batch_size]
            inserted_count = insert_training_data_batch(db, batch)
            total_inserted += inserted_count
            print(f"  📦 Inserted batch {i//batch_size + 1}: {inserted_count} records")
        
        print(f"✅ Saved {total_inserted} {split_type} records to database")
    else:
        print(f"⚠️ No {split_type} data to save")


def main():
    """Main preprocessing function"""
    print("🚀 Starting database-based preprocessing...")
    
    # Connect to MongoDB
    client = get_client()
    db = get_db(client)
    
    # Initialize collections
    print("🔧 Initializing MongoDB collections...")
    collections = init_collections(db)
    print("✅ Collections initialized")
    
    try:
        # 1) Load observations from database
        df_all = get_observations_from_db(db)
        if df_all.empty:
            print("❌ No observations found. Please run insert-observation.py first.")
            return
        
        print(f"📊 Loaded {len(df_all)} observations, {df_all.shape[1]} columns")

        # 2) Basic imputation (conservative)
        print("🔧 Applying imputation...")
        df_all = basic_impute_per_lake(df_all, method="ffill_then_median")

        # 3) Encode lake_id
        print("🔧 Encoding lake IDs...")
        df_all, le = encode_lake_id(df_all, db)
        print(f"✅ Encoded {df_all['lake_id'].nunique()} unique lakes")

        # 4) Create supervised dataset
        print("🔧 Creating supervised dataset...")
        supervised = build_date_aware_supervised(df_all, horizons=HORIZONS)
        print(f"✅ Created {len(supervised)} supervised records")

        # 5) Add baseline predictions
        print("🔧 Adding baseline predictions...")
        supervised = add_baselines(supervised, df_all)
        
        # Compute baseline scores
        for H in HORIZONS:
            mask_H = supervised["H"] == H
            valid_data = supervised[mask_H & ~supervised["target_water_area_m2"].isna()]
            if len(valid_data) > 0:
                locf_scores = valid_data[["target_water_area_m2", "baseline_locf"]].dropna()
                seasonal_scores = valid_data[["target_water_area_m2", "baseline_seasonal"]].dropna()
                
                if len(locf_scores) > 0:
                    locf_mae = np.mean(np.abs(locf_scores["target_water_area_m2"] - locf_scores["baseline_locf"]))
                    print(f"  H={H} LOCF baseline MAE: {locf_mae:,.0f}")
                
                if len(seasonal_scores) > 0:
                    seasonal_mae = np.mean(np.abs(seasonal_scores["target_water_area_m2"] - seasonal_scores["baseline_seasonal"]))
                    print(f"  H={H} Seasonal baseline MAE: {seasonal_mae:,.0f}")

        # 6) Split data and save to database
        print("🔧 Splitting data into train/val/test...")
        
        train_list, val_list, test_list = [], [], []

        for H in HORIZONS:
            sup_H = supervised[supervised["H"] == H].copy()
            sup_H = sup_H[~sup_H["target_water_area_m2"].isna()].reset_index(drop=True)

            # Add horizon column explicitly
            sup_H["H"] = H

            # Split
            train_df, val_df, test_df = time_cutoff_split(
                sup_H, train_end="2022-12-31", val_end="2023-12-31"
            )

            train_list.append(train_df)
            if val_df is not None:
                val_list.append(val_df)
            test_list.append(test_df)

        # Combine all horizons
        train_combined = pd.concat(train_list, ignore_index=True)
        val_combined = pd.concat(val_list, ignore_index=True) if val_list else None
        test_combined = pd.concat(test_list, ignore_index=True)

        # Save to database
        save_training_data_to_db(train_combined, "train", db)
        if val_combined is not None:
            save_training_data_to_db(val_combined, "val", db)
        save_training_data_to_db(test_combined, "test", db)

        print("\n🎉 Database-based preprocessing completed successfully!")
        print(f"📊 Summary:")
        print(f"  - Train records: {len(train_combined)}")
        print(f"  - Val records: {len(val_combined) if val_combined is not None else 0}")
        print(f"  - Test records: {len(test_combined)}")
        print(f"  - Total records: {len(train_combined) + (len(val_combined) if val_combined is not None else 0) + len(test_combined)}")
        
        print("\n🔍 Next steps:")
        print("1. Update your training scripts to read from MongoDB instead of parquet files")
        print("2. Update data_loader.py to use MongoDB collections")
        print("3. Remove old parquet file dependencies")

    except Exception as e:
        print(f"❌ Preprocessing failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


if __name__ == "__main__":
    main()
