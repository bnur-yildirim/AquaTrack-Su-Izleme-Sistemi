/**
 * Göl karşılaştırma grafikleri bileşeni
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { LAKE_CONFIG } from '../constants'

const LakeComparisonChart = ({ allLakesData }) => {
  if (!allLakesData || allLakesData.length === 0) {
    return null
  }

      return (
    <div className="chart-wrapper">
      <div className="chart-title">
        7 Göl Karşılaştırması
            </div>
      <div className="chart-subtitle">
        Yıllık ve Mevsimsel Analiz (2018-2024)
        </div>
      
      {/* Yıllık Karşılaştırma */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          fontSize: '16px',
          fontWeight: '600',
          color: '#475569',
          marginBottom: '16px'
        }}>
          Yıllık Ortalama Su Alanı
            </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={prepareYearlyComparisonData(allLakesData)} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis 
              dataKey="year" 
              stroke="#64748b" 
              style={{ fontSize: '13px', fontWeight: '500' }}
              tick={{ fill: '#475569' }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1e6).toFixed(0)}M m²`} 
              stroke="#64748b"
              style={{ fontSize: '12px', fontWeight: '500' }}
              tick={{ fill: '#475569' }}
            />
            <Tooltip 
              formatter={(value, name) => [`${(value / 1e6).toFixed(1)}M m²`, name]}
              contentStyle={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#0f172a', fontWeight: '600' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '13px', fontWeight: '500' }}
              iconType="rect"
            />
            
            <Bar dataKey="van" fill={LAKE_CONFIG.LAKE_COLORS.van} name="Van Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tuz" fill={LAKE_CONFIG.LAKE_COLORS.tuz} name="Tuz Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egirdir" fill={LAKE_CONFIG.LAKE_COLORS.egirdir} name="Eğirdir Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="burdur" fill={LAKE_CONFIG.LAKE_COLORS.burdur} name="Burdur Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ulubat" fill={LAKE_CONFIG.LAKE_COLORS.ulubat} name="Ulubat Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sapanca" fill={LAKE_CONFIG.LAKE_COLORS.sapanca} name="Sapanca Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="salda" fill={LAKE_CONFIG.LAKE_COLORS.salda} name="Salda Gölü" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mevsimsel Karşılaştırma */}
      <div>
        <h3 style={{ 
          fontSize: '16px',
          fontWeight: '600',
          color: '#475569',
          marginBottom: '16px'
        }}>
          Mevsimsel Ortalama Su Alanları
            </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart 
            data={prepareSeasonalComparisonData(allLakesData)} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              stroke="#64748b" 
              style={{ fontSize: '12px', fontWeight: '500' }}
              tick={{ fill: '#475569' }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1e6).toFixed(0)}M m²`} 
              stroke="#64748b"
              style={{ fontSize: '12px', fontWeight: '500' }}
              tick={{ fill: '#475569' }}
            />
            <Tooltip 
              formatter={(value, name) => [`${(value / 1e6).toFixed(1)}M m²`, name]}
              contentStyle={{
        background: 'white',
        border: '1px solid #e2e8f0',
            borderRadius: '8px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#0f172a', fontWeight: '600' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '13px', fontWeight: '500' }}
              iconType="rect"
            />
            
            <Bar dataKey="van" fill={LAKE_CONFIG.LAKE_COLORS.van} name="Van Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tuz" fill={LAKE_CONFIG.LAKE_COLORS.tuz} name="Tuz Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egirdir" fill={LAKE_CONFIG.LAKE_COLORS.egirdir} name="Eğirdir Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="burdur" fill={LAKE_CONFIG.LAKE_COLORS.burdur} name="Burdur Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ulubat" fill={LAKE_CONFIG.LAKE_COLORS.ulubat} name="Ulubat Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sapanca" fill={LAKE_CONFIG.LAKE_COLORS.sapanca} name="Sapanca Gölü" radius={[4, 4, 0, 0]} />
            <Bar dataKey="salda" fill={LAKE_CONFIG.LAKE_COLORS.salda} name="Salda Gölü" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Açıklama */}
      <div className="alert alert-info" style={{ marginTop: '20px' }}>
        <p style={{ 
          fontSize: '13px',
          color: '#475569',
          lineHeight: '1.5',
          margin: 0
        }}>
          <strong>Karşılaştırma Bilgisi:</strong> Yıllık grafik her yıl için göllerin ortalama su alanlarını, 
          mevsimsel grafik ise her ay için ortalama değerleri gösterir. Veri kaynağı: 2018-2024 Sentinel-2 uydu verileri.
        </p>
      </div>
    </div>
  )
}

// Veri hazırlama fonksiyonları
function prepareYearlyComparisonData(allLakesData) {
  if (!allLakesData || allLakesData.length === 0) return []
  
  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024]
  const chartData = years.map(year => {
    const yearData = { year }
    
    allLakesData.forEach(lakeData => {
      if (lakeData.historical && lakeData.historical.years && lakeData.historical.actual) {
        const yearIndex = lakeData.historical.years.indexOf(year)
        if (yearIndex !== -1) {
          const lakeKey = lakeData.lake_id
          yearData[lakeKey] = lakeData.historical.actual[yearIndex] || 0
        }
      }
    })
    
    return yearData
  })
  
  return chartData
}

function prepareSeasonalComparisonData(allLakesData) {
  if (!allLakesData || allLakesData.length === 0) return []
  
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  const chartData = months.map((month, index) => {
    const monthData = { month }
    
    allLakesData.forEach(lakeData => {
      if (lakeData.seasonal && lakeData.seasonal.values) {
        const lakeKey = lakeData.lake_id
        monthData[lakeKey] = lakeData.seasonal.values[index] || 0
      }
    })
    
    return monthData
  })
  
  return chartData
}

export default LakeComparisonChart