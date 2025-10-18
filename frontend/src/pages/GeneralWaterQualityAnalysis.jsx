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
  const [yearlyClusterData, setYearlyClusterData] = useState([])
  
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const pieChartRef = useRef(null)
  const pieChartInstance = useRef(null)
  const lakeClusterChartRef = useRef(null)
  const lakeClusterChartInstance = useRef(null)
  const trendChartRef = useRef(null)
  const trendChartInstance = useRef(null)
  const correlationChartRef = useRef(null)
  const correlationChartInstance = useRef(null)
  const radarChartRef = useRef(null)
  const radarChartInstance = useRef(null)
  const predictionChartRef = useRef(null)
  const predictionChartInstance = useRef(null)
  const [predictionData, setPredictionData] = useState([])
  const [autoRotate, setAutoRotate] = useState(true)
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
        // 1. Matrix data (Pie chart için - 49 kayıt)
        const matrixResponse = await fetch(`${API_BASE}/api/quality/matrix-analysis`)
        const matrixResult = await matrixResponse.json()
        
        // 2. TÜM ham veriler (3D için - 2,775 kayıt)
        const allDataResponse = await fetch(`${API_BASE}/api/quality/all-data`)
        const allDataResult = await allDataResponse.json()
        
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
          
          console.log('%c🌊 VERİ BAŞARIYLA YÜKLENDİ!', 'background: #10b981; color: white; font-size: 18px; padding: 12px; font-weight: bold;')
          console.log(`✅ ${formatted.length} veri noktası • 7 göl • 7 yıl (2018-2024)`)
          
          setScatter3DData(formatted)
        }
        
        // Yıllara Göre Cluster Dağılımı için yeni API
        try {
          const yearlyResponse = await fetch(`${API_BASE}/api/quality/yearly-cluster-distribution`)
          const yearlyResult = await yearlyResponse.json()
          
          if (yearlyResult.status === 'success') {
            setYearlyClusterData(yearlyResult.yearly_distribution)
          }
        } catch (error) {
          console.error('❌ Yearly cluster data error:', error)
        }

        // 3 Aylık Tahmin verisi - Arka planda yükle (blocking olmasın)
        fetch(`${API_BASE}/api/quality/predict-3-months`)
          .then(res => res.json())
          .then(predictionResult => {
            if (predictionResult.status === 'success') {
              console.log('%c🔮 3 AYLIK TAHMİN YÜKLENDİ!', 'background: #8b5cf6; color: white; font-size: 16px; padding: 10px; font-weight: bold;')
              console.log(`✅ ${predictionResult.total_predictions} tahmin • ${predictionResult.forecast_horizon}`)
              setPredictionData(predictionResult.predictions)
            }
          })
          .catch(error => {
            console.error('❌ Prediction data error:', error)
          })
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
    if (!radarChartRef.current || scatter3DData.length === 0) return
    
    if (!radarChartInstance.current) {
      radarChartInstance.current = echarts.init(radarChartRef.current, 'light')
    }
    
    updateRadarChart()

    const handleResize = () => radarChartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scatter3DData, autoRotate])

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

  // Lake Cluster Chart - Initialize once  
  useEffect(() => {
    if (!lakeClusterChartRef.current || !matrixData) return
    
    if (!lakeClusterChartInstance.current) {
      lakeClusterChartInstance.current = echarts.init(lakeClusterChartRef.current, 'light')
    }

    const handleResize = () => lakeClusterChartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [matrixData])

  // Trend Chart - Initialize once  
  useEffect(() => {
    if (!trendChartRef.current || !scatter3DData.length) return
    
    if (!trendChartInstance.current) {
      trendChartInstance.current = echarts.init(trendChartRef.current, 'light')
    }

    updateTrendChart()

    const handleResize = () => trendChartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scatter3DData])

  // Correlation Chart - Initialize once  
  useEffect(() => {
    if (!correlationChartRef.current || !scatter3DData.length) return
    
    if (!correlationChartInstance.current) {
      correlationChartInstance.current = echarts.init(correlationChartRef.current, 'light')
    }

    updateCorrelationChart()

    const handleResize = () => correlationChartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scatter3DData])

  // Radar Chart - Initialize once  
  useEffect(() => {
    if (!radarChartRef.current || !scatter3DData.length) return
    
    if (!radarChartInstance.current) {
      radarChartInstance.current = echarts.init(radarChartRef.current, 'light')
    }

    updateRadarChart()

    const handleResize = () => radarChartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scatter3DData])

  // selectedYear değişince pie chart ve lake cluster chart güncelle
  useEffect(() => {
    if (pieChartInstance.current && matrixData && selectedYear) {
      updatePieChart()
    }
    if (lakeClusterChartInstance.current && matrixData && selectedYear) {
      updateLakeClusterChart()
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
      if (lakeClusterChartInstance.current) {
        lakeClusterChartInstance.current.dispose()
        lakeClusterChartInstance.current = null
      }
      if (trendChartInstance.current) {
        trendChartInstance.current.dispose()
        trendChartInstance.current = null
      }
      if (correlationChartInstance.current) {
        correlationChartInstance.current.dispose()
        correlationChartInstance.current = null
      }
      if (radarChartInstance.current) {
        radarChartInstance.current.dispose()
        radarChartInstance.current = null
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
          autoRotate: autoRotate,
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
    
    console.log('%c🥧 PIE CHART DEBUG', 'background: #f59e0b; color: white; font-size: 16px; padding: 10px; font-weight: bold;')
    console.log('Selected Year:', selectedYear)
    console.log('Year Data Count:', yearData.length)
    console.log('Year Data Sample:', yearData.slice(0, 3))
    
    // Göl başına toplam ölçüm sayısını hesapla
    const lakeMeasurements = {}
    yearData.forEach(d => {
      if (!lakeMeasurements[d.lake]) {
        lakeMeasurements[d.lake] = 0
      }
      lakeMeasurements[d.lake] += d.measurements
    })
    
    console.log('Lake Measurements:', lakeMeasurements)

    // Pie chart için data hazırla
    const pieData = Object.entries(lakeMeasurements).map(([lake, totalMeasurements]) => {
      return {
        name: lake,
        value: totalMeasurements,
        itemStyle: {
          color: LAKE_COLORS[lake] || '#888'
        }
      }
    })
    
    console.log('Pie Data:', pieData)

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
            <span style="color: #999;">Toplam Ölçüm: <strong>${params.value}</strong></span><br/>
            <span style="color: #999;">Yüzde: <strong>${params.percent.toFixed(1)}%</strong></span>
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

  const updateLakeClusterChart = () => {
    if (!lakeClusterChartInstance.current || !matrixData || !selectedYear) return

    // Seçili yıl için veriyi filtrele
    const yearData = matrixData.matrix_data.filter(d => d.year === selectedYear)
    
    console.log('%c🔍 LAKE CLUSTER CHART DEBUG', 'background: #8b5cf6; color: white; font-size: 16px; padding: 10px; font-weight: bold;')
    console.log('Selected Year:', selectedYear)
    console.log('Year Data Count:', yearData.length)
    console.log('Year Data Sample:', yearData.slice(0, 3))
    
    // Göller listesi
    const lakes = Object.keys(LAKE_COLORS)
    
    // Her göl ve cluster kombinasyonu için sayıları hesapla
    const lakeClusterData = {}
    lakes.forEach(lake => {
      lakeClusterData[lake] = { 0: 0, 1: 0, 2: 0, 3: 0 }
    })
    
    yearData.forEach(d => {
      if (lakeClusterData[d.lake]) {
        lakeClusterData[d.lake][d.cluster] = (lakeClusterData[d.lake][d.cluster] || 0) + d.measurements
        console.log(`${d.lake} - Cluster ${d.cluster}: +${d.measurements} = ${lakeClusterData[d.lake][d.cluster]}`)
      }
    })
    
    console.log('Lake Cluster Data:', lakeClusterData)
    
    // Toplam kontrolü
    Object.entries(lakeClusterData).forEach(([lake, clusters]) => {
      const total = Object.values(clusters).reduce((sum, val) => sum + val, 0)
      console.log(`${lake} Toplam: ${total}`)
    })

    // Stacked bar için series data hazırla
    const series = [
      {
        name: CLUSTER_NAMES[0],
        type: 'bar',
        stack: 'total',
        data: lakes.map(lake => lakeClusterData[lake][0]),
        itemStyle: { color: CLUSTER_COLORS[0] },
        emphasis: {
          focus: 'series'
        }
      },
      {
        name: CLUSTER_NAMES[1],
        type: 'bar',
        stack: 'total',
        data: lakes.map(lake => lakeClusterData[lake][1]),
        itemStyle: { color: CLUSTER_COLORS[1] },
        emphasis: {
          focus: 'series'
        }
      },
      {
        name: CLUSTER_NAMES[2],
        type: 'bar',
        stack: 'total',
        data: lakes.map(lake => lakeClusterData[lake][2]),
        itemStyle: { color: CLUSTER_COLORS[2] },
        emphasis: {
          focus: 'series'
        }
      },
      {
        name: CLUSTER_NAMES[3],
        type: 'bar',
        stack: 'total',
        data: lakes.map(lake => lakeClusterData[lake][3]),
        itemStyle: { color: CLUSTER_COLORS[3] },
        emphasis: {
          focus: 'series'
        }
      }
    ]
    
    console.log('Series Data:', series.map(s => ({ name: s.name, data: s.data })))

    lakeClusterChartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: `${selectedYear} - Göllere Göre Cluster Dağılımı`,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params) => {
          const lakeName = params[0].name
          let html = `<div style="padding: 10px;">
            <strong style="font-size: 15px;">${lakeName}</strong><br/>`
          let total = 0
          params.forEach(param => {
            total += param.value
            html += `
              <div style="margin-top: 5px;">
                ${param.marker} ${param.seriesName}: <strong>${param.value}</strong>
              </div>
            `
          })
          html += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
            Toplam: <strong>${total}</strong>
          </div></div>`
          return html
        },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1
      },
      legend: {
        data: [CLUSTER_NAMES[0], CLUSTER_NAMES[1], CLUSTER_NAMES[2], CLUSTER_NAMES[3]],
        top: 40,
        textStyle: {
          color: '#64748b',
          fontSize: 12
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 80,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: lakes.map(l => l.replace(' Gölü', '')),
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          rotate: 45
        },
        axisLine: {
          lineStyle: { color: '#e2e8f0' }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Ölçüm Sayısı',
        nameTextStyle: {
          color: '#64748b',
          fontSize: 12
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11
        },
        axisLine: {
          lineStyle: { color: '#e2e8f0' }
        },
        splitLine: {
          lineStyle: { color: '#f1f5f9' }
        },
        min: 0,
        max: 100,
        interval: 10
      },
      series: series
    })
  }

  const updateTrendChart = () => {
    if (!trendChartInstance.current || !scatter3DData.length) return

    // Yıllara ve göllere göre grupla
    const yearlyData = {}
    scatter3DData.forEach(item => {
      if (!yearlyData[item.year]) {
        yearlyData[item.year] = {}
      }
      if (!yearlyData[item.year][item.lake]) {
        yearlyData[item.year][item.lake] = { ndwi: [], chl_a: [], turbidity: [], wri: [] }
      }
      yearlyData[item.year][item.lake].ndwi.push(item.ndwi)
      yearlyData[item.year][item.lake].chl_a.push(item.chl_a)
      yearlyData[item.year][item.lake].turbidity.push(item.turbidity)
      yearlyData[item.year][item.lake].wri.push(item.wri)
    })

    // Yıllık ortalamalar
    const years = Object.keys(yearlyData).sort()
    
    const lakeSeries = Object.keys(LAKE_COLORS).map(lake => {
      const data = years.map(year => {
        const lakeData = yearlyData[year]?.[lake]
        if (!lakeData || lakeData.ndwi.length === 0) return null
        const avg = lakeData.ndwi.reduce((a, b) => a + b, 0) / lakeData.ndwi.length
        return parseFloat(avg.toFixed(3))
      })
      
      return {
        name: lake.replace(' Gölü', ''),
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 12,
        lineStyle: { width: 5 },
        itemStyle: { 
          color: LAKE_COLORS[lake],
          borderWidth: 3,
          borderColor: '#fff'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowColor: LAKE_COLORS[lake]
          }
        }
      }
    })

    trendChartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: 'Yıllara Göre NDWI Trend Analizi',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1
      },
      legend: {
        data: Object.keys(LAKE_COLORS).map(l => l.replace(' Gölü', '')),
        top: 40,
        textStyle: { color: '#64748b', fontSize: 11 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 80,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: years,
        boundaryGap: false,
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#e2e8f0' } }
      },
      yAxis: {
        type: 'value',
        name: 'NDWI Değeri',
        nameTextStyle: { color: '#64748b', fontSize: 12 },
        axisLabel: { 
          color: '#64748b', 
          fontSize: 11,
          formatter: '{value}'
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        min: 0.55,
        max: 0.65,
        interval: 0.01
      },
      series: lakeSeries
    })
  }

  const updateCorrelationChart = () => {
    if (!correlationChartInstance.current || !scatter3DData.length) return

    // Korelasyon hesapla
    const params = ['ndwi', 'wri', 'chl_a', 'turbidity']
    const correlations = []
    
    params.forEach((param1, i) => {
      params.forEach((param2, j) => {
        // Pearson korelasyonu hesapla
        const values1 = scatter3DData.map(d => d[param1])
        const values2 = scatter3DData.map(d => d[param2])
        
        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length
        
        const numerator = values1.reduce((sum, v1, idx) => sum + (v1 - mean1) * (values2[idx] - mean2), 0)
        const denom1 = Math.sqrt(values1.reduce((sum, v) => sum + Math.pow(v - mean1, 2), 0))
        const denom2 = Math.sqrt(values2.reduce((sum, v) => sum + Math.pow(v - mean2, 2), 0))
        
        const correlation = numerator / (denom1 * denom2)
        correlations.push([j, i, correlation.toFixed(2)])
      })
    })

    const paramLabels = ['NDWI', 'WRI', 'Chl-a', 'Turbidity']

    correlationChartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: 'Parametre Korelasyon Matrisi',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      tooltip: {
        position: 'top',
        formatter: (params) => {
          return `${paramLabels[params.data[1]]} vs ${paramLabels[params.data[0]]}<br/>Korelasyon: <strong>${params.data[2]}</strong>`
        },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1
      },
      grid: {
        left: 80,
        top: 60,
        right: 60,
        bottom: 60
      },
      xAxis: {
        type: 'category',
        data: paramLabels,
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        splitArea: { show: false }
      },
      yAxis: {
        type: 'category',
        data: paramLabels,
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        splitArea: { show: false }
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 10,
        text: ['Yeşil Pozitif', 'Mavi Negatif'],
        textStyle: { color: '#1e293b', fontSize: 12, fontWeight: 'bold' },
        inRange: {
          color: [
            '#10b981', // Yeşil - Güçlü pozitif (cluster 0 rengi)
            '#34d399', // Açık yeşil
            '#6ee7b7', // Çok açık yeşil
            '#a7f3d0', // Çok hafif yeşil
            '#f3f4f6', // Gri - Nötr
            '#93c5fd', // Açık mavi
            '#3b82f6', // Mavi (Sapanca Gölü rengi)
            '#1d4ed8'  // Koyu mavi - Güçlü negatif
          ]
        },
        itemWidth: 20,
        itemHeight: 200,
        borderColor: '#1e293b',
        borderWidth: 2
      },
      series: [{
        name: 'Korelasyon',
        type: 'heatmap',
        data: correlations,
        label: {
          show: true,
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 'bold',
          formatter: (params) => {
            const value = params.data[2]
            if (value > 0.7) return 'Güçlü'
            if (value > 0.3) return 'Orta'
            if (value > -0.3) return 'Zayıf'
            if (value > -0.7) return 'Orta'
            return 'Güçlü'
          }
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: '#e5e7eb',
          opacity: 0.9
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0,0,0,0.3)',
            borderWidth: 2,
            borderColor: '#374151',
            opacity: 1
          }
        }
      }]
    })
  }

  const updateRadarChart = () => {
    if (!radarChartInstance.current || !scatter3DData.length) return

    // Göl başına ortalamalar
    const lakeAverages = {}
    Object.keys(LAKE_COLORS).forEach(lake => {
      const lakeData = scatter3DData.filter(d => d.lake === lake)
      if (lakeData.length > 0) {
        lakeAverages[lake] = {
          ndwi: lakeData.reduce((sum, d) => sum + d.ndwi, 0) / lakeData.length,
          wri: lakeData.reduce((sum, d) => sum + d.wri, 0) / lakeData.length,
          chl_a: lakeData.reduce((sum, d) => sum + d.chl_a, 0) / lakeData.length,
          turbidity: lakeData.reduce((sum, d) => sum + d.turbidity, 0) / lakeData.length
        }
      }
    })

    // Normalizasyon için max değerler
    const maxValues = {
      ndwi: Math.max(...Object.values(lakeAverages).map(v => v.ndwi)),
      wri: Math.max(...Object.values(lakeAverages).map(v => v.wri)),
      chl_a: Math.max(...Object.values(lakeAverages).map(v => v.chl_a)),
      turbidity: Math.max(...Object.values(lakeAverages).map(v => v.turbidity))
    }

    // 3D Scatter Chart için data hazırla
    const scatter3DDataForChart = Object.entries(lakeAverages).map(([lake, values]) => ({
      name: lake.replace(' Gölü', ''),
      value: [values.ndwi, values.wri, values.chl_a, values.turbidity],
      itemStyle: { 
        color: LAKE_COLORS[lake],
        opacity: 0.8
      },
      symbolSize: Math.max(15, Math.min(50, values.ndwi * 100)) // NDWI'ye göre boyut
    }))

    console.log('%c📊 3D GÖL PARAMETRE KARŞILAŞTIRMASI', 'background: #8b5cf6; color: white; font-size: 16px; padding: 10px; font-weight: bold;')
    console.log('Lake Averages:', lakeAverages)
    console.log('3D Scatter Data:', scatter3DDataForChart)

    radarChartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: '3D Göl Parametre Karşılaştırması',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const [ndwi, wri, chl_a, turbidity] = params.data.value
          return `
            <div style="padding: 12px;">
              <strong style="color: ${params.color}; font-size: 16px;">${params.data.name}</strong><br/>
              <div style="margin-top: 8px;">
                <span style="color: #10b981;">NDWI: <strong>${ndwi.toFixed(3)}</strong></span><br/>
                <span style="color: #3b82f6;">WRI: <strong>${wri.toFixed(3)}</strong></span><br/>
                <span style="color: #f59e0b;">Chl-a: <strong>${chl_a.toFixed(1)}</strong></span><br/>
                <span style="color: #ef4444;">Turbidity: <strong>${turbidity.toFixed(3)}</strong></span>
              </div>
            </div>
          `
        },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1
      },
      xAxis3D: {
        type: 'value',
        name: 'NDWI',
        nameTextStyle: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
        axisLine: { lineStyle: { color: '#10b981', width: 2 } },
        axisLabel: { color: '#10b981', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(16,185,129,0.1)' } },
        min: 0.5,
        max: 0.7
      },
      yAxis3D: {
        type: 'value',
        name: 'WRI',
        nameTextStyle: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },
        axisLine: { lineStyle: { color: '#3b82f6', width: 2 } },
        axisLabel: { color: '#3b82f6', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59,130,246,0.1)' } },
        min: 1.0,
        max: 1.4
      },
      zAxis3D: {
        type: 'value',
        name: 'Chl-a',
        nameTextStyle: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold' },
        axisLine: { lineStyle: { color: '#f59e0b', width: 2 } },
        axisLabel: { color: '#f59e0b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(245,158,11,0.1)' } },
        min: 150,
        max: 300
      },
      grid3D: {
        boxWidth: 100,
        boxDepth: 80,
        boxHeight: 100,
        light: {
          main: {
            intensity: 1.2,
            shadow: true
          },
          ambient: {
            intensity: 0.3
          }
        },
        viewControl: {
          projection: 'perspective',
          autoRotate: autoRotate,
          autoRotateDirection: 'cw',
          autoRotateSpeed: 10,
          rotateSensitivity: 1,
          zoomSensitivity: 1,
          panSensitivity: 1,
          distance: 200
        },
        environment: '#ffffff'
      },
      series: [{
        type: 'scatter3D',
        data: scatter3DDataForChart,
        symbolSize: 20,
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0,0,0,0.5)'
          }
        }
      }]
    })
  }

  // Prediction Chart - Initialize once
  useEffect(() => {
    if (!predictionChartRef.current || !predictionData.length) return
    
    if (!predictionChartInstance.current) {
      predictionChartInstance.current = echarts.init(predictionChartRef.current, 'light')
    }

    updatePredictionChart()

    const handleResize = () => predictionChartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [predictionData])

  const updatePredictionChart = () => {
    if (!predictionChartInstance.current || !predictionData.length) return

    // Göllere göre grupla
    const lakeGroups = {}
    predictionData.forEach(pred => {
      if (!lakeGroups[pred.lake]) {
        lakeGroups[pred.lake] = []
      }
      lakeGroups[pred.lake].push(pred)
    })

    // Her göl için series oluştur
    const series = Object.entries(lakeGroups).map(([lake, predictions]) => {
      predictions.sort((a, b) => a.month - b.month)
      
      return {
        name: lake.replace(' Gölü', ''),
        type: 'line',
        data: predictions.map(p => p.predicted_ndwi),
        smooth: true,
        symbol: 'circle',
        symbolSize: 14,
        lineStyle: { 
          width: 4,
          type: 'dashed'  // Tahmin çizgilerini kesikli yap
        },
        itemStyle: { 
          color: LAKE_COLORS[lake],
          borderWidth: 3,
          borderColor: '#fff'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowColor: LAKE_COLORS[lake]
          }
        },
        markPoint: {
          data: predictions.map((p, idx) => ({
            coord: [idx, p.predicted_ndwi],
            symbol: 'pin',
            symbolSize: 50,
            label: {
              show: true,
              formatter: () => CLUSTER_NAMES[p.predicted_cluster].split(' ')[0],
              fontSize: 10,
              color: '#fff'
            },
            itemStyle: {
              color: CLUSTER_COLORS[p.predicted_cluster]
            }
          }))
        }
      }
    })

    predictionChartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: '3 Aylık Su Kalitesi Tahmini',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params) => {
          let html = `<div style="padding: 8px;">`
          html += `<strong>+${params[0].dataIndex + 1} Ay Sonra</strong><br/>`
          params.forEach(param => {
            const lake = param.seriesName + ' Gölü'
            const pred = lakeGroups[lake][param.dataIndex]
            html += `
              <div style="margin-top: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: ${param.color};"></div>
                  <strong>${param.seriesName}</strong>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-left: 16px;">
                  📅 ${pred.date}<br/>
                  📊 NDWI: ${pred.predicted_ndwi}<br/>
                  🔮 ${pred.interpretation}<br/>
                  ✨ Güven: ${(pred.confidence * 100).toFixed(0)}%
                </div>
              </div>
            `
          })
          html += `</div>`
          return html
        },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#1e293b' },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
      },
      legend: {
        data: Object.keys(lakeGroups).map(l => l.replace(' Gölü', '')),
        top: 45,
        textStyle: { color: '#64748b', fontSize: 12 }
      },
      grid: {
        left: 60,
        right: 40,
        top: 100,
        bottom: 60
      },
      xAxis: {
        type: 'category',
        data: ['+1 Ay', '+2 Ay', '+3 Ay'],
        axisLabel: { 
          color: '#64748b',
          fontSize: 13,
          fontWeight: '600'
        },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'NDWI (Tahmini)',
        nameTextStyle: { color: '#1e293b', fontSize: 13, fontWeight: 'bold' },
        axisLabel: { 
          color: '#64748b',
          fontSize: 12,
          formatter: '{value}'
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        splitLine: { lineStyle: { color: '#f1f5f9' } }
      },
      series: series
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
        <div style={{
          background: 'linear-gradient(135deg, rgb(83, 133, 209) 0%, rgb(19, 161, 55) 50%, #0ea5e9 100%)',
          padding: '24px 16px',
          borderBottom: '3px solid #00897B',
          boxShadow: '0 2px 12px rgba(13, 71, 161, 0.15)',
          textAlign: 'center',
          marginBottom: 0
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ 
              fontSize: '32px',
              fontWeight: '800',
              margin: 0,
              color: 'white',
              letterSpacing: '-0.5px',
              textShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              Su Kalitesi Analizi
            </h1>
            <p style={{ 
              fontSize: '14px',
              margin: '8px 0 0 0',
              color: 'rgba(255,255,255,0.95)',
              fontWeight: '500'
            }}>
              Türkiye'nin 7 büyük gölü • 2018-2024
            </p>
          </div>
        </div>

        {/* 3D Analiz */}
        <div style={{
          background: 'linear-gradient(135deg, rgb(83, 133, 209) 0%, rgb(19, 161, 55) 50%, #0ea5e9 100%)',
          padding: '24px 16px',
          borderBottom: '3px solid #00897B',
          boxShadow: '0 2px 12px rgba(13, 71, 161, 0.15)',
          textAlign: 'center',
          borderRadius: 12,
          marginBottom: 32,
          marginTop: 0
        }}>
          <h2 style={{ 
            fontSize: '32px',
            fontWeight: '800',
            margin: 0,
            color: 'white',
            letterSpacing: '-0.5px',
            textShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            3D Parametre Analizi
          </h2>
          <p style={{ 
            fontSize: '14px',
            margin: '8px 0 0 0',
            color: 'rgba(255,255,255,0.95)',
            fontWeight: '500'
          }}>
            {scatter3DData.length} veri noktası • Parametreleri değiştirin
          </p>
          
          {/* Animasyon Kontrol Butonu */}
          <div style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'center',
            gap: 12
          }}>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: '2px solid rgba(255,255,255,0.3)',
                background: autoRotate ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {autoRotate ? '⏸️ Durdur' : '▶️ Başlat'}
              <span style={{ fontSize: '10px' }}>
                {autoRotate ? 'Animasyon' : 'Animasyon'}
              </span>
            </button>
          </div>
        </div>

        {/* 3D Analiz */}
        {scatter3DData.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: 24,
            padding: 40,
            marginBottom: 0,
            marginTop: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>

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
              <div ref={radarChartRef} style={{ width: '100%', height: '100%' }} />
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

        {/* Yıl Seçici + Pie Chart */}
        {matrixData && (
          <div style={{
            background: 'white',
            borderRadius: 24,
            padding: 40,
            marginBottom: 0,
            marginTop: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgb(83, 133, 209) 0%, rgb(19, 161, 55) 50%, #0ea5e9 100%)',
              padding: '24px 16px',
              borderBottom: '3px solid #00897B',
              boxShadow: '0 2px 12px rgba(13, 71, 161, 0.15)',
              textAlign: 'center',
              borderRadius: 12,
              marginBottom: 24
            }}>
              <h2 style={{ 
                fontSize: '32px',
                fontWeight: '800',
                margin: 0,
                color: 'white',
                letterSpacing: '-0.5px',
                textShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                Yıllara Göre Cluster Dağılımı
              </h2>
              <p style={{ 
                fontSize: '14px',
                margin: '8px 0 0 0',
                color: 'rgba(255,255,255,0.95)',
                fontWeight: '500'
              }}>
                Yıl seçerek göllerin o yıldaki dağılımını görün
              </p>
            </div>

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

            {/* Göl Göl Cluster Dağılımı - Stacked Bar Chart */}
            <div style={{
              height: '450px',
              background: 'white',
              borderRadius: 16,
              overflow: 'hidden',
              border: '2px solid #e2e8f0',
              marginBottom: 16
            }}>
              <div ref={lakeClusterChartRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Legend - Cluster Tipleri */}
            <div style={{
              marginBottom: 32,
              padding: 20,
              background: '#f8fafc',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              flexWrap: 'wrap'
            }}>
              {Object.entries(CLUSTER_NAMES).map(([id, name]) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: CLUSTER_COLORS[id],
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} />
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>

            {/* Cluster Açıklamaları */}
            <div style={{
              marginBottom: 32,
              padding: 24,
              background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
              borderRadius: 16,
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                📊 Su Kalitesi Cluster Açıklamaları
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16
              }}>
                <div style={{
                  padding: 16,
                  background: 'white',
                  borderRadius: 12,
                  border: '2px solid #10b981'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
                    <strong style={{ color: '#10b981' }}>Normal Su Kalitesi</strong>
            </div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Standart su kalitesi parametreleri. Düşük turbidity, orta seviye NDWI. 
                    <strong> Örnek: Burdur, Eğirdir, Ulubat</strong>
                  </p>
          </div>

                <div style={{
                  padding: 16,
                  background: 'white',
                  borderRadius: 12,
                  border: '2px solid #ef4444'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} />
                    <strong style={{ color: '#ef4444' }}>Alg Patlaması Riski</strong>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Yüksek Chlorophyll-a konsantrasyonu. Alg patlaması riski var.
                    <strong> Örnek: Salda Gölü</strong>
                  </p>
                </div>

                <div style={{
                  padding: 16,
                  background: 'white',
                  borderRadius: 12,
                  border: '2px solid #f59e0b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }} />
                    <strong style={{ color: '#f59e0b' }}>Tuzlu Su</strong>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Tuzlu göl özellikleri. Yüksek WRI değerleri.
                    <strong> Örnek: Tuz Gölü</strong>
                  </p>
                </div>

                <div style={{
                  padding: 16,
                  background: 'white',
                  borderRadius: 12,
                  border: '2px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }} />
                    <strong style={{ color: '#3b82f6' }}>Özel Coğrafi Durum</strong>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Van Gölü gibi özel coğrafi özelliklere sahip göller. Benzersiz jeolojik yapı.
                    <strong> Örnek: Van Gölü, Salda Gölü</strong>
                  </p>
                </div>
              </div>
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

        {/* Yeni Analizler */}
        {scatter3DData.length > 0 && (
          <>
            {/* Trend Analizi */}
            <div style={{
              background: 'white',
              borderRadius: 24,
              padding: 40,
              marginBottom: 40,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{
                fontSize: '32px',
                fontWeight: '700',
                marginBottom: 24,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                📈 NDWI Trend Analizi
              </h3>
              <div style={{
                height: '450px',
                background: 'white',
                borderRadius: 16,
                overflow: 'hidden',
                border: '2px solid #e2e8f0'
              }}>
                <div ref={trendChartRef} style={{ width: '100%', height: '100%' }} />
              </div>
              <div style={{
                marginTop: 16,
                padding: 16,
                background: '#f8fafc',
                borderRadius: 12,
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#64748b'
              }}>
                📈 Göllerin 2018-2024 arası NDWI değişimi • Yıllık ortalamalar
              </div>
            </div>

            {/* Grid: Korelasyon + Radar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: 40,
              marginBottom: 40
            }}>
              {/* Korelasyon Heatmap */}
              <div style={{
                background: 'white',
                borderRadius: 24,
                padding: 40,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  marginBottom: 24,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  🔥 Parametre Korelasyon Matrisi
                </h3>
                <div style={{
                  height: '400px',
                  background: 'white',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '2px solid #e2e8f0'
                }}>
                  <div ref={correlationChartRef} style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{
                  marginTop: 16,
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 12,
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}>
                  🔗 Parametreler arası korelasyon • 2,775 veri noktası
                </div>
            </div>

            </div>

            {/* 3 Aylık Tahmin Grafiği */}
            <div style={{
              background: 'white',
              borderRadius: 24,
              padding: 40,
              marginBottom: 40,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '3px dashed #8b5cf6'
            }}>
              <h3 style={{
                fontSize: '32px',
                fontWeight: '700',
                marginBottom: 24,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                🔮 3 Aylık Su Kalitesi Tahmini
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '4px 12px',
                  background: '#8b5cf6',
                  color: 'white',
                  borderRadius: 12
                }}>
                  ML Prediction
                </span>
              </h3>
              {predictionData.length > 0 ? (
                <>
                  <div style={{
                    height: '450px',
                    background: 'white',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '2px solid #e2e8f0'
                  }}>
                    <div ref={predictionChartRef} style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div style={{
                    marginTop: 16,
                    padding: 16,
                    background: 'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
                    borderRadius: 12,
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#64748b'
                  }}>
                    🤖 Linear Regression ile tahmin • 📊 Son 6 aylık veri kullanıldı • 🔮 {predictionData.length} tahmin
                  </div>
                </>
              ) : (
                <div style={{
                  height: '450px',
                  background: '#f8fafc',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #e2e8f0'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔮</div>
                    <div style={{ color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>
                      Tahminler hesaplanıyor...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 60,
          padding: 24,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          borderRadius: 16,
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.875rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: 12, fontSize: '1.5rem' }}>
            🛰️ 🔬 📊
        </div>
          <div style={{ fontWeight: '600', marginBottom: 8, color: '#1e293b' }}>
            Veri Kaynakları & Metodoloji
          </div>
          <div>
            <strong>Sentinel-2</strong> uydu görüntüleri • <strong>K-Means Clustering</strong> algoritması
          </div>
          <div style={{ marginTop: 8, fontSize: '0.8125rem' }}>
            2,775 veri noktası • 7 göl • 2018-2024 (7 yıl)
          </div>
      </div>

      </div>
    </div>
  )
}
