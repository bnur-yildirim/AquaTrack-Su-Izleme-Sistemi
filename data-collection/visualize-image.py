import rasterio  # type: ignore
import numpy as np
import matplotlib.pyplot as plt
import glob
import os
from math import ceil
import random

# Path to your images folder
IMG_FOLDER = r"C:\Users\Beyza\Workspace\aquatrack\data\gol_tuz\images"

# Get all image files for any bands (e.g., B2, B3, B4, B8)
all_files = glob.glob(os.path.join(IMG_FOLDER, "*_image.*.tif"))

# Organize files by date, tile, and band
# Structure: {date: {tile_index: {band: filepath}}}
files_dict = {}

for filepath in all_files:
    filename = os.path.basename(filepath)
    # Assumes filename format like: 20220101_tile0_image.B2.tif
    parts = filename.split("_")
    date_str = parts[0]
    tile_part = [p for p in parts if "tile" in p][0]  # e.g. tile0
    tile_index = tile_part.replace("tile", "")
    band_part = filename.split(".")[-2]  # e.g. B2, B8, etc.

    if date_str not in files_dict:
        files_dict[date_str] = {}
    if tile_index not in files_dict[date_str]:
        files_dict[date_str][tile_index] = {}

    files_dict[date_str][tile_index][band_part] = filepath

# Pick a random date to visualize
random.seed()
selected_date = random.choice(list(files_dict.keys()))
print(f"Selected date: {selected_date}")

tiles_for_date = files_dict[selected_date]
n_tiles = len(tiles_for_date)


# Percentile stretch function with NaN support
def stretch(band, pmin=2, pmax=98):
    vmin, vmax = np.nanpercentile(band, (pmin, pmax))
    stretched = np.clip((band - vmin) / (vmax - vmin), 0, 1)
    return stretched


# Plot grid size
cols = 5
rows = ceil(n_tiles / cols)

fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4))
axes = axes.ravel()

# Bands to use for visualization: RGB = Red(B4), Green(B3), Blue(B2)
vis_bands = ["B4", "B3", "B2"]

for ax, (tile_idx, bands_dict) in zip(axes, tiles_for_date.items()):
    # Check if all needed bands are present
    if not all(b in bands_dict for b in vis_bands):
        print(f"Skipping tile {tile_idx}, missing bands for visualization.")
        ax.axis("off")
        continue

    band_arrays = []
    for b in vis_bands:
        with rasterio.open(bands_dict[b]) as src:
            arr = src.read(1).astype(np.float32)
            # Mask no data or zero values (adjust if your data uses another nodata value)
            arr[arr <= 0] = np.nan
            # Scale reflectance values if needed (Sentinel-2 Level 2A typically scaled by 10000)
            arr = arr / 10000.0
            print(
                f"Tile {tile_idx} band {b} min={np.nanmin(arr):.4f}, max={np.nanmax(arr):.4f}"
            )
            band_arrays.append(arr)

    # Stretch each band
    stretched = [stretch(band) for band in band_arrays]

    # Stack bands into RGB image
    rgb = np.dstack(stretched)

    ax.imshow(rgb)
    ax.set_title(f"Tile {tile_idx}", fontsize=10)
    ax.axis("off")

# Turn off extra axes if any
for ax in axes[n_tiles:]:
    ax.axis("off")

plt.tight_layout()
plt.show()
