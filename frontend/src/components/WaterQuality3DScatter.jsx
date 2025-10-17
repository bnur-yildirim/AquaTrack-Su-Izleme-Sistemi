import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import 'echarts-gl'

/**
 * 3D Scatter Plot - Su Kalitesi Analizi
 * X: NDWI, Y: WRI, Z: Chlorophyll-a
 * Renk: Cluster, Boyut: Turbidity
 */
export default function WaterQuality3DScatter({ data, title, selectedLake }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'light')
    }

    // Cluster renkleri
    const clusterColors = {
      0: '#28a745', // Normal - Yeşil
      1: '#dc3545', // Alg patlaması - Kırmızı
      2: '#ffc107', // Tuzlu - Sarı
      3: '#17a2b8'  // Özel - Açık Mavi
    }

    // Cluster isimleri
    const clusterNames = {
      0: 'Normal Su Kalitesi',
      1: 'Alg Patlaması Riski',
      2: 'Tuzlu Su',
      3: 'Özel Coğrafi Durum'
    }

    // Veriyi hazırla - [ndwi, wri, chl_a, turbidity, cluster, date]
    const chartData = data.map(item => ({
      value: [
        item.ndwi || 0,           // X: NDWI
        item.wri || 0,            // Y: WRI
        item.chl_a || 0,          // Z: Chlorophyll-a
        item.turbidity || 0,      // Size
        item.cluster || 0         // Color
      ],
      itemStyle: {
        color: clusterColors[item.cluster || 0]
      },
      cluster: item.cluster || 0,
      date: item.date || '',
      lakeName: item.lakeName || selectedLake || ''
    }))

    // Min/Max değerlerini hesapla
    const ndwiValues = chartData.map(d => d.value[0])
    const wriValues = chartData.map(d => d.value[1])
    const chlValues = chartData.map(d => d.value[2])
    const turbidityValues = chartData.map(d => d.value[3])

    const ndwiMin = Math.min(...ndwiValues)
    const ndwiMax = Math.max(...ndwiValues)
    const wriMin = Math.min(...wriValues)
    const wriMax = Math.max(...wriValues)
    const chlMin = Math.min(...chlValues)
    const chlMax = Math.max(...chlValues)
    const turbidityMax = Math.max(...turbidityValues)

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: title || '3D Su Kalitesi Analizi',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#1e293b'
        }
      },
      tooltip: {
        formatter: (params) => {
          const data = params.data
          return `
            <div style="padding: 10px;">
              <strong style="color: ${data.itemStyle.color}">
                ${clusterNames[data.cluster]}
              </strong><br/>
              ${data.lakeName ? `<strong>${data.lakeName}</strong><br/>` : ''}
              ${data.date ? `📅 ${data.date}<br/>` : ''}
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #e2e8f0;"/>
              💧 NDWI: <strong>${data.value[0].toFixed(2)}</strong><br/>
              🌊 WRI: <strong>${data.value[1].toFixed(2)}</strong><br/>
              🌿 Chlorophyll-a: <strong>${data.value[2].toFixed(2)}</strong> mg/m³<br/>
              ☁️ Turbidity: <strong>${data.value[3].toFixed(3)}</strong> NTU<br/>
              🎯 Cluster: <strong>${data.cluster}</strong>
            </div>
          `
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#1e293b'
        }
      },
      legend: {
        data: Object.keys(clusterNames).map(key => clusterNames[key]),
        top: 50,
        textStyle: {
          color: '#64748b',
          fontSize: 12
        },
        itemWidth: 20,
        itemHeight: 12
      },
      xAxis3D: {
        name: 'NDWI',
        type: 'value',
        min: ndwiMin,
        max: ndwiMax,
        nameTextStyle: {
          color: '#3b82f6',
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5e1'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        }
      },
      yAxis3D: {
        name: 'WRI',
        type: 'value',
        min: wriMin,
        max: wriMax,
        nameTextStyle: {
          color: '#10b981',
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5e1'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        }
      },
      zAxis3D: {
        name: 'Chlorophyll-a (mg/m³)',
        type: 'value',
        min: chlMin,
        max: chlMax,
        nameTextStyle: {
          color: '#f59e0b',
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5e1'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        }
      },
      grid3D: {
        boxWidth: 100,
        boxDepth: 80,
        boxHeight: 60,
        environment: '#f8fafc',
        light: {
          main: {
            intensity: 1.2,
            shadow: true
          },
          ambient: {
            intensity: 0.6
          }
        },
        viewControl: {
          distance: 200,
          alpha: 30,
          beta: 30,
          autoRotate: false,
          autoRotateSpeed: 10,
          rotateSensitivity: 1,
          zoomSensitivity: 1,
          panSensitivity: 1,
          minDistance: 100,
          maxDistance: 400
        },
        postEffect: {
          enable: true,
          bloom: {
            enable: false
          },
          SSAO: {
            enable: true,
            radius: 2,
            intensity: 1
          }
        }
      },
      visualMap: {
        show: true,
        dimension: 3,
        min: 0,
        max: turbidityMax,
        inRange: {
          symbolSize: [8, 30]
        },
        text: ['Yüksek Turbidity', 'Düşük Turbidity'],
        textStyle: {
          color: '#64748b',
          fontSize: 11
        },
        right: 10,
        bottom: 40,
        itemWidth: 20,
        itemHeight: 120,
        calculable: true,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10
      },
      series: [
        {
          type: 'scatter3D',
          data: chartData,
          symbolSize: (dataItem) => {
            // Turbidity'ye göre boyut (min: 8, max: 30)
            const turbidity = dataItem[3]
            return Math.max(8, Math.min(30, 8 + (turbidity / turbidityMax) * 22))
          },
          itemStyle: {
            borderWidth: 0.5,
            borderColor: 'rgba(255, 255, 255, 0.8)',
            opacity: 0.85
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2,
              borderColor: '#fff',
              opacity: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          }
        }
      ]
    }

    chartInstance.current.setOption(option)

    // Resize handler
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize()
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [data, title, selectedLake])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

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
          height: '600px',
          minHeight: '500px'
        }} 
      />
      
      {/* Bilgi Kartı */}
      <div style={{
        marginTop: 16,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          flexWrap: 'wrap',
          justifyContent: 'center',
          fontSize: '0.875rem',
          color: '#64748b'
        }}>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ color: '#3b82f6' }}>X Ekseni:</strong> NDWI (Su İçeriği)
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ color: '#10b981' }}>Y Ekseni:</strong> WRI (Su Oranı)
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ color: '#f59e0b' }}>Z Ekseni:</strong> Chlorophyll-a
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ color: '#ef4444' }}>Nokta Boyutu:</strong> Turbidity
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ color: '#8b5cf6' }}>Renk:</strong> Cluster Tipi
          </div>
        </div>
        <p style={{ 
          textAlign: 'center', 
          marginTop: 12, 
          fontSize: '0.8125rem',
          color: '#64748b',
          fontStyle: 'italic'
        }}>
          🖱️ Fare ile döndürün • 🔍 Scroll ile yakınlaştırın • ✋ Sağ tık ile taşıyın
        </p>
      </div>
    </div>
  )
}
