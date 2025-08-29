# Water Area Forecasting - Multi-Lake, Multi-Horizon

import pandas as pd
import numpy as np
from pathlib import Path
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import json
import os
import warnings
warnings.filterwarnings("ignore")

# 1) Dosya yolu ve çıktı klasörü

DATA_DIR = Path(r"C:\Users\glylm\Desktop\proje_aqua\water_quantity\output")
MODEL_DIR = DATA_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

TRAIN_FILE = DATA_DIR / "train_combined.parquet"
VAL_FILE = DATA_DIR / "val_combined.parquet"
TEST_FILE = DATA_DIR / "test_combined.parquet"

TARGET_COL = "target_water_area_m2"
HORIZONS = [1, 2, 3]

# --------------------------
# 2) Veri yükleme
# --------------------------
train_df = pd.read_parquet(TRAIN_FILE)
val_df = pd.read_parquet(VAL_FILE)
test_df = pd.read_parquet(TEST_FILE)


# 3) Eksik feature doldurma

num_cols = train_df.select_dtypes(include=[np.number]).columns.tolist()
num_cols = [c for c in num_cols if c not in ["lake_id", TARGET_COL]]
for col in num_cols:
    median_val = train_df[col].median()
    train_df[col].fillna(median_val, inplace=True)
    val_df[col].fillna(median_val, inplace=True)
    test_df[col].fillna(median_val, inplace=True)

train_df.fillna(method="ffill", inplace=True)
val_df.fillna(method="ffill", inplace=True)
test_df.fillna(method="ffill", inplace=True)

# 4) Model ve tahmin

metrics_summary = {}
predictions_list = []

for H in HORIZONS:
    print(f"\n=== Training horizon H={H} ===")
    # Horizon filtreleme
    X_train = train_df[train_df["H"] == H].drop(columns=["lake_name", "date", TARGET_COL])
    y_train = train_df.loc[train_df["H"] == H, TARGET_COL]
    
    X_val = val_df[val_df["H"] == H].drop(columns=["lake_name", "date", TARGET_COL])
    y_val = val_df.loc[val_df["H"] == H, TARGET_COL]
    
    X_test = test_df[test_df["H"] == H].drop(columns=["lake_name", "date", TARGET_COL])
    y_test = test_df.loc[test_df["H"] == H, TARGET_COL]

    # CatBoost
    model = CatBoostRegressor(
        iterations=2000,
        depth=6,
        learning_rate=0.05,
        loss_function="RMSE",
        random_seed=42,
        verbose=100
    )
    model.fit(
        X_train, y_train,
        eval_set=(X_val, y_val),
        use_best_model=True
    )

    # Tahmin
    test_pred = model.predict(X_test)
    
    # Metrikler
    mask = ~y_test.isna()
    y_clean, p_clean = y_test[mask], test_pred[mask]
    mae = mean_absolute_error(y_clean, p_clean)
    rmse = np.sqrt(mean_squared_error(y_clean, p_clean))
    metrics_summary[f"H{H}"] = {"MAE": mae, "RMSE": rmse, "Test_rows": len(y_clean)}
    print(f"H{H} Test -> MAE={mae:.0f} | RMSE={rmse:.0f} | {len(y_clean)} rows")

    # Tahminleri kaydet
    temp_df = test_df[test_df["H"] == H].copy()
    temp_df["predicted_water_area"] = test_pred
    predictions_list.append(temp_df[["lake_id","date","H",TARGET_COL,"predicted_water_area"]])

    # Model kaydet
    model_path = MODEL_DIR / f"catboost_H{H}.pkl"
    model.save_model(str(model_path))
    print(f"Saved model -> {model_path}")


# 5) CSV/JSON kaydetme

all_predictions = pd.concat(predictions_list, ignore_index=True)
all_predictions.to_parquet(MODEL_DIR / "all_predictions.parquet", index=False)
pd.DataFrame.from_dict(metrics_summary, orient="index").to_csv(MODEL_DIR / "metrics_summary.csv")
with open(MODEL_DIR / "metrics_summary.json", "w") as f:
    json.dump(metrics_summary, f, indent=2)

print("All predictions and metrics saved.")

"""
bestTest = 16944027.79
bestIteration = 1998

Shrink model to first 1999 iterations.
H3 Test -> MAE=11480760 | RMSE=26967107 | 317 rows

"""
