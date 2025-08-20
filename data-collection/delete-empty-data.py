import os
import rasterio  # type: ignore
import numpy as np
import pandas as pd
import time

# Set absolute paths
images_folder = r"C:\Users\Beyza\Workspace\aquatrack\data\gol_van\images"
ndwi_folder = r"C:\Users\Beyza\Workspace\aquatrack\data\gol_van\ndwi_masks"


def check_and_delete_empty_tifs(folder):
    folder = os.path.abspath(folder)  # Make sure it's an absolute path
    empty_files = []
    tif_files = [f for f in os.listdir(folder) if f.lower().endswith(".tif")]
    total_files = len(tif_files)

    print(f"\nChecking {total_files} files in: {folder}\n")

    for idx, file in enumerate(tif_files, 1):
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
                        if np.all(np.isclose(data, 0, atol=1e-6)):
                            is_empty = True

            if is_empty:
                print(f"[{idx}/{total_files}] Deleting: {file_path}")
                try:
                    os.remove(file_path)
                    time.sleep(0.05)  # small delay
                    if not os.path.exists(file_path):
                        print(f"✅ Deleted: {file_path}")
                        empty_files.append(file_path)
                    else:
                        print(f"❌ Failed to delete (still exists): {file_path}")
                except PermissionError:
                    print(f"⚠️ Locked (cannot delete right now): {file_path}")
            else:
                print(f"[{idx}/{total_files}] OK: {file_path}")

        except Exception as e:
            print(f"[{idx}/{total_files}] ERROR reading {file_path} - {e}")

    before_count = total_files
    after_count = len([f for f in os.listdir(folder) if f.lower().endswith(".tif")])
    print(f"\nBefore: {before_count} files")
    print(f"After: {after_count} files")
    print(f"Deleted: {before_count - after_count} files")

    return empty_files


# Run deletion
deleted_images = check_and_delete_empty_tifs(images_folder)
deleted_masks = check_and_delete_empty_tifs(ndwi_folder)

# Save report
pd.DataFrame(
    {"deleted_images": deleted_images, "deleted_ndwi_masks": deleted_masks}
).to_csv("./deleted_tifs_report.csv", index=False)

print("\n[Done] Deleted empty files and saved report to deleted_tifs_report.csv")
