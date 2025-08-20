// Load all lakes
var lakes = ee.FeatureCollection("projects/aquatrack-468214/assets/HydroLAKES_Turkey");

// Add all lakes to map
Map.addLayer(lakes, { color: 'blue' }, 'All Lakes');

// Center on Turkey
Map.centerObject(lakes, 6);
