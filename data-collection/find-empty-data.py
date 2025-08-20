import os
import rasterio  # type: ignore
import numpy as np
import pandas as pd

# Folders containing downloaded images and NDWI masks
images_folder = "./data/gol_van/images"
ndwi_folder = "./data/gol_van/ndwi_masks"


def check_empty_tifs_realtime(folder):
    empty_files = []
    total_files = len([f for f in os.listdir(folder) if f.endswith(".tif")])
    print(f"Checking {total_files} files in {folder}...\n")

    for idx, file in enumerate(os.listdir(folder), 1):
        if file.endswith(".tif"):
            file_path = os.path.join(folder, file)
            try:
                with rasterio.open(file_path) as src:
                    data = src.read(1)  # read first band
                    is_empty = False
                    if src.nodata is not None:
                        mask = data == src.nodata
                        if np.all(mask):
                            is_empty = True
                    else:
                        if np.all(data == 0):
                            is_empty = True

                    if is_empty:
                        empty_files.append(file)
                        print(f"[{idx}/{total_files}] EMPTY: {file}")
                    else:
                        print(f"[{idx}/{total_files}] OK: {file}")
            except Exception as e:
                print(f"[{idx}/{total_files}] ERROR: {file} - {e}")
                empty_files.append(file)
    return empty_files


# Check images
# empty_images = check_empty_tifs_realtime(images_folder)

# Check NDWI masks
empty_masks = check_empty_tifs_realtime(ndwi_folder)
