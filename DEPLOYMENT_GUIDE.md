# 🚀 Deployment (Yayınlama) Kılavuzu

AquaTrack projesini canlıya almak için gerekli adımlar.

---

## 📦 NELERİ YÜKLEMELISIN?

### **Senaryo 1: Frontend + Backend Birlikte** (ÖNERİLİR)

```
Frontend (React) → Vercel/Netlify
Backend (Python Flask) → Heroku/Railway/Render
Database (SQLite) → Backend ile birlikte
Models (PKL) → Backend ile birlikte
CSV Veriler → Backend ile birlikte VEYA cloud storage
```

---

## 🎨 **FRONTEND DEPLOYMENT**

### **Platform: Vercel (ÖNERİLİR - ÜCRETSİZ)**

**1. Hazırlık:**
```bash
cd frontend

# Build yap
npm run build

# dist/ klasörü oluşur (production dosyaları)
```

**2. Vercel'e Yükle:**
```bash
# Vercel CLI kur
npm install -g vercel

# Deploy et
vercel

# Sorulara cevaplar:
# - Project name: aquatrack-frontend
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist
```

**3. Ortam Değişkenleri:**
```
Vercel Dashboard → Settings → Environment Variables

VITE_API_URL = https://aquatrack-backend.herokuapp.com
```

**4. Frontend Kodu Güncelle:**
```javascript
// frontend/src/constants/index.js
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
}
```

**Sonuç:**
```
Frontend URL: https://aquatrack-frontend.vercel.app
```

---

## ⚙️ **BACKEND DEPLOYMENT**

### **Platform: Railway (ÖNERİLİR - ÜCRETSİZ)**

**1. Gerekli Dosyalar:**

```
backend/
├── app.py ✅
├── requirements.txt ✅
├── routes/ ✅
├── models.py ✅
├── Procfile ❌ OLUŞTUR
└── runtime.txt ❌ OLUŞTUR
```

**2. Procfile Oluştur:**
```bash
echo "web: python backend/app.py" > Procfile
```

**3. runtime.txt Oluştur:**
```bash
echo "python-3.10.12" > runtime.txt
```

**4. Railway'e Yükle:**
```bash
# Railway CLI kur
npm install -g @railway/cli

# Login
railway login

# Proje oluştur
railway init

# Deploy
railway up

# Ortam değişkenleri
railway variables set FLASK_ENV=production
railway variables set SECRET_KEY=your-secret-key-here
```

**5. Gerekli Dosyaları Yükle:**

**Seçenek A: Küçük modeller Railway'e dahil et (<500 MB)**
```bash
# Git LFS kullan (Railway destekliyor)
git lfs install
git lfs track "*.pkl"
git add .gitattributes
git commit -m "Add LFS for models"
git push
```

**Seçenek B: Cloud Storage kullan (ÖNERİLİR)**
```bash
# AWS S3, Google Cloud Storage, Azure Blob

# Backend'de dosyaları S3'ten indir
import boto3

def download_models_from_s3():
    s3 = boto3.client('s3')
    s3.download_file('aquatrack-models', 
                    'kmeans_water_quality.pkl', 
                    'models/kmeans_water_quality.pkl')
```

**Sonuç:**
```
Backend URL: https://aquatrack-backend.up.railway.app
```

---

## 💾 **VERİTABANI**

### **Seçenek 1: SQLite (Basit - Küçük Projeler)**
```
✅ users.db
✅ news.db

Railway'de:
- SQLite dosyaları backend ile birlikte
- Volume mount gerekir (persistent storage)
```

### **Seçenek 2: PostgreSQL (ÖNERİLİR - Production)**
```bash
# Railway otomatik PostgreSQL verir (ücretsiz)
railway add postgresql

# Backend'de güncelle
# backend/database.py
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL')
conn = psycopg2.connect(DATABASE_URL)
```

---

## 📊 **BÜYÜK DOSYALAR (CSV, MODELS)**

### **Seçenek 1: Git LFS (Limit 1 GB)**
```bash
# GitHub/Railway Git LFS
git lfs install
git lfs track "*.pkl"
git lfs track "*.csv"
git add .gitattributes
git commit -m "Add LFS"
git push
```

**Maliyet:**
- GitHub: 1 GB ücretsiz, sonra $5/ay
- Railway: 500 MB ücretsiz

---

### **Seçenek 2: Cloud Storage (ÖNERİLİR)**

