# 🚀 AquaTrack Kurulum Rehberi

Bu rehber, AquaTrack projesini adım adım nasıl kuracağınızı ve çalıştıracağınızı açıklar.

## 📋 İçindekiler

- [🖥️ Sistem Gereksinimleri](#️-sistem-gereksinimleri)
- [📥 Projeyi İndirme](#-projeyi-İndirme)
- [🐍 Python Backend Kurulumu](#-python-backend-kurulumu)
- [📦 Node.js Frontend Kurulumu](#-nodejs-frontend-kurulumu)
- [🔍 Veri Kaynaklarını Kontrol Etme](#-veri-kaynaklarını-kontrol-etme)
- [🚀 Uygulamayı Başlatma](#-uygulamayı-başlatma)
- [✅ Test Etme](#-test-etme)
- [❌ Sorun Giderme](#-sorun-giderme)

---

## 🖥️ Sistem Gereksinimleri

### Minimum Gereksinimler
- **İşletim Sistemi**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 8 GB (16 GB önerilen)
- **Disk Alanı**: 5 GB boş alan
- **İnternet Bağlantısı**: Paket indirme için

### Yazılım Gereksinimleri
- **Python**: 3.10 veya üzeri
- **Node.js**: 16.0 veya üzeri
- **npm**: 8.0 veya üzeri
- **Git**: 2.30 veya üzeri (opsiyonel)

### Kontrol Etme
```bash
# Python versiyonu
python --version
# Python 3.10.x olmalı

# Node.js versiyonu
node --version
# v16.x.x veya üzeri olmalı

# npm versiyonu
npm --version
# 8.x.x veya üzeri olmalı
```

---

## 📥 Projeyi İndirme

### Yöntem 1: Git ile İndirme (Önerilen)
```bash
git clone https://github.com/your-username/proje_aqua.git
cd proje_aqua
```

### Yöntem 2: ZIP İndirme
1. GitHub repository'sini ziyaret edin
2. "Code" → "Download ZIP" tıklayın
3. ZIP dosyasını açın
4. Klasörü istediğiniz konuma taşıyın

---

## 🐍 Python Backend Kurulumu

### Adım 1: Sanal Ortam Oluşturma

#### Windows:
```bash
# Sanal ortam oluştur
python -m venv venv

# Sanal ortamı aktifleştir
venv\Scripts\activate

# Başarılı olursa prompt şöyle görünür:
# (venv) C:\Users\YourName\proje_aqua>
```

#### macOS/Linux:
```bash
# Sanal ortam oluştur
python3 -m venv venv

# Sanal ortamı aktifleştir
source venv/bin/activate

# Başarılı olursa prompt şöyle görünür:
# (venv) user@computer:~/proje_aqua$
```

### Adım 2: Python Paketlerini Yükleme

```bash
# requirements.txt dosyası yoksa, gerekli paketleri yükleyin:
pip install flask flask-cors pandas numpy scikit-learn catboost xgboost python-dotenv

# Eğer requirements.txt varsa:
pip install -r requirements.txt
```

**Beklenen Çıktı:**
```
Successfully installed flask-2.3.3 flask-cors-4.0.0 pandas-2.1.1 ...
```

### Adım 3: Backend Bağımlılıklarını Kontrol Etme

```bash
# Backend dizinine git
cd backend

# Python modüllerini test et
python -c "import flask, pandas, numpy, sklearn; print('✅ Tüm modüller yüklü!')"
```

---

## 📦 Node.js Frontend Kurulumu

### Adım 1: Frontend Dizinine Geçme

```bash
# Proje kök dizininden
cd frontend
```

### Adım 2: npm Paketlerini Yükleme

```bash
# Tüm bağımlılıkları yükle
npm install
```

**Beklenen Çıktı:**
```
added 1234 packages, and audited 1235 packages in 45s

found 0 vulnerabilities
```

### Adım 3: Frontend Bağımlılıklarını Kontrol Etme

```bash
# React ve diğer modülleri test et
npm list react recharts @nivo/circle-packing
```

---

## 🔍 Veri Kaynaklarını Kontrol Etme

### Adım 1: Veri Dosyalarının Varlığını Kontrol Etme

```bash
# Proje kök dizinine dön
cd ..

# Veri kaynaklarını kontrol et
python data_sources_config.py
```

**Beklenen Çıktı:**
```
📊 AquaTrack Veri Kaynakları Konfigürasyonu
==================================================
🔍 Veri kaynakları kontrol ediliyor...
✅ Tüm veri kaynakları mevcut!

📋 Veri Kaynakları Özeti:
Su Kalitesi: data/clustered_water_quality.csv
Su Miktarı Parquet: 4 dosya
ML Modelleri: 3 model
```

### Adım 2: Eksik Dosyaları Kontrol Etme

Eğer hata alırsanız:

```bash
# Hangi dosyalar eksik kontrol et
ls -la data/
ls -la backend/models/
```

**Gerekli Dosyalar:**
- `data/clustered_water_quality.csv`
- `backend/models/train_combined.parquet`
- `backend/models/val_combined.parquet`
- `backend/models/test_combined.parquet`
- `backend/models/all_predictions_final.parquet`
- `backend/models/catboost_H1_improved.pkl`
- `backend/models/catboost_H2_improved.pkl`
- `backend/models/catboost_H3_improved.pkl`

---

## 🚀 Uygulamayı Başlatma

### Adım 1: Backend'i Başlatma

#### Terminal 1 - Backend:
```bash
# Proje kök dizininde
cd backend

# Sanal ortamı aktifleştir (eğer aktif değilse)
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Backend'i başlat
python app.py
```

**Beklenen Çıktı:**
```
🚀 AquaTrack API başlatılıyor...
🔍 Veri kaynakları kontrol ediliyor...
✅ Tüm veri kaynakları mevcut!
✅ Kullanıcı veritabanı hazır
✅ Veriler başarıyla yüklendi
✅ ML modelleri yüklendi
 * Running on http://127.0.0.1:5000
 * Debugger is active!
```

### Adım 2: Frontend'i Başlatma

#### Terminal 2 - Frontend:
```bash
# Proje kök dizininde
cd frontend

# Frontend'i başlat
npm run dev
```

**Beklenen Çıktı:**
```
  VITE v4.4.5  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.xxx:3000/
  ➜  press h to show help
```

---

## ✅ Test Etme

### Adım 1: Backend API Testi

#### Tarayıcı ile Test:
```
http://127.0.0.1:5000/api/quality/status
```

**Beklenen Response:**
```json
{
  "status": "success",
  "models": {
    "kmeans": "loaded",
    "xgboost": "loaded"
  },
  "data_source": "clustered_water_quality.csv"
}
```

#### Terminal ile Test:
```bash
# Windows PowerShell
Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/quality/status" -Method GET

# macOS/Linux
curl -X GET http://127.0.0.1:5000/api/quality/status
```

### Adım 2: Frontend Testi

#### Tarayıcıda Açma:
```
http://localhost:3000
```

**Beklenen Görünüm:**
- AquaTrack ana sayfası
- Navigasyon menüsü
- Harita görünümü
- Grafikler yükleniyor

### Adım 3: Tam Entegrasyon Testi

1. **Ana Sayfa**: http://localhost:3000
2. **Su Kalitesi**: Menüden "Su Kalitesi" seçin
3. **Su Miktarı**: Menüden "Su Miktarı" seçin
4. **Göl Seçimi**: Haritadan bir göl tıklayın
5. **Grafikler**: Circle Packing ve diğer grafikler yüklenmeli

---

## ❌ Sorun Giderme

### 🔴 Backend Başlamıyor

#### Sorun: ModuleNotFoundError
```bash
# Çözüm: Paketleri yeniden yükle
pip install flask flask-cors pandas numpy scikit-learn catboost xgboost
```

#### Sorun: Port 5000 kullanımda
```bash
# Windows - Port kullanan işlemi bul
netstat -ano | findstr :5000

# İşlemi sonlandır
taskkill /PID <PID_NUMBER> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

#### Sorun: Veri dosyaları bulunamıyor
```bash
# Dosya yollarını kontrol et
python data_sources_config.py

# Eksik dosyaları kontrol et
ls -la data/
ls -la backend/models/
```

### 🔴 Frontend Başlamıyor

#### Sorun: npm start çalışmıyor
```bash
# package.json'da script kontrol et
cat package.json | grep scripts -A 10

# npm run dev kullan
npm run dev
```

#### Sorun: Module not found
```bash
# node_modules'ı temizle ve yeniden yükle
rm -rf node_modules package-lock.json
npm install
```

#### Sorun: Port 3000 kullanımda
```bash
# Farklı port kullan
npm run dev -- --port 3001
```

### 🔴 API Bağlantı Hatası

#### Sorun: CORS hatası
```bash
# Backend'de CORS ayarlarını kontrol et
# backend/app.py dosyasında:
from flask_cors import CORS
CORS(app)
```

#### Sorun: 404 Not Found
```bash
# API endpoint'lerini kontrol et
curl http://127.0.0.1:5000/api/quality/status

# Route'ları kontrol et
# backend/routes/quality_routes.py
```

### 🔴 Grafikler Yüklenmiyor

#### Sorun: Circle Packing görünmüyor
```bash
# Nivo paketini kontrol et
npm list @nivo/circle-packing

# Eksikse yükle
npm install @nivo/circle-packing
```

#### Sorun: Recharts hataları
```bash
# Recharts paketini kontrol et
npm list recharts

# Eksikse yükle
npm install recharts
```

---

## 🎯 Hızlı Başlangıç (Özet)

```bash
# 1. Projeyi indir
git clone <repository-url>
cd proje_aqua

# 2. Python backend kurulumu
python -m venv venv
venv\Scripts\activate  # Windows
pip install flask flask-cors pandas numpy scikit-learn catboost xgboost

# 3. Node.js frontend kurulumu
cd frontend
npm install

# 4. Veri kaynaklarını kontrol et
cd ..
python data_sources_config.py

# 5. Backend'i başlat (Terminal 1)
cd backend
python app.py

# 6. Frontend'i başlat (Terminal 2)
cd frontend
npm run dev

# 7. Test et
# Backend: http://127.0.0.1:5000/api/quality/status
# Frontend: http://localhost:3000
```

---

## 📞 Yardım Alma

### 🆘 Hala Sorun Mu Var?

1. **GitHub Issues**: Teknik sorunlar için issue açın
2. **README.md**: Ana dokümantasyonu okuyun
3. **Console Logs**: Hata mesajlarını kontrol edin
4. **API Status**: Backend durumunu kontrol edin

### 📝 Hata Raporlama

Hata raporu oluştururken şunları ekleyin:
- İşletim sistemi
- Python/Node.js versiyonları
- Tam hata mesajı
- Adım adım yapılan işlemler
- Console çıktıları

---

**🎉 Kurulum tamamlandı! AquaTrack'i kullanmaya başlayabilirsiniz!**
