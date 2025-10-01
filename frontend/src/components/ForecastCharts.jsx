import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLakes } from '../hooks/useLakes'
import ModernCharts from '../components/ModernCharts'
import FutureForecast from '../components/FutureForecast'
import NormalizedMetrics from '../components/NormalizedMetrics'
// PythonVisualizations'ı KALDIR
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
          <p className="text-gray-600 text-lg mt-4">
            Geçmiş veriler ve gelecek tahminleri - İnteraktif analiz
          </p>
        </div>

        {/* Ana Grafik */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">📈</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Su Alanı Değişimi (2018-2024)</h2>
                <p className="text-gray-600">Gerçek değerler vs Model tahminleri</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <ModernCharts data={data} />
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
                <h2 className="text-2xl font-bold text-gray-800">Trend Analizi</h2>
                <p className="text-gray-600">Yıllık değişim trendleri</p>
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
                <h2 className="text-2xl font-bold text-gray-800">Gerçek vs Tahmin Karşılaştırması</h2>
                <p className="text-gray-600">Model doğruluğu ve hata analizi</p>
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
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-lg">🌊</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Mevsimsel Değişim Analizi</h2>
                <p className="text-gray-600">Aylık su alanı değişimleri</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <SeasonalChart data={data} />
            </div>
          </div>
        </div>

        {/* PythonVisualization