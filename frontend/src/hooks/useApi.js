/**
 * API çağrıları için custom hook
 */

import { useState, useEffect, useCallback } from 'react'
import { apiRequest, handleError } from '../utils'
import { API_CONFIG, ERROR_MESSAGES } from '../constants'

/**
 * Genel API hook'u
 */
export const useApi = (endpoint, options = {}) => {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const data = await apiRequest(endpoint, options)
      setState({ data, loading: false, error: null })
    } catch (error) {
      const errorResult = handleError(error)
      setState({ data: null, loading: false, error: errorResult.error })
    }
  }, [endpoint])

  useEffect(() => {
    if (endpoint) {
      fetchData()
    }
  }, [endpoint])

  return { ...state, refetch: fetchData }
}

/**
 * Göl verileri için hook
 */
export const useLakes = () => {
  return useApi(API_CONFIG.ENDPOINTS.LAKES)
}

/**
 * Tahmin verileri için hook
 */
export const useForecast = (lakeId) => {
  const endpoint = lakeId ? `${API_CONFIG.ENDPOINTS.UNIFIED_FORECAST}?lake_id=${lakeId}` : null
  return useApi(endpoint)
}

/**
 * Model metrikleri için hook
 */
export const useMetrics = () => {
  return useApi(`${API_CONFIG.ENDPOINTS.METRICS}/unified/summary`)
}

/**
 * Su kalitesi verileri için hook
 */
export const useWaterQuality = (lakeId) => {
  const endpoint = lakeId ? `${API_CONFIG.ENDPOINTS.QUALITY}?lake_id=${lakeId}` : null
  return useApi(endpoint)
}

/**
 * Renk özellikleri için hook
 */
export const useColorFeatures = (lakeId) => {
  const endpoint = lakeId ? `${API_CONFIG.ENDPOINTS.COLOR}/features?lake_id=${lakeId}` : null
  return useApi(endpoint)
}

/**
 * Sistem durumu için hook
 */
export const useSystemStatus = () => {
  return useApi(`${API_CONFIG.ENDPOINTS.SYSTEM}/status`)
}