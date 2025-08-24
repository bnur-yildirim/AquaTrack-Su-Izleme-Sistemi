import ee  # type: ignore
import geemap  # type: ignore

ee.Initialize()

# Your HydroLakes feature
hydro_lakes = ee.FeatureCollection("projects/deneme-468217/assets/hydrolakes")

# Filter lake by ID (example, if you know lake ID)
lake = hydro_lakes.filter(ee.Filter.eq("Hylak_id", 1340)).geometry()

# Export to Google Drive as GeoJSON
task = ee.batch.Export.table.toDrive(
    collection=ee.FeatureCollection([ee.Feature(lake)]),
    description="lake_export",
    fileFormat="GeoJSON",
)
task.start()
