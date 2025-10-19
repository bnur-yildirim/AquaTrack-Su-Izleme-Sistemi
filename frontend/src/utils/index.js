/**
 * Yardımcı fonksiyonlar
 */

import { API_CONFIG, ERROR_MESSAGES } from '../constants'

/**
 * API isteği gönder
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`
  const config = {
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)
    
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR)
    }
    throw error
  }
}

/**
 * Alan değerini formatla - km² (daha anlaşılır)
 */
export const formatArea = (value) => {
  if (!value || value === 0) return 'N/A';
  
  // m² → km² dönüşümü (1 km² = 1,000,000 m²)
  const km2 = value / 1e6;
  
  if (km2 >= 1000) {
    return `${(km2 / 1000).toFixed(1)} bin km²`;
  } else if (km2 >= 1) {
    return `${km2.toFixed(1)} km²`;
  } else if (km2 >= 0.1) {
    return `${km2.toFixed(2)} km²`;
  } else {
    return `${km2.toFixed(3)} km²`;
  }
};

/**
 * Alan karşılaştırması - İstanbul karşılaştırması
 */
export const formatAreaWithComparison = (value) => {
  if (!value || value === 0) return 'N/A';
  
  const km2 = value / 1e6;
  const istanbulArea = 5461; // İstanbul'un yüzölçümü (km²)
  const footballFields = Math.round(km2 / 0.00714); // 1 futbol sahası ≈ 0.00714 km²
  
  let formatted = formatArea(value);
  
  // İstanbul karşılaştırması
  if (km2 >= istanbulArea * 0.1) {
    const ratio = (km2 / istanbulArea).toFixed(2);
    formatted += ` (İstanbul'un ${ratio} katı)`;
  } 
  // Futbol sahası karşılaştırması
  else if (footballFields >= 100) {
    formatted += ` (~${footballFields.toLocaleString('tr-TR')} futbol sahası)`;
  }
  
  return formatted;
}

/**
 * Yüzde değerini formatla
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return 'N/A'
  return `${value.toFixed(decimals)}%`
}

/**
 * Tarih formatla
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return new Date(date).toLocaleDateString('tr-TR', { ...defaultOptions, ...options })
}

/**
 * Loading state yönetimi
 */
export const createLoadingState = (initialState = false) => {
  return {
    loading: initialState,
    error: null,
    data: null
  }
}

/**
 * Error handling
 */
export const handleError = (error, fallbackMessage = ERROR_MESSAGES.API_ERROR) => {
  console.error('API Error:', error)
  return {
    error: error.message || fallbackMessage,
    data: null
  }
}

/**
 * Debounce fonksiyonu
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle fonksiyonu
 */
export const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Local storage yönetimi
 */
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('Storage get error:', error)
      return null
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage set error:', error)
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage remove error:', error)
    }
  }
}

/**
 * URL parametrelerini yönet
 */
export const urlParams = {
  get: (param) => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get(param)
  },
  
  set: (param, value) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set(param, value)
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`)
  },
  
  remove: (param) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.delete(param)
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`)
  }
}

/**
 * Validation fonksiyonları
 */
export const validators = {
  isEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },
  
  isRequired: (value) => {
    return value !== null && value !== undefined && value !== ''
  },
  
  isNumber: (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value)
  },
  
  isPositiveNumber: (value) => {
    return validators.isNumber(value) && parseFloat(value) > 0
  }
}