**AWS S3:**
```python
# Backend başlarken dosyaları S3'ten indir
import boto3

def init_data():
    s3 = boto3.client('s3')
    
    # Modelleri indir
    s3.download_file('aquatrack-data', 
                    'models/kmeans_water_quality.pkl',
                    'models/kmeans_water_quality.pkl')
    
    # CSV'leri indir
    s3.download_file('aquatrack-data',
                    'data/water_quality/b5_b11_combined_features.csv',
                    'data/water_quality/b5_b11_combined_features.csv')
```

**Google Cloud Storage:**
```python
from google.cloud import storage

def download_from_gcs():
    client = storage.Client()
    bucket = client.bucket('aquatrack-data')
    
    blob = bucket.blob('models/kmeans_water_quality.pkl')
    blob.download_to_filename('models/kmeans_water_quality.pkl')
```

**Maliyet:**
- AWS S3: İlk 5 GB ücretsiz
- Google Cloud: İlk 5 GB ücretsiz

---

### **Seçenek 3: Minimal Deployment (Sadece Modelleri Yükle)**

```
✅ Sadece model dosyalarını yükle (1.5 MB):
   - models/*.pkl
   - backend/models/*.pkl

❌ CSV'leri yükleme (77 MB)
   → Backend başlarken boş veri ile çalışır
   → Frontend mock data gösterir
```

---

## 🌐 **TAM DEPLOYMENT PLANI**

### **YÜKLENMESİ GEREKENLER:**

| # | Dosya/Klasör | Boyut | Nereye | Zorunlu |
|---|--------------|-------|--------|---------|
| 1 | Frontend build | ~5 MB | Vercel | ✅ EVET |
| 2 | Backend kod | ~10 MB | Railway | ✅ EVET |
| 3 | Model dosyaları | 1.5 MB | Railway/S3 | ✅ EVET |
| 4 | SQLite DB | <1 MB | Railway | ✅ EVET |
| 5 | Su kalitesi CSV | 4 MB | Railway/S3 | ⚠️ İsteğe bağlı |
| 6 | Su miktarı CSV | 73 MB | S3 | ⚠️ İsteğe bağlı |
| 7 | Arşiv | 293 MB | - | ❌ HAYIR |
| 8 | TIF görüntüler | >50 GB | - | ❌ HAYIR |

---

## 🎯 **ÖNERİLEN MİNİMAL DEPLOYMENT**

```
1️⃣ Frontend → Vercel (ÜCRETSİZ)
   - npm run build
   - dist/ klasörünü yükle
   - ~5 MB

2️⃣ Backend → Railway (ÜCRETSİZ)
   - Backend klasörünü yükle
   - requirements.txt
   - ~10 MB

3️⃣ Modeller → Railway ile birlikte
   - models/*.pkl (1.5 MB)
   - Git LFS veya direkt push

4️⃣ Veritabanı → Railway PostgreSQL (ÜCRETSİZ)
   - Otomatik sağlanır
   - users, news tabloları

5️⃣ CSV Veriler → DEMO MODE
   - Backend'de fallback data kullan
   - Gerçek veriler lokal kalabilir
```

**TOPLAM YÜKLEME:** ~17 MB (Railway limit: 500 MB)

---

## 📋 **ADIM ADIM DEPLOYMENT**

### **ADIM 1: Frontend (Vercel)**

```bash
# 1. Frontend klasöründe
cd frontend

# 2. API URL'i production'a çevir
# .env.production oluştur
echo "VITE_API_URL=https://aquatrack-backend.up.railway.app" > .env.production

# 3. Build yap
npm run build

# 4. Vercel'e deploy
npm install -g vercel
vercel --prod
```

---

### **ADIM 2: Backend (Railway)**

```bash
# 1. Proje root'unda
cd C:\Users\glylm\Desktop\proje_aqua

# 2. Procfile oluştur
echo "web: cd backend && python app.py" > Procfile

# 3. railway.json oluştur (opsiyonel)
echo '{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && python app.py",
    "healthcheckPath": "/api/system/health"
  }
}' > railway.json

# 4. Railway'e deploy
railway login
railway init
railway up
```

---

### **ADIM 3: Modelleri Yükle**

**Seçenek A: Git ile (Küçük modeller için)**
```bash
# .gitignore'dan çıkar geçici olarak
git add -f models/*.pkl
git add -f backend/models/*.pkl
git commit -m "Add models for deployment"
git push
```

**Seçenek B: Railway Volume (ÖNERİLİR)**
```bash
# Railway dashboard'da:
# 1. Volume oluştur (1 GB)
# 2. /app/models mount et
# 3. Railway CLI ile yükle

railway volume add models
railway volume upload models models/*.pkl
```

---

### **ADIM 4: CSV Veriler (Opsiyonel)**

