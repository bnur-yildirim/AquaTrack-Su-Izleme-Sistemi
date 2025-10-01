import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Droplets, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

const API_BASE = 'http://localhost:5000'

export default function LakeDetailPage() {
  const { lakeId } = useParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLakeDetail()
  }, [lakeId])

  const fetchLakeDetail = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/api/forecast/detail/${lakeId}`)
      
      if (!response.ok) {
        throw new Error(`Veri alınamadı: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Lake detail data:', result)
      setData(result)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Veri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-4 text-center">Hata Oluştu</h2>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Verileri km²'ye çevir
  const yearlyChartData = data.yearly_summary.map(item => ({
    year: item.year,
    Gerçek: item.actual ? parseFloat((item.actual / 1e6).toFixed(1)) : null,
    Tahmin: item.predicted ? parseFloat((item.predicted / 1e6).toFixed(1)) : null
  }))

  const last12Months = data.monthly_data.slice(-12).map(item => ({
    date: new Date(item.date).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
    Gerçek: item.actual ? parseFloat((item.actual / 1e6).toFixed(1)) : null,
    Tahmin: item.predicted ? parseFloat((item.predicted / 1e6).toFixed(1)) : null
  }))

  const seasonalData = data.seasonal_summary.map(item => ({
    season: item.season,
    Gerçek: item.actual ? parseFloat((item.actual / 1e6).toFixed(1)) : 0,
    Tahmin: item.predicted ? parseFloat((item.predicted / 1e6).toFixed(1)) : 0
  }))

  const latestData = data.monthly_data[data.monthly_data.length - 1]
  const currentArea = latestData?.actual ? (latestData.actual / 1e6).toFixed(0) : 'N/A'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition font-semibold"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri Dön
        </button>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            {data.lake_name} - Detaylı Analiz
          </h1>
          <p className="text-gray-600 text-lg">
            {data.total_records} kayıt • {new Date(data.date_range.start).getFullYear()} - {new Date(data.date_range.end).getFullYear()}
          </p>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm font-medium">Mevcut Alan</p>
              <Droplets className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{currentArea} km²</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm font-medium">Model Doğruluğu</p>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {data.metrics?.r2 ? `${(data.metrics.r2 * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm font-medium">Hata Oranı (MAPE)</p>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {data.metrics?.mape ? `${data.metrics.mape.toFixed(2)}%` : 'N/A'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm font-medium">Güvenilirlik</p>
              <AlertCircle className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {data.metrics?.reliability || 'N/A'}
            </p>
          </div>
        </div>

        {/* Yıllık Grafik */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Yıllık Su Alanı Değişimi (2018-2024)</h2>
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={yearlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="year" 
                stroke="#6b7280"
                style={{ fontSize: '14px', fontWeight: '500' }}
              />
              <YAxis 
                label={{ value: 'Su Alanı (km²)', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: '600' } }}
                stroke="#6b7280"
                style={{ fontSize: '14px' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="Gerçek" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ fill: '#3b82f6', r: 6 }}
                activeDot={{ r: 8 }}
              />
              <Line 
                type="monotone" 
                dataKey="Tahmin" 
                stroke="#ef4444" 
                strokeWidth={3} 
                strokeDasharray="5 5"
                dot={{ fill: '#ef4444', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Son 12 Ay */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Son 12 Ay Detaylı Analiz</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={last12Months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis 
                label={{ value: 'Su Alanı (km²)', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
              />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="Gerçek" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Tahmin" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mevsimsel Analiz */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Mevsimsel Ortalamalar</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={seasonalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="season" stroke="#6b7280" style={{ fontSize: '14px', fontWeight: '500' }} />
              <YAxis 
                label={{ value: 'Su Alanı (km²)', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
              />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="Gerçek" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Tahmin" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}