import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area, ComposedChart,
  PieChart, Pie,
  RadialBarChart, RadialBar,
  Cell
} from 'recharts'

const API_BASE_URL = 'http://127.0.0.1:5000/api/quality'

// Grafik renk paleti
const CHART_COLORS = {
  ndwi: '#3b82f6',
  wri: '#10b981',
  chl_a: '#f59e0b',
  turbidity: '#ef4444',
  confidence: '#8b5cf6'
}

export default function WaterQuality({ selectedLake }) {
  const [lakes, setLakes] = useState([])
  const [clusters, setClusters] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [lakeHistory, setLakeHistory] = useState(null)
  const [currentLakeData, setCurrentLakeData] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [formData, setFormData] = useState({
    ndwi_mean: '',
    wri_mean: '',
    chl_a_mean: '',
    turbidity_mean: ''
  })

  // Göl ID mapping
  const lakeIdMap = {
    'tuz': 140,
    'van': 141,
    'ulubat': 1321,
    'egirdir': 1340,
    'burdur': 1342,
    'sapanca': 14510,
    'salda': 14741
  }

  // Tüm gölleri yükle
  useEffect(() => {
    fetchAllLakes()
    fetchClusterInfo()
  }, [])

  // Seçili göl değiştiğinde veriyi çek
  useEffect(() => {
    if (selectedLake) {
      const lakeId = lakeIdMap[selectedLake]
      if (lakeId) {
        fetchLakeHistory(lakeId)
        // Mevcut göl verisini all lakes'den bul
        const currentLake = lakes.find(l => l.lake_name === getLakeName(selectedLake))
        setCurrentLakeData(currentLake)
      }
    }
  }, [selectedLake, lakes])

  const fetchAllLakes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/all-lakes`)
      const data = await response.json()
      if (response.ok) {
        setLakes(data.lakes || [])
      } else {
        setError(data.error || 'Göller yüklenemedi')
      }
    } catch (err) {
      setError('API bağlantı hatası')
    }
  }

  const fetchClusterInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clusters/info`)
      const data = await response.json()
      if (response.ok) {
        setClusters(data.clusters || [])
      }
    } catch (err) {
      console.error('Cluster bilgileri yüklenemedi:', err)
    }
  }

  const getLakeName = (lakeKey) => {
    const names = {
      'tuz': 'Tuz Gölü',
      'van': 'Van Gölü',
      'ulubat': 'Ulubat Gölü',
      'egirdir': 'Eğirdir Gölü',
      'burdur': 'Burdur Gölü',
      'sapanca': 'Sapanca Gölü',
      'salda': 'Salda Gölü'
    }
    return names[lakeKey] || 'Bilinmeyen Göl'
  }

  const fetchLakeHistory = async (lakeId) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/lake/${lakeId}/cluster`)
      const data = await response.json()
      if (response.ok) {
        setLakeHistory(data)
      }
    } catch (err) {
      console.error('Göl geçmişi yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePredict = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPrediction(null)

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (response.ok) {
        setPrediction(data)
      } else {
        setError(data.error || 'Tahmin yapılamadı')
      }
    } catch (err) {
      setError('API bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  const getClusterColor = (clusterId) => {
    const colors = {
      0: '#28a745', // Normal - Yeşil
      1: '#dc3545', // Alg patlaması - Kırmızı
      2: '#ffc107', // Tuzlu - Sarı
      3: '#17a2b8'  // Özel - Açık Mavi
    }
    return colors[clusterId] || '#6c757d'
  }

  const getClusterIcon = (clusterId) => {
    const icons = {
      0: '✅', // Normal
      1: '⚠️', // Alg patlaması
      2: '🧂', // Tuzlu
      3: '🏔️' // Özel (Van)
    }
    return icons[clusterId] || '❓'
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 30,
        background: 'white',
        borderRadius: 16,
        padding: '32px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          fontSize: '2.5rem', 
          marginBottom: 12
        }}>💧</div>
        <h1 style={{ 
          color: '#1e293b', 
          marginBottom: 8,
          fontSize: '1.875rem',
          fontWeight: '600',
          letterSpacing: '-0.025em'
        }}>
          Su Kalitesi Analizi
        </h1>
        <p style={{ 
          color: '#64748b', 
          fontSize: '0.95rem',
          fontWeight: '400',
          maxWidth: '560px',
          margin: '0 auto',
          lineHeight: '1.5'
        }}>
          K-Means Clustering ile Unsupervised Su Kalitesi Sınıflandırması
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: '12px',
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'overview', label: selectedLake ? getLakeName(selectedLake) + ' - Yıl Yıl Analiz' : 'Genel Bakış', icon: '📊', desc: 'Mevcut durum' },
            { id: 'history', label: 'Detaylı Kayıtlar', icon: '📋', desc: 'Tüm ölçümler' },
            { id: 'analytics', label: 'Tüm Göller', icon: '🔬', desc: 'Karşılaştırma' },
            { id: 'predict', label: 'Tahmin', icon: '🔮', desc: 'Manuel tahmin' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#64748b',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = '#f1f5f9'
                  e.target.style.color = '#1e293b'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = 'transparent'
                  e.target.style.color = '#64748b'
                }
              }}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 32,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        minHeight: '500px'
      }}>
        {/* Göl seçilmemişse Genel Bakış (Tüm Göller) */}
        {!selectedLake && activeTab === 'overview' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: 24, textAlign: 'center', fontSize: '1.5rem', fontWeight: '600' }}>
              🌊 Genel Su Kalitesi Durumu
            </h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 32, fontSize: '0.875rem' }}>
              Tüm göllerin mevcut su kalitesi verileri. Detaylı analiz için bir göl seçin.
            </p>

            {/* Cluster Dağılım Özeti */}
            {lakes.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                marginBottom: 32
              }}>
                {[0, 1, 2, 3].map(clusterId => {
                  const clusterLakes = lakes.filter(lake => lake.cluster === clusterId);
                  return (
                    <div
                      key={clusterId}
                      style={{
                        background: `${getClusterColor(clusterId)}08`,
                        border: `2px solid ${getClusterColor(clusterId)}30`,
                        borderRadius: 12,
                        padding: 16,
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = `0 4px 12px ${getClusterColor(clusterId)}20`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{
                        fontSize: '2.5rem',
                        marginBottom: 8
                      }}>
                        {getClusterIcon(clusterId)}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1e293b',
                        marginBottom: 4
                      }}>
                        Cluster {clusterId}
                      </div>
                      <div style={{
                        fontSize: '1.75rem',
                        fontWeight: '600',
                        color: getClusterColor(clusterId),
                        marginBottom: 4
                      }}>
                        {clusterLakes.length}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b'
                      }}>
                        {clusterLakes.length === 0 ? 'göl yok' : 
                         clusterLakes.length === 1 ? 'göl' : 'göl'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tüm Göller Listesi */}
            {lakes.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 16
              }}>
                {lakes.map((lake, index) => (
                  <div
                    key={index}
                    style={{
                      background: `${getClusterColor(lake.cluster)}08`,
                      borderRadius: 12,
                      padding: 20,
                      border: `2px solid ${getClusterColor(lake.cluster)}30`,
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = `0 4px 12px ${getClusterColor(lake.cluster)}20`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Göl Başlığı */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: `1px solid ${getClusterColor(lake.cluster)}20`
                    }}>
                      <h3 style={{
                        margin: 0,
                        color: '#1e293b',
                        fontSize: '1.125rem',
                        fontWeight: '600'
                      }}>
                        {lake.lake_name}
                      </h3>
                      <div style={{
                        fontSize: '2rem',
                        background: getClusterColor(lake.cluster),
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 2px 8px ${getClusterColor(lake.cluster)}40`
                      }}>
                        {getClusterIcon(lake.cluster)}
                      </div>
                    </div>

                    {/* Cluster Bilgisi */}
                    <div style={{
                      background: 'white',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 12,
                      textAlign: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        color: getClusterColor(lake.cluster),
                        marginBottom: 4
                      }}>
                        {lake.interpretation}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b'
                      }}>
                        Cluster {lake.cluster} • {(lake.confidence * 100).toFixed(1)}% güven
                      </div>
                    </div>

                    {/* Metrikler Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8
                    }}>
                      <div style={{
                        background: 'white',
                        padding: 10,
                        borderRadius: 8,
                        textAlign: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>NDWI</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b' }}>
                          {lake.ndwi.toFixed(2)}
                        </div>
                      </div>

                      <div style={{
                        background: 'white',
                        padding: 10,
                        borderRadius: 8,
                        textAlign: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>WRI</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b' }}>
                          {lake.wri.toFixed(2)}
                        </div>
                      </div>

                      <div style={{
                        background: 'white',
                        padding: 10,
                        borderRadius: 8,
                        textAlign: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Chl-a</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b' }}>
                          {lake.chl_a.toFixed(2)}
                        </div>
                      </div>

                      <div style={{
                        background: 'white',
                        padding: 10,
                        borderRadius: 8,
                        textAlign: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>Turbidity</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b' }}>
                          {lake.turbidity.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Son Ölçüm */}
                    {lake.last_measurement && (
                      <div style={{
                        marginTop: 12,
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        color: '#64748b'
                      }}>
                        📅 {lake.last_measurement}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Göl seçilmemişse History Tab için uyarı */}
        {!selectedLake && activeTab === 'history' && (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: '#64748b'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📈</div>
            <h2 style={{ color: '#1e293b', marginBottom: 12, fontSize: '1.5rem', fontWeight: '600' }}>
              Tarihsel Veri İçin Göl Seçin
            </h2>
            <p style={{ fontSize: '0.95rem', marginBottom: 20, color: '#64748b' }}>
              Bir gölün tarihsel verilerini görmek için ana sayfadan göl seçin
            </p>
          </div>
        )}

        {/* Overview Tab */}
        {selectedLake && activeTab === 'overview' && currentLakeData && (
          <div>
            {/* Header with Lake Name */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                background: `${getClusterColor(currentLakeData.cluster)}08`,
                padding: 20,
                borderRadius: 12,
                border: `2px solid ${getClusterColor(currentLakeData.cluster)}30`
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  background: getClusterColor(currentLakeData.cluster),
                  borderRadius: '50%',
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${getClusterColor(currentLakeData.cluster)}30`
                }}>
                  {getClusterIcon(currentLakeData.cluster)}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h1 style={{ 
                    margin: 0, 
                    color: '#1e293b',
                    fontSize: '1.875rem',
                    fontWeight: '600',
                    letterSpacing: '-0.025em'
                  }}>
                    {getLakeName(selectedLake)}
                  </h1>
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    color: '#64748b',
                    fontSize: '0.95rem'
                  }}>
                    {currentLakeData.interpretation}
                  </p>
                </div>
              </div>
            </div>

            {/* Su Kalitesi Metrikleri */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: 16,
              marginBottom: 32
            }}>
              <div style={{
                background: '#f8fafc',
                padding: 24,
                borderRadius: 12,
                textAlign: 'center',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = CHART_COLORS.ndwi
                e.currentTarget.style.boxShadow = `0 4px 12px ${CHART_COLORS.ndwi}30`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>💧</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '600', color: CHART_COLORS.ndwi, marginBottom: 8 }}>
                  {currentLakeData.ndwi.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500', marginBottom: 4 }}>NDWI</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Su içeriği indeksi
                </div>
              </div>
              
              <div style={{
                background: '#f8fafc',
                padding: 24,
                borderRadius: 12,
                textAlign: 'center',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = CHART_COLORS.wri
                e.currentTarget.style.boxShadow = `0 4px 12px ${CHART_COLORS.wri}30`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌊</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '600', color: CHART_COLORS.wri, marginBottom: 8 }}>
                  {currentLakeData.wri.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500', marginBottom: 4 }}>WRI</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Su oranı indeksi
                </div>
              </div>
              
              <div style={{
                background: '#f8fafc',
                padding: 24,
                borderRadius: 12,
                textAlign: 'center',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = CHART_COLORS.chl_a
                e.currentTarget.style.boxShadow = `0 4px 12px ${CHART_COLORS.chl_a}30`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌿</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '600', color: CHART_COLORS.chl_a, marginBottom: 8 }}>
                  {currentLakeData.chl_a.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500', marginBottom: 4 }}>Chlorophyll-a</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  mg/m³
                </div>
              </div>
              
              <div style={{
                background: '#f8fafc',
                padding: 24,
                borderRadius: 12,
                textAlign: 'center',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = CHART_COLORS.turbidity
                e.currentTarget.style.boxShadow = `0 4px 12px ${CHART_COLORS.turbidity}30`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>☁️</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '600', color: CHART_COLORS.turbidity, marginBottom: 8 }}>
                  {currentLakeData.turbidity.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500', marginBottom: 4 }}>Turbidity</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Bulanıklık (NTU)
                </div>
              </div>
            </div>

            {/* GRAFİK 1: MODERN GRADİENTLİ BAR CHART */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 28,
              marginBottom: 24,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ 
                color: '#1e293b', 
                marginBottom: 24,
                fontSize: '1.25rem',
                fontWeight: '700',
                textAlign: 'center'
              }}>
                📊 Mevcut Su Kalitesi Parametreleri
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={[
                  { name: 'NDWI', value: currentLakeData.ndwi, fill: CHART_COLORS.ndwi },
                  { name: 'WRI', value: currentLakeData.wri, fill: CHART_COLORS.wri },
                  { name: 'Chlorophyll-a', value: currentLakeData.chl_a, fill: CHART_COLORS.chl_a },
                  { name: 'Turbidity', value: currentLakeData.turbidity, fill: CHART_COLORS.turbidity }
                ]} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorNDWI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.ndwi} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.ndwi} stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorWRI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.wri} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.wri} stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorChlA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.chl_a} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.chl_a} stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="colorTurbidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.turbidity} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.turbidity} stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    style={{ fontSize: '0.875rem', fill: '#64748b', fontWeight: '500' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    style={{ fontSize: '0.875rem', fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {[
                      { name: 'NDWI', gradient: 'url(#colorNDWI)' },
                      { name: 'WRI', gradient: 'url(#colorWRI)' },
                      { name: 'Chlorophyll-a', gradient: 'url(#colorChlA)' },
                      { name: 'Turbidity', gradient: 'url(#colorTurbidity)' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gradient} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* GRAFİK 2: POLAR RADAR CHART (İki Görünüm) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: 24,
              marginBottom: 24
            }}>
              {/* Radar Chart */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 28,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ 
                  color: '#1e293b', 
                  marginBottom: 24,
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  textAlign: 'center'
                }}>
                  🎯 Radar - Çok Boyutlu Profil
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={[
                    { subject: 'NDWI', value: Math.abs(currentLakeData.ndwi * 10), fullMark: 100 },
                    { subject: 'WRI', value: Math.min(currentLakeData.wri / 20, 100), fullMark: 100 },
                    { subject: 'Chl-a', value: Math.min(currentLakeData.chl_a / 20, 100), fullMark: 100 },
                    { subject: 'Berraklık', value: Math.max(0, 100 - currentLakeData.turbidity * 100), fullMark: 100 },
                    { subject: 'Güven', value: currentLakeData.confidence * 100, fullMark: 100 }
                  ]}>
                    <PolarGrid stroke="#e2e8f0" strokeWidth={1.5} />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      style={{ fontSize: '0.8125rem', fill: '#64748b', fontWeight: '600' }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]} 
                      style={{ fontSize: '0.7rem', fill: '#94a3b8' }}
                      stroke="#cbd5e1"
                    />
                    <Radar
                      name={getLakeName(selectedLake)}
                      dataKey="value"
                      stroke={getClusterColor(currentLakeData.cluster)}
                      fill={getClusterColor(currentLakeData.cluster)}
                      fillOpacity={0.65}
                      strokeWidth={3}
                      dot={{ fill: getClusterColor(currentLakeData.cluster), r: 5 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Radial Bar Chart (Polar Bar - ECharts tarzı) */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 28,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ 
                  color: '#1e293b', 
                  marginBottom: 24,
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  textAlign: 'center'
                }}>
                  🔄 Radial Bar - Dairesel Çubuk
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="20%" 
                    outerRadius="90%" 
                    barSize={20}
                    data={[
                      { 
                        name: 'NDWI', 
                        value: Math.min(Math.abs(currentLakeData.ndwi * 10), 100), 
                        fill: CHART_COLORS.ndwi,
                        display: currentLakeData.ndwi.toFixed(2)
                      },
                      { 
                        name: 'WRI', 
                        value: Math.min(currentLakeData.wri * 5, 100), 
                        fill: CHART_COLORS.wri,
                        display: currentLakeData.wri.toFixed(2)
                      },
                      { 
                        name: 'Chl-a', 
                        value: Math.min(currentLakeData.chl_a * 3, 100), 
                        fill: CHART_COLORS.chl_a,
                        display: currentLakeData.chl_a.toFixed(2)
                      },
                      { 
                        name: 'Berraklık', 
                        value: Math.max(0, Math.min(100 - currentLakeData.turbidity * 100, 100)), 
                        fill: CHART_COLORS.turbidity,
                        display: (100 - currentLakeData.turbidity * 100).toFixed(1) + '%'
                      }
                    ]}
                    startAngle={90}
                    endAngle={450}
                  >
                    <RadialBar
                      minAngle={15}
                      label={{ 
                        position: 'insideStart', 
                        fill: '#fff',
                        fontWeight: '700',
                        fontSize: 12
                      }}
                      background
                      clockWise
                      dataKey="value"
                    />
                    <Legend 
                      iconSize={10}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: '0.75rem' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      formatter={(value, name, props) => [
                        `${props.payload.display} (Normalize: ${value.toFixed(1)})`,
                        name
                      ]}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Açıklama */}
            <div style={{
              marginBottom: 24,
              padding: 14,
              background: `${getClusterColor(currentLakeData.cluster)}10`,
              border: `1px solid ${getClusterColor(currentLakeData.cluster)}30`,
              borderRadius: 10,
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#1e293b',
              lineHeight: 1.6
            }}>
              <strong style={{ color: getClusterColor(currentLakeData.cluster) }}>Çift Görünüm:</strong> Sol taraf normalleştirilmiş radar, sağ taraf gerçek değerlerle polar bar. 
              Her ikisi de gölün su kalitesi profilini farklı açılardan gösterir.
            </div>

            {/* Cluster Status */}
            <div style={{
              background: `${getClusterColor(currentLakeData.cluster)}08`,
              padding: 24,
              borderRadius: 12,
              border: `2px solid ${getClusterColor(currentLakeData.cluster)}30`,
              marginBottom: 32
            }}>
              <h3 style={{ 
                color: '#1e293b', 
                marginBottom: 16,
                fontSize: '1.125rem',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                📊 Mevcut Cluster Durumu
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 16
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
                    {getClusterIcon(currentLakeData.cluster)}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1e293b' }}>
                    Cluster {currentLakeData.cluster}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1e293b' }}>
                    {(currentLakeData.confidence * 100).toFixed(1)}% Güven
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📅</div>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1e293b' }}>
                    {currentLakeData.last_measurement}
                  </div>
                </div>
              </div>
            </div>

            {/* YILLARA GÖRE ANALİZ - Overview'de */}
            {lakeHistory && lakeHistory.history && lakeHistory.history.length > 0 && (() => {
              // Yıllara göre veri işleme
              const yearlyData = {}
              lakeHistory.history.forEach(record => {
                const year = record.date.split('-')[0]
                if (!yearlyData[year]) {
                  yearlyData[year] = {
                    year,
                    ndwi: [],
                    wri: [],
                    chl_a: [],
                    turbidity: [],
                    clusters: []
                  }
                }
                yearlyData[year].ndwi.push(record.ndwi)
                yearlyData[year].wri.push(record.wri)
                yearlyData[year].chl_a.push(record.chl_a)
                yearlyData[year].turbidity.push(record.turbidity)
                yearlyData[year].clusters.push(record.cluster)
              })

              // Yıllık ortalamaları hesapla
              const yearlyAverages = Object.values(yearlyData).map(yearData => ({
                year: yearData.year,
                ndwi: parseFloat((yearData.ndwi.reduce((a, b) => a + b, 0) / yearData.ndwi.length).toFixed(2)),
                wri: parseFloat((yearData.wri.reduce((a, b) => a + b, 0) / yearData.wri.length).toFixed(2)),
                chl_a: parseFloat((yearData.chl_a.reduce((a, b) => a + b, 0) / yearData.chl_a.length).toFixed(2)),
                turbidity: parseFloat((yearData.turbidity.reduce((a, b) => a + b, 0) / yearData.turbidity.length).toFixed(2)),
                count: yearData.ndwi.length,
                dominantCluster: yearData.clusters.sort((a,b) =>
                  yearData.clusters.filter(v => v===a).length - yearData.clusters.filter(v => v===b).length
                ).pop()
              })).sort((a, b) => a.year - b.year)

              return (
                <>
                  {/* Modern Header Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    borderRadius: 16,
                    padding: 32,
                    marginBottom: 32,
                    boxShadow: '0 8px 24px rgba(30, 41, 59, 0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📅</div>
                    <h2 style={{
                      color: 'white',
                      fontSize: '2rem',
                      fontWeight: '800',
                      marginBottom: 12,
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      letterSpacing: '-0.025em'
                    }}>
                      2018-2024 Yıl Yıl Su Kalitesi Analizi
                    </h2>
                    <p style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '1.125rem',
                      margin: '0 0 20px 0',
                      fontWeight: '500'
                    }}>
                      {yearlyAverages.length} Yıllık Sentinel-2 Uydu Verileri ile Detaylı Analiz
                    </p>
                    <div style={{
                      display: 'inline-flex',
                      gap: 12,
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}>
                      {['📊 Trend Analizi', '🎯 Cluster Değişimi', '📈 Yıllık Ortalamalar'].map((tag, i) => (
                        <div key={i} style={{
                          background: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)',
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: '0.8125rem',
                          color: 'white',
                          fontWeight: '600',
                          border: '1px solid rgba(255,255,255,0.3)'
                        }}>
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Yıllık Özet Kartlar - Modern Cards */}
                  <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 28,
                    marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      color: '#1e293b',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      marginBottom: 24,
                      textAlign: 'center'
                    }}>
                      📅 Yıl Yıl Detaylı Özet Kartlar
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 16
                    }}>
                      {yearlyAverages.map((yearData, idx) => (
                        <div key={idx} style={{
                          background: `linear-gradient(135deg, ${getClusterColor(yearData.dominantCluster)}15, white)`,
                          padding: 20,
                          borderRadius: 14,
                          border: `3px solid ${getClusterColor(yearData.dominantCluster)}`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'
                          e.currentTarget.style.boxShadow = `0 12px 24px ${getClusterColor(yearData.dominantCluster)}40`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}>
                          {/* Yıl Badge */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16
                          }}>
                            <div style={{
                              fontSize: '1.5rem',
                              fontWeight: '800',
                              color: '#1e293b',
                              background: 'white',
                              padding: '6px 12px',
                              borderRadius: 8,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                            }}>
                              {yearData.year}
                            </div>
                            <div style={{
                              fontSize: '2rem',
                              background: getClusterColor(yearData.dominantCluster),
                              borderRadius: '50%',
                              width: 48,
                              height: 48,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 4px 12px ${getClusterColor(yearData.dominantCluster)}50`
                            }}>
                              {getClusterIcon(yearData.dominantCluster)}
                            </div>
                          </div>

                          {/* Parametreler Grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 8,
                            marginBottom: 12
                          }}>
                            <div style={{
                              background: 'white',
                              padding: 10,
                              borderRadius: 8,
                              textAlign: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 3, fontWeight: '600' }}>NDWI</div>
                              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: CHART_COLORS.ndwi }}>
                                {yearData.ndwi}
                              </div>
                            </div>
                            <div style={{
                              background: 'white',
                              padding: 10,
                              borderRadius: 8,
                              textAlign: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 3, fontWeight: '600' }}>Chl-a</div>
                              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: CHART_COLORS.chl_a }}>
                                {yearData.chl_a}
                              </div>
                            </div>
                          </div>

                          {/* Alt Bilgi */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 12,
                            borderTop: `2px solid ${getClusterColor(yearData.dominantCluster)}30`
                          }}>
                            <div style={{
                              fontSize: '0.7rem',
                              color: '#64748b',
                              fontWeight: '500'
                            }}>
                              {yearData.count} ölçüm
                            </div>
                            <div style={{
                              fontSize: '0.65rem',
                              color: getClusterColor(yearData.dominantCluster),
                              fontWeight: '700',
                              background: 'white',
                              padding: '3px 8px',
                              borderRadius: 4
                            }}>
                              C{yearData.dominantCluster}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Yıllık Trend - Modern Area Chart (Nivo tarzı) */}
                  <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 28,
                    marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      color: '#1e293b',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      marginBottom: 24,
                      textAlign: 'center'
                    }}>
                      📈 2018-2024 Yıllık Su Kalitesi Trendi
                    </h3>
                    <ResponsiveContainer width="100%" height={380}>
                      <AreaChart data={yearlyAverages} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="gradientNDWI" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.ndwi} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={CHART_COLORS.ndwi} stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="gradientChlA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.chl_a} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={CHART_COLORS.chl_a} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="year" 
                          style={{ fontSize: '0.875rem', fill: '#64748b', fontWeight: '500' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          style={{ fontSize: '0.875rem', fill: '#64748b' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            padding: '12px'
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 16 }} />
                        <Area
                          type="monotone"
                          dataKey="ndwi"
                          stroke={CHART_COLORS.ndwi}
                          strokeWidth={3}
                          fill="url(#gradientNDWI)"
                          name="NDWI"
                          dot={{ fill: CHART_COLORS.ndwi, r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="chl_a"
                          stroke={CHART_COLORS.chl_a}
                          strokeWidth={3}
                          fill="url(#gradientChlA)"
                          name="Chlorophyll-a"
                          dot={{ fill: CHART_COLORS.chl_a, r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{
                      marginTop: 16,
                      padding: 12,
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: 8,
                      textAlign: 'center',
                      fontSize: '0.8125rem',
                      color: '#1e293b'
                    }}>
                      <strong style={{ color: '#0369a1' }}>Trend Analizi:</strong> Alan grafikleri ile yıllar arası değişimi net görebilirsiniz
                    </div>
                  </div>

                  {/* Yıllık Bar Chart - Tüm Parametreler Karşılaştırma */}
                  <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 28,
                    marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      color: '#1e293b',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      marginBottom: 24,
                      textAlign: 'center'
                    }}>
                      📊 Yıllık Parametre Karşılaştırması
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={yearlyAverages} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="barNDWI" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.ndwi} stopOpacity={0.9}/>
                            <stop offset="100%" stopColor={CHART_COLORS.ndwi} stopOpacity={0.5}/>
                          </linearGradient>
                          <linearGradient id="barWRI" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.wri} stopOpacity={0.9}/>
                            <stop offset="100%" stopColor={CHART_COLORS.wri} stopOpacity={0.5}/>
                          </linearGradient>
                          <linearGradient id="barChlA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.chl_a} stopOpacity={0.9}/>
                            <stop offset="100%" stopColor={CHART_COLORS.chl_a} stopOpacity={0.5}/>
                          </linearGradient>
                          <linearGradient id="barTurb" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.turbidity} stopOpacity={0.9}/>
                            <stop offset="100%" stopColor={CHART_COLORS.turbidity} stopOpacity={0.5}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="year" 
                          style={{ fontSize: '0.875rem', fill: '#64748b', fontWeight: '500' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis 
                          style={{ fontSize: '0.875rem', fill: '#64748b' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            padding: '12px'
                          }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 16 }} />
                        <Bar dataKey="ndwi" fill="url(#barNDWI)" name="NDWI" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="wri" fill="url(#barWRI)" name="WRI" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="chl_a" fill="url(#barChlA)" name="Chlorophyll-a" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="turbidity" fill="url(#barTurb)" name="Turbidity" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* İNTERAKTİF: PIE + LINE CHART KOMBİNASYONU (ECharts tarzı) */}
                  <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 28,
                    marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      color: '#1e293b',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      marginBottom: 24,
                      textAlign: 'center'
                    }}>
                      🔄 İnteraktif Yıllık Cluster Analizi
                    </h3>

                    {(() => {
                      const currentYear = selectedYear || yearlyAverages[yearlyAverages.length - 1]?.year
                      
                      // Seçili yıl için cluster dağılımını hesapla
                      const yearRecords = lakeHistory.history.filter(r => r.date.startsWith(currentYear))
                      const clusterCounts = [0, 1, 2, 3].map(clusterId => {
                        const count = yearRecords.filter(r => r.cluster === clusterId).length
                        return {
                          name: `Cluster ${clusterId}`,
                          value: count,
                          clusterId,
                          percentage: ((count / yearRecords.length) * 100).toFixed(1)
                        }
                      }).filter(item => item.value > 0)

                      const PIE_COLORS = [
                        getClusterColor(0),
                        getClusterColor(1),
                        getClusterColor(2),
                        getClusterColor(3)
                      ]

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                          {/* Sol: Pie Chart */}
                          <div>
                            <h4 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: '#1e293b',
                              textAlign: 'center',
                              marginBottom: 16
                            }}>
                              📊 {currentYear} Yılı Cluster Dağılımı
                            </h4>
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={clusterCounts}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                                  outerRadius={90}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {clusterCounts.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={PIE_COLORS[entry.clusterId]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value, name, props) => [
                                    `${value} ölçüm (${props.payload.percentage}%)`,
                                    name
                                  ]}
                                  contentStyle={{
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 8
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Sağ: Yıl Seçici Kartlar */}
                          <div>
                            <h4 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: '#1e293b',
                              textAlign: 'center',
                              marginBottom: 16
                            }}>
                              📅 Yıl Seçin (Interaktif)
                            </h4>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: 12
                            }}>
                              {yearlyAverages.map((yearData) => (
                                <div
                                  key={yearData.year}
                                  onClick={() => setSelectedYear(yearData.year)}
                                  style={{
                                    background: selectedYear === yearData.year || (!selectedYear && yearData === yearlyAverages[yearlyAverages.length - 1])
                                      ? `linear-gradient(135deg, ${getClusterColor(yearData.dominantCluster)}, ${getClusterColor(yearData.dominantCluster)}cc)`
                                      : '#f8fafc',
                                    padding: 16,
                                    borderRadius: 10,
                                    border: `2px solid ${getClusterColor(yearData.dominantCluster)}`,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: selectedYear === yearData.year ? `0 6px 16px ${getClusterColor(yearData.dominantCluster)}40` : 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (selectedYear !== yearData.year) {
                                      e.currentTarget.style.transform = 'translateY(-2px)'
                                      e.currentTarget.style.boxShadow = `0 4px 12px ${getClusterColor(yearData.dominantCluster)}30`
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (selectedYear !== yearData.year) {
                                      e.currentTarget.style.transform = 'translateY(0)'
                                      e.currentTarget.style.boxShadow = 'none'
                                    }
                                  }}
                                >
                                  <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '800',
                                    color: selectedYear === yearData.year || (!selectedYear && yearData === yearlyAverages[yearlyAverages.length - 1])
                                      ? 'white'
                                      : '#1e293b',
                                    marginBottom: 8
                                  }}>
                                    {yearData.year}
                                  </div>
                                  <div style={{ fontSize: '2rem' }}>
                                    {getClusterIcon(yearData.dominantCluster)}
                                  </div>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: selectedYear === yearData.year || (!selectedYear && yearData === yearlyAverages[yearlyAverages.length - 1])
                                      ? 'rgba(255,255,255,0.9)'
                                      : '#64748b',
                                    marginTop: 6
                                  }}>
                                    {yearData.count} ölçüm
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Açıklama */}
                    <div style={{
                      marginTop: 20,
                      padding: 16,
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      borderRadius: 8,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'start'
                    }}>
                      <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🎯</div>
                      <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.5 }}>
                        <strong style={{ color: '#1e40af' }}>İnteraktif Analiz:</strong> Bir yıla tıklayın, o yılın cluster dağılımı Pie Chart'ta gösterilsin. 
                        Her yılın hangi cluster'lara ait olduğunu yüzdelerle görün.
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* History Tab */}
        {selectedLake && activeTab === 'history' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: 24, textAlign: 'center', fontSize: '1.5rem', fontWeight: '600' }}>
              📈 Tarihsel Veriler - {getLakeName(selectedLake)}
            </h2>
            
            {loading && (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>
                <p style={{ color: '#64748b' }}>Veriler yükleniyor...</p>
              </div>
            )}

            {!loading && lakeHistory && lakeHistory.history && lakeHistory.history.length > 0 && (() => {
              // Yıllara göre veri işleme
              const yearlyData = {}
              lakeHistory.history.forEach(record => {
                const year = record.date.split('-')[0]
                if (!yearlyData[year]) {
                  yearlyData[year] = {
                    year,
                    ndwi: [],
                    wri: [],
                    chl_a: [],
                    turbidity: [],
                    clusters: []
                  }
                }
                yearlyData[year].ndwi.push(record.ndwi)
                yearlyData[year].wri.push(record.wri)
                yearlyData[year].chl_a.push(record.chl_a)
                yearlyData[year].turbidity.push(record.turbidity)
                yearlyData[year].clusters.push(record.cluster)
              })

              // Yıllık ortalamaları hesapla
              const yearlyAverages = Object.values(yearlyData).map(yearData => ({
                year: yearData.year,
                ndwi: (yearData.ndwi.reduce((a, b) => a + b, 0) / yearData.ndwi.length).toFixed(2),
                wri: (yearData.wri.reduce((a, b) => a + b, 0) / yearData.wri.length).toFixed(2),
                chl_a: (yearData.chl_a.reduce((a, b) => a + b, 0) / yearData.chl_a.length).toFixed(2),
                turbidity: (yearData.turbidity.reduce((a, b) => a + b, 0) / yearData.turbidity.length).toFixed(2),
                count: yearData.ndwi.length,
                dominantCluster: yearData.clusters.sort((a,b) =>
                  yearData.clusters.filter(v => v===a).length - yearData.clusters.filter(v => v===b).length
                ).pop()
              })).sort((a, b) => a.year - b.year)

              return (
                <div>
                  <div style={{
                    background: '#f8fafc',
                    padding: 20,
                    borderRadius: 12,
                    marginBottom: 24,
                    textAlign: 'center',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ color: '#1e293b', marginBottom: 4, fontSize: '1rem', fontWeight: '600' }}>
                      Toplam {lakeHistory.total_records} kayıt
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                      {yearlyAverages.length} yıl • {yearlyAverages[0]?.year} - {yearlyAverages[yearlyAverages.length-1]?.year} arası veriler
                    </p>
                  </div>

                  {/* YILLARA GÖRE ANALİZ */}
                  <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ 
                      color: '#1e293b', 
                      marginBottom: 20,
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      📅 Yıllara Göre Su Kalitesi Analizi
                    </h3>

                    {/* Yıllık Özet Kartlar */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                      marginBottom: 32
                    }}>
                      {yearlyAverages.map((yearData, idx) => (
                        <div key={idx} style={{
                          background: `${getClusterColor(yearData.dominantCluster)}08`,
                          padding: 20,
                          borderRadius: 12,
                          border: `2px solid ${getClusterColor(yearData.dominantCluster)}30`,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow = `0 8px 16px ${getClusterColor(yearData.dominantCluster)}30`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16
                          }}>
                            <div style={{
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              color: '#1e293b'
                            }}>
                              {yearData.year}
                            </div>
                            <div style={{ fontSize: '2rem' }}>
                              {getClusterIcon(yearData.dominantCluster)}
                            </div>
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 8,
                            marginBottom: 12
                          }}>
                            <div style={{
                              background: 'white',
                              padding: 8,
                              borderRadius: 6,
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 2 }}>NDWI</div>
                              <div style={{ fontSize: '1rem', fontWeight: '600', color: CHART_COLORS.ndwi }}>
                                {yearData.ndwi}
                              </div>
                            </div>
                            <div style={{
                              background: 'white',
                              padding: 8,
                              borderRadius: 6,
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 2 }}>Chl-a</div>
                              <div style={{ fontSize: '1rem', fontWeight: '600', color: CHART_COLORS.chl_a }}>
                                {yearData.chl_a}
                              </div>
                            </div>
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            textAlign: 'center'
                          }}>
                            {yearData.count} ölçüm
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Yıllık Bar Chart - Tüm Parametreler */}
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ 
                        color: '#1e293b', 
                        marginBottom: 16,
                        fontSize: '1rem',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        📊 Yıllık Ortalama NDWI Değişimi
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={yearlyAverages} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="year" 
                            style={{ fontSize: '0.875rem', fill: '#64748b' }}
                          />
                          <YAxis style={{ fontSize: '0.875rem', fill: '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'white', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: 8 
                            }}
                          />
                          <Legend />
                          <Bar dataKey="ndwi" fill={CHART_COLORS.ndwi} name="NDWI Ortalaması" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Yıllık Çoklu Parametre Grafiği */}
                    <div>
                      <h4 style={{ 
                        color: '#1e293b', 
                        marginBottom: 16,
                        fontSize: '1rem',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        🔬 Yıllık Tüm Parametreler Karşılaştırması
                      </h4>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={yearlyAverages} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="year" 
                            style={{ fontSize: '0.875rem', fill: '#64748b' }}
                          />
                          <YAxis style={{ fontSize: '0.875rem', fill: '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ 
                              background: 'white', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: 8 
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="ndwi" 
                            stroke={CHART_COLORS.ndwi} 
                            strokeWidth={3}
                            dot={{ fill: CHART_COLORS.ndwi, r: 6 }}
                            name="NDWI"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="wri" 
                            stroke={CHART_COLORS.wri} 
                            strokeWidth={3}
                            dot={{ fill: CHART_COLORS.wri, r: 6 }}
                            name="WRI"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="chl_a" 
                            stroke={CHART_COLORS.chl_a} 
                            strokeWidth={3}
                            dot={{ fill: CHART_COLORS.chl_a, r: 6 }}
                            name="Chlorophyll-a"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="turbidity" 
                            stroke={CHART_COLORS.turbidity} 
                            strokeWidth={3}
                            dot={{ fill: CHART_COLORS.turbidity, r: 6 }}
                            name="Turbidity"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Yıllara Göre Cluster Dağılımı */}
                    <div style={{ marginTop: 32 }}>
                      <h4 style={{ 
                        color: '#1e293b', 
                        marginBottom: 16,
                        fontSize: '1rem',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        🎯 Yıllara Göre Baskın Cluster
                      </h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: 12
                      }}>
                        {yearlyAverages.map((yearData, idx) => (
                          <div key={idx} style={{
                            background: 'white',
                            padding: 16,
                            borderRadius: 10,
                            border: `2px solid ${getClusterColor(yearData.dominantCluster)}`,
                            textAlign: 'center'
                          }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#1e293b',
                              marginBottom: 8
                            }}>
                              {yearData.year}
                            </div>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
                              {getClusterIcon(yearData.dominantCluster)}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: getClusterColor(yearData.dominantCluster),
                              fontWeight: '600'
                            }}>
                              Cluster {yearData.dominantCluster}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TARİHSEL TREND GRAFİKLERİ */}
                  <div style={{
                    display: 'grid',
                    gap: 24,
                    marginBottom: 24
                  }}>
                  {/* Line Chart - NDWI & WRI Trendleri */}
                  <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ 
                      color: '#1e293b', 
                      marginBottom: 20,
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      💧 NDWI ve WRI Tarihsel Trendi
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart 
                        data={lakeHistory.history.slice().reverse()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          style={{ fontSize: '0.75rem', fill: '#64748b' }}
                        />
                        <YAxis style={{ fontSize: '0.875rem', fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: 8 
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 20 }} />
                        <Line 
                          type="monotone" 
                          dataKey="ndwi" 
                          stroke={CHART_COLORS.ndwi} 
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.ndwi, r: 4 }}
                          name="NDWI"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="wri" 
                          stroke={CHART_COLORS.wri} 
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.wri, r: 4 }}
                          name="WRI"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Line Chart - Chlorophyll-a & Turbidity Trendleri */}
                  <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ 
                      color: '#1e293b', 
                      marginBottom: 20,
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      🌿 Chlorophyll-a ve Bulanıklık Trendi
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart 
                        data={lakeHistory.history.slice().reverse()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          style={{ fontSize: '0.75rem', fill: '#64748b' }}
                        />
                        <YAxis style={{ fontSize: '0.875rem', fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: 8 
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 20 }} />
                        <Line 
                          type="monotone" 
                          dataKey="chl_a" 
                          stroke={CHART_COLORS.chl_a} 
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.chl_a, r: 4 }}
                          name="Chlorophyll-a"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="turbidity" 
                          stroke={CHART_COLORS.turbidity} 
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.turbidity, r: 4 }}
                          name="Turbidity"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cluster Dağılımı - Zaman İçinde */}
                  <div style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ 
                      color: '#1e293b', 
                      marginBottom: 20,
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      📊 Zaman İçinde Cluster Değişimi
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: 12,
                      marginBottom: 16
                    }}>
                      {[0, 1, 2, 3].map(clusterId => {
                        const count = lakeHistory.history.filter(r => r.cluster === clusterId).length
                        const percentage = ((count / lakeHistory.history.length) * 100).toFixed(1)
                        return (
                          <div
                            key={clusterId}
                            style={{
                              background: `${getClusterColor(clusterId)}08`,
                              border: `2px solid ${getClusterColor(clusterId)}30`,
                              borderRadius: 12,
                              padding: 16,
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                              {getClusterIcon(clusterId)}
                            </div>
                            <div style={{
                              fontSize: '1.5rem',
                              fontWeight: '600',
                              color: getClusterColor(clusterId),
                              marginBottom: 4
                            }}>
                              {count}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {percentage}% kayıt
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Detaylı Kayıt Listesi */}
                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ 
                    color: '#1e293b', 
                    marginBottom: 16,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    📋 Detaylı Ölçüm Kayıtları (Son 150 Kayıt)
                  </h3>
                  <div style={{ 
                    maxHeight: '600px', 
                    overflowY: 'auto',
                    display: 'grid',
                    gap: 12
                  }}>
                    {lakeHistory.history.slice(-150).reverse().map((record, idx) => (
                      <div key={idx} style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 80px',
                        gap: 16,
                        padding: 16,
                        background: '#f8fafc',
                        borderRadius: 10,
                        borderLeft: `4px solid ${getClusterColor(record.cluster)}`,
                        alignItems: 'center',
                        border: '1px solid #e2e8f0',
                        borderLeftWidth: '4px'
                      }}>
                        <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.875rem' }}>
                          {record.date}
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                            NDWI: <strong style={{ color: CHART_COLORS.ndwi }}>{record.ndwi.toFixed(2)}</strong>
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                            WRI: <strong style={{ color: CHART_COLORS.wri }}>{record.wri.toFixed(2)}</strong>
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                            Chl-a: <strong style={{ color: CHART_COLORS.chl_a }}>{record.chl_a.toFixed(2)}</strong>
                          </span>
                          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                            Turb: <strong style={{ color: CHART_COLORS.turbidity }}>{record.turbidity.toFixed(2)}</strong>
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '1.5rem' }}>{getClusterIcon(record.cluster)}</span>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>C{record.cluster}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )})()}
          </div>
        )}

        {/* Analytics Tab - Genel Karşılaştırma */}
        {activeTab === 'analytics' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: 24, textAlign: 'center', fontSize: '1.5rem', fontWeight: '600' }}>
              🔬 Tüm Göller - Su Kalitesi Durumu
            </h2>

            {/* Cluster Dağılım Özeti */}
            {lakes.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                marginBottom: 32
              }}>
                {[0, 1, 2, 3].map(clusterId => {
                  const clusterLakes = lakes.filter(lake => lake.cluster === clusterId);
                  return (
                    <div
                      key={clusterId}
                      style={{
                        background: `${getClusterColor(clusterId)}08`,
                        border: `2px solid ${getClusterColor(clusterId)}30`,
                        borderRadius: 12,
                        padding: 16,
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                        e.currentTarget.style.boxShadow = `0 4px 12px ${getClusterColor(clusterId)}20`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{
                        fontSize: '2.5rem',
                        marginBottom: 8
                      }}>
                        {getClusterIcon(clusterId)}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1e293b',
                        marginBottom: 4
                      }}>
                        Cluster {clusterId}
                      </div>
                      <div style={{
                        fontSize: '1.75rem',
                        fontWeight: '600',
                        color: getClusterColor(clusterId),
                        marginBottom: 4
                      }}>
                        {clusterLakes.length}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b'
                      }}>
                        {clusterLakes.length === 0 ? 'göl yok' : 
                         clusterLakes.length === 1 ? 'göl' : 'göl'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Kart Görünümü - Her Göl İçin */}
            {lakes.length > 0 && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: 25,
                  marginBottom: 50
                }}>
                  {lakes.map((lake, index) => (
                    <div
                      key={index}
                      style={{
                        background: `linear-gradient(135deg, ${getClusterColor(lake.cluster)}10, ${getClusterColor(lake.cluster)}05)`,
                        borderRadius: 20,
                        padding: 30,
                        border: `3px solid ${getClusterColor(lake.cluster)}`,
                        boxShadow: `0 10px 30px ${getClusterColor(lake.cluster)}20`,
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)'
                        e.currentTarget.style.boxShadow = `0 15px 40px ${getClusterColor(lake.cluster)}40`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = `0 10px 30px ${getClusterColor(lake.cluster)}20`
                      }}
                    >
                      {/* Göl Başlığı */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                        paddingBottom: 15,
                        borderBottom: `2px solid ${getClusterColor(lake.cluster)}30`
                      }}>
                        <h3 style={{
                          margin: 0,
                          color: '#2c3e50',
                          fontSize: '1.5rem',
                          fontWeight: '700'
                        }}>
                          {lake.lake_name}
                        </h3>
                        <div style={{
                          fontSize: '2.5rem',
                          background: `linear-gradient(45deg, ${getClusterColor(lake.cluster)}, ${getClusterColor(lake.cluster)}80)`,
                          borderRadius: '50%',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 5px 15px ${getClusterColor(lake.cluster)}50`
                        }}>
                          {getClusterIcon(lake.cluster)}
                        </div>
                      </div>

                      {/* Cluster Bilgisi */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        padding: 15,
                        borderRadius: 12,
                        marginBottom: 20,
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#6c757d',
                          marginBottom: 5,
                          fontWeight: '600'
                        }}>
                          Su Kalitesi Durumu
                        </div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          color: getClusterColor(lake.cluster),
                          marginBottom: 5
                        }}>
                          {lake.interpretation}
                        </div>
                        <div style={{
                          fontSize: '0.85rem',
                          color: '#9ca3af'
                        }}>
                          Cluster {lake.cluster} • {(lake.confidence * 100).toFixed(1)}% güven
                        </div>
                      </div>

                      {/* Metrikler Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12
                      }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          padding: 15,
                          borderRadius: 10,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: 5 }}>NDWI</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2c3e50' }}>
                            {lake.ndwi.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Su içeriği</div>
                        </div>

                        <div style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          padding: 15,
                          borderRadius: 10,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: 5 }}>WRI</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2c3e50' }}>
                            {lake.wri.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Su oranı</div>
                        </div>

                        <div style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          padding: 15,
                          borderRadius: 10,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: 5 }}>Chl-a</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2c3e50' }}>
                            {lake.chl_a.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>mg/m³</div>
                        </div>

                        <div style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          padding: 15,
                          borderRadius: 10,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: 5 }}>Turbidity</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2c3e50' }}>
                            {lake.turbidity.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>NTU</div>
                        </div>
                      </div>

                      {/* Son Ölçüm */}
                      {lake.last_measurement && (
                        <div style={{
                          marginTop: 15,
                          textAlign: 'center',
                          fontSize: '0.8rem',
                          color: '#6c757d',
                          fontStyle: 'italic'
                        }}>
                          📅 Son ölçüm: {lake.last_measurement}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Özet Tablo */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  padding: 25,
                  borderRadius: 15,
                  marginBottom: 30
                }}>
                  <h3 style={{
                    color: '#2c3e50',
                    marginBottom: 20,
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700'
                  }}>
                    📊 Özet Tablo - Tüm Göller
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      background: 'white',
                      borderRadius: 15,
                      overflow: 'hidden'
                    }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(45deg, #667eea, #764ba2)' }}>
                          <th style={{ padding: 15, color: 'white', textAlign: 'left', fontSize: '1rem' }}>Göl</th>
                          <th style={{ padding: 15, color: 'white', textAlign: 'center' }}>Cluster</th>
                          <th style={{ padding: 15, color: 'white', textAlign: 'center' }}>NDWI</th>
                          <th style={{ padding: 15, color: 'white', textAlign: 'center' }}>WRI</th>
                          <th style={{ padding: 15, color: 'white', textAlign: 'center' }}>Chl-a</th>
                          <th style={{ padding: 15, color: 'white', textAlign: 'center' }}>Turbidity</th>
                          <th style={{ padding: 15, color: 'white', textAlign: 'center' }}>Güven</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lakes.map((lake, index) => (
                          <tr 
                            key={index}
                            style={{
                              background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(248, 249, 250, 0.8)',
                              borderBottom: '1px solid #e9ecef'
                            }}
                          >
                            <td style={{ padding: 15, fontWeight: '600', color: '#2c3e50' }}>
                              {lake.lake_name}
                            </td>
                            <td style={{ padding: 15, textAlign: 'center' }}>
                              <span style={{
                                background: `linear-gradient(45deg, ${getClusterColor(lake.cluster)}, ${getClusterColor(lake.cluster)}cc)`,
                                padding: '6px 15px',
                                borderRadius: 20,
                                color: 'white',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.9rem'
                              }}>
                                {getClusterIcon(lake.cluster)} {lake.cluster}
                              </span>
                            </td>
                            <td style={{ padding: 15, textAlign: 'center', color: '#495057' }}>
                              {lake.ndwi.toFixed(2)}
                            </td>
                            <td style={{ padding: 15, textAlign: 'center', color: '#495057' }}>
                              {lake.wri.toFixed(2)}
                            </td>
                            <td style={{ padding: 15, textAlign: 'center', color: '#495057' }}>
                              {lake.chl_a.toFixed(2)}
                            </td>
                            <td style={{ padding: 15, textAlign: 'center', color: '#495057' }}>
                              {lake.turbidity.toFixed(2)}
                            </td>
                            <td style={{ padding: 15, textAlign: 'center', color: '#495057' }}>
                              {(lake.confidence * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Cluster Bilgileri */}
            {clusters.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h3 style={{ 
                  color: '#1e293b', 
                  marginBottom: 20,
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  📊 Cluster Açıklamaları
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                  gap: 16 
                }}>
                  {clusters.map((cluster, index) => (
                    <div
                      key={index}
                      style={{
                        background: `${getClusterColor(cluster.id)}08`,
                        padding: 20,
                        borderRadius: 12,
                        border: `2px solid ${getClusterColor(cluster.id)}30`,
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
                        {getClusterIcon(cluster.id)}
                      </div>
                      <h4 style={{ 
                        color: '#1e293b', 
                        marginBottom: 12,
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}>
                        {cluster.name}
                      </h4>
                      <p style={{ 
                        fontSize: '0.8125rem', 
                        color: '#64748b', 
                        marginBottom: 12,
                        lineHeight: '1.5'
                      }}>
                        {cluster.description}
                      </p>
                      <div style={{ 
                        fontSize: '0.9375rem',
                        fontWeight: '500',
                        color: getClusterColor(cluster.id)
                      }}>
                        {cluster.percentage}% Dağılım
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Predict Tab - Manuel Tahmin */}
        {activeTab === 'predict' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ 
                color: '#1e293b', 
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: 8
              }}>
                🔮 Su Kalitesi Tahmini
              </h2>
              <p style={{ 
                color: '#64748b', 
                fontSize: '0.95rem',
                maxWidth: '560px',
                margin: '0 auto'
              }}>
                Satellit verilerinden su kalitesi parametrelerini girerek gerçek zamanlı tahmin alın
              </p>
            </div>

            <form onSubmit={handlePredict}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: 16,
                marginBottom: 24
              }}>
                {[
                  {
                    name: 'ndwi_mean',
                    label: 'NDWI',
                    placeholder: '5.26',
                    description: 'Su içeriği indeksi'
                  },
                  {
                    name: 'wri_mean',
                    label: 'WRI',
                    placeholder: '1206.05',
                    description: 'Su oranı indeksi'
                  },
                  {
                    name: 'chl_a_mean',
                    label: 'Chlorophyll-a',
                    placeholder: '1212.66',
                    description: 'Klorofil-a (mg/m³)'
                  },
                  {
                    name: 'turbidity_mean',
                    label: 'Turbidity',
                    placeholder: '0.54',
                    description: 'Bulanıklık (NTU)'
                  }
                ].map(field => (
                  <div key={field.name} style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid #e2e8f0'
                  }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: 6, 
                      fontWeight: '500', 
                      color: '#1e293b',
                      fontSize: '0.875rem'
                    }}>
                      {field.label}
                    </label>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      marginBottom: 8,
                      margin: '0 0 8px 0'
                    }}>
                      {field.description}
                    </p>
                    <input
                      type="number"
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      placeholder={field.placeholder}
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        background: 'white',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        color: '#1e293b'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6'
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0'
                        e.target.style.boxShadow = 'none'
                      }}
                      required
                    />
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? '#94a3b8' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: 8,
                    fontSize: '0.9375rem',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: loading ? 'none' : '0 1px 3px rgba(0,0,0,0.12)',
                    minWidth: '180px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = '#2563eb'
                      e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.background = '#3b82f6'
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  {loading ? '⏳ Tahmin Yapılıyor...' : '🔮 Tahmin Et'}
                </button>
              </div>
            </form>

            {/* Prediction Result */}
            {prediction && (
              <div style={{
                marginTop: 32,
                padding: 24,
                background: `${getClusterColor(prediction.cluster)}08`,
                borderRadius: 12,
                border: `2px solid ${getClusterColor(prediction.cluster)}30`
              }}>
                <h3 style={{ 
                  color: '#1e293b', 
                  marginBottom: 20, 
                  textAlign: 'center',
                  fontSize: '1.125rem',
                  fontWeight: '600'
                }}>
                  🎯 Tahmin Sonucu
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 16 
                }}>
                  <div style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 10,
                    textAlign: 'center',
                    border: `1px solid ${getClusterColor(prediction.cluster)}30`
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                      {getClusterIcon(prediction.cluster)}
                    </div>
                    <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.875rem' }}>
                      Cluster {prediction.cluster}
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 10,
                    textAlign: 'center',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
                    <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.875rem' }}>
                      {(prediction.confidence * 100).toFixed(1)}% Güven
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 10,
                    gridColumn: '1 / -1',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: 8, fontSize: '0.875rem' }}>
                      📝 Yorum:
                    </div>
                    <div style={{ color: '#64748b', lineHeight: '1.5', fontSize: '0.875rem' }}>
                      {prediction.interpretation}
                    </div>
                    {prediction.similar_lakes && prediction.similar_lakes.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: 4, fontSize: '0.875rem' }}>
                          🏞️ Benzer Göller:
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                          {prediction.similar_lakes.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div style={{
                marginTop: 24,
                padding: 16,
                background: '#fef2f2',
                color: '#991b1b',
                borderRadius: 12,
                border: '1px solid #fecaca',
                textAlign: 'center',
                fontSize: '0.875rem'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⚠️</div>
                <strong>Hata:</strong> {error}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

