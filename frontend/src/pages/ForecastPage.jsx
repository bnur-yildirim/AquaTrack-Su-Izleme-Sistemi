import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLakes } from '../hooks/useLakes'
import ModernCharts from '../components/ModernCharts'
import FutureForecast from '../components/FutureForecast'
import NormalizedMetrics from '../components/NormalizedMetrics'
import TrendProjectionChart from '../components/TrendProjectionChart'
import RiskLevelCard from '../components/RiskLevelCard'
import DataQualityIndicator from '../components/DataQualityIndicator'
import TrendAnalysisChart from '../components/TrendAnalysisChart'
import ComparisonChart from '../components/ComparisonChart'
import SeasonalChart from '../components/SeasonalChart'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBoundary from '../components/ErrorBoundary'

export default function ForecastPage() {
  const [searchParams] = useSearchParams()
  const { lakes, loading: lakesLoading } = useLakes()
  
  const [selectedLake, setSelectedLake] = useState(() => {
    const urlLake = searchParams.get('lake')
    return urlLake || 'van'
  })
  
  useEffect(() => {
    const urlLake = searchParams.get('lake')
    if (urlLake && urlLake !== selectedLake) {
      setSelectedLake(urlLake)
    }
  }, [searchParams, selectedLake])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedLake) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`http://localhost:5000/api/forecast?lake_id=${selectedLake}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedLake])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="loading"></div>
          <p className="mt-4 text-gray-600">Veri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Hata</h2>
          <p className="text-gray-600">Veri yüklenirken hata oluştu: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Veri Bulunamadı</h2>
          <p className="text-gray-600">Seçilen göl için veri bulunamadı.</p>
        </div>
      </div>
    )
  }

  const lakeName = lakes[selectedLake]?.name || selectedLake.toUpperCase()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Başlık */}
        <div className="text-center mb-12">
          <div className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
              {lakeName} Su Miktarı Analizi
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-green-500 mx-auto rounded-full"></div>
          </div>
          <p className="text-gray-600 text-lg mt-4 mb-6">
            Uydu görüntüleri ve AI tabanlı tahmin sistemi
          </p>
          
          {/* Göl Seçici */}
          <div className="inline-block bg-white rounded-xl shadow-lg p-4 border border-gray-200">
            <label className="text-sm font-semibold text-gray-700 mr-3">Göl Seçin:</label>
            <select
              value={selectedLake}
              onChange={(e) => setSelectedLake(e.target.value)}
              className="px-6 py-3 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg text-gray-800 font-semibold shadow-sm hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all cursor-pointer"
            >
              {Object.entries(lakes).map(([key, lake]) => (
                <option key={key} value={key}>
                  {lake.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Özet Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Son Ölçüm */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm font-medium">Son Ölçüm</span>
              <span className="text-2xl">🌊</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {data.actual.filter(a => a).slice(-1)[0] ? 
                `${(data.actual.filter(a => a).slice(-1)[0] / 1e6).toFixed(1)}M m²` : 'N/A'}
            </div>
            <div className="text-blue-100 text-xs">{data.years.slice(-1)[0]} yılı</div>
          </div>

          {/* Trend */}
          <div className={`rounded-xl p-6 text-white shadow-lg ${
            data.change_percent >= 0 
              ? 'bg-gradient-to-br from-green-500 to-green-600' 
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm font-medium">Trend</span>
              <span className="text-2xl">{data.change_percent >= 0 ? '📈' : '📉'}</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {data.change_percent >= 0 ? '+' : ''}{data.change_percent.toFixed(1)}%
            </div>
            <div className="text-white/80 text-xs">
              {data.change_percent >= 0 ? 'Artış eğiliminde' : 'Azalış eğiliminde'}
            </div>
          </div>

          {/* Veri Noktası */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100 text-sm font-medium">Veri Noktası</span>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {data.data_points || 'N/A'}
            </div>
            <div className="text-purple-100 text-xs">Toplam ölçüm sayısı</div>
          </div>

          {/* Model Doğruluğu */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-100 text-sm font-medium">Model Başarısı</span>
              <span className="text-2xl">🎯</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {data.model_metrics?.r2 ? `${(data.model_metrics.r2 * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-emerald-100 text-xs">R² skoru</div>
          </div>
        </div>

        {/* Ana Grafik */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-white text-lg">📈</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Su Alanı Değişimi (2018-2024)</h2>
                  <p className="text-gray-600">Gerçek değerler vs Model tahminleri</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Toplam Ölçüm</div>
                <div className="text-2xl font-bold text-gray-700">{data.data_points}</div>
              </div>
            </div>
            
            {/* Grafik Açıklaması */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-blue-500 text-xl mr-3">ℹ️</span>
                <div>
                  <p className="text-blue-900 font-semibold mb-1">Grafik Açıklaması:</p>
                  <p className="text-blue-700 text-sm">
                    <strong>Mavi alan</strong>: Sentinel-2 uydu görüntülerinden elde edilen gerçek su alanı ölçümleri. 
                    <strong className="ml-2">Yeşil çizgi</strong>: CatBoost algoritması ile eğitilmiş AI modelinin tahminleri. 
                    Grafikteki uyum modelin doğruluğunu gösterir.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <ModernCharts data={data} />
            </div>
          </div>
        </div>

        {/* YENİ: Trend ve Projeksiyon */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">📈</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Trend Analizi ve Gelecek Projeksiyonları</h2>
                <p className="text-gray-600">2025-2027 lineer regresyon tahminleri</p>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-orange-500 text-xl mr-3">📊</span>
                <div>
                  <p className="text-orange-900 font-semibold mb-1">Nasıl Hesaplanıyor?</p>
                  <p className="text-orange-700 text-sm">
                    Geçmiş yılların verilerine <strong>lineer regresyon</strong> uygulanarak gelecek trendler tahmin ediliyor. 
                    <strong className="ml-1">Mavi çizgi</strong>: Gerçek veriler. 
                    <strong className="ml-1">Turuncu kesikli çizgi</strong>: Gelecek projeksiyonları. 
                    İklim değişiklikleri ve olağanüstü durumlar bu tahminleri etkileyebilir.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <TrendProjectionChart selectedLake={selectedLake} />
            </div>
          </div>
        </div>

        {/* Trend Analizi */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">📊</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Yıllık Değişim Analizi</h2>
                <p className="text-gray-600">Su alanındaki yıllık yüzdelik değişimler</p>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-purple-500 text-xl mr-3">📉</span>
                <div>
                  <p className="text-purple-900 font-semibold mb-1">Değişim Yüzdeleri:</p>
                  <p className="text-purple-700 text-sm">
                    Her çubuk bir yıldan diğerine olan <strong>yüzdelik değişimi</strong> gösterir. 
                    <strong className="text-red-600 ml-1">Negatif değerler</strong> su alanında azalma, 
                    <strong className="text-green-600 ml-1">pozitif değerler</strong> artış anlamına gelir. 
                    Kuraklık ve yağış miktarları bu değişimleri doğrudan etkiler.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <TrendAnalysisChart data={data} />
            </div>
          </div>
        </div>

        {/* Karşılaştırma */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">🔍</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Model Doğruluk Analizi</h2>
                <p className="text-gray-600">Gerçek değerler vs AI tahminleri karşılaştırması</p>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-green-500 text-xl mr-3">✓</span>
                <div>
                  <p className="text-green-900 font-semibold mb-1">Model Performansı:</p>
                  <p className="text-green-700 text-sm">
                    <strong className="text-blue-600">Mavi çubuklar</strong>: Uydu görüntülerinden ölçülen gerçek değerler. 
                    <strong className="text-green-600 ml-1">Yeşil çubuklar</strong>: AI modelinin tahminleri. 
                    <strong className="text-red-600 ml-1">Kırmızı çizgi</strong>: Fark miktarı (düşük olması = yüksek doğruluk). 
                    Çubuklar ne kadar yakınsa model o kadar başarılıdır.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <ComparisonChart data={data} />
            </div>
          </div>
        </div>

        {/* Mevsimsel Analiz */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">🌊</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Mevsimsel Değişim Paterni</h2>
                <p className="text-gray-600">Yıl içindeki tipik su alanı değişimleri</p>
              </div>
            </div>
            
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-cyan-500 text-xl mr-3">🌦️</span>
                <div>
                  <p className="text-cyan-900 font-semibold mb-1">Mevsimsel Etkiler:</p>
                  <p className="text-cyan-700 text-sm">
                    Bu grafik yıl boyunca gölün <strong>tipik davranışını</strong> gösterir. 
                    <strong className="ml-1">İlkbahar</strong>: Kar erimeleri nedeniyle su seviyesi yükselir. 
                    <strong className="ml-1">Yaz</strong>: Buharlaşma artışı ile seviye düşer. 
                    <strong className="ml-1">Sonbahar-Kış</strong>: Yağışlarla kısmi toparlanma. 
                    Pattern göl ekosistemi için kritik öneme sahiptir.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <SeasonalChart data={data} />
            </div>
          </div>
        </div>

        {/* YENİ: Risk + Veri Kalitesi (İki Sütun) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">⚠️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Risk Seviyeleri</h2>
                <p className="text-gray-600">Eşik değerleri ve mevcut durum</p>
              </div>
            </div>
            <RiskLevelCard selectedLake={selectedLake} />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">✓</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Veri Kalitesi</h2>
                <p className="text-gray-600">Uydu görüntülerinin güvenilirliği</p>
              </div>
            </div>
            <DataQualityIndicator selectedLake={selectedLake} />
          </div>
        </div>

        {/* Gelecek Tahminler ve Metrikler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">🔮</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Gelecek Tahminleri</h2>
                <p className="text-gray-600">3 ay ilerisi tahminler</p>
              </div>
            </div>
            <FutureForecast selectedLake={selectedLake} data={data} />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">⚡</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Model Performansı</h2>
                <p className="text-gray-600">Tahmin doğruluğu ve güvenilirlik</p>
              </div>
            </div>
            <NormalizedMetrics data={data} />
          </div>
        </div>

        {/* DSI ve Belediye Önerileri */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 mb-12">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-lg">🏛️</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Kurumsal Öneriler</h2>
              <p className="text-gray-600">DSI ve Belediye için stratejik öneriler</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-xl">🏛️</span>
                </div>
                <h3 className="text-xl font-bold text-blue-800">DSI Önerileri</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">📊</span>
                  <span className="text-blue-700">Su seviyesi takibi ve trend analizi</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">🌡️</span>
                  <span className="text-blue-700">İklim değişikliği etkileri izleme</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">🔬</span>
                  <span className="text-blue-700">Düzenli su kalitesi kontrolü</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-xl">🏢</span>
                </div>
                <h3 className="text-xl font-bold text-green-800">Belediye Önerileri</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">💧</span>
                  <span className="text-green-700">Su tasarrufu kampanyaları</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">🔄</span>
                  <span className="text-green-700">Alternatif su kaynakları araştırma</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">📢</span>
                  <span className="text-green-700">Halk bilinçlendirme çalışmaları</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Metodoloji ve Teknoloji */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 text-white mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">🔬 Metodoloji ve Teknoloji</h2>
            <p className="text-gray-300">Bilimsel temeller ve kullanılan teknolojiler</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Veri Kaynağı */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🛰️</div>
              <h3 className="text-xl font-bold mb-3">Veri Kaynağı</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• Sentinel-2 Uydu Görüntüleri</li>
                <li>• 10m-20m mekansal çözünürlük</li>
                <li>• 2018-2024 zaman serisi</li>
                <li>• NDWI (Su İndeksi) hesaplama</li>
                <li>• Google Earth Engine</li>
              </ul>
            </div>

            {/* AI Modeli */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-3">AI Modeli</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• CatBoost Regression</li>
                <li>• Optuna Hyperparameter Tuning</li>
                <li>• 3 Horizon Tahmin (H1, H2, H3)</li>
                <li>• R² > 0.99 (Van, Eğirdir)</li>
                <li>• WMAPE &lt; 5% ortalama</li>
              </ul>
            </div>

            {/* Features */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-3">Özellikler</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• Lag Features (1-12 ay)</li>
                <li>• Rolling Statistics</li>
                <li>• Trend Indicators</li>
                <li>• Seasonal Components</li>
                <li>• NDWI Time Series</li>
              </ul>
            </div>
          </div>

          {/* Alt Bilgi */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-center text-gray-400 text-sm">
              <strong>Bilimsel Not:</strong> Bu analizler peer-reviewed yöntemlerle hazırlanmış olup, 
              karar verme süreçlerinde referans olarak kullanılabilir. Ancak kesin sonuçlar için 
              yerinde ölçümler ve uzman değerlendirmesi önerilir.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
