# 🔧 AquaTrack API Dokümantasyonu

Bu dokümantasyon, AquaTrack backend API'sinin tüm endpoint'lerini ve kullanım örneklerini içerir.

## 📋 İçindekiler

- [🌐 Base URL](#-base-url)
- [🔐 Authentication](#-authentication)
- [🌊 Su Kalitesi API](#-su-kalitesi-api)
- [💧 Su Miktarı API](#-su-miktarı-api)
- [📊 Analytics API](#-analytics-api)
- [🔧 System API](#-system-api)
- [❌ Error Codes](#-error-codes)
- [📝 Response Format](#-response-format)

---

## 🌐 Base URL

```
Development: http://127.0.0.1:5000
Production: https://api.aquatrack.com
```

---

## 🔐 Authentication

Şu anda authentication gerekli değildir, ancak gelecekte JWT token tabanlı authentication eklenecektir.

---

## 🌊 Su Kalitesi API

### 📊 Sistem Durumu

#### `GET /api/quality/status`
Sistem durumu ve yüklenen modeller hakkında bilgi döner.

**Response:**
```json
{
  "status": "success",
  "message": "Su kalitesi API çalışıyor",
  "models": {
    "kmeans": "loaded",
    "xgboost": "loaded"
  },
  "data_source": "clustered_water_quality.csv",
  "total_records": 15420,
  "date_range": {
    "start": "2018-01-01",
    "end": "2024-12-31"
  },
  "lakes": [
    "Van Gölü", "Tuz Gölü", "Burdur Gölü", 
    "Eğirdir Gölü", "Ulubat Gölü", "Sapanca Gölü", "Salda Gölü"
  ]
}
```

### 🏞️ Genel Analiz

#### `GET /api/quality/general-analysis`
Tüm göllerin genel su kalitesi analizi.

**Response:**
```json
{
  "status": "success",
  "summary": {
    "total_lakes": 7,
    "total_measurements": 15420,
    "date_range": {
      "start": "2018-01-01",
      "end": "2024-12-31"
    }
  },
  "cluster_distribution": {
    "cluster_0": {"count": 3850, "percentage": 25.0, "description": "Normal kalite"},
    "cluster_1": {"count": 4620, "percentage": 30.0, "description": "Alg patlaması"},
    "cluster_2": {"count": 3850, "percentage": 25.0, "description": "Tuzluluk artışı"},
    "cluster_3": {"count": 3080, "percentage": 20.0, "description": "Özel durumlar"}
  },
  "lake_summary": [
    {
      "lake_name": "Van Gölü",
      "total_measurements": 2200,
      "dominant_cluster": 0,
      "avg_ndwi": 0.45,
      "avg_chl_a": 7.23,
      "avg_turbidity": 0.58,
      "avg_wri": 2.81
    }
  ]
}
```

### 🔄 Matris Analizi

#### `GET /api/quality/matrix-analysis`
Circle Packing ve matris görselleştirmeleri için veri.

**Response:**
```json
{
  "status": "success",
  "matrix_data": [
    {
      "lake": "Van Gölü",
      "year": 2024,
      "cluster": 0,
      "ndwi": 0.45,
      "chl_a": 7.23,
      "turbidity": 0.58,
      "wri": 2.81,
      "measurements": 45
    },
    {
      "lake": "Van Gölü",
      "year": 2023,
      "cluster": 1,
      "ndwi": 0.52,
      "chl_a": 12.45,
      "turbidity": 0.67,
      "wri": 3.12,
      "measurements": 52
    }
  ],
  "lakes": ["Van Gölü", "Tuz Gölü", "Burdur Gölü", "Eğirdir Gölü", "Ulubat Gölü", "Sapanca Gölü", "Salda Gölü"],
  "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
  "total_entries": 49
}
```

### 🏞️ Göl Detay Analizi

#### `GET /api/quality/lake/{lake_key}/cluster`
Belirli bir gölün detaylı cluster analizi.

**Parameters:**
- `lake_key` (string): Göl anahtarı
  - `van` - Van Gölü
  - `tuz` - Tuz Gölü
  - `burdur` - Burdur Gölü
  - `egirdir` - Eğirdir Gölü
  - `ulubat` - Ulubat Gölü
  - `sapanca` - Sapanca Gölü
  - `salda` - Salda Gölü

**Example Request:**
```
GET /api/quality/lake/van/cluster
```

**Response:**
```json
{
  "status": "success",
  "lake_name": "Van Gölü",
  "lake_key": "van",
  "current_cluster": 0,
  "confidence": 0.85,
  "features": {
    "ndwi": 0.45,
    "chl_a": 7.23,
    "turbidity": 0.58,
    "wri": 2.81
  },
  "cluster_history": [
    {
      "date": "2024-01-15",
      "cluster": 0,
      "confidence": 0.87,
      "features": {
        "ndwi": 0.43,
        "chl_a": 6.98,
        "turbidity": 0.55,
        "wri": 2.75
      }
    }
  ],
  "total_records": 475,
  "date_range": {
    "start": "2018-01-02",
    "end": "2024-12-31"
  },
  "cluster_distribution": {
    "cluster_0": {"count": 285, "percentage": 60.0},
    "cluster_1": {"count": 95, "percentage": 20.0},
    "cluster_2": {"count": 57, "percentage": 12.0},
    "cluster_3": {"count": 38, "percentage": 8.0}
  }
}
```

---

## 💧 Su Miktarı API

### 📈 Tarihsel Veriler

#### `GET /api/forecast/lake/{lake_id}/historical`
Gölün tarihsel su miktarı verileri.

**Parameters:**
- `lake_id` (integer): Göl ID'si
  - `141` - Van Gölü
  - `140` - Tuz Gölü
  - `1342` - Burdur Gölü
  - `1340` - Eğirdir Gölü
  - `1321` - Ulubat Gölü
  - `14510` - Sapanca Gölü
  - `14741` - Salda Gölü

**Example Request:**
```
GET /api/forecast/lake/141/historical
```

**Response:**
```json
{
  "status": "success",
  "lake_id": 141,
  "lake_name": "Van Gölü",
  "historical": {
    "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
    "actual": [650000000, 680000000, 720000000, 750000000, 780000000, 800000000, 820000000],
    "dates": ["2018-01-01", "2019-01-01", "2020-01-01", "2021-01-01", "2022-01-01", "2023-01-01", "2024-01-01"]
  },
  "statistics": {
    "min_area": 650000000,
    "max_area": 820000000,
    "avg_area": 742857142,
    "trend": "increasing"
  }
}
```

### 🔮 Tahmin Verileri

#### `GET /api/forecast/lake/{lake_id}/predictions`
Gölün gelecek su miktarı tahminleri.

**Parameters:**
- `lake_id` (integer): Göl ID'si

**Example Request:**
```
GET /api/forecast/lake/141/predictions
```

**Response:**
```json
{
  "status": "success",
  "lake_id": 141,
  "lake_name": "Van Gölü",
  "predictions": {
    "H1": {
      "horizon": "1 month",
      "predicted_area": 825000000,
      "confidence": 0.87,
      "date": "2025-01-01"
    },
    "H2": {
      "horizon": "2 months",
      "predicted_area": 830000000,
      "confidence": 0.82,
      "date": "2025-02-01"
    },
    "H3": {
      "horizon": "3 months",
      "predicted_area": 835000000,
      "confidence": 0.78,
      "date": "2025-03-01"
    }
  },
  "model_info": {
    "algorithm": "CatBoost",
    "training_date": "2024-12-01",
    "accuracy": 0.85
  }
}
```

### 🏞️ Tüm Göller Özeti

#### `GET /api/forecast/all-lakes`
Tüm göllerin su miktarı özet verileri.

**Response:**
```json
{
  "status": "success",
  "lakes": [
    {
      "lake_id": 141,
      "lake_name": "Van Gölü",
      "current_area": 820000000,
      "historical": {
        "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
        "actual": [650000000, 680000000, 720000000, 750000000, 780000000, 800000000, 820000000]
      },
      "predictions": {
        "H1": 825000000,
        "H2": 830000000,
        "H3": 835000000
      }
    }
  ],
  "summary": {
    "total_lakes": 7,
    "total_current_area": 4200000000,
    "avg_area": 600000000
  }
}
```

---

## 📊 Analytics API

### 📈 Model Performansı

#### `GET /api/analytics/model-performance`
ML modellerinin performans metrikleri.

**Response:**
```json
{
  "status": "success",
  "water_quantity": {
    "H1": {
      "model": "CatBoost H1",
      "accuracy": 0.87,
      "wmape": 12.5,
      "rmse": 45000000,
      "mae": 38000000
    },
    "H2": {
      "model": "CatBoost H2",
      "accuracy": 0.82,
      "wmape": 15.2,
      "rmse": 52000000,
      "mae": 42000000
    },
    "H3": {
      "model": "CatBoost H3",
      "accuracy": 0.78,
      "wmape": 18.7,
      "rmse": 58000000,
      "mae": 47000000
    }
  },
  "water_quality": {
    "kmeans": {
      "model": "K-Means Clustering",
      "silhouette_score": 0.65,
      "inertia": 1250.45,
      "n_clusters": 4
    },
    "xgboost": {
      "model": "XGBoost Classifier",
      "accuracy": 0.92,
      "precision": 0.89,
      "recall": 0.91,
      "f1_score": 0.90
    }
  }
}
```

### 📊 Detaylı Analiz

#### `GET /api/analytics/detailed-analysis`
Detaylı analiz ve karşılaştırma verileri.

**Response:**
```json
{
  "status": "success",
  "water_quality_trends": {
    "van": {
      "lake_name": "Van Gölü",
      "trend_analysis": {
        "ndwi": {"trend": "stable", "change": 0.02},
        "chl_a": {"trend": "increasing", "change": 1.5},
        "turbidity": {"trend": "stable", "change": -0.01},
        "wri": {"trend": "increasing", "change": 0.3}
      }
    }
  },
  "comparative_analysis": {
    "lake_rankings": [
      {"lake": "Van Gölü", "overall_score": 8.5},
      {"lake": "Sapanca Gölü", "overall_score": 8.2},
      {"lake": "Eğirdir Gölü", "overall_score": 7.8}
    ]
  }
}
```

---

## 🔧 System API

### 🖥️ Sistem Bilgileri

#### `GET /api/system/info`
Sistem bilgileri ve durumu.

**Response:**
```json
{
  "status": "success",
  "system": {
    "name": "AquaTrack API",
    "version": "2.0.0",
    "environment": "development",
    "uptime": "2h 15m 30s",
    "memory_usage": "256 MB",
    "cpu_usage": "15%"
  },
  "database": {
    "status": "connected",
    "type": "file-based",
    "records": 15420
  },
  "models": {
    "loaded": 7,
    "water_quality": 4,
    "water_quantity": 3
  }
}
```

### 🔍 Sistem Sağlığı

#### `GET /api/system/health`
Sistem sağlık durumu kontrolü.

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "models": "ok",
    "data_sources": "ok",
    "memory": "ok",
    "disk_space": "ok"
  },
  "timestamp": "2024-12-01T10:30:00Z"
}
```

---

## ❌ Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | İstek başarılı |
| 400 | Bad Request | Geçersiz parametreler |
| 404 | Not Found | Kaynak bulunamadı |
| 500 | Internal Server Error | Sunucu hatası |
| 503 | Service Unavailable | Servis kullanılamıyor |

### Error Response Format

```json
{
  "status": "error",
  "error_code": "INVALID_LAKE_ID",
  "message": "Geçersiz göl ID'si",
  "details": {
    "provided_id": "invalid_id",
    "valid_ids": [141, 140, 1342, 1340, 1321, 14510, 14741]
  },
  "timestamp": "2024-12-01T10:30:00Z"
}
```

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_LAKE_ID` | Geçersiz göl ID'si | Geçerli ID kullanın |
| `INVALID_LAKE_KEY` | Geçersiz göl anahtarı | Geçerli anahtar kullanın |
| `DATA_NOT_FOUND` | Veri bulunamadı | Veri kaynağını kontrol edin |
| `MODEL_NOT_LOADED` | Model yüklenmemiş | Sistemi yeniden başlatın |
| `RATE_LIMIT_EXCEEDED` | Rate limit aşıldı | Daha sonra tekrar deneyin |

---

## 📝 Response Format

### Success Response

```json
{
  "status": "success",
  "data": {
    // Actual data here
  },
  "metadata": {
    "timestamp": "2024-12-01T10:30:00Z",
    "version": "2.0.0",
    "request_id": "req_123456789"
  }
}
```

### Error Response

```json
{
  "status": "error",
  "error_code": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    // Additional error details
  },
  "timestamp": "2024-12-01T10:30:00Z"
}
```

---

## 🔧 API Kullanım Örnekleri

### JavaScript/Fetch

```javascript
// Su kalitesi verilerini çek
async function fetchWaterQuality(lakeKey) {
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/quality/lake/${lakeKey}/cluster`);
    const data = await response.json();
    
    if (data.status === 'success') {
      console.log('Göl:', data.lake_name);
      console.log('Mevcut cluster:', data.current_cluster);
      console.log('Güven:', data.confidence);
    } else {
      console.error('Hata:', data.message);
    }
  } catch (error) {
    console.error('API hatası:', error);
  }
}

// Kullanım
fetchWaterQuality('van');
```

### Python/Requests

```python
import requests

# Su miktarı tahminlerini çek
def fetch_water_quantity_predictions(lake_id):
    try:
        response = requests.get(f'http://127.0.0.1:5000/api/forecast/lake/{lake_id}/predictions')
        data = response.json()
        
        if data['status'] == 'success':
            predictions = data['predictions']
            print(f"Göl: {data['lake_name']}")
            print(f"H1 Tahmini: {predictions['H1']['predicted_area']}")
            print(f"H2 Tahmini: {predictions['H2']['predicted_area']}")
            print(f"H3 Tahmini: {predictions['H3']['predicted_area']}")
        else:
            print(f"Hata: {data['message']}")
    except Exception as e:
        print(f"API hatası: {e}")

# Kullanım
fetch_water_quantity_predictions(141)
```

### curl

```bash
# Sistem durumunu kontrol et
curl -X GET http://127.0.0.1:5000/api/quality/status

# Van Gölü su kalitesi
curl -X GET http://127.0.0.1:5000/api/quality/lake/van/cluster

# Van Gölü su miktarı tahminleri
curl -X GET http://127.0.0.1:5000/api/forecast/lake/141/predictions
```

---

## 📊 Rate Limiting

API kullanımı için rate limiting uygulanmaktadır:

- **Genel limit**: 100 istek/dakika
- **Ağır işlemler**: 10 istek/dakika
- **IP bazlı**: Her IP için ayrı limit

Rate limit aşıldığında `429 Too Many Requests` döner.

---

## 🔄 API Versiyonlama

API versiyonlama URL path'inde yapılmaktadır:

- **v1**: `/api/v1/quality/status` (Deprecated)
- **v2**: `/api/quality/status` (Current)

Gelecekte v3 çıktığında backward compatibility korunacaktır.

---

## 📞 Destek

API ile ilgili sorunlar için:

1. **GitHub Issues**: Teknik sorunlar
2. **API Documentation**: Bu dokümantasyon
3. **System Health**: `/api/system/health` endpoint'i

---

*Son güncelleme: Aralık 2024*
*API Versiyon: 2.0.0*
