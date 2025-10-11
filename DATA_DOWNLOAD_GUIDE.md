# 📥 Veri İndirme Kılavuzu

**Not:** Bu proje büyük veri dosyaları (370 MB+) içerdiği için GitHub'a **yüklenmemiştir**.

---

## 🚨 GitHub'dan Clone Ettiyseniz

Projeyi çalıştırmak için **veri dosyalarını ayrıca indirmeniz** gerekiyor.

---

## 📦 Seçenek 1: Minimal Kurulum (ÖNERİLİR)

Sadece gerekli dosyaları indir:

### **1. Su Kalitesi Verisi (4 MB)**
```bash
# data/water_quality/ klasörünü oluştur
mkdir -p data/water_quality

# Ana dosyayı indir (Google Drive, Dropbox, vb.)
# İndirme linkini buraya ekleyin:
# [LINK: b5_b11_combined_features.csv]

# Dosyayı koy
# data/water_quality/b5_b11_combined_features.csv
```

### **2. Modelleri İndir veya Yeniden Eğit**

**Opsiyon A: Hazır modelleri indir (ÖNERİLİR - 1 MB)**
```bash
# models/ klasörünü oluştur
mkdir -p models

# İndir:
# - kmeans_water_quality.pkl (10 KB)
# - scaler_water_quality.pkl (545 bytes)
# [LINK: models.zip]
```

**Opsiyon B: Modelleri yeniden eğit (10 dakika)**
```bash
# Su kalitesi modelini eğit
python training/unsupervised_clustering.py

# Çıktı:
# - models/kmeans_water_quality.pkl
# - models/scaler_water_quality.pkl
```

### **3. Su Miktarı Modellerini İndir/Eğit**

**Opsiyon A: Hazır modelleri indir**
```bash
mkdir -p backend/models

# İndir:
# - catboost_H1_improved.pkl (208 KB)
# - catboost_H2_improved.pkl (80 KB)
# - catboost_H3_improved.pkl (104 KB)
# [LINK: backend_models.zip]
```

**Opsiyon B: Eğitim setlerini indir ve eğit**
```bash
# Gerekli: complete_*.csv dosyaları (50 MB)
# [LINK: water_quantity_datasets.zip]

# Eğit
cd water_quantity
python train_improved_model.py
```

---

## 📦 Seçenek 2: Tam Kurulum (İsteğe Bağlı)

Tüm verileri indir (analiz, görselleştirme için):

### **1. data/water_quality/ (4 MB)**
```
✅ GEREKLİ:
- b5_b11_combined_features.csv (1.5 MB)

⚪ OPSİYONEL:
- clustered_water_quality.csv (1.5 MB)
- egirdir_b5_b11_features.csv (346 KB)
- *.png, *.json (analiz dosyaları)
```

### **2. data/water_quantity/ (73 MB)**
```
✅ GEREKLİ (Model eğitimi için):
- complete_train_dataset.csv (40 MB)
- complete_val_dataset.csv (3.3 MB)
- complete_test_dataset.csv (6.3 MB)

⚪ OPSİYONEL:
- lake_*_features_forecasting.csv (7 dosya, 2.8 MB)
- train/val/test_dataset.csv (eski versiyon)
```

### **3. data/analysis/ (2.5 MB)**
```
⚪ OPSİYONEL (sadece görselleştirme):
- *.png dosyaları (analiz grafikleri)
```

### **4. data/archived/ (293 MB)**
```
❌ ATLAT:
Eski başarısız denemeler, gerek yok
```

### **5. data/gol_*/ (HAM UYDU GÖRÜNTÜLERİ)**
```
❌ ATLAT:
371,607 TIF dosyası, çok büyük
Sadece model geliştirme için gerekli
Production'da gerek yok
```

---

## 🎯 Hızlı Başlangıç

### **Sadece Demo İçin (Minimum):**
```bash
# 1. Boş klasörler oluştur
mkdir -p data/water_quality
mkdir -p models
mkdir -p backend/models

# 2. Küçük placeholder dosyalar oluştur
echo "# Veri dosyaları GitHub'da yok, DATA_DOWNLOAD_GUIDE.md'ye bakın" > data/README.md

# 3. Frontend'i çalıştır (mock data ile)
cd frontend
npm install
npm run dev

# 4. Backend'i çalıştır (fallback data ile)
cd backend
pip install -r requirements.txt
python app.py
```

