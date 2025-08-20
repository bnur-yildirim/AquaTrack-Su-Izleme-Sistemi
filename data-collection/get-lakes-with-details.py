import ee  # type: ignore
import csv


def list_lakes_with_details(asset_path, limit=None):
    ee.Initialize()

    hydro_lakes = ee.FeatureCollection(asset_path)
    total = hydro_lakes.size().getInfo()
    print(f"Total lakes in collection: {total}")

    # Get all lakes (no name filter)
    n = total if limit is None else min(limit, total)
    features = hydro_lakes.toList(n)

    lakes = []
    for i in range(n):
        feature = ee.Feature(features.get(i))

        lake_id = feature.get("Hylak_id").getInfo()
        lake_name = feature.get("Lake_name").getInfo()
        country = feature.get("Country").getInfo()

        # Replace missing/empty name
        if not lake_name:
            lake_name = "Unnamed"

        # Get centroid for coordinates
        centroid = feature.geometry().centroid().coordinates().getInfo()
        lon, lat = centroid[0], centroid[1]

        lakes.append(
            {
                "Lake_name": lake_name,
                "Hylak_id": lake_id,
                "Country": country,
                "Latitude": lat,
                "Longitude": lon,
            }
        )

    # Sort by Lake_name (case-insensitive)
    lakes.sort(key=lambda x: x["Lake_name"].lower())

    return lakes


def save_lakes_to_csv(lakes, filename="lakes_with_details.csv"):
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["Lake_name", "Hylak_id", "Country", "Latitude", "Longitude"])
        for lake in lakes:
            writer.writerow(
                [
                    lake["Lake_name"],
                    lake["Hylak_id"],
                    lake["Country"],
                    lake["Latitude"],
                    lake["Longitude"],
                ]
            )
    print(f"Saved {len(lakes)} lakes to {filename}")


# Example usage
lakes_data = list_lakes_with_details(
    "projects/aquatrack-468214/assets/HydroLAKES_Turkey"
)
save_lakes_to_csv(lakes_data)

# Preview first 10
for lake in lakes_data[:10]:
    print(lake)