**Seçenek A: Demo Mode (Veri yok)**
```python
# backend/routes/water_quality_routes.py
# Fallback veri kullan

if not os.path.exists(csv_path):
    # Demo data döndür
    return jsonify({
        "status": "demo",
        "message": "Gerçek veri yok, demo çalışıyor",
        "demo_data": [...]
    })
```

**Seçenek B: Cloud Storage**
```python
# Backend başlarken S3'ten indir
def download_data_on_startup():
    if not os.path.exists('data/water_quality/b5_b11_combined_features.csv'):
        download_from_s3('b5_b11_combined_features.csv')
```

---

## 💰 **MALİYET TAHMİNİ**

### **ÜCRETSİZ (Hobby):**
```
✅ Vercel: Frontend hosting (100 GB bandwidth/ay)
✅ Railway: Backend + DB (500 MB storage, 500 saat/ay)
✅ AWS S3: İlk 5 GB ücretsiz

TOPLAM: $0/ay
```

### **ÜCRETLİ (Production):**
```
Vercel Pro: $20/ay (daha fazla bandwidth)
Railway Pro: $5/ay (1 GB storage, unlimited saat)
AWS S3: $0.023/GB/ay (~$2/ay 100 GB için)

TOPLAM: ~$27/ay
```

---

## 📝 **DEPLOYMENT CHECKLİST**

### **Frontend:**
```
✅ npm run build çalıştı mı?
✅ dist/ klasörü oluştu mu?
✅ .env.production VITE_API_URL ayarlı mı?
✅ Vercel'e deploy edildi mi?
✅ Tarayıcıda açılıyor mu?
```

### **Backend:**
```
✅ requirements.txt tam mı?
✅ Procfile oluşturuldu mu?
✅ Railway'e push yapıldı mı?
✅ /api/system/health endpoint çalışıyor mu?
✅ CORS ayarları production'a uygun mu?
```

### **Modeller:**
```
✅ models/*.pkl yüklendi mi? (1.5 MB)
✅ backend/models/*.pkl yüklendi mi? (600 KB)
✅ Backend başlarken yükleniyor mu?
```

### **Veritabanı:**
```
✅ PostgreSQL oluşturuldu mu?
✅ Tablolar migrate edildi mi?
✅ Backend DATABASE_URL kullanıyor mu?
```

### **CSV Veriler (Opsiyonel):**
```
⚪ data/water_quality/*.csv (4 MB)
⚪ data/water_quantity/*.csv (73 MB)
→ S3'e yükle veya demo mode kullan
```

---

## 🔧 **BACKEND İÇİN GÜNCELLEME GEREKLİ**

### **1. app.py - Production Mode:**
```python
# backend/app.py

import os

# Production için debug=False
DEBUG_MODE = os.environ.get('FLASK_ENV') != 'production'

if __name__ == "__main__":
    app.run(
        debug=DEBUG_MODE,
        host="0.0.0.0",  # Production için 0.0.0.0
        port=int(os.environ.get('PORT', 5000)),  # Railway PORT kullan
        threaded=True
    )
```

### **2. CORS - Frontend URL:**
```python
# backend/app.py

from flask_cors import CORS

# Production'da sadece frontend URL'ine izin ver
ALLOWED_ORIGINS = [
    'http://localhost:3000',  # Development
    'https://aquatrack-frontend.vercel.app'  # Production
]

CORS(app, origins=ALLOWED_ORIGINS)
```

### **3. Model/Veri Yükleme:**
```python
# backend/models.py

def load_models():
    # Railway'de dosya yoksa S3'ten indir
    if not os.path.exists('models/kmeans_water_quality.pkl'):
        if os.environ.get('USE_S3') == 'true':
            download_from_s3()
        else:
            # Demo mode
            log_info("⚠️ Demo mode: Model dosyaları yok")
            return False
    
    # Normal yükleme
    ...
```

---

## 🌐 **MİNİMAL DEPLOYMENT (ÜCRETSİZ)**

Sadece temel özellikleri deploy et:

```
1️⃣ Frontend → Vercel
   - Build: npm run build
   - Deploy: vercel --prod
   - Boyut: 5 MB
   - Maliyet: $0

2️⃣ Backend → Railway
   - Push: railway up
   - Boyut: 10 MB (kod only)
   - Maliyet: $0
   
3️⃣ Models → Railway Volume
   - Upload: railway volume upload
   - Boyut: 1.5 MB
   - Maliyet: $0

4️⃣ Database → Railway PostgreSQL
   - Otomatik: railway add postgresql
   - Boyut: <10 MB
   - Maliyet: $0

❌ CSV Veriler → DEMO MODE
   - Backend fallback data kullanır
   - Tam özellik yok ama çalışır
```

