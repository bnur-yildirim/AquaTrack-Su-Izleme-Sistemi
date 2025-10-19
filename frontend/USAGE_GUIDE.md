# 📱 AquaTrack Frontend Kullanım Rehberi

Bu rehber, AquaTrack frontend uygulamasının kullanımı ve özelliklerini açıklar.

## 🏠 Ana Sayfa

### Dashboard
- **Genel Durum**: Tüm göllerin mevcut durumu
- **Hızlı Erişim**: Su kalitesi ve miktarı analizlerine doğrudan erişim
- **Özet Kartlar**: Temel metrikler ve istatistikler

## 🗺️ Harita Görünümü

### İnteraktif Özellikler
- **Göl Seçimi**: Haritadan göllere tıklayarak detay görünümü
- **Renk Kodlaması**: Su kalitesi durumuna göre renk gösterimi
  - 🟢 Yeşil: Normal kalite (Cluster 0)
  - 🔴 Kırmızı: Alg patlaması (Cluster 1)
  - 🟡 Sarı: Tuzluluk artışı (Cluster 2)
  - 🔵 Mavi: Özel durumlar (Cluster 3)
- **Detay Bilgi**: Hover ile göl bilgilerini görüntüleme

## 📊 Su Kalitesi Analizi

### Genel Analiz Sayfası
- **Circle Packing**: Göl ve yıl hiyerarşisi görünümü
- **Cluster Dağılımı**: 4 farklı kalite seviyesinin dağılımı
- **Trend Analizi**: Yıllık değişimler ve kalite eğilimleri

### Göl Detay Analizi
- **Radial Bar Chart**: NDWI, Chl-a, Turbidity, WRI parametrelerinin karşılaştırması
- **Yıllık Analiz**: 2018-2024 dönemi için detaylı inceleme
- **Cluster Geçmişi**: Zaman içi kalite değişimleri
- **İnteraktif Grafikler**: Hover ve click olayları ile detaylı bilgi

## 💧 Su Miktarı Analizi

### Genel Analiz Sayfası
- **Circle Packing**: Su alanı büyüklüğüne göre hiyerarşik görünüm
- **Mevsimsel Analiz**: Aylık ortalama su alanları
- **Karşılaştırma**: Göller arası su miktarı farkları

### Tahmin Analizi
- **Model Performansı**: H1, H2, H3 modellerinin doğruluk oranları
- **Radial Bar Chart**: Model başarı oranlarının görselleştirilmesi
- **Gelecek Tahminleri**: 1-3 aylık su miktarı projeksiyonları
- **Tarihsel Veriler**: Geçmiş dönem verileri ile karşılaştırma

## 🎨 Görselleştirme Özellikleri

### Kullanılan Kütüphaneler
- **Recharts**: Bar, Line, Area, Radar, Pie, RadialBar chart'ları
- **Nivo**: Circle Packing hiyerarşik görünüm
- **Responsive Design**: Tüm ekran boyutları için optimize

### Chart Türleri
- **Bar Charts**: Su miktarı karşılaştırmaları
- **Line Charts**: Trend analizleri
- **Radar Charts**: Çok boyutlu parametre analizi
- **Radial Bar Charts**: Model performansları
- **Pie Charts**: Cluster dağılımları
- **Circle Packing**: Hiyerarşik veri görünümü

## 🔧 Teknik Özellikler

### Component Yapısı
```
src/
├── components/          # Yeniden kullanılabilir bileşenler
│   ├── ModelPerformanceChart.jsx
│   ├── LakeComparisonChart.jsx
│   └── ErrorBoundary.jsx
├── pages/              # Sayfa bileşenleri
│   ├── GeneralWaterQualityAnalysis.jsx
│   ├── GeneralWaterQuantityAnalysis.jsx
│   ├── WaterQuality.jsx
│   └── ForecastPageNew.jsx
├── config/             # Konfigürasyon
│   └── dataSources.js
└── constants/          # Sabit değerler
```

### API Entegrasyonu
- **Merkezi Konfigürasyon**: `dataSources.js` ile API endpoint'leri
- **Error Handling**: API hataları için güvenli yönetim
- **Loading States**: Kullanıcı deneyimi için yükleme durumları
- **Data Validation**: Gelen verilerin doğrulanması

## 🎯 Kullanım İpuçları

### Navigation
1. **Ana Sayfa**: Dashboard görünümü
2. **Su Kalitesi**: Genel ve detay analizler
3. **Su Miktarı**: Tahmin ve karşılaştırma analizleri
4. **Model Performans**: ML modellerinin başarı oranları

### İnteraktif Özellikler
- **Hover**: Grafik üzerinde detay bilgileri
- **Click**: Göl seçimi ve detay görünümü
- **Zoom**: Grafik yakınlaştırma (desteklenen chart'larda)
- **Filter**: Yıl ve parametre filtreleme

### Responsive Kullanım
- **Desktop**: Tam özellikli görünüm
- **Tablet**: Optimize edilmiş layout
- **Mobile**: Temel özellikler ve dokunmatik kontroller

## 🔍 Sorun Giderme

### Yaygın Sorunlar
1. **Grafikler yüklenmiyor**: API bağlantısını kontrol edin
2. **Veri görünmüyor**: Backend'in çalıştığından emin olun
3. **Yavaş yükleme**: İnternet bağlantınızı kontrol edin

### Debug Bilgileri
- **Console**: F12 ile browser console'u açın
- **Network**: API çağrılarını Network tab'da kontrol edin
- **Errors**: Hata mesajlarını Console'da görüntüleyin

## 📞 Destek

Frontend ile ilgili sorunlar için:
- **GitHub Issues**: Teknik sorunlar
- **Documentation**: Bu kullanım rehberi
- **API Status**: Backend durumunu kontrol edin

---

*Son güncelleme: Aralık 2024*
*Frontend Versiyon: 2.0.0*
