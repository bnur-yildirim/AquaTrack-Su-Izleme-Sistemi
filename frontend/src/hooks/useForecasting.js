import { useState, useEffect, useMemo } from 'react'

const API_BASE = 'http://localhost:5000'

export const HORIZON_OPTIONS = [
  { value: 'H1', label: '1 Ay (H1)', months: 1 },
  { value: 'H2', label: '2 Ay (H2)', months: 2 },
  { value: 'H3', label: '3 Ay (H3)', months: 3 }
]

export function useForecasting(selectedLake, selectedHorizon = 'H1', yearStart, yearEnd) {
  // Basit sabit veri döndür
  const data = {
    historical: [
      { date: '2018-06-30', target_water_area_m2: 973119950, predicted_water_area: null, data_type: 'historical' },
      { date: '2019-06-30', target_water_area_m2: 962457224, predicted_water_area: null, data_type: 'historical' },
      { date: '2020-06-30', target_water_area_m2: 836692427, predicted_water_area: null, data_type: 'historical' },
      { date: '2021-06-30', target_water_area_m2: 798421798, predicted_water_area: null, data_type: 'historical' },
      { date: '2022-06-30', target_water_area_m2: 987838515, predicted_water_area: null, data_type: 'historical' },
      { date: '2023-06-30', target_water_area_m2: 1003990060, predicted_water_area: null, data_type: 'historical' },
      { date: '2024-06-30', target_water_area_m2: 887394142, predicted_water_area: null, data_type: 'historical' }
    ],
    test: [],
    future: [
      { date: '2025-06-30', target_water_area_m2: null, predicted_water_area: 900000000, data_type: 'future', confidence: 'medium' },
      { date: '2026-06-30', target_water_area_m2: null, predicted_water_area: 850000000, data_type: 'future', confidence: 'medium' },
      { date: '2027-06-30', target_water_area_m2: null, predicted_water_area: 800000000, data_type: 'future', confidence: 'medium' }
    ]
  }
  
  const forecastSummary = {
    lake_id: selectedLake,
    lake_name: 'Van Gölü',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    actual: [973119950, 962457224, 836692427, 798421798, 987838515, 1003990060, 887394142, null],
    predicted: [null, null, null, null, null, null, null, 900000000],
    change_percent: -5.3,
    last_update: new Date().toISOString(),
    status: 'success'
  }
  
  const modelMetrics = {
    H1: { mae: 0.15, rmse: 0.22 },
    H2: { mae: 0.18, rmse: 0.25 },
    H3: { mae: 0.21, rmse: 0.28 }
  }
  
  const loading = false
  const error = null

  // Veriyi filtrele
  const filtered = useMemo(() => {
    if (!data.historical && !data.future) return []
    
    const allData = [...(data.historical || []), ...(data.future || [])]
    
    return allData.filter(record => {
      if (!record.date) return false
      const year = new Date(record.date).getFullYear()
      return year >= yearStart && year <= yearEnd
    })
  }, [data, yearStart, yearEnd])

  return {
    data,
    filtered,
    forecastSummary,
    modelMetrics,
    loading,
    error,
    confidence: forecastSummary?.confidence || 'medium'
  }
}

function processForecastData(forecastData, timeseriesData, yearStart, yearEnd) {
  const historical = []
  const future = []
  
  // Historical data (2018-2024) - sadece gerçek değerler
  if (forecastData.actual && forecastData.years) {
    for (let i = 0; i < forecastData.years.length; i++) {
      const year = forecastData.years[i]
      const actual = forecastData.actual[i]
      
      if (year >= yearStart && year <= yearEnd && actual !== null) {
        historical.push({
          date: `${year}-06-30`,
          target_water_area_m2: actual,
          predicted_water_area: null,
          data_type: 'historical'
        })
      }
    }
  }
  
  // Future data (2025+) - sadece tahmin değerleri
  if (forecastData.predicted && forecastData.years) {
    for (let i = 0; i < forecastData.years.length; i++) {
      const year = forecastData.years[i]
      const predicted = forecastData.predicted[i]
      
      if (year >= 2025 && predicted !== null) {
        future.push({
          date: `${year}-06-30`,
          target_water_area_m2: null,
          predicted_water_area: predicted,
          data_type: 'future',
          confidence: 'medium'
        })
      }
    }
  }
  
  // Timeseries data ekle
  if (timeseriesData && timeseriesData.length > 0) {
    timeseriesData.forEach(record => {
      const year = new Date(record.date).getFullYear()
      
      if (year >= yearStart && year <= yearEnd) {
        if (year < 2025) {
          // Historical
          historical.push({
            date: record.date,
            target_water_area_m2: record.actual_area,
            predicted_water_area: null,
            data_type: 'historical'
          })
        } else {
          // Future
          future.push({
            date: record.date,
            target_water_area_m2: null,
            predicted_water_area: record.predicted_area,
            data_type: 'future',
            confidence: 'medium'
          })
        }
      }
    })
  }
  
  return { historical, test: [], future }
}