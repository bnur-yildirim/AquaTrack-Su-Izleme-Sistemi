import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'

const API_BASE = 'http://localhost:5000'

function getLevelColor(level) {
  const colors = {
    severe: '#dc2626',    // Daha koyu kırmızı
    moderate: '#ea580c',  // Daha koyu turuncu
    good: '#059669',      // Daha koyu yeşil
    normal: '#3b82f6'     // Mavi (normal durum)
  }
  return colors[level] || colors.normal
}

function getLakeSize(area) {
  if (area > 1e9) return 20
  if (area > 5e8) return 15
  return 10
}

export default function MapPage({ onLakeSelect, setCurrentPage, setSearchParams }) {
  const [lakes, setLakes] = useState({})
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const lakesRes = await fetch(`${API_BASE}/api/lakes`)
        const lakesData = await lakesRes.json()
        const dict = lakesData.lakes || {}
        setLakes(dict)

        const entries = Object.entries(dict)
        const markerPromises = entries.map(async ([key, info]) => {
          try {
            const forecastRes = await fetch(`${API_BASE}/api/forecast?lake_id=${key}`)
            const forecast = forecastRes.ok ? await forecastRes.json() : null

            const change = forecast?.change_percent ?? 0
            const area = forecast?.actual?.filter(a => a).slice(-1)[0] ?? 0
            
            let level = 'normal'
            if (change < -15) level = 'severe'
            else if (change < -5) level = 'moderate'
            else if (change > 5) level = 'good'

            return {
              key,
              name: info.name,
              lat: info.lat,
              lng: info.lng,
              change,
              level,
              area
            }
          } catch (error) {
            console.error(`Lake ${key} error:`, error)
            return null
          }
        })

        const markerList = await Promise.all(markerPromises)
        const validMarkers = markerList.filter(m => m && m.lat && m.lng)
        console.log('📍 Göller yüklendi:', validMarkers.length)
        setMarkers(validMarkers)
        
      } catch (error) {
        console.error('Map error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const center = useMemo(() => [39.0, 35.0], [])

  const handleLakeClick = (marker) => {
    if (onLakeSelect) {
      onLakeSelect(marker.key)
    }
  }

  const handleAnalysisClick = (marker, analysisType) => {
    const lakeKey = marker.key
    
    const newSearchParams = new URLSearchParams()
    newSearchParams.set('page', analysisType)
    newSearchParams.set('lake', lakeKey)
    
    if (setCurrentPage) setCurrentPage(analysisType)
    if (setSearchParams) setSearchParams(newSearchParams)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px', color: '#64748b' }}>
        <div>Harita yükleniyor...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        {[
          { level: 'severe', label: 'Kritik (<-15%)', color: '#dc2626' },
          { level: 'moderate', label: 'Dikkat (-15% - -5%)', color: '#ea580c' },
          { level: 'normal', label: 'Normal (-5% - +5%)', color: '#3b82f6' },
          { level: 'good', label: 'İyi (>+5%)', color: '#059669' }
        ].map(item => (
          <div key={item.level} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }}></div>
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {markers.map(m => (
            <CircleMarker 
              key={m.key} 
              center={[m.lat, m.lng]} 
              radius={getLakeSize(m.area)}
              pathOptions={{ 
                color: getLevelColor(m.level), 
                fillColor: getLevelColor(m.level), 
                fillOpacity: 0.7, 
                weight: 3,
                opacity: 0.8
              }}
              eventHandlers={{ click: () => handleLakeClick(m) }}
            >
              <Popup maxWidth={320} minWidth={300}>
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' }}>
                    {m.name}
                  </h3>
                  
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Güncel Su Alanı</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                      {m.area ? `${(m.area / 1e6).toFixed(1)} km²` : 'N/A'}
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: m.change < 0 ? '#dc2626' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      {m.change ? (
                        <>
                          {m.change > 0 ? '↗️' : '↘️'}
                          {`${m.change > 0 ? '+' : ''}${m.change.toFixed(1)}%`}
                        </>
                      ) : 'N/A'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button 
                      style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s' }}
                      onClick={() => handleAnalysisClick(m, 'forecast')}
                      onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                      onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                    >
                      📊 Su Miktarı
                    </button>
                    <button 
                      style={{ background: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s' }}
                      onClick={() => handleAnalysisClick(m, 'quality')}
                      onMouseEnter={(e) => e.target.style.background = '#047857'}
                      onMouseLeave={(e) => e.target.style.background = '#059669'}
                    >
                      💧 Su Kalitesi
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}