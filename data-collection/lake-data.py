import os
import pandas as pd
import ee  # type: ignore
import geemap  # type: ignore


def download_lake_ndwi_timeseries_all_tiles(
    hydro_lakes_id,
    export_folder,
    start_date="2018-01-01",
    end_date="2024-12-31",
    scale=10,
    cloud_pct_threshold=10,
    tile_size_km=10,
    project_id="aquatrack-468214",
):
    ee.Initialize(project=project_id)

    # Load HydroLAKES Turkey dataset and filter by lake ID
    hydro_lakes = ee.FeatureCollection(
        "projects/aquatrack-468214/assets/HydroLAKES_Turkey"
    )
    lake_feature = hydro_lakes.filter(ee.Filter.eq("Hylak_id", hydro_lakes_id)).first()
    lake_geometry = lake_feature.geometry()

    # Split lake polygon into tiles
    bounds = lake_geometry.bounds().coordinates().get(0).getInfo()
    xs = [c[0] for c in bounds]
    ys = [c[1] for c in bounds]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    tile_size_deg = tile_size_km / 111.0

    tiles = []
    tile_index = 0
    x = xmin
    while x < xmax:
        y = ymin
        while y < ymax:
            tile_geom = ee.Geometry.Rectangle(
                [x, y, x + tile_size_deg, y + tile_size_deg]
            )
            intersection = lake_geometry.intersection(tile_geom, 1)
            if intersection.area().getInfo() > 0:
                tiles.append((tile_index, intersection))
                tile_index += 1
            y += tile_size_deg
        x += tile_size_deg

    os.makedirs(os.path.join(export_folder, "images"), exist_ok=True)
    os.makedirs(os.path.join(export_folder, "ndwi_masks"), exist_ok=True)

    # Sentinel-2 SR collection with NDWI band added
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR")
        .filterBounds(lake_geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_pct_threshold))
        .select(["B2", "B3", "B4", "B8"])
        .map(
            lambda img: img.addBands(
                img.normalizedDifference(["B3", "B8"]).rename("NDWI")
            )
        )
    )

    ndwi_list = []

    # Get list of image IDs (client-side call only once)
    img_ids = collection.aggregate_array("system:index").getInfo()

    for img_id in img_ids:
        img = ee.Image(collection.filter(ee.Filter.eq("system:index", img_id)).first())
        date_str = img.date().format("YYYY-MM-dd").getInfo()

        for t_idx, tile_geom in tiles:
            ndwi_list.append({"date": date_str, "tile": t_idx})

            filename_base = f"{date_str.replace('-', '')}_tile{t_idx}"
            # Export image bands
            geemap.ee_export_image(
                img.select(["B2", "B3", "B4", "B8"]),
                filename=os.path.join(
                    export_folder, "images", f"{filename_base}_image.tif"
                ),
                scale=scale,
                region=tile_geom,
                file_per_band=True,
            )
            # Export NDWI mask
            geemap.ee_export_image(
                img.select("NDWI"),
                filename=os.path.join(
                    export_folder, "ndwi_masks", f"{filename_base}_mask.tif"
                ),
                scale=scale,
                region=tile_geom,
            )

    df = pd.DataFrame(ndwi_list)
    csv_path = os.path.join(
        export_folder,
        f"lake_{hydro_lakes_id}_ndwi_timeseries_{start_date}_{end_date}.csv",
    )
    df.to_csv(csv_path, index=False)
    print(f"[DONE] Time series saved: {csv_path}")

    return df


if __name__ == "__main__":
    lake_id = 141
    export_folder = "./data/gol_van"

    download_lake_ndwi_timeseries_all_tiles(
        hydro_lakes_id=lake_id,
        export_folder=export_folder,
        start_date="2024-01-01",
        end_date="2024-12-31",
        scale=10,
        cloud_pct_threshold=10,
        tile_size_km=10,
    )
