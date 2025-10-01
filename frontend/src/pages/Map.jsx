import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LakeComparisonChart from '../components/LakeComparisonChart'

const API_BASE = 'http://localhost:5000'

function levelColor(level) {
  if (level === 'severe') return '#dc2626'
  if (level === 'moderate') return '#f59e0b'
  if (level === 'good') return '#059669'
  return '#3b82f6'
}

function getLakeSize(area) {
  if (area > 1e9) return 20  // Large lake
  if (area > 5e8) return 15  // Medium lake
  return 10  // Small lake
}

// Mini chart component - Simple HTML/CSS
function MiniChart({ data, title, color = '#3b82f6' }) {
  console.log('MiniChart render:', { dataLength: data?.length, color, data: data?.slice(0, 2) })
  
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height: 150, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: '0.9rem',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        border: '1px solid #e5e7eb'
      }}>
        Chart data loading...
      </div>
    )
  }

  // Get last 8 data points and normalize
  const recentData = data.slice(-8)
  const values = recentData.map(d => d.target_water_area_m2 || 0)
  const predictions = recentData.map(d => d.predicted_water_area || 0)
  
  const maxVal = Math.max(...values, ...predictions)
  const minVal = Math.min(...values, ...predictions)
  const range = maxVal - minVal || 1
  
  const normalizeHeight = (val) => ((val - minVal) / range) * 100

  return (
    <div style={{ height: 150, width: '100%', padding: 8 }}>
      {/* Title */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: 8,
        fontSize: '0.7rem',
        color: '#6b7280'
      }}>
        <span>🔵 Actual</span>
        <span>🟡 Prediction</span>
      </div>
      
      {/* Mini Bar Chart */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'end', 
        height: 100, 
        gap: 3,
        backgroundColor: '#f9fafb',
        padding: 8,
        borderRadius: 6,
        border: '1px solid #e5e7eb'
      }}>
        {recentData.map((d, i) => {
          const actualHeight = normalizeHeight(d.target_water_area_m2 || 0)
          const predHeight = normalizeHeight(d.predicted_water_area || 0)
          
          return (
            <div key={i} style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              gap: 1
            }}>
              {/* Prediction bar */}
              <div style={{
                width: '40%',
                height: `${predHeight}%`,
                backgroundColor: '#f59e0b',
                borderRadius: '2px 2px 0 0',
                minHeight: 2,
                opacity: 0.8
              }} />
              
              {/* Actual bar */}
              <div style={{
                width: '60%',
                height: `${actualHeight}%`,
                backgroundColor: color,
                borderRadius: '2px 2px 0 0',
                minHeight: 2
              }} />
              
              {/* Date */}
              <div style={{ 
                fontSize: '0.6rem', 
                color: '#9ca3af',
                transform: 'rotate(-45deg)',
                transformOrigin: 'center',
                marginTop: 4
              }}>
                {new Date(d.date).toLocaleDateString('tr-TR', { month: 'short' })}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Value range */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: 4,
        fontSize: '0.6rem',
        color: '#9ca3af'
      }}>
        <span>{(minVal / 1_000_000).toFixed(1)} km²</span>
        <span>{(maxVal / 1_000_000).toFixed(1)} km²</span>
      </div>
    </div>
  )
}

