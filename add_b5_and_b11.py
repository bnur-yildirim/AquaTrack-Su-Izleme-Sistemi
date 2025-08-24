import os
import pandas as pd
import ee
import geemap

def download_b5_b11_only(
    hydro_lakes_id,
    export_folder,
    start_date="2018-06-10",
    end_date="2021-12-31",
    scale=10,
    cloud_pct_threshold=10,
    tile_size_km=10,
    project_id="deneme-468217",
):
    ee.Initialize(project=project_id)

    # Load HydroLAKES Turkey dataset and filter by lake ID
    hydro_lakes = ee.FeatureCollection(
        "projects/deneme-468217/assets/hydrolakes"
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

    # Ana klasör oluştur
    os.makedirs(export_folder, exist_ok=True)

    # Sentinel-2 SR collection - sadece B5 ve B11
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR")
        .filterBounds(lake_geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_pct_threshold))
        .select(["B5", "B11"])  # Sadece B5 ve B11
    )

    download_list = []

    # Get list of image IDs
    img_ids = collection.aggregate_array("system:index").getInfo()
    
    print(f"Toplam {len(img_ids)} görüntü bulundu")
    print(f"Toplam {len(tiles)} tile var")

    for i, img_id in enumerate(img_ids):
        img = ee.Image(collection.filter(ee.Filter.eq("system:index", img_id)).first())
        date_str = img.date().format("YYYY-MM-dd").getInfo()
        
        print(f"İşleniyor ({i+1}/{len(img_ids)}): {date_str}")

        for t_idx, tile_geom in tiles:
            download_list.append({"date": date_str, "tile": t_idx})

            filename_base = f"{date_str.replace('-', '')}_tile{t_idx}"
            
            # B5 ve B11'i tek request ile indir
            geemap.ee_export_image(
                img.select(["B5", "B11"]),
                filename=os.path.join(
                    export_folder, f"{filename_base}_B5_B11.tif"
                ),
                scale=scale,
                region=tile_geom,
                file_per_band=True,  # Her bant için ayrı dosya oluştur
            )

    # CSV kaydet
    df = pd.DataFrame(download_list)
    csv_path = os.path.join(
        export_folder,
        f"lake_{hydro_lakes_id}_B5_B11_timeseries_{start_date}_{end_date}.csv",
    )
    df.to_csv(csv_path, index=False)
    print(f"[DONE] B5 ve B11 bantları tek request ile indirildi")
    print(f"CSV dosyası: {csv_path}")
    print(f"Dosyalar: {export_folder}/")

    return df

if __name__ == "__main__":
    lake_id = 141  # Lake Van
    export_folder = "./data/gol_van_B5_B11"

    download_b5_b11_only(
        hydro_lakes_id=lake_id,
        export_folder=export_folder,
        start_date="2018-06-11",
        end_date="2021-12-31",
        scale=10,
        cloud_pct_threshold=10,
        tile_size_km=10,
    )