# ==========================
# Water Area Forecasting - Multi-Horizon with Optuna
# ==========================
import pandas as pd
import numpy as np
from pathlib import Path
from catboost import CatBoostRegressor
from sklearn.model_selection import KFold, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error
import optuna
import json
import warnings
warnings.filterwarnings("ignore")

# --------------------------
# 1) Dosya yolu ve çıktı klasörü
# --------------------------
DATA_DIR = Path(r"C:\Users\glylm\Desktop\proje_aqua\water_quantity\output")
MODEL_DIR = DATA_DIR / "models_optuna"
MODEL_DIR.mkdir(parents=True, exist_ok=True) 

TRAIN_FILE = DATA_DIR / "train_combined.parquet"
VAL_FILE   = DATA_DIR / "val_combined.parquet"
TEST_FILE  = DATA_DIR / "test_combined.parquet"

TARGET_COL = "target_water_area_m2"
HORIZONS = [1, 2, 3]

# --------------------------
# 2) Veri yükleme
# --------------------------
train_df = pd.read_parquet(TRAIN_FILE)
val_df   = pd.read_parquet(VAL_FILE)
test_df  = pd.read_parquet(TEST_FILE)

# --------------------------
# 3) Eksik feature doldurma
# --------------------------
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

# --------------------------
# 4) Optuna + CatBoost
# --------------------------
metrics_summary = {}
predictions_list = []

for H in HORIZONS:
    print(f"\n=== Hyperparameter Optimization for Horizon H={H} ===")
    # Horizon filtreleme
    X_train = train_df[train_df["H"] == H].drop(columns=["lake_name", "date", TARGET_COL])
    y_train = train_df.loc[train_df["H"] == H, TARGET_COL]
    X_val   = val_df[val_df["H"] == H].drop(columns=["lake_name", "date", TARGET_COL])
    y_val   = val_df.loc[val_df["H"] == H, TARGET_COL]
    X_test  = test_df[test_df["H"] == H].drop(columns=["lake_name", "date", TARGET_COL])
    y_test  = test_df.loc[test_df["H"] == H, TARGET_COL]

    # ----------------------
    # Optuna objective
    # ----------------------
    def objective(trial):
        params = {
            "iterations": trial.suggest_int("iterations", 500, 2000),
            "depth": trial.suggest_int("depth", 4, 10),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
            "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1, 10),
            "bagging_temperature": trial.suggest_float("bagging_temperature", 0, 10),
            "random_strength": trial.suggest_float("random_strength", 0.5, 5),
            "loss_function": "RMSE",
            "random_seed": 42,
            "verbose": 0
        }
        model = CatBoostRegressor(**params)
        kf = KFold(n_splits=3, shuffle=True, random_state=42)  # küçük hızlı olsun
        scores = cross_val_score(model, X_train, y_train,
                                 cv=kf, scoring="neg_root_mean_squared_error")
        return -np.mean(scores)

    # Optuna çalıştır
    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=30, show_progress_bar=True)  # 30 trial

    best_params = study.best_params
    print(f"Best params H{H}: {best_params}")
    print(f"Best CV RMSE H{H}: {study.best_value:.0f}")

    # ----------------------
    # Final model fit (train+val)
    # ----------------------
    model = CatBoostRegressor(**best_params, loss_function="RMSE", random_seed=42, verbose=100)
    model.fit(
        pd.concat([X_train, X_val]), 
        pd.concat([y_train, y_val]),
        use_best_model=False
    )

    # ----------------------
    # Test prediction
    # ----------------------
    test_pred = model.predict(X_test)
    mask = ~y_test.isna()
    y_clean, p_clean = y_test[mask], test_pred[mask]

    mae = mean_absolute_error(y_clean, p_clean)
    rmse = np.sqrt(mean_squared_error(y_clean, p_clean))

    metrics_summary[f"H{H}"] = {
        "Best_Params": best_params,
        "MAE": mae,
        "RMSE": rmse,
        "Test_rows": len(y_clean)
    }
    print(f"H{H} Test -> MAE={mae:.0f} | RMSE={rmse:.0f} | {len(y_clean)} rows")

    # ----------------------
    # Save predictions
    # ----------------------
    temp_df = test_df[test_df["H"] == H].copy()
    temp_df["predicted_water_area"] = test_pred
    predictions_list.append(temp_df[["lake_id","date","H",TARGET_COL,"predicted_water_area"]])

    model_path = MODEL_DIR / f"catboost_H{H}_optuna.pkl"
    model.save_model(str(model_path))
    print(f"Saved model -> {model_path}")

# --------------------------
# 5) Save metrics & predictions
# --------------------------
all_predictions = pd.concat(predictions_list, ignore_index=True)
all_predictions.to_parquet(MODEL_DIR / "all_predictions_optuna.parquet", index=False)

pd.DataFrame.from_dict(metrics_summary, orient="index").to_csv(MODEL_DIR / "metrics_summary_optuna.csv")
with open(MODEL_DIR / "metrics_summary_optuna.json", "w") as f:
    json.dump(metrics_summary, f, indent=2)

print("\n✅ All predictions and metrics saved with Optuna optimization.")
