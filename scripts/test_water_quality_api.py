"""
K-Means Su Kalitesi API Test Script
Tüm endpoint'leri test eder
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def print_section(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def test_single_predict():
    """Tekil tahmin testi"""
    print_section("TEST 1: Tekil Su Kalitesi Tahmini")
    
    url = f"{BASE_URL}/api/water-quality/predict"
    data = {
        "ndwi_mean": 5.26,
        "wri_mean": 1206.05,
        "chl_a_mean": 1212.66,
        "turbidity_mean": 0.54
    }
    
    print(f"Request: POST {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    response = requests.post(url, json=data)
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print(f"\n✅ SUCCESS - Cluster: {result.get('cluster')}, {result.get('cluster_name')}")
    else:
        print(f"❌ FAILED: {response.text}")

def test_batch_predict():
    """Toplu tahmin testi"""
    print_section("TEST 2: Toplu Su Kalitesi Tahmini")
    
    url = f"{BASE_URL}/api/water-quality/batch"
    data = {
        "lake_id": 141,
        "measurements": [
            {
                "date": "2024-01-01",
                "ndwi_mean": 5.26,
                "wri_mean": 1206.05,
                "chl_a_mean": 1212.66,
                "turbidity_mean": 0.54
            },
            {
                "date": "2024-02-01",
                "ndwi_mean": 5.30,
                "wri_mean": 1210.00,
                "chl_a_mean": 1215.00,
                "turbidity_mean": 0.55
            },
            {
                "date": "2024-03-01",
                "ndwi_mean": 5.40,
                "wri_mean": 1220.00,
                "chl_a_mean": 1225.00,
                "turbidity_mean": 0.60
            }
        ]
    }
    
    print(f"Request: POST {url}")
    print(f"Data: {data['lake_id']}, {len(data['measurements'])} measurements")
    
    response = requests.post(url, json=data)
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ SUCCESS - {result.get('total_measurements')} measurements processed")
        for i, res in enumerate(result.get('results', [])[:3]):  # İlk 3 sonuç
            print(f"  {i+1}. {res['date']} - Cluster: {res['cluster']}, Risk: {res['risk_level']}")
    else:
        print(f"❌ FAILED: {response.text}")

def test_lake_analysis():
    """Göl analizi testi"""
    print_section("TEST 3: Göl Analizi (Van Gölü)")
    
    lake_id = "141"
    url = f"{BASE_URL}/api/water-quality/lake-analysis/{lake_id}"
    
    print(f"Request: GET {url}")
    
    response = requests.get(url)
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ SUCCESS - {result.get('lake_name')}")
        print(f"  Total Measurements: {result.get('total_measurements')}")
        print(f"  Date Range: {result.get('date_range', {}).get('start')} - {result.get('date_range', {}).get('end')}")
        print(f"  Dominant Cluster: {result.get('dominant_cluster', {}).get('name')} ({result.get('dominant_cluster', {}).get('percentage')}%)")
        print(f"\n  Cluster Distribution:")
        for cluster_id, data in result.get('cluster_distribution', {}).items():
            print(f"    {data['name']}: {data['count']} ({data['percentage']}%)")
    else:
        print(f"❌ FAILED: {response.text}")

def test_clusters_info():
    """Cluster bilgileri testi"""
    print_section("TEST 4: Cluster Bilgileri")
    
    url = f"{BASE_URL}/api/water-quality/clusters/info"
    
    print(f"Request: GET {url}")
    
    response = requests.get(url)
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ SUCCESS - {result.get('total_clusters')} clusters")
        print(f"  Model: {result.get('model')}")
        print(f"  Features: {', '.join(result.get('features', []))}")
        print(f"\n  Clusters:")
        for cluster_id, info in result.get('clusters', {}).items():
            print(f"    {info['icon']} Cluster {cluster_id}: {info['name']} (Risk: {info['risk_level']})")
    else:
        print(f"❌ FAILED: {response.text}")

def test_all_lakes_summary():
    """Tüm göller özeti testi"""
    print_section("TEST 5: Tüm Göller Özeti")
    
    url = f"{BASE_URL}/api/water-quality/all-lakes-summary"
    
    print(f"Request: GET {url}")
    
    response = requests.get(url)
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ SUCCESS - {result.get('total_lakes')} lakes")
        print(f"\n  Göller:")
        for lake in result.get('lakes', []):
            print(f"    {lake['icon']} {lake['lake_name']}: {lake['cluster_name']} (Risk: {lake['risk_level']})")
            print(f"       Measurements: {lake['measurements']}")
    else:
        print(f"❌ FAILED: {response.text}")

def main():
    print("\n" + "🔬"*35)
    print(" "*25 + "K-MEANS SU KALİTESİ API TEST")
    print("🔬"*35)
    
    try:
        # Test 1: Tekil tahmin
        test_single_predict()
        
        # Test 2: Toplu tahmin
        test_batch_predict()
        
        # Test 3: Göl analizi
        test_lake_analysis()
        
        # Test 4: Cluster bilgileri
        test_clusters_info()
        
        # Test 5: Tüm göller özeti
        test_all_lakes_summary()
        
        # Özet
        print_section("TEST ÖZETİ")
        print("✅ Tüm testler tamamlandı!")
        print("\n📊 Endpoint'ler:")
        print("  1. POST /api/water-quality/predict - Tekil tahmin")
        print("  2. POST /api/water-quality/batch - Toplu tahmin")
        print("  3. GET  /api/water-quality/lake-analysis/{lake_id} - Göl analizi")
        print("  4. GET  /api/water-quality/clusters/info - Cluster bilgileri")
        print("  5. GET  /api/water-quality/all-lakes-summary - Tüm göller özeti")
        print("\n💡 Kullanım:")
        print("  python test_water_quality_api.py")
        print("\n⚠️ Not: Backend'in çalışıyor olması gerekir (python backend/app.py)")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ HATA: Backend'e bağlanılamadı!")
        print("Backend'i başlatın: python backend/app.py")
    except Exception as e:
        print(f"\n❌ HATA: {str(e)}")

if __name__ == "__main__":
    main()

