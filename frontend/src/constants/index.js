/**
 * Uygulama sabitleri ve konfigürasyon
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  TIMEOUT: 30000, // 30 saniye timeout
  ENDPOINTS: {
    LAKES: '/api/lakes',
    FORECAST: '/api/forecast',
    UNIFIED_FORECAST: '/api/forecast/unified',
    METRICS: '/api/metrics',
    QUALITY: '/api/quality',
    COLOR: '/api/color',
    SYSTEM: '/api/system'
  }
}

// Lake Configuration
export const LAKE_CONFIG = {
  DEFAULT_LAKE: 'van',
  LAKE_IDS: ['van', 'tuz', 'ulubat', 'egirdir', 'burdur', 'sapanca', 'salda'],
  LAKE_NAMES: {
    van: 'Van Gölü',
    tuz: 'Tuz Gölü', 
    ulubat: 'Ulubat Gölü',
    egirdir: 'Eğirdir Gölü',
    burdur: 'Burdur Gölü',
    sapanca: 'Sapanca Gölü',
    salda: 'Salda Gölü'
  },
  LAKE_COLORS: {
    van: '#3b82f6',      // Mavi - Van Gölü
    tuz: '#ef4444',      // Kırmızı - Tuz Gölü  
    egirdir: '#10b981',  // Yeşil - Eğirdir Gölü
    burdur: '#f59e0b',   // Turuncu - Burdur Gölü
    ulubat: '#8b5cf6',   // Mor - Ulubat Gölü
    sapanca: '#06b6d4',  // Cyan - Sapanca Gölü
    salda: '#84cc16'     // Lime - Salda Gölü
  }
}

// UI Constants
export const UI_CONFIG = {
  CHART_HEIGHT: 400,
  CARD_PADDING: 24,
  BORDER_RADIUS: 12,
  ANIMATION_DURATION: 300,
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200
  }
}

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ağ bağlantısı hatası',
  API_ERROR: 'API yanıt hatası',
  DATA_LOADING_ERROR: 'Veri yüklenirken hata oluştu',
  INVALID_LAKE: 'Geçersiz göl seçimi',
  TIMEOUT_ERROR: 'İstek zaman aşımına uğradı'
}

// Success Messages
export const SUCCESS_MESSAGES = {
  DATA_LOADED: 'Veri başarıyla yüklendi',
  LAKE_SELECTED: 'Göl seçimi güncellendi',
  FORECAST_GENERATED: 'Tahmin başarıyla oluşturuldu'
}

// Fallback Data - Minimal fallback for UI components only
export const FALLBACK_DATA = {
  MODEL_METRICS: {
    summary: {
      avg_wmape: 2.44,
      total_lakes: 7,
      total_data_points: 8109,
      best_performance: "Van Gölü",
      analysis_period: "2018-2024"
    },
    status: "fallback"
  }
}
