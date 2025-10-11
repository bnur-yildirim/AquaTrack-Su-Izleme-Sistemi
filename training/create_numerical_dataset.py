import os
import glob
import numpy as np
import pandas as pd
import rasterio  # type: ignore
from rasterio.merge import merge  # type: ignore
from rasterio.features import geometry_mask  # type: ignore
import rasterio.warp  # type: ignore
from rasterio.enums import Resampling  # type: ignore
import geopandas as gpd  # type: ignore
from datetime import datetime
from scipy.stats import zscore, skew, kurtosis

NDWI_THRESHOLD = 0.0
ROLLING_WINDOW = 3
FORECAST_HORIZONS = [1, 2, 3]  # months ahead


# -----------------------
# Functions
# -----------------------
def gather_dates(ndwi_dir):
    all_files = glob.glob(os.path.join(ndwi_dir, "*_mask.tif"))
    return sorted(set(f.split(os.sep)[-1].split("_")[0] for f in all_files))


def gather_ndwi_tiles(ndwi_dir, date_str):
    pattern = os.path.join(ndwi_dir, f"{date_str}_tile*_mask.tif")
    return sorted(glob.glob(pattern))


def mosaic_raster_tiles(tiles):
    if not tiles:
        return None, None, None
    srcs = [rasterio.open(fp) for fp in tiles]
    mosaic, transform = merge(srcs)
    crs = srcs[0].meta["crs"]
    nodata = srcs[0].nodata
    for s in srcs:
        s.close()
    arr = mosaic[0].astype(np.float32)
    if nodata is not None:
        arr[arr == nodata] = np.nan
    return arr, transform, crs


def mosaic_band_tiles(band_dir, date_str, band_name):
    pattern = os.path.join(band_dir, f"{date_str}_tile*_image.{band_name}.tif")
    tiles = sorted(glob.glob(pattern))
    return mosaic_raster_tiles(tiles)


def resample_band_to_ndwi(
    band_array, band_transform, band_crs, ndwi_shape, ndwi_transform, ndwi_crs
):
    if band_array is None:
        return None
    dst_array = np.empty(ndwi_shape, dtype=np.float32)
    rasterio.warp.reproject(
        source=band_array,
        destination=dst_array,
        src_transform=band_transform,
        src_crs=band_crs,
        dst_transform=ndwi_transform,
        dst_crs=ndwi_crs,
        resampling=Resampling.bilinear,
        dst_nodata=np.nan,
    )
    return dst_array


def rasterize_lake_mask(lake_poly_path, transform, crs, shape):
    lake = gpd.read_file(lake_poly_path)
    if lake.crs != crs:
        lake = lake.to_crs(crs)
    geom = lake.geometry.union_all()
    H, W = shape
    mask = ~geometry_mask([geom], transform=transform, invert=False, out_shape=(H, W))
    return mask


def get_season(month):
    if month in [12, 1, 2]:
        return "Winter"
    elif month in [3, 4, 5]:
        return "Spring"
    elif month in [6, 7, 8]:
        return "Summer"
    else:
        return "Autumn"