**TOPLAM YÜKLEME:** ~17 MB  
**TOPLAM MALİYET:** $0/ay  
**ÖZELLİKLER:** %70 (temel işlevler)

---

## 🎯 **TAM DEPLOYMENT (ÜCRETLİ)**

Tüm özellikleri deploy et:

```
1️⃣ Frontend → Vercel Pro
   - Build + deploy
   - Boyut: 5 MB
   - Maliyet: $20/ay

2️⃣ Backend → Railway Pro
   - Code + models
   - Boyut: 12 MB
   - Maliyet: $5/ay

3️⃣ CSV Veriler → AWS S3
   - Upload: 77 MB
   - Download: Backend'den
   - Maliyet: ~$2/ay

4️⃣ Database → Railway PostgreSQL
   - Otomatik provision
   - Maliyet: Dahil

5️⃣ TIF Görüntüler → S3 Glacier (arşiv)
   - Upload: >50 GB
   - Maliyet: ~$2/ay (nadiren erişim)
```

**TOPLAM YÜKLEME:** ~90 MB (TIF hariç)  
**TOPLAM MALİYET:** ~$29/ay  
**ÖZELLİKLER:** %100 (tüm işlevler)

---

## 📂 **YÜKLENMESİ GEREKENLER - ÖNCELİK SIRASINA GÖRE**

### **🔴 ZORUNLU (Çalışması için):**
```
1. Frontend build dosyaları (dist/)           5 MB
2. Backend kod (backend/)                    10 MB
3. Model dosyaları (models/*.pkl)            1.5 MB
4. Veritabanı şeması (users, news)           <1 MB
───────────────────────────────────────────────────
TOPLAM ZORUNLU:                              ~17 MB ✅
```

### **🟡 ÖNERİLİR (Tam özellikler için):**
```
5. Su kalitesi CSV (data/water_quality/)     4 MB
6. Su miktarı CSV (data/water_quantity/)    73 MB
───────────────────────────────────────────────────
TOPLAM ÖNERİLEN:                            77 MB
```

### **⚪ OPSİYONEL (Geliştirme için):**
```
7. Analiz görselleri (data/analysis/)        2.5 MB
8. Summary JSON'lar (data/summary/)          <1 MB
───────────────────────────────────────────────────
TOPLAM OPSİYONEL:                           2.5 MB
```

### **❌ YÜKLEME (Gereksiz):**
```
9. Arşiv dosyaları (data/archived/)          293 MB ❌
10. Ham TIF görüntüler (data/gol_*/)         >50 GB ❌
───────────────────────────────────────────────────
TOPLAM GEREKSIZ:                             >300 MB
```

---

## 🚀 **HIZLI BAŞLANGIÇ**

### **1. Minimal Deployment (17 MB):**
```bash
# Frontend
cd frontend && npm run build
vercel --prod

# Backend (modeller dahil)
git add -f models/*.pkl backend/models/*.pkl
railway up
```

### **2. Tam Deployment (94 MB):**
```bash
# Frontend
vercel --prod

# Backend + CSV'ler S3'e yükle
aws s3 cp data/water_quality/ s3://aquatrack-data/water_quality/ --recursive
railway up

# Backend'de S3'ten indir
railway variables set USE_S3=true
railway variables set AWS_ACCESS_KEY_ID=...
railway variables set AWS_SECRET_ACCESS_KEY=...
```

---

## 💡 **ÖNERİM**

**Başlangıç için:**
```
✅ Frontend → Vercel (ücretsiz)
✅ Backend + Modeller → Railway (ücretsiz)
✅ CSV'ler → Lokal kalsın (demo mode)
❌ TIF'ler → Yükleme

Maliyet: $0/ay
Çalışır: %70 özellik
```

**Ciddi kullanım için:**
```
✅ Frontend → Vercel Pro ($20/ay)
✅ Backend → Railway Pro ($5/ay)
✅ CSV'ler → AWS S3 (~$2/ay)
✅ Database → Railway PostgreSQL (dahil)

Maliyet: ~$27/ay
Çalışır: %100 özellik
```

---

## 🎉 **SONUÇ**

Frontend deploy etmek için **ZORUNLU:**
- ✅ Frontend build (5 MB)
- ✅ Backend code (10 MB)
- ✅ Model dosyaları (1.5 MB)
- ✅ Veritabanı (<1 MB)

**TOPLAM:** 17 MB → Railway ücretsiz limiti içinde!

**CSV veriler opsiyonel**, S3 kullan veya demo mode çalıştır.

---

**Deployment yapmak ister misin? Hangi platformu tercih edersin?**
- Vercel + Railway (ücretsiz)
- Vercel + Heroku
- Netlify + Render

