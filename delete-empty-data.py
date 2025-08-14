import os
import rasterio
import numpy as np
import pandas as pd
import time

images_folder = "./data/gol_tuz/images"
ndwi_folder = "./data/gol_tuz/ndwi_masks"


def check_and_delete_empty_tifs(folder):
    empty_files = []
    total_files = len([f for f in os.listdir(folder) if f.endswith(".tif")])
    print(f"Checking {total_files} files in {folder}...\n")

    for idx, file in enumerate(os.listdir(folder), 1):
        if file.endswith(".tif"):
            file_path = os.path.join(folder, file)
            try:
                with rasterio.Env():
                    with rasterio.open(file_path) as src:
                        data = src.read(1)
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
                    try:
                        time.sleep(0.05)  # short delay
                        os.remove(file_path)
                        print(f"[{idx}/{total_files}] DELETED EMPTY: {file}")
                    except PermissionError:
                        print(f"[{idx}/{total_files}] WARNING (locked): {file}")
                else:
                    print(f"[{idx}/{total_files}] OK: {file}")

            except Exception as e:
                print(f"[{idx}/{total_files}] ERROR: {file} - {e}")

    return empty_files


# Delete empty images
deleted_images = check_and_delete_empty_tifs(images_folder)

# Delete empty NDWI masks
deleted_masks = check_and_delete_empty_tifs(ndwi_folder)

pd.DataFrame(
    {"deleted_images": deleted_images, "deleted_ndwi_masks": deleted_masks}
).to_csv("./deleted_tifs_report.csv", index=False)

print("\n[Done] Deleted empty files and saved report to deleted_tifs_report.csv")
