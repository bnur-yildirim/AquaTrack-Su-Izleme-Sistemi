# 📬 POSTMAN TEST REHBERİ

## 🚀 SU KALİTESİ API TEST

### 1️⃣ **Model Durumu Kontrol**

```
Method: GET
URL: http://127.0.0.1:5000/api/quality/status

Beklenen Sonuç:
{
  "status": "active",
  "models_loaded": true,
  "available_models": ["kmeans", "scaler", "xgboost", "xgboost_scaler"],
  "model_type": "K-Means Clustering (Unsupervised)",
  "clusters": 4,
  "features": ["NDWI", "WRI", "Chlorophyll-a", "Turbidity"],
  "timestamp": "2025-10-09T..."
}

✅ KONTROL:
- status: "active" olmalı
- models_loaded: true olmalı
- available_models: en az 2 model olmalı
```

---

### 2️⃣ **Cluster Bilgileri**

```
Method: GET
URL: http://127.0.0.1:5000/api/quality/clusters/info

Beklenen Sonuç:
{
  "clusters": [
    {
      "id": 0,
      "name": "Normal Su Kalitesi",
      "description": "Standart su kalitesi parametreleri...",
      "percentage": 93.0,
      "example_lakes": ["Burdur", "Tuz", "Ulubat", "Eğirdir"],
      "color": "#28a745",
      "status": "good"
    },
    {
      "id": 1,
      "name": "Alg Patlaması Riski",
      ...
    },
    ...
  ],
  "total_clusters": 4,
  "method": "K-Means Unsupervised Learning"
}

✅ KONTROL:
- total_clusters: 4 olmalı
- Her cluster için color ve example_lakes olmalı
```

---

### 3️⃣ **Cluster Tahmini (POST)**

```
Method: POST
URL: http://127.0.0.1:5000/api/quality/predict
Headers:
  Content-Type: application/json

Body (JSON):
{
  "ndwi_mean": 5.26,
  "wri_mean": 1206.05,
  "chl_a_mean": 1212.66,
  "turbidity_mean": 0.54
}

Beklenen Sonuç:
{
  "cluster": 0,
  "interpretation": "Normal su kalitesi - Standart durum",
  "confidence": 0.95,
  "similar_lakes": ["Burdur", "Tuz", "Ulubat", "Eğirdir"],
  "features": {
    "ndwi": 5.26,
    "wri": 1206.05,
    "chl_a": 1212.66,
    "turbidity": 0.54
  }
}

✅ KONTROL:
- cluster: 0-3 arası bir sayı olmalı
- interpretation: Anlamlı metin olmalı
- confidence: 0-1 arası olmalı
```

---

### 4️⃣ **Tüm Göller Durumu**

```
Method: GET
URL: http://127.0.0.1:5000/api/quality/all-lakes

Beklenen Sonuç:
{
  "lakes": [
    {
      "lake_name": "Tuz Gölü",
      "cluster": 0,
      "interpretation": "Normal su kalitesi",
      "confidence": 0.92,
      "similar_lakes": ["Burdur", "Ulubat"],
      "last_measurement": "2024-12-18",
      "ndwi": 3.34,
      "wri": 1200.5,
      "chl_a": 1205.3,
      "turbidity": 0.58
    },
    ...
  ],
  "total_lakes": 6,
  "timestamp": "2025-10-09T..."
}

✅ KONTROL:
- total_lakes: 6 olmalı (Eğirdir eksik olabilir)
- Her göl için interpretation ve confidence olmalı
- ndwi, wri, chl_a, turbidity değerleri olmalı
```

---

### 5️⃣ **Göl Cluster History**

```
Method: GET
URL: http://127.0.0.1:5000/api/quality/lake/141/cluster

(141 = Van Gölü)
Diğer göller:
- 140 = Tuz
- 1321 = Ulubat
- 1340 = Eğirdir
- 1342 = Burdur
- 14510 = Sapanca
- 14741 = Salda

Beklenen Sonuç:
{
  "lake_id": "141",
  "lake_name": "Van Gölü",
  "current_cluster": 3,
  "interpretation": "Özel coğrafi durum",
  "confidence": 0.88,
  "similar_lakes": ["Van", "Salda"],
  "cluster_history": [
    {
      "date": "2018-01-20",
      "cluster": 3,
      "ndwi": 6.13,
      "wri": 2.55,
      "chl_a": 4.64,
      "turbidity": 2.66
    },
    ...
  ],
  "total_measurements": 511,
  "features": {...},
  "timestamp": "..."
}

✅ KONTROL:
- lake_name doğru olmalı
- cluster_history dizisi dolu olmalı
- total_measurements > 0 olmalı
```

