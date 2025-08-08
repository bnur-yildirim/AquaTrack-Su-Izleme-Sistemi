import rasterio
from rasterio.windows import Window
import matplotlib.pyplot as plt

# Coordinates of Tuz Gölü
# lat, lon = 38.50, 33.20

# van gölü
lat, lon = 38.64, 42.95

file_path = r"C:/Users/Beyza/Workspace/aquatrack/data/occurrence_30E_40Nv1_4_2021.tif"

with rasterio.open(file_path) as src:
    # Convert (lon, lat) to image pixel coordinates (col, row)
    row, col = src.index(lon, lat)

    # Define a window around that location (e.g., 500x500 pixels)
    window = Window(col - 250, row - 250, 500, 500)

    # Read the data in that window
    img = src.read(1, window=window)

    # Plot it
    plt.imshow(img, cmap="Blues", vmin=0, vmax=100)
    plt.title("Surface Water Occurrence (Tuz Gölü)")
    plt.colorbar(label="Occurrence (%)")
    plt.show()
