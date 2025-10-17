import { useState, useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import 'echarts-gl'

// API Base URL
const API_BASE = 'http://127.0.0.1:5000'

const CLUSTER_COLORS = {
  0: '#10b981',
  1: '#ef4444',
  2: '#f59e0b',
  3: '#3b82f6'
}

// Her göl için farklı renk
const LAKE_COLORS = {
  'Van Gölü': '#ef4444',
  'Tuz Gölü': '#f59e0b',
  'Eğirdir Gölü': '#10b981',
  'Burdur Gölü': '#8b5cf6',
  'Sapanca Gölü': '#3b82f6',
  'Salda Gölü': '#06b6d4',
  'Ulubat Gölü': '#ec4899'
}

const CLUSTER_NAMES = {
  0: 'Normal Su Kalitesi',
  1: 'Alg Patlaması Riski',
  2: 'Tuzlu Su',
  3: 'Özel Coğrafi Durum'
}

export default function GeneralWaterQualityAnalysis() {
  const [matrixData, setMatrixData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scatter3DData, setScatter3DData] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const pieChartRef = useRef(null)
  const pieChartInstance = useRef(null)
  const [config, setConfig] = useState({
    xAxis3D: 'ndwi',
    yAxis3D: 'wri',
    zAxis3D: 'chl_a',
    color: 'turbidity',
    symbolSize: 'measurements'
  })

  const parameters = [
    { key: 'ndwi', label: 'NDWI' },
    { key: 'wri', label: 'WRI' },
    { key: 'chl_a', label: 'Chlorophyll-a' },
    { key: 'turbidity', label: 'Turbidity' },
    { key: 'measurements', label: 'Ölçüm Sayısı' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📥 Veri çekiliyor...')
        
        // 1. Matrix data (Pie chart için - 49 kayıt)
        const matrixResponse = await fetch(`${API_BASE}/api/quality/matrix-analysis`)
        const matrixResult = await matrixResponse.json()
        
        // 2. TÜM ham veriler (3D için - 2,775 kayıt)
        const allDataResponse = await fetch(`${API_BASE}/api/quality/all-data`)
        const allDataResult = await allDataResponse.json()
        
        console.log('✅ Matrix:', matrixResult.matrix_data?.length, 'kayıt')
        console.log('✅ Ham Veri:', allDataResult.total_records, 'kayıt')
        
        if (matrixResult.status === 'success') {
          setMatrixData(matrixResult)
          setSelectedYear(matrixResult.years[matrixResult.years.length - 1])
        }
        
        if (allDataResult.status === 'success') {
          // 3D için TÜM 2,775 kaydı kullan
          const formatted = allDataResult.data.map(item => ({
            lake: item.lake,
            date: item.date,
            year: item.year,
            cluster: item.cluster || 0,
            measurements: 1,
            ndwi: parseFloat(item.ndwi) || 0,
            wri: parseFloat(item.wri) || 0,
            chl_a: parseFloat(item.chl_a) || 0,
            turbidity: parseFloat(item.turbidity) || 0.001
          }))
          setScatter3DData(formatted)
          console.log('✅ 3D için hazır:', formatted.length, 'nokta')
        }
      } catch (error) {
        console.error('❌ Veri hatası:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 3D Chart - Initialize once
  useEffect(() => {
    if (!chartRef.current || scatter3DData.length === 0) return
    
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'light')
    }
    
    updateChart()

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scatter3DData, config])

  // Pie Chart - Initialize once  
  useEffect(() => {
    if (!pieChartRef.current || !matrixData) return
    
    if (!pieChartInstance.current) {
      pieChartInstance.current = echarts.init(pieChartRef.current, 'light')
    }

    const handleResize = () => pieChartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [matrixData])

  // selectedYear değişince pie chart güncelle
  useEffect(() => {
    if (pieChartInstance.current && matrixData && selectedYear) {
      updatePieChart()
    }
  }, [selectedYear])

  // Cleanup - Only on component unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
      if (pieChartInstance.current) {
        pieChartInstance.current.dispose()
        pieChartInstance.current = null
      }
    }
  }, [])

  const updateChart = () => {
    if (!chartInstance.current) return
    
    const maxValues = {
      color: Math.max(...scatter3DData.map(d => d[config.color] || 0)),
      symbolSize: Math.max(...scatter3DData.map(d => d[config.symbolSize] || 0))
    }

    const seriesData = scatter3DData.map((item, idx) => [
      item[config.xAxis3D],
      item[config.yAxis3D],
      item[config.zAxis3D],
      item[config.color],
      item[config.symbolSize],
      idx
    ])

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params) => {
          const idx = params.data[5]
          const d = scatter3DData[idx]
          const lakeColor = LAKE_COLORS[d.lake] || '#888'
          return `
            <div style="padding: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${lakeColor};"></div>
                <strong style="color: ${lakeColor}; font-size: 15px;">${d.lake}</strong>
              </div>
              <span style="color: #999; font-size: 13px;">📅 ${d.year} • ${CLUSTER_NAMES[d.cluster]}</span>
              <hr style="margin: 10px 0; border: none; border-top: 1px solid #e2e8f0;"/>
              <div style="font-size: 13px; line-height: 1.8;">
                <strong>${parameters.find(p => p.key === config.xAxis3D)?.label}:</strong> ${d[config.xAxis3D].toFixed(3)}<br/>
                <strong>${parameters.find(p => p.key === config.yAxis3D)?.label}:</strong> ${d[config.yAxis3D].toFixed(3)}<br/>
                <strong>${parameters.find(p => p.key === config.zAxis3D)?.label}:</strong> ${d[config.zAxis3D].toFixed(3)}<br/>
                <strong>${parameters.find(p => p.key === config.color)?.label}:</strong> ${d[config.color].toFixed(3)}<br/>
                <strong>${parameters.find(p => p.key === config.symbolSize)?.label}:</strong> ${d[config.symbolSize]}
              </div>
            </div>
          `
        },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#1e293b' },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
      },
      visualMap: [
        {
          show: true,
          top: 10,
          left: 10,
          calculable: true,
          dimension: 3,
          max: maxValues.color,
          inRange: {
            color: ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
          },
          textStyle: { color: '#64748b', fontSize: 11 },
          text: ['Yüksek', 'Düşük'],
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          borderRadius: 8
        },
        {
          show: true,
          bottom: 10,
          left: 10,
          calculable: true,
          dimension: 4,
          max: maxValues.symbolSize,
          inRange: {
            symbolSize: [10, 35]
          },
          textStyle: { color: '#64748b', fontSize: 11 },
          text: ['Çok', 'Az'],
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          borderRadius: 8
        }
      ],
      xAxis3D: {
        name: parameters.find(p => p.key === config.xAxis3D)?.label,
        type: 'value',
        nameTextStyle: { fontSize: 14, fontWeight: 'bold', color: '#000000' },
        axisLine: { lineStyle: { color: '#000000', width: 2.5 } },
        axisLabel: { color: '#1e293b', fontSize: 11, fontWeight: '600' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)', width: 1 } }
      },
      yAxis3D: {
        name: parameters.find(p => p.key === config.yAxis3D)?.label,
        type: 'value',
        nameTextStyle: { fontSize: 14, fontWeight: 'bold', color: '#000000' },
        axisLine: { lineStyle: { color: '#000000', width: 2.5 } },
        axisLabel: { color: '#1e293b', fontSize: 11, fontWeight: '600' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)', width: 1 } }
      },
      zAxis3D: {
        name: parameters.find(p => p.key === config.zAxis3D)?.label,
        type: 'value',
        nameTextStyle: { fontSize: 14, fontWeight: 'bold', color: '#000000' },
        axisLine: { lineStyle: { color: '#000000', width: 2.5 } },
        axisLabel: { color: '#1e293b', fontSize: 11, fontWeight: '600' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.1)', width: 1 } }
      },
      grid3D: {
        boxWidth: 120,
        boxDepth: 100,
        boxHeight: 80,
        environment: '#ffffff',
        axisLine: { 
          lineStyle: { 
            color: '#000000',
            width: 2.5
          } 
        },
        axisPointer: { 
          lineStyle: { 
            color: '#000000',
            width: 3
          } 
        },
        splitLine: { 
          show: true,
          lineStyle: { 
            color: 'rgba(0, 0, 0, 0.08)',
            width: 1
          }
        },
        viewControl: {
          autoRotate: true,
          autoRotateSpeed: 10,
          distance: 220,
          minDistance: 120,
          maxDistance: 400,
          rotateSensitivity: 1,
          zoomSensitivity: 1
        },
        light: {
          main: { 
            intensity: 1.8,
            shadow: true,
            shadowQuality: 'high',
            alpha: 30,
            beta: 40
          },
          ambient: { 
            intensity: 0.9
          }
        },
        postEffect: {
          enable: true,
          bloom: {
            enable: true,
            bloomIntensity: 0.1
          },
          SSAO: { 
            enable: true, 
            radius: 4, 
            intensity: 2,
            quality: 'high'
          },
          colorCorrection: {
            enable: true,
            exposure: 0,
            brightness: 0.1,
            contrast: 1.2,
            saturation: 1.3
          }
        }
      },
      series: [{
        type: 'scatter3D',
        dimensions: [
          config.xAxis3D,
          config.yAxis3D,
          config.zAxis3D,
          config.color,
          config.symbolSize
        ],
        data: seriesData,
        symbolSize: 15,
        itemStyle: {
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.9)',
          opacity: 0.95,
          color: (params) => {
            const idx = params.data[5]
            const item = scatter3DData[idx]
            return LAKE_COLORS[item.lake] || '#888'
          }
        },
        emphasis: {
          itemStyle: {
            borderWidth: 3,
            borderColor: '#fff',
            opacity: 1,
            shadowBlur: 15,
            shadowColor: 'rgba(0,0,0,0.4)'
          }
        }
      }]
    })
  }

  const updatePieChart = () => {
    if (!pieChartInstance.current || !matrixData || !selectedYear) return

    // Seçili yıl için veriyi filtrele
    const yearData = matrixData.matrix_data.filter(d => d.year === selectedYear)
    
    // Göl başına cluster sayısını hesapla
    const lakeClusterCounts = {}
    yearData.forEach(d => {
      if (!lakeClusterCounts[d.lake]) {
        lakeClusterCounts[d.lake] = {}
      }
      lakeClusterCounts[d.lake][d.cluster] = (lakeClusterCounts[d.lake][d.cluster] || 0) + 1
    })

    // Pie chart için data hazırla
    const pieData = Object.entries(lakeClusterCounts).map(([lake, clusters]) => {
      // En çok olan cluster'ı bul
      const dominantCluster = Object.entries(clusters).reduce((a, b) => 
        clusters[a[0]] > clusters[b[0]] ? a : b
      )[0]
      
      return {
        name: lake,
        value: Object.values(clusters).reduce((sum, count) => sum + count, 0),
        itemStyle: {
          color: LAKE_COLORS[lake] || '#888'
        },
        cluster: parseInt(dominantCluster)
      }
    })

    pieChartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: selectedYear.toString(),
        left: 'center',
        top: '5%',
        textStyle: {
          fontSize: 32,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params) => `
          <div style="padding: 10px;">
            <strong style="color: ${params.color}; font-size: 15px;">${params.name}</strong><br/>
            <span style="color: #999;">Ölçüm Sayısı: <strong>${params.value}</strong></span><br/>
            <span style="color: #999;">Oran: <strong>${params.percent.toFixed(1)}%</strong></span><br/>
            <span style="color: #999;">Dominant Cluster: <strong>${CLUSTER_NAMES[params.data.cluster]}</strong></span>
          </div>
        `,
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '55%'],
        data: pieData,
        label: {
          formatter: '{b}\n{c} ölçüm',
          fontSize: 12,
          fontWeight: '600',
          color: '#1e293b'
        },
        labelLine: {
          length: 20,
          length2: 15
        },
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          },
          label: {
            fontSize: 14,
            fontWeight: 'bold'
          }
        }
      }]
    })
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🌊</div>
          <div style={{ color: '#64748b', fontSize: '1.125rem', fontWeight: '500' }}>
            Yükleniyor...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: '4rem', marginBottom: 20 }}>💧</div>
          <h1 style={{ 
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: 12,
            letterSpacing: '-0.03em'
          }}>
            Su Kalitesi Analizi
          </h1>
          <p style={{ 
            fontSize: '1.125rem',
            color: '#64748b',
            maxWidth: 600,
            margin: '0 auto'
          }}>
            Türkiye'nin 7 büyük gölü • 2018-2024
          </p>
        </div>

        {/* Yıl Seçici + Pie Chart */}
        {matrixData && (
          <div style={{
            background: 'white',
            borderRadius: 24,
            padding: 40,
            marginBottom: 40,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              Yıllara Göre Cluster Dağılımı
            </h2>
            <p style={{ 
              fontSize: '0.9375rem', 
              color: '#64748b',
              textAlign: 'center',
              marginBottom: 24
            }}>
              Yıl seçerek göllerin o yıldaki dağılımını görün
            </p>

            {/* Yıl Seçici */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 32,
              flexWrap: 'wrap'
            }}>
              {matrixData.years.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 12,
                    border: selectedYear === year ? '3px solid #3b82f6' : '2px solid #e2e8f0',
                    background: selectedYear === year 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : 'white',
                    color: selectedYear === year ? 'white' : '#64748b',
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedYear === year 
                      ? '0 6px 20px rgba(59, 130, 246, 0.4)' 
                      : '0 2px 8px rgba(0,0,0,0.05)',
                    transform: selectedYear === year ? 'translateY(-3px) scale(1.05)' : 'translateY(0) scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedYear !== year) {
                      e.target.style.background = '#f8fafc'
                      e.target.style.borderColor = '#cbd5e1'
                      e.target.style.transform = 'translateY(-2px) scale(1.02)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedYear !== year) {
                      e.target.style.background = 'white'
                      e.target.style.borderColor = '#e2e8f0'
                      e.target.style.transform = 'translateY(0) scale(1)'
                    }
                  }}
                >
                  {year}
                </button>
              ))}
            </div>

            {/* Pie Chart */}
            <div style={{
              height: '500px',
              background: 'white',
              borderRadius: 16,
              overflow: 'hidden',
              border: '2px solid #e2e8f0'
            }}>
              <div ref={pieChartRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Legend - Göller */}
            <div style={{
              marginTop: 24,
              padding: 20,
              background: '#f8fafc',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              flexWrap: 'wrap'
            }}>
              {Object.entries(LAKE_COLORS).map(([lake, color]) => (
                <div key={lake} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: color,
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} />
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                    {lake.replace(' Gölü', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3D Analiz */}
        {scatter3DData.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: 24,
            padding: 40,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: 8
              }}>
                3D Parametre Analizi
              </h2>
              <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
                {scatter3DData.length} veri noktası • Parametreleri değiştirin
              </p>
            </div>

            {/* Parametre Seçiciler */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 32,
              padding: 24,
              background: '#f8fafc',
              borderRadius: 16
            }}>
              {[
                { key: 'xAxis3D', label: 'X Ekseni', icon: '→' },
                { key: 'yAxis3D', label: 'Y Ekseni', icon: '↑' },
                { key: 'zAxis3D', label: 'Z Ekseni', icon: '◆' },
                { key: 'color', label: 'Renk', icon: '●' },
                { key: 'symbolSize', label: 'Boyut', icon: '⬤' }
              ].map(({ key, label, icon }) => (
                <div key={key}>
                  <label style={{
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    color: '#64748b',
                    marginBottom: 6,
                    display: 'block'
                  }}>
                    {icon} {label}
                  </label>
                  <select
                    value={config[key]}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {parameters.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* 3D Chart */}
            <div style={{
              height: '650px',
              background: '#f8fafc',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}>
              <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Legend - Clusters */}
            <div style={{
              marginTop: 24,
              padding: 20,
              background: '#f8fafc',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              flexWrap: 'wrap'
            }}>
              {[
                { label: 'İyi Kalite', color: '#10b981' },
                { label: 'Alg Riski', color: '#ef4444' },
                { label: 'Tuzlu', color: '#f59e0b' },
                { label: 'Özel', color: '#3b82f6' }
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: color
                  }} />
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 40,
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '0.875rem'
        }}>
          🛰️ Sentinel-2 • 🔬 K-Means Clustering
        </div>

      </div>
    </div>
  )
}