---

## 🧪 TEST SENARYOLARI

### **Senaryo 1: Normal Su** ✅
```json
POST /api/quality/predict
{
  "ndwi_mean": 5.0,
  "wri_mean": 10.0,
  "chl_a_mean": 15.0,
  "turbidity_mean": 0.8
}

Beklenen: cluster = 0 (Normal)
```

### **Senaryo 2: Alg Patlaması** 🔴
```json
POST /api/quality/predict
{
  "ndwi_mean": 3800.0,
  "wri_mean": 1.5,
  "chl_a_mean": 5000.0,
  "turbidity_mean": 3.5
}

Beklenen: cluster = 1 (Alg patlaması)
```

### **Senaryo 3: Tuzlu Su** 🟡
```json
POST /api/quality/predict
{
  "ndwi_mean": 4.0,
  "wri_mean": 1000.0,
  "chl_a_mean": 1050.0,
  "turbidity_mean": 0.4
}

Beklenen: cluster = 2 (Tuzlu)
```

### **Senaryo 4: Van Gölü Özel** 🔵
```json
POST /api/quality/predict
{
  "ndwi_mean": 180.0,
  "wri_mean": 3.0,
  "chl_a_mean": 240.0,
  "turbidity_mean": 3.8
}

Beklenen: cluster = 3 (Özel)
```

---

## ❌ HATA SENARYOLARI

### **Eksik Field**
```json
POST /api/quality/predict
{
  "ndwi_mean": 5.0,
  "wri_mean": 10.0
  // chl_a_mean ve turbidity_mean eksik!
}

Beklenen: 400 Bad Request
{
  "error": "Missing required field: chl_a_mean"
}
```

### **Geçersiz Lake ID**
```
GET /api/quality/lake/99999/cluster

Beklenen: 404 Not Found
{
  "error": "Lake not found"
}
```

---

## 🎨 POSTMAN COLLECTION

### **Import Edilecek JSON:**

```json
{
  "info": {
    "name": "AquaTrack - Water Quality API",
    "description": "Su kalitesi clustering API testleri"
  },
  "item": [
    {
      "name": "1. Model Status",
      "request": {
        "method": "GET",
        "url": "http://127.0.0.1:5000/api/quality/status"
      }
    },
    {
      "name": "2. Cluster Info",
      "request": {
        "method": "GET",
        "url": "http://127.0.0.1:5000/api/quality/clusters/info"
      }
    },
    {
      "name": "3. Predict Cluster",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"ndwi_mean\": 5.26,\n  \"wri_mean\": 1206.05,\n  \"chl_a_mean\": 1212.66,\n  \"turbidity_mean\": 0.54\n}"
        },
        "url": "http://127.0.0.1:5000/api/quality/predict"
      }
    },
    {
      "name": "4. All Lakes Quality",
      "request": {
        "method": "GET",
        "url": "http://127.0.0.1:5000/api/quality/all-lakes"
      }
    },
    {
      "name": "5. Van Gölü Cluster",
      "request": {
        "method": "GET",
        "url": "http://127.0.0.1:5000/api/quality/lake/141/cluster"
      }
    }
  ]
}
```

Bu JSON'u Postman'a **Import** edebilirsin!

---

## 🔍 POSTMAN ADIM ADIM

### **1. Postman Aç**
- Postman Desktop App veya Web

### **2. New Request Oluştur**
- Click "New" → "HTTP Request"

### **3. Test 1: Status**
```
GET → http://127.0.0.1:5000/api/quality/status
Send butonuna tıkla
```

✅ **Başarılıysa:** 200 OK, modeller yüklendi mesajı gelir

### **4. Test 2: Predict**
```
POST → http://127.0.0.1:5000/api/quality/predict
Body → raw → JSON seç
Paste:
{
  "ndwi_mean": 5.26,
  "wri_mean": 1206.05,
  "chl_a_mean": 1212.66,
  "turbidity_mean": 0.54
}
Send
```

✅ **Başarılıysa:** cluster, interpretation, confidence gelir

---

**Backend çalışıyor mu şimdi? Postman ile test edebiliyor musun?** 🤔
