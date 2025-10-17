import React, { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'

/**
 * Animasyonlu Scatter → Bar Chart Dönüşümü
 * Göl verilerini scatter plot'tan bar chart'a animasyonlu geçiş
 */
export default function AnimatedScatterToBar({ lakeHistory, lakeName }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const intervalRef = useRef(null)
  const [currentView, setCurrentView] = useState('scatter')

  useEffect(() => {
    if (!chartRef.current || !lakeHistory || !lakeHistory.history || lakeHistory.history.length === 0) {
      return
    }

    // Chart'ı initialize et
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'light')
    }

    // Verileri hazırla
    const historyData = lakeHistory.history

    // NDWI vs Chlorophyll-a scatter data
    const ndwiChlData = historyData.map(record => [
      record.ndwi,
      record.chl_a,
      record.cluster // cluster bilgisi
    ])

    // WRI vs Turbidity scatter data
    const wriTurbData = historyData.map(record => [
      record.wri,
      record.turbidity,
      record.cluster
    ])

    // Cluster renkleri
    const clusterColors = {
      0: '#28a745',
      1: '#dc3545',
      2: '#ffc107',
      3: '#17a2b8'
    }

    // Ortalamaları hesapla
    const avgNDWI = historyData.reduce((sum, r) => sum + r.ndwi, 0) / historyData.length
    const avgChlA = historyData.reduce((sum, r) => sum + r.chl_a, 0) / historyData.length
    const avgWRI = historyData.reduce((sum, r) => sum + r.wri, 0) / historyData.length
    const avgTurbidity = historyData.reduce((sum, r) => sum + r.turbidity, 0) / historyData.length

    // Scatter Option
    const scatterOption = {
      backgroundColor: 'transparent',
      title: {
        text: `${lakeName} - Parametre Dağılımı`,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      grid: [
        { left: '7%', top: '55', width: '38%', height: '38%' },
        { right: '7%', top: '55', width: '38%', height: '38%' }
      ],
      tooltip: {
        formatter: (params) => {
          const clusterNames = {
            0: 'Normal',
            1: 'Alg Riski',
            2: 'Tuzlu',
            3: 'Özel'
          }
          return `
            <div style="padding: 8px;">
              <strong>${params.seriesName}</strong><br/>
              ${params.marker} Cluster: ${clusterNames[params.data[2]]}<br/>
              X: ${params.data[0].toFixed(3)}<br/>
              Y: ${params.data[1].toFixed(2)}
            </div>
          `
        }
      },
      xAxis: [
        {
          type: 'value',
          gridIndex: 0,
          name: 'NDWI',
          nameLocation: 'middle',
          nameGap: 30,
          scale: true,
          axisLine: { lineStyle: { color: '#cbd5e1' } },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        {
          type: 'value',
          gridIndex: 1,
          name: 'WRI',
          nameLocation: 'middle',
          nameGap: 30,
          scale: true,
          axisLine: { lineStyle: { color: '#cbd5e1' } },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        }
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          name: 'Chl-a (mg/m³)',
          nameLocation: 'middle',
          nameGap: 40,
          scale: true,
          axisLine: { lineStyle: { color: '#cbd5e1' } },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        {
          type: 'value',
          gridIndex: 1,
          name: 'Turbidity (NTU)',
          nameLocation: 'middle',
          nameGap: 40,
          scale: true,
          axisLine: { lineStyle: { color: '#cbd5e1' } },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        }
      ],
      series: [
        {
          name: 'NDWI vs Chl-a',
          type: 'scatter',
          xAxisIndex: 0,
          yAxisIndex: 0,
          id: 'ndwi-chl',
          dataGroupId: 'group1',
          data: ndwiChlData,
          symbolSize: 8,
          itemStyle: {
            color: (params) => clusterColors[params.data[2]] || '#3b82f6',
            opacity: 0.7
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              borderWidth: 2,
              borderColor: '#fff'
            }
          },
          universalTransition: {
            enabled: true,
            delay: (idx) => Math.random() * 400
          }
        },
        {
          name: 'WRI vs Turbidity',
          type: 'scatter',
          xAxisIndex: 1,
          yAxisIndex: 1,
          id: 'wri-turb',
          dataGroupId: 'group2',
          data: wriTurbData,
          symbolSize: 8,
          itemStyle: {
            color: (params) => clusterColors[params.data[2]] || '#10b981',
            opacity: 0.7
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              borderWidth: 2,
              borderColor: '#fff'
            }
          },
          universalTransition: {
            enabled: true,
            delay: (idx) => Math.random() * 400
          }
        }
      ]
    }

    // Bar Option
    const barOption = {
      backgroundColor: 'transparent',
      title: {
        text: `${lakeName} - Ortalama Değerler`,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '20%',
        bottom: '15%'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params) => {
          const param = params[0]
          return `
            <div style="padding: 8px;">
              <strong>${param.name}</strong><br/>
              ${param.marker} ${param.value.toFixed(3)}
            </div>
          `
        }
      },
      xAxis: {
        type: 'category',
        data: ['NDWI', 'Chl-a', 'WRI', 'Turbidity'],
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontWeight: '500' }
      },
      yAxis: {
        type: 'value',
        name: 'Değer',
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: [
        {
          name: 'Ortalama',
          type: 'bar',
          id: 'averages',
          data: [
            {
              value: avgNDWI,
              itemStyle: { color: '#3b82f6' }
            },
            {
              value: avgChlA / 100, // Normalize for better visualization
              itemStyle: { color: '#10b981' }
            },
            {
              value: avgWRI,
              itemStyle: { color: '#f59e0b' }
            },
            {
              value: avgTurbidity,
              itemStyle: { color: '#ef4444' }
            }
          ],
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: (params) => params.value.toFixed(2),
            color: '#64748b',
            fontSize: 11,
            fontWeight: '600'
          },
          universalTransition: {
            enabled: true,
            seriesKey: ['ndwi-chl', 'wri-turb'],
            delay: (idx) => Math.random() * 400
          }
        }
      ]
    }

    // İlk grafiği göster
    chartInstance.current.setOption(scatterOption)
    setCurrentView('scatter')

    // Otomatik geçiş
    intervalRef.current = setInterval(() => {
      setCurrentView(prev => {
        const newView = prev === 'scatter' ? 'bar' : 'scatter'
        const option = newView === 'scatter' ? scatterOption : barOption
        chartInstance.current.setOption(option, true)
        return newView
      })
    }, 3000) // 3 saniyede bir değiş

    // Resize handler
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize()
      }
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [lakeHistory, lakeName])

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  if (!lakeHistory || !lakeHistory.history || lakeHistory.history.length === 0) {
    return null
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      marginBottom: 24
    }}>
      <div 
        ref={chartRef} 
        style={{ 
          width: '100%', 
          height: '450px'
        }} 
      />
      
      {/* Bilgi */}
      <div style={{
        marginTop: 16,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: currentView === 'scatter' ? '#3b82f6' : '#10b981',
          color: 'white',
          borderRadius: 8,
          fontSize: '0.875rem',
          fontWeight: '600',
          transition: 'all 0.3s'
        }}>
          {currentView === 'scatter' ? '📊 Scatter Plot' : '📈 Bar Chart'}
        </div>
        <p style={{ 
          marginTop: 12, 
          fontSize: '0.8125rem',
          color: '#64748b',
          fontStyle: 'italic'
        }}>
          ✨ Grafik otomatik olarak değişiyor • {lakeHistory.total_records} aylık veri
        </p>
      </div>
    </div>
  )
}
