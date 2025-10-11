import requests
import json

# Test all-lakes endpoint
r = requests.get('http://localhost:5000/api/quality/all-lakes')
data = r.json()

print(f"✅ API Status: {r.status_code}")
print(f"📊 Total lakes: {len(data['lakes'])}")
print("\n🏞️ Lakes Data:")
print("-" * 80)

for lake in data['lakes']:
    print(f"\n{lake['lake_name']}:")
    print(f"  • Cluster: {lake['cluster']} ({lake['interpretation']})")
    print(f"  • Confidence: {lake['confidence']*100:.1f}%")
    print(f"  • NDWI: {lake['ndwi']:.2f}")
    print(f"  • WRI: {lake['wri']:.2f}")
    print(f"  • Chl-a: {lake['chl_a']:.2f}")
    print(f"  • Turbidity: {lake['turbidity']:.2f}")
    if lake.get('last_measurement'):
        print(f"  • Last measurement: {lake['last_measurement']}")

