import ee  # type: ignore
import geemap  # type: ignore

ee.Initialize(project ='deneme-468217')

# Your HydroLakes feature
hydro_lakes = ee.FeatureCollection("projects/deneme-468217/assets/hydrolakes")

# Filter lake by ID (example, if you know lake ID)
lake = hydro_lakes.filter(ee.Filter.eq("Hylak_id", 141)).geometry()

# Export to Google Drive as GeoJSON
task = ee.batch.Export.table.toDrive(
    collection=ee.FeatureCollection([ee.Feature(lake)]),
    description="lake_van_export",
    fileFormat="GeoJSON",
)
task.start()
