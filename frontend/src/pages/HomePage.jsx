import { useState, useEffect } from 'react'
import MapPage from './Map'
import ColorFeatures from '../components/ColorFeatures'
import LakeComparisonChart from '../components/LakeComparisonChart'

const API_BASE = 'http://localhost:5000'

export default function HomePage({ setCurrentPage, setSearchParams }) {
  const [selectedLake, setSelectedLake] = useState('van')
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/metrics/normalized`)
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error('Metrics API hatası:', err))
  }, [])

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2>🌊 AquaTrack Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>
          Türkiye Gölleri Su Miktarı ve Kalitesi İzleme Sistemi
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 10 }}>
          Haritadan bir göl seçerek detaylı analizleri görüntüleyebilirsiniz
        </p>
      </div>
      
      {/* Ana Layout - Harita + Sağ Panel */}
      <div className="main-dashboard-layout">
        {/* Ana Harita */}
        <div className="map-container">
          <MapPage 
            onLakeSelect={setSelectedLake} 
            setCurrentPage={setCurrentPage}
            setSearchParams={setSearchParams}
          />
        </div>
        
        {/* Sağ Panel - Sadece göl seçildiğinde */}
        {selectedLake && (
          <div className="side-panel">
            <ColorFeatures selectedLake={selectedLake} />
          </div>
        )}
      </div>

      {/* Türkiye Gölleri Genel Durumu */}
      <div style={{ marginTop: '40px', marginBottom: '40px' }}>
        <div className="card" style={{ 
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px'
            }}>
              <span style={{ fontSize: '24px' }}>🏞️</span>
            </div>
            <div>
              <h2 style={{ 
                margin: 0,
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '4px'
              }}>
                Türkiye Gölleri Genel Durumu
              </h2>
              <p style={{ 
                margin: 0,
                color: '#6b7280',
                fontSize: '16px'
              }}>
                7 büyük gölün karşılaştırmalı analizi ve AI model performansı
              </p>
            </div>
          </div>
          
          {/* Bilgilendirme Kutusu */}
          <div style={{
            background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
            border: '2px solid #93c5fd',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'start' }}>
              <span style={{ fontSize: '24px', marginRight: '12px' }}>💡</span>
              <div>
                <p style={{ 
                  margin: 0,
                  fontWeight: '600',
                  color: '#1e3a8a',
                  marginBottom: '8px',
                  fontSize: '16px'
                }}>
                  Metrikler Açıklaması:
                </p>
                <p style={{ 
                  margin: 0,
                  color: '#1e40af',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <strong>Son Ölçüm</strong>: 2024 yılının en güncel Sentinel-2 uydu verisi. 
                  <strong style={{ marginLeft: '8px' }}>Trend</strong>: Son 12 ay içindeki değişim yüzdesi. 
                  <strong style={{ marginLeft: '8px' }}>WMAPE</strong>: Model hata oranı (düşük = daha iyi). 
                  <strong style={{ marginLeft: '8px' }}>R²</strong>: Model uyum kalitesi (1.0 = mükemmel). 
                  Van ve Eğirdir gölleri <strong>%99.9 doğruluk</strong> ile en yüksek performansa sahip.
                </p>
              </div>
            </div>
          </div>

          <div style={{ 
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <LakeComparisonChart />
          </div>
        </div>
      </div>
      
      {/* Hızlı Erişim Kartları */}
      <div className="quick-access-cards">
        <div className="quick-card">
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: 15,
            background: 'var(--gradient-secondary)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--white)'
          }}>
            📊
          </div>
          <h3>Su Miktarı Analizi</h3>
          <p>
            Gelişmiş algoritmaları ile göl su alanı tahminleri ve trend analizi
          </p>
          <button
            onClick={() => {
              setCurrentPage('forecast')
              setSearchParams(new URLSearchParams([['page', 'forecast']]))
            }}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Su Miktarı Analizine Git
          </button>
        </div>
        
        <div className="quick-card">
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: 15,
            background: 'var(--gradient-primary)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--white)'
          }}>
            💧
          </div>
          <h3>Su Kalitesi Analizi</h3>
          <p>
            Uydu görüntüleri ile su kalitesi tahminleri ve spektral analiz
          </p>
          <button
            onClick={() => {
              setCurrentPage('quality')
              setSearchParams(new URLSearchParams([['page', 'quality']]))
            }}
            className="btn btn-success"
            style={{ width: '100%' }}
          >
            Su Kalitesi Analizine Git
          </button>
        </div>

        {/* Model Başarı Kartı */}
        {metrics && (
          <div className="quick-card" style={{ 
            background: 'linear-gradient(135deg, var(--primary-blue), var(--primary-green))',
            color: 'white'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: 15,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white'
            }}>
              🎯
            </div>
            <h3>Model Başarı Oranı</h3>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              margin: '15px 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {(100 - metrics.summary.avg_mape).toFixed(1)}%
            </div>
            <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>
              Ortalama MAPE: {metrics.summary.avg_mape}% 
              <br />
              7 göl üzerinde normalize edilmiş başarı
            </p>
            <button
              onClick={() => {
                setCurrentPage('forecast')
                setSearchParams(new URLSearchParams([['page', 'forecast']]))
              }}
              className="btn"
              style={{ 
                width: '100%', 
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              Detaylı Metrikleri Gör
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
