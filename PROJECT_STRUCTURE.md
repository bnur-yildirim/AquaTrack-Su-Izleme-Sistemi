# 📂 Proje Klasör Yapısı

**Tarih:** 11 Ekim 2025  
**Durum:** ✅ Organize Edilmiş

---

## 🎯 ANA KLASÖRLER

```
proje_aqua/
│
├── 🎨 frontend/                   # React Frontend (Ana uygulama)
│   ├── src/                       # Kaynak kodlar
│   ├── public/                    # Statik dosyalar
│   ├── dist/                      # Build çıktısı
│   └── package.json
│
├── ⚙️ backend/                     # Flask Backend (API)
│   ├── routes/                    # API endpoint'leri
│   ├── models.py                  # Model yükleme
│   ├── app.py                     # Ana uygulama
│   └── *.db                       # SQLite veritabanları
│
├── 📊 data/                        # Veri dosyaları (organize)
│   ├── water_quality/             # Su kalitesi verileri
│   ├── water_quantity/            # Su miktarı verileri
│   ├── analysis/                  # Analiz görselleri
│   ├── archived/                  # Eski denemeler
│   ├── summary/                   # Özet JSON'lar
│   └── gol_*/                     # Ham uydu görüntüleri
│
├── 🤖 models/                      # Eğitilmiş ML modelleri
│   ├── kmeans_water_quality.pkl   # Su kalitesi (K-Means)
│   ├── scaler_water_quality.pkl   # Normalizasyon
│   └── DEPRECATED_MODELS_README.md
│
├── 🎓 training/                    # Model eğitim scriptleri
│   ├── unsupervised_clustering.py # K-Means eğitimi
│   └── ...
│
├── 📜 scripts/                     # Yardımcı scriptler
│   ├── extract_*.py               # Feature extraction
│   └── ...
│
├── 📖 docs/                        # Dokümantasyon
│   ├── SETUP.md
│   ├── BACKEND_GUIDE.md
│   ├── FRONTEND_GUIDE.md
│   └── ...
│
└── 📝 README.md                    # Ana proje README
```

---

## ❌ **GEREKSIZ/ESKİ KLASÖRLER (Temizlendi)**

```
❌ src/ → SİLİNDİ (root'ta olmamalı, frontend/src/ var)
   - Boş component klasörleri
   - Eski frontend denemesi
```

---

## ⚠️ **KARIŞIK GÖRÜNEN AMA GEREKLİ OLANLAR**

### **1. catboost_info/**
```
Ne: CatBoost model eğitimi sırasında oluşan loglar
Neden var: Model eğitilirken otomatik oluşuyor
Silinebilir mi: ✅ EVET (yeniden oluşur)
```

### **2. outputs/**
```
Ne: water_quantity model çıktıları
Neden var: Eski model eğitim çıktıları
Silinebilir mi: ⚠️ Yedeklersen evet
İçinde: Eski model versiyonları
```

### **3. water_quality/ (root'ta)**
```
Ne: Eski water_quality eğitim klasörü
Neden var: İlk eğitimler burada yapılmış
Silinebilir mi: ⚠️ Yedeklersen evet
İçinde: Eski training scriptleri + veriler
```

### **4. water_quantity/ (root'ta)**
```
Ne: Su miktarı eğitim klasörü
Neden var: Model eğitimleri burada
Silinebilir mi: ❌ HAYIR (aktif kullanımda)
İçinde: train_model.py, output/
```

### **5. dataset_clean/**
```
Ne: Veri temizleme scriptleri
Neden var: İlk veri hazırlama aşaması
Silinebilir mi: ⚠️ Yedeklersen evet
```

### **6. presentation_visuals/**
```
Ne: Sunum için görseller
Neden var: Proje sunumu için
Silinebilir mi: ⚪ Sunum bittiyse evet
```

---

## 🧹 **TEMİZLİK ÖNERİLERİ**

### **SİLİNEBİLİRLER (Güvenli):**
```bash
# 1. CatBoost geçici dosyalar
Remove-Item -Recurse catboost_info

# 2. Python cache
Remove-Item -Recurse __pycache__
Get-ChildItem -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force

# 3. Git özet (artık gerek yok)
Remove-Item git_summary.txt

# 4. Node modules (yeniden kurulur)
Remove-Item -Recurse frontend/node_modules
Remove-Item -Recurse node_modules
```

**Boşalacak alan:** ~500 MB (çoğu node_modules)

---

### **YEDEKLERSENİZ SİLİNEBİLİRLER:**
```bash
# 1. Eski eğitim klasörü
Move-Item water_quality data/archived/old_water_quality_training

# 2. Eski outputs
Move-Item outputs data/archived/old_outputs

# 3. Dataset clean scriptleri
Move-Item dataset_clean scripts/dataset_clean

# 4. Presentation (sunum bittiyse)
# Zip'le ve başka yere taşı
Compress-Archive -Path presentation_visuals -DestinationPath presentation_visuals.zip
Remove-Item -Recurse presentation_visuals
```

**Boşalacak alan:** ~1 GB

---

## 🎯 **İDEAL YAPILANDIRMA**

```
proje_aqua/
│
├── 🎨 frontend/              # React app
├── ⚙️ backend/               # Flask API
├── 📊 data/                  # Organize veri klasörü
├── 🤖 models/                # ML modelleri
├── 🎓 training/              # Eğitim scriptleri
├── 📜 scripts/               # Yardımcı scriptler
├── 📖 docs/                  # Dokümantasyon
├── 📝 README.md
├── 📥 DATA_DOWNLOAD_GUIDE.md
├── 🚀 DEPLOYMENT_GUIDE.md
└── 📋 requirements.txt
```

**Temiz, minimal, profesyonel!** ✨

---

## 💡 **ŞİMDİ NE YAPALIM?**

### **Seçenek 1: Sadece Gerekli Temizlik (ÖNERİLİR)**
```bash
# Geçici dosyaları sil
Remove-Item -Recurse catboost_info, __pycache__
Remove-Item git_summary.txt

# Frontend node_modules temizle (yeniden kurulur)
Remove-Item -Recurse frontend/node_modules
```

### **Seçenek 2: Kapsamlı Temizlik**
```bash
# + Eski klasörleri arşivle
Move-Item water_quality/data data/archived/old_wq_data
Move-Item outputs data/archived/old_outputs
Move-Item dataset_clean scripts/archived/
```

### **Seçenek 3: Hiç Dokunma**
```
Olduğu gibi bırak, çalışıyor zaten! ✅
```

---

## ✅ **SONUÇ**

**Root'taki `src/` silindi** ✅  
**Gereksiz boş klasör** ❌  
**frontend/src/ asıl kaynak** ✅  

**Başka temizlik yapmak ister misin?**
- catboost_info/ sil?
- __pycache__ sil?
- node_modules sil?
- Eski klasörleri arşivle?

Yoksa **olduğu gibi bırakalım?** 🤔