def calculate_metrics(
    ndwi,
    lake_mask,
    lake_id,
    date_str,
    transform,
    num_tiles,
    expected_tiles,
    b2=None,
    b3=None,
    b4=None,
    b8=None,
    ndwi_threshold=NDWI_THRESHOLD,
):
    if ndwi is None:
        return None
    valid = lake_mask & np.isfinite(ndwi)
    water = valid & (ndwi > ndwi_threshold)
    pixel_area_m2 = abs(transform.a * -transform.e)
    total_lake_pixels = int(lake_mask.sum())
    valid_pixels = int(valid.sum())
    water_pixels = int(water.sum())

    valid_ratio = valid_pixels / total_lake_pixels if total_lake_pixels > 0 else 0.0
    cloud_pct = max(0.0, 1.0 - valid_ratio) * 100.0

    date_obj = datetime.strptime(date_str, "%Y%m%d")
    month = date_obj.month
    doy = date_obj.timetuple().tm_yday

    metrics = {
        "lake_id": lake_id,
        "date": date_obj,
        "water_area_m2": water_pixels * pixel_area_m2,
        "valid_pixel_ratio": valid_ratio,
        "cloud_pct": cloud_pct,
        "num_tiles": num_tiles,
        "missing_flag": int(num_tiles < expected_tiles),
        "month": month,
        "season": get_season(month),
        "doy": doy,
        "month_sin": np.sin(2 * np.pi * month / 12),
        "month_cos": np.cos(2 * np.pi * month / 12),
        "doy_sin": np.sin(2 * np.pi * doy / 365.25),
        "doy_cos": np.cos(2 * np.pi * doy / 365.25),
    }

    if valid_pixels:
        metrics.update(
            {
                "ndwi_mean": float(np.nanmean(ndwi[valid])),
                "ndwi_std": float(np.nanstd(ndwi[valid])),
                "ndwi_var": float(np.nanvar(ndwi[valid])),
                "ndwi_min": float(np.nanmin(ndwi[valid])),
                "ndwi_max": float(np.nanmax(ndwi[valid])),
                "ndwi_p25": float(np.nanpercentile(ndwi[valid], 25)),
                "ndwi_p50": float(np.nanpercentile(ndwi[valid], 50)),
                "ndwi_p75": float(np.nanpercentile(ndwi[valid], 75)),
                "ndwi_skew": float(skew(ndwi[valid])),
                "ndwi_kurtosis": float(kurtosis(ndwi[valid])),
                "ndwi_gt_0.1": int((ndwi[valid] > 0.1).sum()),
                "ndwi_gt_0.2": int((ndwi[valid] > 0.2).sum()),
                "ndwi_gt_0.3": int((ndwi[valid] > 0.3).sum()),
            }
        )
    else:
        for key in [
            "ndwi_mean",
            "ndwi_std",
            "ndwi_var",
            "ndwi_min",
            "ndwi_max",
            "ndwi_p25",
            "ndwi_p50",
            "ndwi_p75",
            "ndwi_skew",
            "ndwi_kurtosis",
            "ndwi_gt_0.1",
            "ndwi_gt_0.2",
            "ndwi_gt_0.3",
        ]:
            metrics[key] = np.nan

    # Band stats and ratios
    for band_name, band_array in zip(["b2", "b3", "b4", "b8"], [b2, b3, b4, b8]):
        if band_array is not None:
            band_array = band_array[: ndwi.shape[0], : ndwi.shape[1]]
            band_valid_mask = valid & np.isfinite(band_array)
            if np.any(band_valid_mask):
                band_vals = band_array[band_valid_mask]
                metrics[f"{band_name}_mean"] = float(np.nanmean(band_vals))
                metrics[f"{band_name}_std"] = float(np.nanstd(band_vals))
                metrics[f"{band_name}_min"] = float(np.nanmin(band_vals))
                metrics[f"{band_name}_max"] = float(np.nanmax(band_vals))
            else:
                for stat in ["mean", "std", "min", "max"]:
                    metrics[f"{band_name}_{stat}"] = np.nan
        else:
            for stat in ["mean", "std", "min", "max"]:
                metrics[f"{band_name}_{stat}"] = np.nan

    # Band ratios
    metrics["b3_b2_ratio"] = (
        metrics["b3_mean"] / metrics["b2_mean"] if metrics["b2_mean"] else np.nan
    )
    metrics["b4_b8_ratio"] = (
        metrics["b4_mean"] / metrics["b8_mean"] if metrics["b8_mean"] else np.nan
    )

    return metrics


def add_date_aware_forecast_targets(df, horizons=[1, 2, 3]):
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    for H in horizons:
        target_col = f"water_area_target_H{H}"
        df[target_col] = np.nan
        for idx, row in df.iterrows():
            current_date = row["date"]
            target_date = current_date + pd.DateOffset(months=H)
            future_rows = df[df["date"] >= target_date]
            if not future_rows.empty:
                df.at[idx, target_col] = future_rows.iloc[0]["water_area_m2"]
    return df


