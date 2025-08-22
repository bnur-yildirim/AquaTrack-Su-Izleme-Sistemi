import os
import rasterio
import numpy as np
import pandas as pd
from datetime import datetime

# Ayarlamalar
dataset_folder = r"C:\Users\glylm\Desktop\proje_aqua\van\data\gol_van"
output_csv = os.path.join(dataset_folder, "van_lake_numerical_dataset.csv")
ndwi_threshold = 0.3  # su pikseli eşik değeri

def get_season(month):
    if month in [12,1,2]: return "Winter"
    elif month in [3,4,5]: return "Spring"
    elif month in [6,7,8]: return "Summer"
    else: return "Autumn"

records = []

for year in os.listdir(dataset_folder):
    year_path = os.path.join(dataset_folder, year)
    images_path = os.path.join(year_path, "images")
    masks_path = os.path.join(year_path, "ndwi_masks")

    if not os.path.isdir(images_path) or not os.path.isdir(masks_path):
        continue

    for mask_file in os.listdir(masks_path):
        if not mask_file.endswith(".tif"):
            continue

        mask_path = os.path.join(masks_path, mask_file)
        image_file = mask_file.replace("_mask.tif", "_image.tif")
        image_path = os.path.join(images_path, image_file)

        # Tarih bilgisini dosya isminden al
        date_str = mask_file.split("_")[0]
        date_obj = datetime.strptime(date_str, "%Y%m%d")
        year_val = date_obj.year
        month_val = date_obj.month
        season_val = get_season(month_val)

        # Maskeden sayısal özellikler
        with rasterio.open(mask_path) as src:
            mask = src.read(1).astype('float32')
            pixel_size = src.res[0] * src.res[1]  # m²/piksel
            valid_mask = mask != src.nodata if src.nodata is not None else np.ones_like(mask, dtype=bool)
            mask[~valid_mask] = -9999

            water_pixels = np.sum(mask[mask>ndwi_threshold]>0)
            water_area_m2 = water_pixels * pixel_size
            water_percent = water_pixels / mask.size * 100
            missing_ratio = np.sum(mask==-9999)/mask.size*100
            ndwi_valid = mask[mask>ndwi_threshold]

            ndwi_mean = np.mean(ndwi_valid) if ndwi_valid.size>0 else 0
            ndwi_std = np.std(ndwi_valid) if ndwi_valid.size>0 else 0
            ndwi_median = np.median(ndwi_valid) if ndwi_valid.size>0 else 0
            ndwi_max = np.max(ndwi_valid) if ndwi_valid.size>0 else 0
            ndwi_min = np.min(ndwi_valid) if ndwi_valid.size>0 else 0
            ndwi_var = np.var(ndwi_valid) if ndwi_valid.size>0 else 0

        # Image bandlarından ek öznitelikler
        b_means = {}
        if os.path.exists(image_path):
            with rasterio.open(image_path) as img_src:
                for i in range(1, img_src.count+1):
                    band = img_src.read(i).astype('float32')
                    band[~valid_mask] = np.nan
                    b_means[f"b{i}_mean"] = np.nanmean(band)

        record = {
            "lake_id": 141,  # Van Gölü
            "date": date_obj,
            "year": year_val,
            "month": month_val,
            "season": season_val,
            "water_area_m2": water_area_m2,
            "water_percent": water_percent,
            "missing_ratio": missing_ratio,
            "ndwi_mean": ndwi_mean,
            "ndwi_std": ndwi_std,
            "ndwi_median": ndwi_median,
            "ndwi_max": ndwi_max,
            "ndwi_min": ndwi_min,
            "ndwi_var": ndwi_var,
        }
        record.update(b_means)
        records.append(record)

# DataFrame ve CSV
df = pd.DataFrame(records)
df.to_csv(output_csv, index=False)
print(f"[DONE] Dataset saved: {output_csv}")
