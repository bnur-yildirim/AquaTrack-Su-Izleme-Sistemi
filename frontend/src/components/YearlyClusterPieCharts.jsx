import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

const CLUSTER_COLORS = {
  0: '#10b981',
  1: '#ef4444', 
  2: '#f59e0b',
  3: '#3b82f6'
}

const CLUSTER_NAMES = {
  0: 'Normal',
  1: 'Alg Riski',
  2: 'Tuzlu',
  3: 'Özel'
}

export default function YearlyClusterPieCharts({ lakeHistory, lakeName }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current || !lakeHistory?.history?.length) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'light')
    }

    // Veriyi hazırla: ['ClusterName', 'Count', 'ClusterID', 'Year']
    const sourceData = [['ClusterName', 'Count', 'ClusterID', 'Year']]
    
    // Yıllara göre grupla ve cluster sayılarını hesapla
    const yearlyData = {}
    lakeHistory.history.forEach(record => {
      const year = parseInt(record.date.split('-')[0])
      if (!yearlyData[year]) {
        yearlyData[year] = { 0: 0, 1: 0, 2: 0, 3: 0 }
      }
      yearlyData[year][record.cluster]++
    })

    // Dataset source'u doldur
    Object.entries(yearlyData).forEach(([year, clusters]) => {
      Object.entries(clusters).forEach(([clusterId, count]) => {
        if (count > 0) {
          sourceData.push([
            CLUSTER_NAMES[clusterId],
            count,
            parseInt(clusterId),
            parseInt(year)
          ])
        }
      })
    })

    const years = Object.keys(yearlyData).map(Number).sort()
    
    // Dataset: Ana kaynak + her yıl için transform
    const datasets = [{ source: sourceData }]
    years.forEach(year => {
      datasets.push({
        transform: {
          type: 'filter',
          config: { dimension: 'Year', value: year }
        }
      })
    })

    // Her yıl için pie series
    const series = years.map((year, index) => ({
      type: 'pie',
      radius: 50,
      center: ['50%', '50%'], // Default center
      datasetIndex: index + 1,
      encode: {
        itemName: 'ClusterName',
        value: 'Count'
      },
      label: {
        formatter: '{b}\n{c}',
        fontSize: 11,
        fontWeight: '600'
      },
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2,
        color: (params) => {
          const clusterName = params.name
          const clusterId = Object.keys(CLUSTER_NAMES).find(
            key => CLUSTER_NAMES[key] === clusterName
          )
          return CLUSTER_COLORS[clusterId] || '#888'
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }))

    // Başlıklar
    const titles = years.map((year, index) => ({
      text: year.toString(),
      left: '50%',
      top: '50%',
      textAlign: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b'
      }
    }))

    // Responsive media queries
    const media = [
      {
        query: { minAspectRatio: 1 },
        option: {
          title: years.map((year, i) => ({
            text: year.toString(),
            left: `${(i + 0.5) * (100 / years.length)}%`,
            top: '8%',
            textAlign: 'center',
            textStyle: {
              fontSize: 18,
              fontWeight: 'bold',
              color: '#1e293b'
            }
          })),
          series: years.map((_, i) => ({
            center: [`${(i + 0.5) * (100 / years.length)}%`, '50%']
          }))
        }
      },
      {
        option: {
          title: years.map((year, i) => ({
            text: year.toString(),
            left: '50%',
            top: `${(i + 0.5) * (100 / years.length) - 8}%`,
            textAlign: 'center',
            textStyle: {
              fontSize: 16,
              fontWeight: 'bold',
              color: '#1e293b'
            }
          })),
          series: years.map((_, i) => ({
            center: ['50%', `${(i + 0.5) * (100 / years.length)}%`]
          }))
        }
      }
    ]

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: titles,
      tooltip: {
        trigger: 'item',
        formatter: (params) => `
          <div style="padding: 8px;">
            <strong style="color: ${params.color}">${params.name}</strong><br/>
            Sayı: <strong>${params.value}</strong><br/>
            Oran: <strong>${params.percent.toFixed(1)}%</strong>
          </div>
        `,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1
      },
      dataset: datasets,
      series: series,
      media: media
    })

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [lakeHistory, lakeName])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  if (!lakeHistory?.history?.length) return null

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      marginBottom: 24
    }}>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: 8
        }}>
          📅 Yıllara Göre Cluster Dağılımı
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          {lakeName} - Her yıl için su kalitesi kategorileri
        </p>
      </div>

      <div ref={chartRef} style={{ width: '100%', height: '500px', minHeight: '400px' }} />

      <div style={{
        marginTop: 16,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 12,
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        flexWrap: 'wrap'
      }}>
        {[
          { label: 'Normal Su', color: '#10b981' },
          { label: 'Alg Riski', color: '#ef4444' },
          { label: 'Tuzlu Su', color: '#f59e0b' },
          { label: 'Özel Durum', color: '#3b82f6' }
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 12,
              height: 12,
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
  )
}
