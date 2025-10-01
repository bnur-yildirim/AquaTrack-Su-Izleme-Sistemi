import React from 'react'

/**
 * Python pandas describe() benzeri istatistik kartları
 */
export function StatisticsCards({ data, lakeName }) {
  if (!data) return null

  const stats = calculateStatistics(data)

  return (
    <div className="statistics-grid">
      <StatCard
        title="Ortalama Su Alanı"
        value={stats.mean}
        unit="km²"
        icon="📊"
        color="blue"
        trend={stats.meanTrend}
      />
      <StatCard
        title="Maksimum Değer"
        value={stats.max}
        unit="km²"
        icon="📈"
        color="green"
        trend={stats.maxTrend}
      />
      <StatCard
        title="Minimum Değer"
        value={stats.min}
        unit="km²"
        icon="📉"
        color="red"
        trend={stats.minTrend}
      />
      <StatCard
        title="Standart Sapma"
        value={stats.std}
        unit="km²"
        icon="📊"
        color="purple"
        trend={stats.stdTrend}
      />
      <StatCard
        title="Değişim Oranı"
        value={data.change_percent}
        unit="%"
        icon="🔄"
        color={data.change_percent >= 0 ? "green" : "red"}
        trend={data.change_percent >= 0 ? "positive" : "negative"}
      />
      <StatCard
        title="Veri Noktası Sayısı"
        value={data.data_points}
        unit="kayıt"
        icon="📋"
        color="gray"
      />
    </div>
  )
}

/**
 * Tekil istatistik kartı
 */
function StatCard({ title, value, unit, icon, color, trend }) {
  const formatValue = (val) => {
    if (val == null) return '--'
    if (typeof val === 'number') {
      if (val >= 1e9) return (val / 1e9).toFixed(1)
      if (val >= 1e6) return (val / 1e6).toFixed(1)
      if (val >= 1e3) return (val / 1e3).toFixed(1)
      return val.toFixed(1)
    }
    return val
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'positive': return '↗️'
      case 'negative': return '↘️'
      case 'stable': return '→'
      default: return ''
    }
  }

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'positive': return '#10b981'
      case 'negative': return '#ef4444'
      case 'stable': return '#6b7280'
      default: return '#6b7280'
    }
  }

  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-header">
        <div className="stat-icon">{icon}</div>
        <div className="stat-title">{title}</div>
      </div>
      <div className="stat-content">
        <div className="stat-value">
          {formatValue(value)}
          <span className="stat-unit">{unit}</span>
        </div>
        {trend && (
          <div 
            className="stat-trend"
            style={{ color: getTrendColor(trend) }}
          >
            {getTrendIcon(trend)}
          </div>
        )}
      </div>
      <style jsx>{`
        .stat-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 12px 12px 0 0;
        }
        
        .stat-card-blue::before { background: linear-gradient(90deg, #3b82f6, #1d4ed8); }
        .stat-card-green::before { background: linear-gradient(90deg, #10b981, #059669); }
        .stat-card-red::before { background: linear-gradient(90deg, #ef4444, #dc2626); }
        .stat-card-purple::before { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
        .stat-card-gray::before { background: linear-gradient(90deg, #6b7280, #4b5563); }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
        }
        
        .stat-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .stat-icon {
          font-size: 24px;
          margin-right: 8px;
        }
        
        .stat-title {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          font-family: 'Inter', sans-serif;
        }
        
        .stat-content {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          font-family: 'Inter', sans-serif;
        }
        
        .stat-unit {
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          margin-left: 4px;
        }
        
        .stat-trend {
          font-size: 20px;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}

/**
 * Python numpy benzeri istatistik hesaplamaları
 */
function calculateStatistics(data) {
  const actual = data.actual?.filter(val => val != null) || []
  const predicted = data.predicted?.filter(val => val != null) || []
  
  if (actual.length === 0) {
    return {
      mean: 0,
      max: 0,
      min: 0,
      std: 0,
      meanTrend: 'stable',
      maxTrend: 'stable',
      minTrend: 'stable',
      stdTrend: 'stable'
    }
  }

  const mean = actual.reduce((a, b) => a + b, 0) / actual.length
  const max = Math.max(...actual)
  const min = Math.min(...actual)
  const variance = actual.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / actual.length
  const std = Math.sqrt(variance)

  // Trend hesaplama (son 3 değer vs önceki 3 değer)
  const getTrend = (values) => {
    if (values.length < 6) return 'stable'
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3
    const previous = values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
    const change = (recent - previous) / previous * 100
    if (change > 5) return 'positive'
    if (change < -5) return 'negative'
    return 'stable'
  }

  return {
    mean: mean,
    max: max,
    min: min,
    std: std,
    meanTrend: getTrend(actual),
    maxTrend: getTrend(actual),
    minTrend: getTrend(actual),
    stdTrend: getTrend(actual)
  }
}

/**
 * Python matplotlib benzeri grid layout
 */
export function StatisticsGrid({ children }) {
  return (
    <div className="statistics-grid">
      {children}
      <style jsx>{`
        .statistics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        
        @media (max-width: 768px) {
          .statistics-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  )
}
