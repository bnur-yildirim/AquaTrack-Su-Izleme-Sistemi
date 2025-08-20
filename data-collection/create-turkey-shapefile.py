import geopandas as gpd  # type: ignore

# Paths to your files
hydrolakes_fp = r"C:\Users\Beyza\Downloads\HydroLAKES_polys_v10_shp\HydroLAKES_polys_v10_shp\HydroLAKES_polys_v10.shp"
turkey_boundary_fp = (
    r"C:\Users\Beyza\Downloads\gadm41_TUR_shp\gadm41_TUR_0.shp"  # Level 0 boundary
)

# Load HydroLAKES polygons
hydrolakes = gpd.read_file(hydrolakes_fp)

# Load Turkey boundary (Level 0)
turkey = gpd.read_file(turkey_boundary_fp)

# Reproject hydrolakes to match Turkey CRS
hydrolakes = hydrolakes.to_crs(turkey.crs)

# Filter lakes intersecting Turkey
turkey_lakes = hydrolakes[hydrolakes.intersects(turkey.unary_union)]

# Save to new shapefile
turkey_lakes.to_file("HydroLAKES_Turkey.shp")

print("Saved HydroLAKES_Turkey.shp with", len(turkey_lakes), "lakes.")
