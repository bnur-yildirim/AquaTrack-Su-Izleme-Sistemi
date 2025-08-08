import rasterio
import numpy as np
import matplotlib.pyplot as plt

# Paths to your bands (change these to match your filenames)
b2_path = r"C:\Users\Beyza\Workspace\aquatrack\data\lake_tuz\images\20190728_image.B2.tif"  # Blue
b3_path = r"C:\Users\Beyza\Workspace\aquatrack\data\lake_tuz\images\20190728_image.B3.tif"  # Green
b4_path = r"C:\Users\Beyza\Workspace\aquatrack\data\lake_tuz\images\20190728_image.B4.tif"  # Red


# Load bands
def load_band(path):
    with rasterio.open(path) as src:
        arr = src.read(1).astype(np.float32)
    return arr / 10000.0  # scale Sentinel-2 reflectance


blue = load_band(b2_path)
green = load_band(b3_path)
red = load_band(b4_path)


# Percentile stretch per band
def stretch(band, pmin=2, pmax=98):
    lo = np.percentile(band, pmin)
    hi = np.percentile(band, pmax)
    return np.clip((band - lo) / (hi - lo), 0, 1)


r_stretch = stretch(red)
g_stretch = stretch(green)
b_stretch = stretch(blue)

# White balance: normalize by mean brightness
r_norm = r_stretch / np.mean(r_stretch)
g_norm = g_stretch / np.mean(g_stretch)
b_norm = b_stretch / np.mean(b_stretch)

# Re-scale to [0,1] after balancing
rgb_balanced = np.dstack((r_norm, g_norm, b_norm))
rgb_balanced = (rgb_balanced - rgb_balanced.min()) / (
    rgb_balanced.max() - rgb_balanced.min()
)

# Plot
plt.figure(figsize=(8, 8))
plt.imshow(rgb_balanced)
plt.title("Sentinel-2 True Color (Balanced)")
plt.axis("off")
plt.show()
