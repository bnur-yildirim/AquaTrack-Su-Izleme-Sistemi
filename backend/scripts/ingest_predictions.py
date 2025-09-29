import os
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime

# Ensure backend path for imports
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

from database import get_client, get_db


def normalize_date(val):
    # Accept string ISO, pandas Timestamp, or int epoch ms
    if pd.isna(val):
        return None
    try:
        if isinstance(val, (int, float)):
            # assume ms epoch if large
            if val > 10_000_000:
                return pd.to_datetime(val, unit='ms')
            return pd.to_datetime(val, unit='s')
        return pd.to_datetime(val)
    except Exception:
        return None


def main():
    models_dir = BASE_DIR / 'models'
    parquet_path = models_dir / 'all_predictions_final.parquet'
    if not parquet_path.exists():
        print(f"Parquet not found: {parquet_path}")
        sys.exit(1)

    df = pd.read_parquet(parquet_path)
    if df.empty:
        print("No rows in parquet.")
        return

    # Normalize columns
    required_cols = [
        'lake_id', 'date', 'H', 'predicted_water_area_m2'
    ]
    for col in required_cols:
        if col not in df.columns:
            print(f"Missing column: {col}")
            sys.exit(1)

    df = df.copy()
    df['date'] = df['date'].apply(normalize_date)
    df = df.dropna(subset=['date'])

    # Build documents for model_prediction_history
    docs = []
    for _, row in df.iterrows():
        try:
            doc = {
                'lake_id': int(row['lake_id']),
                'date': row['date'].to_pydatetime() if hasattr(row['date'], 'to_pydatetime') else row['date'],
                'model_id': 'catboost_optuna',
                'prediction_type': 'water_quantity',
                'horizon': int(row['H']),
                'inputs': {},
                'outputs': {
                    'predicted_water_area_m2': float(row['predicted_water_area_m2'])
                },
                'confidence_score': None,
                'created_at': datetime.utcnow()
            }
            docs.append(doc)
        except Exception:
            continue

    if not docs:
        print("No valid documents to insert.")
        return

    client = get_client(os.getenv('MONGODB_URI'))
    db = get_db(client, os.getenv('MONGODB_DB_NAME'))
    coll = db['model_prediction_history']

    # Insert with upsert on unique key (lake_id, date, model_id, horizon)
    from pymongo import UpdateOne
    ops = []
    for d in docs:
        filt = {
            'lake_id': d['lake_id'],
            'date': d['date'],
            'model_id': d['model_id'],
            'horizon': d['horizon']
        }
        ops.append(UpdateOne(filt, {'$set': d}, upsert=True))

    if ops:
        result = coll.bulk_write(ops, ordered=False)
        print(f"Upserted: {result.upserted_count}, Modified: {result.modified_count}")
    else:
        print("No operations executed.")


if __name__ == '__main__':
    main()


