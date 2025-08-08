import ee
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import geemap

# ----------------------------------
# Config
# ----------------------------------

EXPORT_FOLDER = "data/lake_tuz"
IMG_FOLDER = os.path.join(EXPORT_FOLDER, "images")
MASK_FOLDER = os.path.join(EXPORT_FOLDER, "ndwi_masks")
CSV_PATH = os.path.join(EXPORT_FOLDER, "lake_ndwi_timeseries.csv")
START_DATE = "2018-01-01"
END_DATE = "2024-12-31"
PATCH_SIZE = 512  # in pixels
SCALE = 10  # Sentinel-2 resolution (10m)

os.makedirs(IMG_FOLDER, exist_ok=True)
os.makedirs(MASK_FOLDER, exist_ok=True)

# ----------------------------------
# Init Earth Engine
# ----------------------------------
ee.Initialize(project="aquatrack-468214")

# Define Lake Tuz center point (you can replace with polygon later)
lake_center = ee.Geometry.Point([33.30, 38.75])

# Load Sentinel-2 SR ImageCollection and filter it
collection = (
    ee.ImageCollection("COPERNICUS/S2_SR")
    .filterBounds(lake_center)
    .filterDate(START_DATE, END_DATE)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
    .select(["B2", "B3", "B4", "B8"])  # B2 (blue), B3 (green), B4 (red), B8 (NIR)
)

# ----------------------------------
# Add NDWI band: (Green - NIR) / (Green + NIR) = (B3 - B8) / (B3 + B8)
# ----------------------------------
def add_ndwi(image):
    ndwi = image.normalizedDifference(["B3", "B8"]).rename("NDWI")
    return image.addBands(ndwi)

collection = collection.map(add_ndwi)

# ----------------------------------
# Prepare time series list
# ----------------------------------
ndwi_list = []

# Export and save images + NDWI masks
images = collection.toList(collection.size())
n = images.size().getInfo()

print(f"[INFO] Found {n} images. Downloading...")

for i in range(n):
    img = ee.Image(images.get(i))
    date_str = img.date().format("YYYY-MM-dd").getInfo()

    # Clip to patch around lake center
    region = lake_center.buffer(3000).bounds()  # approx 6x6 km

    # Get NDWI mean for time series
    stats = img.select("NDWI").reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=SCALE,
        maxPixels=1e9,
    )

    ndwi_val = stats.get("NDWI")
    if ndwi_val is None:
        continue

    ndwi_val = ee.Number(ndwi_val).getInfo()
    ndwi_list.append({"date": date_str, "NDWI": ndwi_val})

    # Use geemap to export image and mask as numpy arrays
    filename_base = f"{date_str.replace('-', '')}"

    image_path = os.path.join(IMG_FOLDER, f"{filename_base}_image.tif")
    mask_path = os.path.join(MASK_FOLDER, f"{filename_base}_mask.tif")

    print(f"  > Downloading image for {date_str}")

    # Export bands as GeoTIFFs (file_per_band=True gives separate TIFFs per band)
    geemap.ee_export_image(
        img.select(["B2", "B3", "B4", "B8"]),
        filename=image_path,
        scale=SCALE,
        region=region,
        file_per_band=True,
    )

    geemap.ee_export_image(
        img.select("NDWI"),
        filename=mask_path,
        scale=SCALE,
        region=region,
    )

# ----------------------------------
# Save time series to CSV
# ----------------------------------
df = pd.DataFrame(ndwi_list)
df.to_csv(CSV_PATH, index=False)
print(f"[DONE] Time series saved: {CSV_PATH}")

# ----------------------------------
# Optional: Plot NDWI Time Series
# ----------------------------------
df["date"] = pd.to_datetime(df["date"])
df["NDWI"] = pd.to_numeric(df["NDWI"])
df.plot(x="date", y="NDWI", figsize=(10, 5), title="Lake Tuz NDWI Time Series")
plt.grid()
plt.tight_layout()
plt.show()
