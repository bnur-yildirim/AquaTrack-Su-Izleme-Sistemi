/**
 * Uygulama sabitleri ve konfigürasyon
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
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

// Fallback Data
export const FALLBACK_DATA = {
  LAKE_COLOR_FEATURES: {
    van: {
      water_clarity: 1.15,
      turbidity: 0.58,
      blue_green_ratio: 1.22,
      color_score: 82,
      water_type: 'Çok Berrak',
      ph_level: 8.2,
      temperature: 12.5,
      dissolved_oxygen: 9.8
    },
    ulubat: {
      water_clarity: 0.82,
      turbidity: 0.95,
      blue_green_ratio: 0.92,
      color_score: 68,
      water_type: 'Normal',
      ph_level: 7.8,
      temperature: 14.2,
      dissolved_oxygen: 8.5
    },
    sapanca: {
      water_clarity: 1.02,
      turbidity: 0.68,
      blue_green_ratio: 1.12,
      color_score: 76,
      water_type: 'Temiz',
      ph_level: 7.9,
      temperature: 13.8,
      dissolved_oxygen: 9.2
    },
    tuz: {
      water_clarity: 0.88,
      turbidity: 1.35,
      blue_green_ratio: 0.78,
      color_score: 55,
      water_type: 'Tuzlu',
      ph_level: 8.8,
      temperature: 16.5,
      dissolved_oxygen: 6.8
    },
    salda: {
      water_clarity: 1.45,
      turbidity: 0.42,
      blue_green_ratio: 1.68,
      color_score: 92,
      water_type: 'Kristal Berrak',
      ph_level: 8.5,
      temperature: 11.2,
      dissolved_oxygen: 10.5
    },
    burdur: {
      water_clarity: 0.78,
      turbidity: 1.15,
      blue_green_ratio: 0.88,
      color_score: 58,
      water_type: 'Orta',
      ph_level: 7.6,
      temperature: 15.8,
      dissolved_oxygen: 7.9
    },
    egirdir: {
      water_clarity: 1.08,
      turbidity: 0.65,
      blue_green_ratio: 1.18,
      color_score: 79,
      water_type: 'Berrak',
      ph_level: 8.0,
      temperature: 13.1,
      dissolved_oxygen: 9.4
    }
  },
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
