import { useState, useEffect, useMemo } from 'react'

const API_BASE = 'http://localhost:5000'

export function useUnifiedForecasting(selectedLake, selectedHorizon = 'H1', yearStart, yearEnd) {
  const [data, setData] = useState({
    historical: [],
    test: [],
    future: []
  })
  const [forecastSummary, setForecastSummary] = useState(null)
  const [modelMetrics, setModelMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Ana tahmin verilerini yükle
  useEffect(() => {
    if (!selectedLake || !selectedHorizon) return
    
    setLoading(true)
    setError(null)
    
    const loadForecastData = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/unified/forecast?lake_id=${selectedLake}&horizon=${selectedHorizon}`
        )
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.status === 'success') {
          // Veriyi kategorilere ayır
          const historical = []
          const test = []
          const future = []
          
          // Yıllık verileri işle - DOĞRU MANTIK
          for (let i = 0; i < result.years.length; i++) {
            const year = result.years[i]
            const actual = result.actual[i]
            const predicted = result.predicted[i]
            
            if (year < 2025) {
              // Historical data (2018-2024) - SADECE GERÇEK DEĞERLER
              if (actual !== null) {
                historical.push({
                  date: `${year}-06-30`,
                  target_water_area_m2: actual,
                  predicted_water_area: null, // TAHMİN YOK!
                  data_type: 'historical'
                })
              }
            } else {
              // Future data (2025+) - SADECE TAHMİN DEĞERLERİ
              if (predicted !== null) {
                future.push({
                  date: `${year}-06-30`,
                  target_water_area_m2: null, // GERÇEK YOK!
                  predicted_water_area: predicted,
                  data_type: 'future',
                  confidence: result.confidence?.level || 'medium'
                })
              }
            }
          }
          
          setData({ historical, test, future })
          setForecastSummary({
            ...result,
            predictions_3months: result.future_predictions || [],
            change_percent: result.change_percent || 0,
            last_update: result.last_update
          })
        } else {
          setError(result.message || 'Veri yüklenemedi')
        }
      } catch (err) {
        console.error('Forecast data error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadForecastData()
  }, [selectedLake, selectedHorizon])

  // Zaman serisi verilerini yükle
  useEffect(() => {
    if (!selectedLake || !selectedHorizon) return
    
    const loadTimeseriesData = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/unified/timeseries?lake_id=${selectedLake}&horizon=${selectedHorizon}&limit=1000`
        )
        
        if (response.ok) {
          const result = await response.json()
          if (result.status === 'success' && result.records) {
            // Zaman serisi verilerini mevcut veriye ekle
            const timeseriesData = result.records.map(record => ({
              ...record,
              date: record.date,
              target_water_area_m2: record.target_water_area_m2,
              predicted_water_area: record.predicted_water_area,
              horizon: selectedHorizon,
              confidence: getConfidenceLevel(selectedHorizon)
            }))
            
            // Veriyi güncelle
            setData(prevData => ({
              ...prevData,
              timeseries: timeseriesData
            }))
          }
        }
      } catch (err) {
        console.error('Timeseries data error:', err)
      }
    }
    
    loadTimeseriesData()
  }, [selectedLake, selectedHorizon])

  // Model metriklerini yükle
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/unified/compare?lake_id=${selectedLake}`)
        if (response.ok) {
          const result = await response.json()
          if (result.status === 'success') {
            setModelMetrics(result.comparison)
          }
        }
      } catch (err) {
        console.error('Metrics error:', err)
      }
    }
    
    if (selectedLake) {
      loadMetrics()
    }
  }, [selectedLake])

  // Tüm veriyi birleştir
  const allData = useMemo(() => {
    const combined = []
    
    if (data.historical) combined.push(...data.historical)
    if (data.test) combined.push(...data.test)
    if (data.future) combined.push(...data.future)
    if (data.timeseries) combined.push(...data.timeseries)
    
    // Duplikasyonları temizle
    const unique = combined.filter((item, index, self) => 
      index === self.findIndex(t => t.date === item.date)
    )
    
    return unique.sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [data])

  // Yıl aralığına göre filtrele
  const filtered = useMemo(() => {
    return allData.filter(item => {
      const year = new Date(item.date).getFullYear()
      return year >= yearStart && year <= yearEnd
    })
  }, [allData, yearStart, yearEnd])

  // Güven seviyesi fonksiyonu
  const getConfidenceLevel = (horizon) => {
    const levels = {
      'H1': { level: 'high', color: '#22c55e', text: 'Yüksek Güven' },
      'H2': { level: 'medium', color: '#f59e0b', text: 'Orta Güven' },
      'H3': { level: 'low', color: '#ef4444', text: 'Düşük Güven' }
    }
    return levels[horizon] || { level: 'unknown', color: '#6b7280', text: 'Bilinmeyen' }
  }

  return {
    data: allData,
    filtered,
    forecastSummary,
    modelMetrics,
    loading,
    error,
    confidence: getConfidenceLevel(selectedHorizon)
  }
}

// Horizon seçenekleri
export const HORIZON_OPTIONS = [
  { value: 'H1', label: '1 Ay Sonra', confidence: 'Yüksek Güven', color: '#22c55e' },
  { value: 'H2', label: '2 Ay Sonra', confidence: 'Orta Güven', color: '#f59e0b' },
  { value: 'H3', label: '3 Ay Sonra', confidence: 'Düşük Güven', color: '#ef4444' }
]
