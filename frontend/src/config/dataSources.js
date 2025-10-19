// ==========================
// DATA SOURCES CONFIGURATION - FRONTEND
// AquaTrack - Merkezi Veri Kaynakları
// ==========================

const DATA_SOURCES = {
  // API Base URL
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000',
  
  // Su Kalitesi Endpoints
  WATER_QUALITY: {
    matrixAnalysis: '/api/quality/matrix-analysis',
    lakeCluster: (lakeKey) => `/api/quality/lake/${lakeKey}/cluster`,
    generalAnalysis: '/api/quality/general-analysis'
  },
  
  // Su Miktarı Endpoints
  WATER_QUANTITY: {
    historical: (lakeId) => `/api/forecast/lake/${lakeId}/historical`,
    predictions: (lakeId) => `/api/forecast/lake/${lakeId}/predictions`,
    allLakes: '/api/forecast/all-lakes'
  },
  
  // Göl İsimleri Mapping
  LAKE_NAMES: {
    van: 'Van Gölü',
    tuz: 'Tuz Gölü',
    burdur: 'Burdur Gölü',
    egirdir: 'Eğirdir Gölü',
    ulubat: 'Ulubat Gölü',
    sapanca: 'Sapanca Gölü',
    salda: 'Salda Gölü'
  },
  
  // Göl ID'leri
  LAKE_IDS: {
    van: '141',
    tuz: '142', 
    burdur: '1342',
    egirdir: '143',
    ulubat: '144',
    sapanca: '145',
    salda: '146'
  },
  
  // Veri Aralığı
  DATA_RANGE: {
    startYear: 2018,
    endYear: 2024,
    months: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 
             'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  },
  
  // Chart Renkleri
  CHART_COLORS: {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    success: '#10b981',
    purple: '#8b5cf6',
    pink: '#ec4899',
    
    // Su kalitesi parametreleri
    ndwi: '#3b82f6',
    chl_a: '#10b981', 
    turbidity: '#f59e0b',
    wri: '#ef4444',
    
    // Cluster renkleri
    cluster0: '#10b981', // Normal
    cluster1: '#ef4444', // Alg
    cluster2: '#f59e0b', // Tuzlu
    cluster3: '#3b82f6'  // Özel
  }
}

// API Helper Fonksiyonları
export const apiHelpers = {
  // Su Kalitesi API çağrıları
  async fetchMatrixAnalysis() {
    const response = await fetch(`${DATA_SOURCES.API_BASE_URL}${DATA_SOURCES.WATER_QUALITY.matrixAnalysis}`)
    if (!response.ok) throw new Error(`Matrix analysis failed: ${response.status}`)
    return response.json()
  },
  
  async fetchLakeCluster(lakeKey) {
    const response = await fetch(`${DATA_SOURCES.API_BASE_URL}${DATA_SOURCES.WATER_QUALITY.lakeCluster(lakeKey)}`)
    if (!response.ok) throw new Error(`Lake cluster failed: ${response.status}`)
    return response.json()
  },
  
  // Su Miktarı API çağrıları
  async fetchLakeHistorical(lakeId) {
    const response = await fetch(`${DATA_SOURCES.API_BASE_URL}${DATA_SOURCES.WATER_QUANTITY.historical(lakeId)}`)
    if (!response.ok) throw new Error(`Lake historical failed: ${response.status}`)
    return response.json()
  },
  
  async fetchLakePredictions(lakeId) {
    const response = await fetch(`${DATA_SOURCES.API_BASE_URL}${DATA_SOURCES.WATER_QUANTITY.predictions(lakeId)}`)
    if (!response.ok) throw new Error(`Lake predictions failed: ${response.status}`)
    return response.json()
  },
  
  async fetchAllLakes() {
    const response = await fetch(`${DATA_SOURCES.API_BASE_URL}${DATA_SOURCES.WATER_QUANTITY.allLakes}`)
    if (!response.ok) throw new Error(`All lakes failed: ${response.status}`)
    return response.json()
  }
}

// Göl Helper Fonksiyonları
export const lakeHelpers = {
  getLakeName(lakeKey) {
    return DATA_SOURCES.LAKE_NAMES[lakeKey] || lakeKey
  },
  
  getLakeId(lakeKey) {
    return DATA_SOURCES.LAKE_IDS[lakeKey] || lakeKey
  },
  
  getAllLakeKeys() {
    return Object.keys(DATA_SOURCES.LAKE_NAMES)
  },
  
  getAllLakeNames() {
    return Object.values(DATA_SOURCES.LAKE_NAMES)
  }
}

// Veri Doğrulama
export const validateDataSources = async () => {
  console.log('🔍 Veri kaynakları kontrol ediliyor...')
  
  try {
    // Test API bağlantısı
    const response = await fetch(`${DATA_SOURCES.API_BASE_URL}/api/quality/status`)
    if (!response.ok) {
      throw new Error(`API bağlantısı başarısız: ${response.status}`)
    }
    
    console.log('✅ API bağlantısı başarılı')
    return true
  } catch (error) {
    console.error('❌ Veri kaynağı hatası:', error)
    return false
  }
}

export default DATA_SOURCES