def process_all_dates(ndwi_dir, band_dir, lake_poly, lake_id):
    dates = gather_dates(ndwi_dir)
    max_tiles = max(
        len(gather_ndwi_tiles(ndwi_dir, d))
        for d in dates
        if gather_ndwi_tiles(ndwi_dir, d)
    )
    all_records = []

    for date_str in dates:
        ndwi_tiles = gather_ndwi_tiles(ndwi_dir, date_str)
        num_tiles = len(ndwi_tiles)
        if num_tiles == 0:
            print(f"[SKIP] No tiles for date {date_str}")
            continue

        ndwi, transform, crs = mosaic_raster_tiles(ndwi_tiles)
        lake_mask = rasterize_lake_mask(lake_poly, transform, crs, ndwi.shape)

        b2, b2_t, b2_crs = mosaic_band_tiles(band_dir, date_str, "B2")
        b3, b3_t, b3_crs = mosaic_band_tiles(band_dir, date_str, "B3")
        b4, b4_t, b4_crs = mosaic_band_tiles(band_dir, date_str, "B4")
        b8, b8_t, b8_crs = mosaic_band_tiles(band_dir, date_str, "B8")

        b2 = resample_band_to_ndwi(b2, b2_t, b2_crs, ndwi.shape, transform, crs)
        b3 = resample_band_to_ndwi(b3, b3_t, b3_crs, ndwi.shape, transform, crs)
        b4 = resample_band_to_ndwi(b4, b4_t, b4_crs, ndwi.shape, transform, crs)
        b8 = resample_band_to_ndwi(b8, b8_t, b8_crs, ndwi.shape, transform, crs)

        metrics = calculate_metrics(
            ndwi,
            lake_mask,
            lake_id,
            date_str,
            transform,
            num_tiles,
            max_tiles,
            b2,
            b3,
            b4,
            b8,
        )
        all_records.append(metrics)
        print(f"[DONE] {date_str}")

    df = pd.DataFrame(all_records).sort_values("date").reset_index(drop=True)
    df["gap_days_since_last_obs"] = df["date"].diff().dt.days.fillna(0)

    water_series = df["water_area_m2"]
    for lag in [1, 2, 3, 4, 5, 6, 12]:
        df[f"water_area_lag_{lag}"] = water_series.shift(lag)
    for w in [3, 6, 12]:
        df[f"rolling{w}_mean"] = water_series.shift(1).rolling(w, min_periods=1).mean()
        df[f"rolling{w}_std"] = water_series.shift(1).rolling(w, min_periods=1).std()
        df[f"rolling{w}_min"] = water_series.shift(1).rolling(w, min_periods=1).min()
        df[f"rolling{w}_max"] = water_series.shift(1).rolling(w, min_periods=1).max()

    df["water_area_diff"] = df["water_area_m2"].diff()
    df["water_area_pct_change"] = df["water_area_m2"].pct_change()
    df["water_area_cumsum"] = df["water_area_m2"].cumsum()
    df["season_avg"] = df.groupby("season")["water_area_m2"].transform("mean")
    df["area_vs_season_avg"] = df["water_area_m2"] - df["season_avg"]
    df["zscore"] = zscore(df["water_area_m2"])
    df["water_area_outlier"] = (df["zscore"].abs() > 3).astype(int)
    df["ndwi_mean_diff"] = df["ndwi_mean"].diff()

    # One-hot season
    df = pd.get_dummies(df, columns=["season"], drop_first=False)

    df = add_date_aware_forecast_targets(df, horizons=FORECAST_HORIZONS)

    return df


# -----------------------
# Main
# -----------------------
if __name__ == "__main__":
    LAKE_ID = 141
    NDWI_DIR = r"C:\Users\glylm\Desktop\proje_aqua\van\data\gol_van\ndwi"
    BAND_DIR = r"C:\Users\glylm\Desktop\proje_aqua\van\data\gol_van\images"
    LAKE_POLY = r"C:\Users\glylm\Desktop\proje_aqua\water_quantity\lake_van_export.geojson"
    OUT_PATH = r"C:\Users\glylm\Desktop\proje_aqua\water_quantity\output"

    os.makedirs(OUT_PATH, exist_ok=True)

    df = process_all_dates(NDWI_DIR, BAND_DIR, LAKE_POLY, LAKE_ID)
    df["lake_name"] = "Van Gölü"

    # Eksik veri özeti
    missing_summary = df.isna().sum()
    print("\n[INFO] Eksik veri özeti:")
    print(missing_summary[missing_summary > 0])

    # En düşük ve en yüksek su alanı
    min_row = df.loc[df["water_area_m2"].idxmin()]
    max_row = df.loc[df["water_area_m2"].idxmax()]
    print(
        f"\n[MIN] En düşük su alanı: {min_row['water_area_m2']:.2f} m² ({min_row['date'].date()})"
    )
    print(
        f"[MAX] En yüksek su alanı: {max_row['water_area_m2']:.2f} m² ({max_row['date'].date()})"
    )

    # CSV kaydı
    csv_path = os.path.join(OUT_PATH, f"lake_{LAKE_ID}_features_forecasting.csv")
    df.to_csv(csv_path, index=False)
    print(f"\n[SAVED] CSV: {csv_path}")