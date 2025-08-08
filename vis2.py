import rasterio
import numpy as np
import matplotlib.pyplot as plt

# --- File path to your Sentinel-2 image (update as needed) ---
b3_path = r"C:\Users\Beyza\Workspace\aquatrack\data\lake_tuz\images\20230103_image.B3.tif"  # Example


with rasterio.open(b3_path) as src:
    b3 = src.read(1)

plt.imshow(b3, cmap="gray")
plt.title("Band 3 - Green")
plt.axis("off")
plt.show()

"""
# --- Load RGB bands (B4 = Red, B3 = Green, B2 = Blue) ---
with rasterio.open(image_path) as src:
    red = src.read(3)   # Band 4
    green = src.read(2) # Band 3
    blue = src.read(1)  # Band 2

# --- Stack and normalize for display ---
rgb = np.stack([red, green, blue], axis=-1)

# Normalize to 0-1 for matplotlib (optional but improves display)
def normalize(array):
    array_min, array_max = array.min(), array.max()
    return ((array - array_min) / (array_max - array_min + 1e-6))

rgb_normalized = normalize(rgb)

# --- Plot the true color image ---
plt.figure(figsize=(8, 8))
plt.imshow(rgb_normalized)
plt.title("True Color (RGB) - Sentinel-2")
plt.axis("off")
plt.show()
"""