### **Tam Kurulum İçin:**
```bash
# 1. Gerekli dosyaları indir (linkler yukarıda)

# 2. Modelleri eğit
python training/unsupervised_clustering.py
cd water_quantity && python train_improved_model.py

# 3. Backend başlat
cd backend && python app.py

# 4. Frontend başlat
cd frontend && npm run dev
```

---

## 📊 Dosya Boyutları

| Kategori | Boyut | GitHub'a Koy? |
|----------|-------|---------------|
| Kod (Python, JS) | ~10 MB | ✅ EVET |
| README'ler | <1 MB | ✅ EVET |
| JSON config'ler | <1 MB | ✅ EVET |
| **Su kalitesi CSV** | **4 MB** | ❌ HAYIR |
| **Su miktarı CSV** | **73 MB** | ❌ HAYIR |
| **Modeller** | **1 MB** | ❌ HAYIR |
| **Arşiv** | **293 MB** | ❌ HAYIR |
| **TIF görüntüleri** | **> 50 GB** | ❌ HAYIR |

---

## 🔗 Veri Paylaşım Alternatifleri

### **1. Google Drive** (ÖNERİLİR)
```
✅ Ücretsiz 15 GB
✅ Kolay paylaşım
✅ Link ile erişim

Yapı:
AquaTrack_Data/
├── essential/ (5 MB) - Minimum çalışma için
├── full/ (78 MB) - Tam eğitim için
└── raw/ (>50 GB) - Ham TIF'ler (opsiyonel)
```

### **2. Kaggle Datasets**
```
✅ 100 GB ücretsiz
✅ ML topluluğu erişebilir
✅ Version control

kaggle.com/your-username/aquatrack-data
```

### **3. Hugging Face**
```
✅ ML dataset hosting
✅ Ücretsiz
✅ API erişim

huggingface.co/datasets/your-username/aquatrack
```

### **4. Git LFS (Large File Storage)**
```
⚠️ GitHub 1 GB limit
⚠️ Ücretli (bandwidth)

# Sadece modeller için kullan (1 MB)
git lfs track "*.pkl"
```

---

## 🎓 Önerilen Yaklaşım

### **GitHub'a Koy:**
```
✅ Tüm kodlar (backend, frontend)
✅ README'ler (4 dosya)
✅ requirements.txt
✅ package.json
✅ .env.example
✅ Dokümantasyon (docs/)
✅ Küçük JSON'lar (summary/, <1 MB)
```

### **GitHub'a Koyma:**
```
❌ data/archived/ (293 MB)
❌ data/water_quantity/*.csv (73 MB)
❌ data/water_quality/*.csv (4 MB)
❌ data/gol_*/ (TIF görüntüleri)
❌ models/*.pkl (1 MB)
❌ backend/models/*.pkl (600 KB)
```

### **Google Drive'a Koy:**
```
Klasör yapısı:
AquaTrack_Data/
├── README.txt (indirme talimatları)
├── models.zip (1 MB)
├── water_quality.zip (4 MB)
└── water_quantity.zip (73 MB)

Toplam: ~78 MB
```

**GitHub README'de link ver:**
```markdown
## 📥 Veri İndirme

Büyük dosyalar GitHub'da değil. İndir:
- [Google Drive Link] - Tüm veri ve modeller (78 MB)
- Detaylı talimatlar: DATA_DOWNLOAD_GUIDE.md
```

---

## ✅ .gitignore Güncellendi

Artık `git status` yapınca:
```bash
$ git status

✅ Dahil edilecek:
  - backend/ (tüm .py dosyaları)
  - frontend/src/ (tüm .jsx dosyaları)
  - docs/ (tüm .md dosyaları)
  - data/README.md ✨
  - data/*/README.md ✨
  - requirements.txt
  - package.json

❌ İgnore edilecek:
  - data/*.csv (ağır!)
  - data/gol_*/ (TIF'ler)
  - data/archived/ (293 MB)
  - models/*.pkl
  - *.db
  - node_modules/
```

---

## 💡 Sonuç

✅ **.gitignore güncellendi**  
✅ **Ağır dosyalar (370 MB) ignore edildi**  
✅ **Sadece kod ve README'ler GitHub'a gidecek**  
✅ **Veri indirme kılavuzu hazır**  

**GitHub'a push yapabilirsin!** 🚀

```bash
git add .
git commit -m "feat: K-Means su kalitesi sistemi + data organizasyonu"
git push
```

Veri dosyalarını **Google Drive** veya **Kaggle**'a yükleyip README'de link verebilirsin!
