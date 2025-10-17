import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import 'echarts-gl'

/**
 * 3D Heatmap (Bar3D) - Su Miktarı Göller x Yıllar
 * X: Yıllar (2018-2024), Y: Göller, Z: Su Alanı (m²)
 * Renk: Su alanı değerine göre gradient
 * 
 * Veri Kaynağı: /api/forecast/unified (tüm göller)
 */

export default function WaterQuantity3DHeatmap({ allLakesData }) {
  const [autoRotate, setAutoRotate] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState('actual') // actual, h1, h2, h3

  if (!allLakesData || allLakesData.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
      Veri yükleniyor...
    </div>
  }

  // Göl isimleri
  const lakes = allLakesData.map(lake => lake.lake_name)
  
  // Yıl aralığı
  const years = allLakesData[0]?.historical?.years || []
  
  // 3D Heatmap verisi [yıl_index, göl_index, değer]
  const data3D = []
  let minValue = Infinity
  let maxValue = -Infinity

  allLakesData.forEach((lake, lakeIndex) => {
    const dataSource = selectedMetric === 'actual' 
      ? lake.historical?.actual 
      : lake.historical?.[`predicted_${selectedMetric}`]
    
    if (!dataSource) return

    years.forEach((year, yearIndex) => {
      const value = dataSource[yearIndex] || 0
      data3D.push([yearIndex, lakeIndex, value])
      minValue = Math.min(minValue, value)
      maxValue = Math.max(maxValue, value)
    })
  })

  const option = {
    backgroundColor: '#1e293b',
    tooltip: {
      formatter: (params) => {
        const [yearIdx, lakeIdx, value] = params.value
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px;">
              ${lakes[lakeIdx]} - ${years[yearIdx]}
            </div>
            <div style="font-size: 0.85rem;">
              <div><strong>Su Alanı:</strong> ${(value / 1e6).toFixed(2)} km²</div>
              <div><strong>Metre Kare:</strong> ${value.toLocaleString()} m²</div>
              <div><strong>Tip:</strong> ${
                selectedMetric === 'actual' ? 'Gerçek Veri' :
                selectedMetric === 'h1' ? 'H1 Tahmin (1 ay)' :
                selectedMetric === 'h2' ? 'H2 Tahmin (2 ay)' :
                'H3 Tahmin (3 ay)'
              }</div>
            </div>
          </div>
        `
      }
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      inRange: {
        color: [
          '#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8',
          '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'
        ]
      },
      text: ['Yüksek', 'Düşük'],
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      calculable: true,
      top: 20,
      right: 20,
      formatter: (value) => `${(value / 1e6).toFixed(1)} km²`
    },
    xAxis3D: {
      type: 'category',
      data: years.map(y => y.toString()),
      name: 'Yıl',
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        interval: 0,
        rotate: 45
      },
      axisLine: {
        lineStyle: {
          color: '#475569'
        }
      }
    },
    yAxis3D: {
      type: 'category',
      data: lakes,
      name: 'Göller',
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        interval: 0
      },
      axisLine: {
        lineStyle: {
          color: '#475569'
        }
      }
    },
    zAxis3D: {
      type: 'value',
      name: 'Su Alanı (m²)',
      nameTextStyle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        formatter: (value) => `${(value / 1e6).toFixed(0)}km²`
      },
      axisLine: {
        lineStyle: {
          color: '#475569'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#334155'
        }
      }
    },
    grid3D: {
      boxWidth: 200,
      boxDepth: 80,
      boxHeight: 100,
      viewControl: {
        autoRotate: autoRotate,
        autoRotateSpeed: 8,
        distance: 250,
        alpha: 25,
        beta: 40,
        minAlpha: -90,
        maxAlpha: 90
      },
      light: {
        main: {
          intensity: 1.2,
          shadow: true,
          shadowQuality: 'high'
        },
        ambient: {
          intensity: 0.4
        }
      },
      environment: 'auto',
      postEffect: {
        enable: true,
        bloom: {
          enable: true,
          intensity: 0.1
        },
        SSAO: {
          enable: true,
          radius: 2
        }
      }
    },
    series: [
      {
        type: 'bar3D',
        data: data3D.map(item => ({
          value: item
        })),
        shading: 'lambert',
        label: {
          show: false,
          fontSize: 10,
          borderWidth: 1
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            color: '#fff',
            formatter: (params) => {
              const [yearIdx, lakeIdx, value] = params.value
              return `${lakes[lakeIdx]}\n${years[yearIdx]}\n${(value / 1e6).toFixed(1)}km²`
            }
          },
          itemStyle: {
            color: '#3b82f6',
            opacity: 1
          }
        },
        itemStyle: {
          opacity: 0.9
        },
        bevelSize: 0.5,
        bevelSmoothness: 2
      }
    ]
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 28,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
        <h2 style={{
          color: 'white',
          fontSize: '1.75rem',
          fontWeight: '800',
          marginBottom: 8,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          3D Heatmap - Göller × Yıllar × Su Alanı
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.9)',
          fontSize: '1rem',
          margin: 0
        }}>
          7 Göl × {years.length} Yıl interaktif 3D bar grafiği
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        {/* Auto Rotate Button */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            background: autoRotate 
              ? 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)'
              : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            padding: '10px 24px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {autoRotate ? '⏸️ Döndürmeyi Durdur' : '▶️ Otomatik Döndür'}
        </button>

        {/* Metric Selector */}
        <div style={{
          background: '#f8fafc',
          padding: '8px',
          borderRadius: 10,
          border: '2px solid #e2e8f0',
          display: 'flex',
          gap: 8
        }}>
          {[
            { key: 'actual', label: 'Gerçek', color: '#10b981' },
            { key: 'h1', label: 'H1', color: '#3b82f6' },
            { key: 'h2', label: 'H2', color: '#f59e0b' },
            { key: 'h3', label: 'H3', color: '#ef4444' }
          ].map(metric => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              style={{
                background: selectedMetric === metric.key 
                  ? metric.color 
                  : 'white',
                color: selectedMetric === metric.key ? 'white' : '#64748b',
                border: 'none',
                borderRadius: 6,
                padding: '6px 16px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {metric.label}
            </button>
          ))}
        </div>

        <div style={{
          background: '#f8fafc',
          padding: '10px 20px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          fontSize: '0.85rem',
          color: '#64748b',
          fontWeight: '600'
        }}>
          🖱️ Sürükle • Scroll ile zoom • Bara tıkla
        </div>
      </div>

      {/* 3D Heatmap */}
      <div style={{ 
        height: 650,
        background: '#1e293b',
        borderRadius: 12,
        overflow: 'hidden',
        border: '2px solid #334155'
      }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: '#ecfdf5',
        border: '1px solid #a7f3d0',
        borderRadius: 10,
        display: 'flex',
        gap: 12,
        alignItems: 'start'
      }}>
        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>💡</div>
        <div style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6 }}>
          <strong style={{ color: '#047857' }}>3D Heatmap Analizi:</strong> Her bar bir gölün bir yıldaki su alanını gösterir.
          Bar yüksekliği su alanına, renk gradyanı ise değere göre değişir.
          <strong> Gerçek:</strong> Ölçülen veriler,
          <strong> H1/H2/H3:</strong> Model tahminleri (1-3 ay öncesi).
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        marginTop: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12
      }}>
        {[
          { 
            label: 'Toplam Bar', 
            value: data3D.length,
            color: '#0891b2'
          },
          { 
            label: 'En Büyük', 
            value: (maxValue / 1e6).toFixed(0) + ' km²',
            color: '#ef4444'
          },
          { 
            label: 'En Küçük', 
            value: (minValue / 1e6).toFixed(0) + ' km²',
            color: '#3b82f6'
          },
          { 
            label: 'Ortalama', 
            value: ((data3D.reduce((sum, d) => sum + d[2], 0) / data3D.length) / 1e6).toFixed(0) + ' km²',
            color: '#10b981'
          }
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white',
            padding: 12,
            borderRadius: 8,
            border: `2px solid ${stat.color}30`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

