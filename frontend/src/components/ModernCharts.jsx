import { useState } from "react"
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export default function ModernCharts({ data }) {
  const [timeRange, setTimeRange] = useState("all")
  const [showActual, setShowActual] = useState(true)
  const [showPredicted, setShowPredicted] = useState(true)

  if (!data) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '400px',
        background: '#f8fafc',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div>Veri yükleniyor...</div>
        </div>
      </div>
    )
  }

  // Prepare chart data
  let chartData = data.years?.map((year, i) => ({
    year,
    actual: data.actual?.[i],
    predicted: data.predicted?.[i],
  })).filter(item => 
    item.actual !== null && item.actual !== undefined && 
    item.predicted !== null && item.predicted !== undefined
  ) || []

  // Time filter
  if (timeRange === "recent" && chartData.length > 3) {
    chartData = chartData.slice(-3)
  } else if (timeRange === "mid" && chartData.length > 5) {
    chartData = chartData.slice(-5)
  }

  // Calculate metrics
  const calculateMetrics = () => {
    if (chartData.length === 0) return { mape: 0, r2: 0 }
    
    const errors = chartData.map(d => Math.abs((d.predicted - d.actual) / d.actual) * 100)
    const mape = errors.reduce((a, b) => a + b, 0) / errors.length
    
    const actuals = chartData.map(d => d.actual)
    const predictions = chartData.map(d => d.predicted)
    const meanActual = actuals.reduce((a, b) => a + b, 0) / actuals.length
    const ssRes = chartData.reduce((sum, d) => sum + Math.pow(d.predicted - d.actual, 2), 0)
    const ssTot = actuals.reduce((sum, a) => sum + Math.pow(a - meanActual, 2), 0)
    const r2 = Math.max(0, 1 - (ssRes / ssTot))
    
    return { mape, r2 }
  }

  const metrics = calculateMetrics()

  const formatArea = (value) => {
    if (!value) return ""
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B m²`
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M m²`
    return `${(value / 1e3).toFixed(0)}K m²`
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Metrics Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#f8fafc',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
            R² Score
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a' }}>
            {(metrics.r2 * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{
          background: '#f8fafc',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
            Ortalama Hata (MAPE)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a' }}>
            ±{metrics.mape.toFixed(1)}%
          </div>
        </div>

        <div style={{
          background: '#f8fafc',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
            Veri Noktası
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0f172a' }}>
            {chartData.length}
          </div>
        </div>
      </div>

      {/* Time Range Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'Tüm Veri' },
          { value: 'mid', label: 'Son 5 Yıl' },
          { value: 'recent', label: 'Son 3 Yıl' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTimeRange(value)}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: timeRange === value ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              background: timeRange === value ? '#eff6ff' : 'white',
              color: timeRange === value ? '#1e40af' : '#475569',
              fontWeight: timeRange === value ? '600' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div style={{ 
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              stroke="#94a3b8"
              style={{ fontSize: "13px" }}
            />
            <YAxis
              tickFormatter={formatArea}
              stroke="#94a3b8"
              style={{ fontSize: "12px" }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload
                  const error = ((item.predicted - item.actual) / item.actual) * 100
                  
                  return (
                    <div style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '700',
                        color: '#0f172a',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        {item.year}
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: '#3b82f6' 
                          }}></div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Gerçek</span>
                        </div>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '700',
                          color: '#0f172a'
                        }}>
                          {formatArea(item.actual)}
                        </div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: '#10b981' 
                          }}></div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Tahmin</span>
                        </div>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '700',
                          color: '#0f172a'
                        }}>
                          {formatArea(item.predicted)}
                        </div>
                      </div>

                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                          Hata
                        </div>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '700',
                          color: Math.abs(error) < 1 ? '#10b981' : Math.abs(error) < 3 ? '#3b82f6' : '#f59e0b'
                        }}>
                          {error > 0 ? '+' : ''}{error.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />

            <Legend 
              wrapperStyle={{ paddingTop: "20px" }} 
              iconType="circle"
            />

            {showActual && (
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorActual)"
                name="Gerçek Değerler"
                dot={{ fill: "#3b82f6", r: 4 }}
              />
            )}

            {showPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Model Tahminleri"
                dot={{ fill: "#10b981", r: 4 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Toggle Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => setShowActual(!showActual)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: showActual ? '2px solid #3b82f6' : '1px solid #cbd5e1',
              background: showActual ? '#eff6ff' : 'white',
              color: showActual ? '#1e40af' : '#64748b',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: showActual ? '#3b82f6' : '#cbd5e1'
            }}></div>
            Gerçek Değerler
          </button>
          
          <button
            onClick={() => setShowPredicted(!showPredicted)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: showPredicted ? '2px solid #10b981' : '1px solid #cbd5e1',
              background: showPredicted ? '#ecfdf5' : 'white',
              color: showPredicted ? '#047857' : '#64748b',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: showPredicted ? '#10b981' : '#cbd5e1'
            }}></div>
            Model Tahminleri
          </button>
        </div>
      </div>

      {/* Year Performance Grid */}
      <div style={{
        marginTop: '24px',
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h4 style={{ 
          fontSize: '16px',
          fontWeight: '600',
          color: '#0f172a',
          marginBottom: '16px'
        }}>
          Yıllık Performans
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px'
        }}>
          {chartData.map((item) => {
            const error = ((item.predicted - item.actual) / item.actual) * 100
            const errorAbs = Math.abs(error)
            const isGood = errorAbs < 1
            const isFair = errorAbs < 3
            
            return (
              <div 
                key={item.year}
                style={{
                  background: isGood ? '#ecfdf5' : isFair ? '#eff6ff' : '#fef3c7',
                  border: `2px solid ${isGood ? '#6ee7b7' : isFair ? '#93c5fd' : '#fde68a'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}
              >
                <div style={{ 
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '8px'
                }}>
                  {item.year}
                </div>
                <div style={{ 
                  fontSize: '20px',
                  fontWeight: '700',
                  color: isGood ? '#047857' : isFair ? '#1e40af' : '#b45309'
                }}>
                  {error > 0 ? '+' : ''}{error.toFixed(1)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}