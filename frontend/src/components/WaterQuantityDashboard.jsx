"""
Su Miktarı Dashboard - Gelişmiş Görselleştirme
Normalize edilmiş metrikler ve interaktif grafikler
"""

import { useState, useEffect, useMemo } from 'react'
import { Line, Bar, Scatter, Doughnut } from 'react-chartjs-2'

const API_BASE = 'http://localhost:5000'

export default function WaterQuantityDashboard({ selectedLake, yearRange }) {
  const [forecastData, setForecastData] = useState(null)
  const [metricsData, setMetricsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('overview') // overview, detailed, comparison

  // Veri yükleme
  useEffect(() => {
    if (!selectedLake) return
    
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/api/forecast?lake_id=${selectedLake}`).then(r => r.json()),
      fetch(`${API_BASE}/api/analytics/model-performance?lake_id=${selectedLake}`).then(r => r.json())
    ])
    .then(([forecast, metrics]) => {
      setForecastData(forecast)
      setMetricsData(metrics)
      setLoading(false)
    })
    .catch(err => {
      console.error('Veri yükleme hatası:', err)
      setLoading(false)
    })
  }, [selectedLake])

  // 1. Ana Zaman Serisi Grafiği
  const mainTimeSeriesData = useMemo(() => {
    if (!forecastData) return null

    const years = forecastData.years || []
    const actual = forecastData.actual || []
    const predicted = forecastData.predicted || []

    return {
      labels: years,
      datasets: [
        {
          label: 'Gerçek Değerler',
          data: actual.map(v => v ? v / 1_000_000 : null),
          borderColor: '#1e40af',
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          pointBackgroundColor: '#1e40af',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          borderWidth: 3,
          tension: 0.3,
          fill: false,
        },
        {
          label: 'Model Tahminleri',
          data: predicted.map(v => v ? v / 1_000_000 : null),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          borderWidth: 3,
          tension: 0.3,
          fill: false,
        }
      ]
    }
  }, [forecastData])

  // 2. Gelecek Tahmin Kartları
  const futurePredictions = useMemo(() => {
    if (!forecastData?.predictions_3months) return []

    return forecastData.predictions_3months.map((value, index) => ({
      month: index + 1,
      value: value ? value / 1_000_000 : null,
      change: index > 0 ? 
        ((value - forecastData.predictions_3months[index-1]) / forecastData.predictions_3months[index-1]) * 100 : 0
    }))
  }, [forecastData])

  // 3. Model Performans Metrikleri
  const performanceMetrics = useMemo(() => {
    if (!metricsData?.metrics) return null

    const metrics = metricsData.metrics
    return {
      successRate: metrics.Success_Rate || 0,
      mape: metrics.MAPE || 0,
      wmape: metrics.WMAPE || 0,
      r2: metrics.R2 || 0,
      sampleCount: metrics.sample_count || 0
    }
  }, [metricsData])

  // 4. Göl Karşılaştırma Verisi
  const [comparisonData, setComparisonData] = useState(null)
  
  useEffect(() => {
    fetch(`${API_BASE}/api/analytics/compare-lakes`)
      .then(r => r.json())
      .then(data => setComparisonData(data))
      .catch(err => console.error('Karşılaştırma verisi hatası:', err))
  }, [])

  // 5. Performans Doughnut Grafiği
  const performanceDoughnutData = useMemo(() => {
    if (!performanceMetrics) return null

    const successRate = performanceMetrics.successRate
    const errorRate = 100 - successRate

    return {
      labels: ['Başarılı Tahminler', 'Hatalı Tahminler'],
      datasets: [{
        data: [successRate, errorRate],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#059669', '#dc2626'],
        borderWidth: 2,
        hoverOffset: 4
      }]
    }
  }, [performanceMetrics])

  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '15px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
      }}>
        <div style={{ fontSize: '1.2rem', color: '#6b7280' }}>
          📊 Su miktarı verileri yükleniyor...
        </div>
      </div>
    )
  }

  return (
    <div className="water-quantity-dashboard">
      {/* Başlık ve Kontroller */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#1f2937' }}>
          📊 Su Miktarı Analiz Dashboard
        </h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setViewMode('overview')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: viewMode === 'overview' ? '#1e40af' : '#ffffff',
              color: viewMode === 'overview' ? '#ffffff' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Genel Bakış
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: viewMode === 'detailed' ? '#1e40af' : '#ffffff',
              color: viewMode === 'detailed' ? '#ffffff' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Detaylı Analiz
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: viewMode === 'comparison' ? '#1e40af' : '#ffffff',
              color: viewMode === 'comparison' ? '#ffffff' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Göl Karşılaştırma
          </button>
        </div>
      </div>

      {/* Genel Bakış Modu */}
      {viewMode === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Ana Zaman Serisi */}
          <div style={{
            background: '#ffffff',
            borderRadius: '15px',
            padding: '25px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
              📈 Su Alanı Zaman Serisi (km²)
            </h3>
            {mainTimeSeriesData && (
              <div style={{ height: '400px' }}>
                <Line
                  data={mainTimeSeriesData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                          font: { size: 13, weight: '600' }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#374151',
                        borderColor: '#d1d5db',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: 15
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Yıl',
                          font: { size: 14, weight: '600' }
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Su Alanı (km²)',
                          font: { size: 14, weight: '600' }
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Performans Metrikleri */}
          <div style={{
            background: '#ffffff',
            borderRadius: '15px',
            padding: '25px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
              🎯 Model Performansı
            </h3>
            
            {performanceMetrics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{
                  padding: '15px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {performanceMetrics.successRate.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    Başarı Oranı
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{
                    padding: '12px',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {performanceMetrics.mape.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>MAPE</div>
                  </div>
                  
                  <div style={{
                    padding: '12px',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {performanceMetrics.r2.toFixed(3)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>R²</div>
                  </div>
                </div>

                {performanceDoughnutData && (
                  <div style={{ height: '200px' }}>
                    <Doughnut
                      data={performanceDoughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              padding: 15,
                              font: { size: 12 }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gelecek Tahmin Kartları */}
      {forecastData?.predictions_3months && (
        <div style={{
          background: '#ffffff',
          borderRadius: '15px',
          padding: '25px',
          marginTop: '20px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
            🔮 Gelecek 3 Ay Tahminleri
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            {futurePredictions.map((pred, index) => (
              <div
                key={index}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#ffffff',
                  borderRadius: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-5px) scale(1.05)'
                  e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)'
                  e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}
              >
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '5px' }}>
                  {pred.month}. Ay
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {pred.value ? pred.value.toFixed(1) : '--'}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  km²
                </div>
                {index > 0 && (
                  <div style={{
                    fontSize: '0.7rem',
                    marginTop: '5px',
                    color: pred.change > 0 ? '#10b981' : '#ef4444'
                  }}>
                    {pred.change > 0 ? '+' : ''}{pred.change.toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Göl Karşılaştırma Modu */}
      {viewMode === 'comparison' && comparisonData && (
        <div style={{
          background: '#ffffff',
          borderRadius: '15px',
          padding: '25px',
          marginTop: '20px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
            🏞️ Göl Performans Karşılaştırması
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            {comparisonData.comparisons?.map((lake, index) => (
              <div
                key={index}
                style={{
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)'
                  e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#1f2937' }}>
                  {lake.lake_name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '15px' }}>
                  {lake.lake_area_km2} km²
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Başarı:</span>
                  <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    {lake.metrics?.Success_Rate?.toFixed(1) || '--'}%
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>WMAPE:</span>
                  <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    {lake.metrics?.WMAPE?.toFixed(1) || '--'}%
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Veri:</span>
                  <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    {lake.data_points} kayıt
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
