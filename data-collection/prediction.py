# ==========================
# prediction.py
# Ensemble Water Area Forecast - Multi-Horizon
# ==========================
import pandas as pd
import numpy as np
from pathlib import Path
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import warnings
warnings.filterwarnings("ignore")

# --------------------------
# 1) Dosya yolları
# --------------------------
DATA_DIR = Path(r"C:\Users\glylm\Desktop\proje_aqua\water_quantity\output")
MODEL_DIR = DATA_DIR / "models_optuna"

TEST_FILE = DATA_DIR / "test_combined.parquet"
TARGET_COL = "target_water_area_m2"
HORIZONS = [1, 2, 3]

# --------------------------
# 2) Test verisi yükleme
# --------------------------
test_df = pd.read_parquet(TEST_FILE)

# --------------------------
# 3) Feature hazırlama
# --------------------------
def prepare_features(df):
    df = df.copy()
    # Lag ve rolling özellikleri
    for lag in [1, 2, 3]:
        df[f'lag_{lag}'] = df.groupby('lake_id')[TARGET_COL].shift(lag)
    df['rolling_mean_3'] = df.groupby('lake_id')[TARGET_COL].shift(1).rolling(3, min_periods=1).mean()
    df['rolling_std_3']  = df.groupby('lake_id')[TARGET_COL].shift(1).rolling(3, min_periods=1).std()
    df['trend_3m'] = df['rolling_mean_3'] - df['rolling_mean_3'].shift(3)

    # NDWI feature ekleme
    if 'ndwi' in df.columns:
        df['ndwi_mean'] = df.groupby('lake_id')['ndwi'].shift(1).rolling(3, min_periods=1).mean()
        df['ndwi_std']  = df.groupby('lake_id')['ndwi'].shift(1).rolling(3, min_periods=1).std()
    else:
        df['ndwi_mean'] = 0
        df['ndwi_std']  = 0

    # Eksik değerleri doldur
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in num_cols:
        df[col].fillna(0, inplace=True)
    return df

test_df = prepare_features(test_df)

# --------------------------
# 4) Modelleri yükle ve tahmin yap
# --------------------------
predictions_list = []
metrics_summary = {}

for H in HORIZONS:
    print(f"\n--- Predicting Horizon H{H} ---")
    model_path = MODEL_DIR / f"catboost_H{H}_optuna.pkl"
    model = CatBoostRegressor()
    model.load_model(str(model_path))
    print(f"✓ Model H{H} loaded: {model_path.name}")

    # Horizon filtreleme
    X_test = test_df[test_df["H"] == H].drop(columns=["lake_name","date",TARGET_COL])
    y_test = test_df.loc[test_df["H"] == H, TARGET_COL]

    # Tahmin
    test_pred = model.predict(X_test)
    mask = ~y_test.isna()
    y_clean, p_clean = y_test[mask], test_pred[mask]

    mae = mean_absolute_error(y_clean, p_clean)
    rmse = np.sqrt(mean_squared_error(y_clean, p_clean))
    metrics_summary[f"H{H}"] = {"MAE": mae, "RMSE": rmse, "Test_rows": len(y_clean)}

    print(f"H{H} -> MAE={mae:.2f} | RMSE={rmse:.2f} | Rows={len(y_clean)}")

    # Tahminleri kaydet
    temp_df = test_df[test_df["H"] == H].copy()
    temp_df["predicted_water_area"] = test_pred
    predictions_list.append(temp_df[["lake_id","date","H",TARGET_COL,"predicted_water_area"]])

# --------------------------
# 5) Sonuçları kaydet
# --------------------------
all_predictions = pd.concat(predictions_list, ignore_index=True)
all_predictions.to_parquet(MODEL_DIR / "all_predictions_final.parquet", index=False)
pd.DataFrame.from_dict(metrics_summary, orient="index").to_csv(MODEL_DIR / "metrics_summary_final.csv")

print("\n✅ Predictions completed and saved.")