export default function MapPage({ onLakeSelect, setCurrentPage, setSearchParams }) {
  const navigate = useNavigate()
  const [lakes, setLakes] = useState({})
  const [markers, setMarkers] = useState([])
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        // Get lake list
        const lakesRes = await fetch(`${API_BASE}/api/lakes`)
        const lakesData = await lakesRes.json()
        const dict = lakesData.lakes || {}
      setLakes(dict)

        // Get forecast and analytics data for each lake
      const entries = Object.entries(dict)
        const markerPromises = entries.map(async ([key, info]) => {
          try {
            // Forecast data - use old API
            const forecastRes = await fetch(`${API_BASE}/api/forecast?lake_id=${key}`)
            const forecast = forecastRes.ok ? await forecastRes.json() : null

            // Analytics data - use current endpoint
            const analyticsRes = await fetch(`${API_BASE}/api/forecast?lake_id=${key}`)
            const analytics = analyticsRes.ok ? await analyticsRes.json() : null

            // Timeseries data - use current endpoint
            const timeseriesRes = await fetch(`${API_BASE}/api/forecast?lake_id=${key}`)
            const timeseries = timeseriesRes.ok ? await timeseriesRes.json() : null

            const change = forecast?.change_percent ?? 0
            const area = analytics?.overview?.area_statistics?.mean ?? 0
            const cv = analytics?.overview?.area_statistics?.coefficient_of_variation ?? 0
            
            // Determine status
            let level = 'normal'
            if (change < -15) level = 'severe'
            else if (change < -5) level = 'moderate'
            else if (change > 5) level = 'good'

            // Get last 12 months data
            const records = Array.isArray(timeseries?.records) ? timeseries.records : []
            const recentRecords = records
              .filter(r => r && r.date)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 12)
              .reverse()

            return {
              key,
              name: info.name,
              lat: info.lat,
              lng: info.lng,
              change,
              level,
              area,
              cv,
              dataPoints: analytics?.overview?.total_records ?? 0,
              lastUpdate: analytics?.overview?.date_range?.end ?? null,
              recentData: recentRecords,
              forecast: forecast
            }
          } catch (error) {
            console.error(`Lake ${key} data error:`, error)
            return {
              key,
              name: info.name,
              lat: info.lat,
              lng: info.lng,
              change: 0,
              level: 'normal',
              area: 0,
              cv: 0,
              dataPoints: 0,
              lastUpdate: null,
              recentData: [],
              forecast: null
            }
          }
        })

        const markerList = await Promise.all(markerPromises)
        setMarkers(markerList.filter(m => m.lat && m.lng))
        
      } catch (error) {
        console.error('Map data error:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const center = useMemo(() => [39.0, 35.0], [])

  const formatArea = (area) => {
    if (area >= 1e9) return `${(area / 1e9).toFixed(1)} billion m²`
    if (area >= 1e6) return `${(area / 1e6).toFixed(1)} million m²`
    return `${(area / 1e3).toFixed(1)} thousand m²`
  }

  const getStatusText = (level) => {
    switch(level) {
      case 'severe': return 'Critical Risk'
      case 'moderate': return 'Attention'
      case 'good': return 'Good Status'
      default: return 'Normal'
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ padding: 40 }}>Map loading...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
          Turkey Lake Analysis Map
        </h1>
        <p className="text-gray-600 text-lg">
          Sentinel-2 satellite images and AI-based water area analysis
        </p>
      </div>

      {/* HARİTA - EN ÜSTTE */}
      <div className="mb-8">
        {/* Harita Lejantı */}
        <div style={{ 
          display: 'flex', 
          gap: 20, 
          marginBottom: 15,
          padding: 10,
          backgroundColor: '#f9fafb',
          borderRadius: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: '#dc2626' 
            }}></div>
            <span style={{ fontSize: '0.9rem' }}>Critical Risk (&lt;-15%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: '#f59e0b' 
            }}></div>
            <span style={{ fontSize: '0.9rem' }}>Attention (-15% - -5%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: '#3b82f6' 
            }}></div>
            <span style={{ fontSize: '0.9rem' }}>Normal (-5% - +5%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: '#059669' 
            }}></div>
            <span style={{ fontSize: '0.9rem' }}>Good Status (&gt;+5%)</span>
          </div>
        </div>
      </div>

      <div className="map-container" style={{ height: 600 }}>
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map(m => (
            <CircleMarker 
              key={m.key} 
              center={[m.lat, m.lng]} 
              radius={getLakeSize(m.area)}
              pathOptions={{ 
                color: levelColor(m.level), 
                fillColor: levelColor(m.level), 
                fillOpacity: 0.7,
                weight: 3
              }}
              eventHandlers={{
                click: (e) => {
                  setSelectedMarker(m)
                  // Ana sayfada göl seçimini güncelle
                  if (onLakeSelect) {
                    onLakeSelect(m.key || m.name.toLowerCase())
                  }
                  // Sadece marker'ı seç, popup'tan analiz seçilecek
                  console.log('Marker clicked:', m.name, 'Popup will show analysis options')
                }
              }}
            >
              <Popup maxWidth={400} minWidth={350}>
                <div style={{ padding: 15 }}>
                  {/* Basit Göl Başlığı */}
                  <div style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: 'bold', 
                    marginBottom: 15,
                    color: '#2c3e50',
                    textAlign: 'center',
                    borderBottom: '2px solid #bdc3c7',
                    paddingBottom: 10
                  }}>
                    {m.name}
                  </div>
                  
                  {/* Basit Su Miktarı Bilgisi */}
                  <div style={{ 
                    background: '#f8f9fa',
                    padding: 20,
                    borderRadius: 8,
                    marginBottom: 15,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.9em', color: '#6c757d', marginBottom: 8 }}>
                      Current Water Area
                    </div>
                    <div style={{ 
                      fontSize: '1.8em', 
                      fontWeight: 'bold', 
                      color: '#495057',
                      marginBottom: 8
                    }}>
                      {m.area ? `${(m.area / 1e6).toFixed(1)} km²` : 'Hesaplanıyor...'}
                    </div>
                    <div style={{ 
                      fontSize: '1em', 
                      color: m.change && m.change < 0 ? '#dc3545' : '#28a745',
                      fontWeight: 'bold'
                    }}>
                      {m.change ? `${m.change > 0 ? '+' : ''}${m.change.toFixed(1)}%` : 'Calculating trend...'}
                    </div>
                  </div>
                  
                  {/* Basit Durum Göstergesi */}
                  <div style={{
                    background: m.level === 'good' ? '#d4edda' : 
                               m.level === 'moderate' ? '#fff3cd' : 
                               m.level === 'severe' ? '#f8d7da' : '#e2e3e5',
                    color: m.level === 'good' ? '#155724' : 
                           m.level === 'moderate' ? '#856404' : 
                           m.level === 'severe' ? '#721c24' : '#383d41',
                    padding: 12,
                    borderRadius: 6,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    marginBottom: 15
                  }}>
                    {m.level === 'good' ? 'Good Status' : 
                     m.level === 'moderate' ? 'Attention Required' : 
                     m.level === 'severe' ? 'Critical Status' : 'Normal'}
                  </div>
                  
                  {/* İki Analiz Seçeneği */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginTop: 15
                  }}>
                    <button 
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#2563eb'}
                      onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                      onClick={() => {
                        const lakeKey = m.key || m.name.toLowerCase()
                        setCurrentPage('forecast')
                        setSearchParams({ lake: lakeKey, page: 'forecast' })
                        console.log('Water Quantity Analysis selected:', lakeKey)
                      }}
                    >
                      Water Quantity
                    </button>
                    
                    <button 
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#059669'}
                      onMouseOut={(e) => e.target.style.background = '#10b981'}
                      onClick={() => {
                        const lakeKey = m.key || m.name.toLowerCase()
                        setCurrentPage('quality')
                        setSearchParams({ lake: lakeKey, page: 'quality' })
                        console.log('Water Quality Analysis selected:', lakeKey)
                      }}
                    >
                      Water Quality
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* SOL TARAF: Hover Butonları ve Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sol Kolon - Hover Butonları */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Su Miktarı Genel Analizleri Butonu */}
          <div className="group relative">
            <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="font-bold text-lg">Water Quantity</div>
                  <div className="text-sm opacity-90">General Analysis</div>
                </div>
              </div>
            </button>
            
            {/* Hover Grafik - Su Miktarı */}
            <div className="absolute left-full top-0 ml-4 w-96 bg-white rounded-2xl shadow-2xl border border-blue-200 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-50">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3"></span>
                <div>
                  <h3 className="text-lg font-bold text-blue-800">Water Quantity General Analysis</h3>
                  <p className="text-blue-600 text-sm">Lake water area changes and trend analysis</p>
                </div>
              </div>

              {/* İstatistik Kartları */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-600 text-xs font-medium">Total Lakes</span>
                    <span className="text-lg"></span>
                  </div>
                  <div className="text-xl font-bold text-blue-800">{markers.length}</div>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-600 text-xs font-medium">Good Status</span>
                    <span className="text-lg"></span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {markers.filter(m => m.level === 'good').length}
                  </div>
                </div>
              </div>

              {/* Genel Trend Analizi */}
              <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                  <span className="text-lg mr-2"></span>
                  General Trend Analysis
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Average Change:</span>
                    <span className="font-bold text-blue-600">
                      {(() => {
                        const avgChange = markers.reduce((sum, m) => sum + m.change, 0) / markers.length;
                        return avgChange > 0 ? `+${avgChange.toFixed(1)}%` : `${avgChange.toFixed(1)}%`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Best:</span>
                    <span className="font-bold text-green-600">
                      {(() => {
                        const bestLake = markers.reduce((best, current) => 
                          current.change > best.change ? current : best
                        );
                        return bestLake.name;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Most Declining:</span>
                    <span className="font-bold text-red-600">
                      {(() => {
                        const worstLake = markers.reduce((worst, current) => 
                          current.change < worst.change ? current : worst
                        );
                        return worstLake.name;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Göl Performans Karşılaştırması Butonu */}
          <div className="group relative">
            <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="font-bold text-lg">Lake Performance</div>
                  <div className="text-sm opacity-90">AI Model Comparison</div>
                </div>
              </div>
            </button>
            
            {/* Hover Grafik - Göl Performans */}
            <div className="absolute left-full top-0 ml-4 w-96 bg-white rounded-2xl shadow-2xl border border-purple-200 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-50">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3"></span>
                <div>
                  <h3 className="text-lg font-bold text-purple-800">Lake Performance Comparison</h3>
                  <p className="text-purple-600 text-sm">AI model performance of all lakes</p>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <LakeComparisonChart />
              </div>
            </div>
          </div>

          {/* Su Kalitesi Butonu (Gelecek) */}
          <div className="group relative">
            <button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="font-bold text-lg">Water Quality</div>
                  <div className="text-sm opacity-90">Parameters (Coming Soon)</div>
                </div>
              </div>
            </button>
            
            {/* Hover Grafik - Su Kalitesi (Placeholder) */}
            <div className="absolute left-full top-0 ml-4 w-96 bg-white rounded-2xl shadow-2xl border border-green-200 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-50">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3"></span>
                <div>
                  <h3 className="text-lg font-bold text-green-800">Water Quality Analysis</h3>
                  <p className="text-green-600 text-sm">Lake water quality parameters</p>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">🔧</div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Coming Soon</h4>
                <p className="text-gray-500 text-sm">
                  Water quality analysis and evaluation system is being developed...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Kolon - Boş Alan (Gelecek İçerikler İçin) */}
        <div className="lg:col-span-3">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Analysis Panel</h3>
            <p className="text-gray-500">
              Hover over the buttons on the left to view detailed analysis
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
