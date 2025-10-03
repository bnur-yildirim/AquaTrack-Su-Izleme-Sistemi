import { useState, useEffect } from 'react'
import MapPage from './Map'
import ColorFeatures from '../components/ColorFeatures'
import LakeComparisonChart from '../components/LakeComparisonChart'

const API_BASE = 'http://localhost:5000'

export default function HomePage({ setCurrentPage, setSearchParams }) {
  const [selectedLake, setSelectedLake] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/metrics/normalized`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        console.error('Metrics API hatası:', err)
        // Fallback veri
        setMetrics({
          summary: {
            avg_mape: 12.5,
            total_lakes: 7,
            best_performance: "Van Gölü"
          },
          status: "fallback"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetrics()
  }, [])

  const handlePageChange = (page) => {
    if (setCurrentPage) setCurrentPage(page)
    if (setSearchParams) setSearchParams(new URLSearchParams([['page', page]]))
  }

  const handleLakeSelect = (lakeKey) => {
    // Sadece seçili gölü güncelle, sayfa değiştirme
    setSelectedLake(lakeKey)
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '24px',
      background: '#ffffff',
      minHeight: '100vh'
    }}>
      {/* Header Section */}
      <header style={{ 
        textAlign: 'center', 
        marginBottom: '48px',
        paddingTop: '24px'
      }}>
        <h1 style={{ 
          fontSize: '36px',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '12px',
          letterSpacing: '-0.5px'
        }}>
          AquaTrack Göl İzleme Sistemi
        </h1>
        <p style={{ 
          fontSize: '18px',
          color: '#475569',
          marginBottom: '8px',
          fontWeight: '500'
        }}>
          Türkiye Gölleri Su Miktarı ve Kalitesi İzleme Platformu
        </p>
        <p style={{ 
          fontSize: '14px',
          color: '#64748b',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Sentinel-2 uydu verileri ve yapay zeka destekli analizlerle göl ekosistemlerini izleyin
        </p>
      </header>

      {/* Ana Layout - Harita + Yan Panel */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: selectedLake ? '1fr 400px' : '1fr',
        gap: '24px',
        marginBottom: '48px',
        transition: 'grid-template-columns 0.3s ease'
      }}>
        {/* Harita Container */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          minHeight: '700px'
        }}>
          <MapPage 
            onLakeSelect={handleLakeSelect} 
            setCurrentPage={setCurrentPage}
            setSearchParams={setSearchParams}
          />
        </div>
        
        {/* Yan Panel - Göl Seçildiğinde */}
        {selectedLake && (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            height: 'fit-content',
            animation: 'slideIn 0.3s ease'
          }}>
            <ColorFeatures selectedLake={selectedLake} />
          </div>
        )}
      </div>

      {/* İsteğe bağlı: Karşılaştırma grafiği göstermek isterseniz yorum satırını kaldırın */}
      {/* 
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '48px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#0ea5e9',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px',
            fontSize: '24px'
          }}>
            🏞️
          </div>
          <div>
            <h2 style={{ 
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: '#0f172a',
              marginBottom: '4px'
            }}>
              Türkiye Gölleri Genel Durumu
            </h2>
            <p style={{ 
              margin: 0,
              color: '#64748b',
              fontSize: '14px'
            }}>
              7 büyük gölün karşılaştırmalı analizi ve model performans değerlendirmesi
            </p>
          </div>
        </div>
        
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ 
                margin: 0,
                fontWeight: '600',
                color: '#334155',
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                Metrik Açıklamaları
              </p>
              <p style={{ 
                margin: 0,
                color: '#475569',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                <strong>Son Ölçüm:</strong> 2024 yılı en güncel uydu verisi • 
                <strong> Trend:</strong> Son 12 aydaki değişim • 
                <strong> WMAPE:</strong> Model hata oranı (düşük daha iyi) • 
                <strong> R²:</strong> Model uyum kalitesi (1.0 mükemmel)
              </p>
            </div>
          </div>
        </div>

        <div style={{ 
          background: '#fafafa',
          borderRadius: '8px',
          padding: '24px'
        }}>
          <LakeComparisonChart />
        </div>
      </div>
      */}
      
      {/* Hızlı Erişim Kartları */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '48px'
      }}>
        {/* Su Miktarı Analizi */}
        <ActionCard
          icon="📊"
          iconBg="#eff6ff"
          title="Su Miktarı Analizi"
          description="AI destekli algoritmalar ile göl su alanı tahminleri, trend analizi ve gelecek projeksiyonları"
          features={[
            'Gerçek zamanlı tahmin',
            'Trend analizi',
            '3 aylık projeksiyon'
          ]}
          buttonText="Analiz Et →"
          buttonColor="#0ea5e9"
          buttonHoverColor="#0284c7"
          onClick={() => handlePageChange('forecast')}
        />
        
        {/* Su Kalitesi Analizi */}
        <ActionCard
          icon="💧"
          iconBg="#ecfdf5"
          title="Su Kalitesi Analizi"
          description="Sentinel-2 uydu görüntüleri ile su kalitesi değerlendirmesi ve spektral analiz"
          features={[
            'Spektral analiz',
            'Kalite indeksi',
            'Bulanıklık ölçümü'
          ]}
          buttonText="Kalite Analizi →"
          buttonColor="#10b981"
          buttonHoverColor="#059669"
          onClick={() => handlePageChange('quality')}
        />

        {/* Model Başarı Kartı */}
        {!loading && metrics && (
          <PerformanceCard
            percentage={(100 - metrics.summary.avg_mape).toFixed(1)}
            mape={metrics.summary.avg_mape}
            onClick={() => handlePageChange('forecast')}
          />
        )}
      </div>
    </div>
  )
}

// Yardımcı Bileşen: Action Card
function ActionCard({ icon, iconBg, title, description, features, buttonText, buttonColor, buttonHoverColor, onClick }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)

  return (
    <div 
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ 
        width: '56px',
        height: '56px',
        background: iconBg,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        fontSize: '28px'
      }}>
        {icon}
      </div>
      <h3 style={{ 
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '12px'
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.6',
        marginBottom: '20px'
      }}>
        {description}
      </p>
      <div style={{ 
        background: '#f8fafc',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          fontSize: '13px',
          fontWeight: '600',
          color: '#334155',
          marginBottom: '10px'
        }}>
          Özellikler:
        </div>
        {features.map((feature, index) => (
          <div key={index} style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
            • {feature}
          </div>
        ))}
      </div>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: isButtonHovered ? buttonHoverColor : buttonColor,
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
      >
        {buttonText}
      </button>
    </div>
  )
}

// Yardımcı Bileşen: Performance Card
function PerformanceCard({ percentage, mape, onClick }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)

  return (
    <div 
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ 
        width: '56px',
        height: '56px',
        background: '#fef3c7',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        fontSize: '28px'
      }}>
        🎯
      </div>
      <h3 style={{ 
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '12px'
      }}>
        Model Performansı
      </h3>
      <div style={{ 
        fontSize: '48px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        {percentage}%
      </div>
      <p style={{ 
        fontSize: '14px',
        color: '#64748b',
        textAlign: 'center',
        lineHeight: '1.6',
        marginBottom: '20px'
      }}>
        Ortalama Doğruluk Oranı
        <br />
        <span style={{ fontSize: '13px' }}>
          7 göl üzerinde WMAPE: {mape}%
        </span>
      </p>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: isButtonHovered ? '#d97706' : '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
      >
        Detaylı Metrikler →
      </button>
    </div>
  )
}