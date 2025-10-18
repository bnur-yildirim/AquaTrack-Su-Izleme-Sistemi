import { useState, useEffect } from 'react'
import { useColorFeatures } from '../hooks/useApi'
import { FALLBACK_DATA } from '../constants'

export default function ColorFeatures({ selectedLake }) {
  const { data: colorData, loading, error } = useColorFeatures(selectedLake)
  
  // Fallback data kullan
  const fallbackData = FALLBACK_DATA.LAKE_COLOR_FEATURES[selectedLake] || FALLBACK_DATA.LAKE_COLOR_FEATURES.van
  const displayData = colorData || fallbackData

  if (loading) {
    return (
      <div className="color-features-panel">
        <h3>🎨 Su Rengi Analizi</h3>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div className="loading"></div>
          <p>Renk analizi yapılıyor...</p>
        </div>
      </div>
    )
  }

  if (!displayData) {
    return (
      <div className="color-features-panel">
        <h3>🎨 Su Rengi Analizi</h3>
        <p style={{ color: 'var(--text-muted)' }}>Göl seçin</p>
      </div>
    )
  }

  // Su tipi rengini belirle
  const getWaterTypeColor = (type) => {
    switch(type) {
      case 'Berrak': return '#00bcd4'
      case 'Normal': return '#4caf50'  
      case 'Bulanık': return '#ff9800'
      default: return '#9e9e9e'
    }
  }

  // Skor rengini belirle
  const getScoreColor = (score) => {
    if (score > 80) return '#4caf50'
    if (score > 60) return '#ff9800'
    return '#f44336'
  }

  return (
    <div className="color-features-panel">
      <h3>Su Rengi Analizi</h3>
      <p style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginBottom: 10 }}>
        Spektral bantlardan hesaplanan su kalitesi
      </p>
      
      {/* Su Tipi */}
      <div className="color-metric">
        <div className="metric-header">
          <span className="metric-title">Su Tipi</span>
        </div>
        <div 
          className="water-type-badge"
          style={{ 
            background: getWaterTypeColor(displayData.water_type),
            color: 'white',
            padding: '6px 12px',
            borderRadius: '15px',
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: '0.85em'
          }}
        >
          {displayData.water_type}
        </div>
      </div>

      {/* Berraklık */}
      <div className="color-metric">
        <div className="metric-header">
          <span className="metric-title">Su Berraklığı</span>
        </div>
        <div className="clarity-display">
          <div className="clarity-level" style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '2px' }}>
            {displayData.water_clarity > 1.2 ? 'Çok Berrak' :
             displayData.water_clarity > 1.0 ? 'Berrak' :
             displayData.water_clarity > 0.8 ? 'Orta' : 'Bulanık'}
          </div>
          <div className="clarity-description" style={{ fontSize: '0.75em', color: '#6b7280' }}>
            {displayData.water_clarity > 1.2 ? 'Kristal berraklığında' :
             displayData.water_clarity > 1.0 ? 'İyi görüş mesafesi' :
             displayData.water_clarity > 0.8 ? 'Orta berraklık' : 'Görüş kısıtlı'}
          </div>
        </div>
      </div>

      {/* Bulanıklık */}
      <div className="color-metric">
        <div className="metric-header">
          <span className="metric-title">Su Bulanıklığı</span>
        </div>
        <div className="turbidity-display">
          <div className="turbidity-level" style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '2px' }}>
            {colorData.turbidity < 0.7 ? 'Çok Temiz' :
             colorData.turbidity < 1.0 ? 'Temiz' :
             colorData.turbidity < 1.5 ? 'Orta Bulanık' : 'Bulanık'}
          </div>
          <div className="turbidity-description" style={{ fontSize: '0.75em', color: '#6b7280' }}>
            {colorData.turbidity < 0.7 ? 'Tortu/alg yok' :
             colorData.turbidity < 1.0 ? 'Az tortu var' :
             colorData.turbidity < 1.5 ? 'Orta tortu seviyesi' : 'Yoğun tortu/alg'}
          </div>
        </div>
      </div>

      {/* Su Rengi */}
      <div className="color-metric">
        <div className="metric-header">
          <span className="metric-title">Su Rengi</span>
        </div>
        <div className="color-display">
          <div className="color-indicator" style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '2px' }}>
            {colorData.blue_green_ratio > 1.2 ? 'Mavi Tonlu' :
             colorData.blue_green_ratio > 1.0 ? 'Mavi-Yeşil' :
             colorData.blue_green_ratio > 0.8 ? 'Yeşil Tonlu' : 'Kahverengi'}
          </div>
          <div className="color-meaning" style={{ fontSize: '0.75em', color: '#6b7280' }}>
            {colorData.blue_green_ratio > 1.2 ? 'Derin, temiz su' :
             colorData.blue_green_ratio > 1.0 ? 'Sağlıklı su rengi' :
             colorData.blue_green_ratio > 0.8 ? 'Hafif algli' : 'Tortu/kirlilik var'}
          </div>
        </div>
      </div>

      {/* Genel Su Kalitesi */}
      <div className="color-metric">
        <div className="metric-header">
          <span className="metric-title">Genel Su Kalitesi</span>
        </div>
        <div className="quality-rating">
          <div className="quality-score" style={{ fontSize: '1.2em', marginBottom: '4px' }}>
            <span className="score-number">{Math.round(colorData.color_score)}</span>
            <span className="score-max">/100</span>
          </div>
          <div className="quality-text" style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '2px' }}>
            {colorData.color_score > 80 ? 'Mükemmel Kalite' :
             colorData.color_score > 60 ? 'İyi Kalite' :
             colorData.color_score > 40 ? 'Orta Kalite' : 'Zayıf Kalite'}
          </div>
          <div className="quality-description" style={{ fontSize: '0.75em', color: '#6b7280' }}>
            {colorData.color_score > 80 ? 'İçme suyu kalitesinde' :
             colorData.color_score > 60 ? 'Rekreasyon için uygun' :
             colorData.color_score > 40 ? 'Dikkat gerekli' : 'Kirlilik var'}
          </div>
        </div>
      </div>

    </div>
  )
}
