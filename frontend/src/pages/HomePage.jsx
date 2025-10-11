import { useState, useEffect, useCallback } from 'react'
import MapPage from './Map'
import ColorFeatures from '../components/ColorFeatures'
import ModelPerformanceChart from '../components/ModelPerformanceChart'
import PerformanceCard from '../components/PerformanceCard'
import LakeComparisonChart from '../components/LakeComparisonChart'
import NewsPanel from '../components/NewsPanel'
import { useMetrics, useForecast } from '../hooks/useApi'
import { API_CONFIG, LAKE_CONFIG } from '../constants'

// Profesyonel Renk Paleti
const COLORS = {
  primary: '#0D47A1',      // Derin Mavi
  secondary: '#1976D2',    // Canlı Mavi  
  accent: '#00897B',       // Teal
  success: '#2E7D32',      // Koyu Yeşil
  warning: '#F57C00',      // Turuncu
  danger: '#C62828',       // Kırmızı
  dark: '#263238',         // Koyu Gri
  medium: '#546E7A',       // Orta Gri
  light: '#ECEFF1',        // Açık Gri
  white: '#FFFFFF'
}

export default function HomePage({ setCurrentPage, setSearchParams, user }) {
  const [selectedLake, setSelectedLake] = useState(null)
  const [allLakesData, setAllLakesData] = useState(null)
  const [loading, setLoading] = useState(true)

  const { data: metrics, loading: metricsLoading, error: metricsError } = useMetrics()

  // Tüm göllerin verilerini çek
  const fetchAllLakes = useCallback(async () => {
    let isMounted = true;
      try {
        const promises = LAKE_CONFIG.LAKE_IDS.map(async (lakeId) => {
          try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UNIFIED_FORECAST}?lake_id=${lakeId}`)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
            return data
      } catch (err) {
            console.error(`Error fetching ${lakeId}:`, err)
            return {
              status: 'success',
              lake_id: lakeId,
              lake_name: LAKE_CONFIG.LAKE_NAMES[lakeId],
              historical: {
                years: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
                actual: [1000000, 1100000, 1200000, 1300000, 1400000, 1500000, 1600000]
              }
            }
          }
        })
      
      const results = await Promise.all(promises)
      const validResults = results.filter(result => result && result.status === 'success')
        if (isMounted) {
      setAllLakesData(validResults)
        setLoading(false)
    }
      } catch (error) {
        console.error('Error fetching all lakes:', error)
        if (isMounted) {
          setAllLakesData([])
        setLoading(false)
      }
    }
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    fetchAllLakes()
  }, [fetchAllLakes])

  const handlePageChange = (page) => {
    if (setCurrentPage) setCurrentPage(page)
    if (setSearchParams) setSearchParams(new URLSearchParams([['page', page]]))
  }

  const handleLakeSelect = (lakeKey) => {
    setSelectedLake(lakeKey)
  }

  return (
    <div className="homepage-container" style={{ 
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${COLORS.light} 0%, #FFFFFF 100%)`
    }}>

      <div className="homepage-content" style={{ 
        maxWidth: '1600px', 
        margin: '0 auto',
        padding: '40px 20px',
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        
        {/* SOL TARAF - HABER PANELİ */}
        <div style={{
          position: 'sticky',
          top: '100px'
        }}>
          <NewsPanel user={user} />
        </div>

        {/* SAĞ TARAF - ANA İÇERİK */}
        <div>
        
        {/* BAŞLIK */}
        <div style={{
          textAlign: 'center',
          marginBottom: '28px'
        }}>
          <h1 
            style={{
              fontSize: '28px',
              fontWeight: '800',
              color: COLORS.dark,
              margin: '0 0 6px 0',
              letterSpacing: '-0.5px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handlePageChange('home')}
            onMouseOver={(e) => {
              e.target.style.color = COLORS.primary;
              e.target.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              e.target.style.color = COLORS.dark;
              e.target.style.transform = 'scale(1)';
            }}
          >
            AquaTrack
          </h1>
          <p style={{
            fontSize: '20px',
            color: COLORS.medium,
            margin: '0',
            fontWeight: '800'
          }}>
            <span 
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
              onClick={() => handlePageChange('general-water-quantity')}
              onMouseOver={(e) => {
                e.target.style.color = '#0ea5e9';
                e.target.style.background = 'rgba(14, 165, 233, 0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.color = COLORS.medium;
                e.target.style.background = 'transparent';
              }}
            >
              Su Miktarı
            </span>
            {' ve '}
            <span 
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
              onClick={() => handlePageChange('general-water-quality')}
              onMouseOver={(e) => {
                e.target.style.color = '#10b981';
                e.target.style.background = 'rgba(16, 185, 129, 0.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.color = COLORS.medium;
                e.target.style.background = 'transparent';
              }}
            >
              Su Kalitesi
            </span>
            {' İzleme Sistemi'}
          </p>
        </div>

        {/* HARITA - ORİJİNAL MapPage Component */}
        <div className="map-section-card" style={{
          background: COLORS.white,
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${COLORS.light}`,
          height: '600px',
          marginBottom: '32px',
          overflow: 'hidden'
          }}>
            <MapPage 
              onLakeSelect={handleLakeSelect} 
              setCurrentPage={setCurrentPage}
              setSearchParams={setSearchParams}
              selectedLake={selectedLake}
            />
          </div>

        {/* İKİ ANA KART - Su Miktarı ve Su Kalitesi */}
        <div className="main-cards-container" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '40px'
        }}>
          
          {/* SU MİKTARI KARTI */}
          <div className="water-quantity-card" style={{
            background: COLORS.white,
          borderRadius: '16px',
          padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${COLORS.light}`,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '240px'
          }}
          onClick={() => handlePageChange('general-water-quantity')}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
          }}>
            
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: COLORS.dark,
                margin: '0 0 6px 0'
              }}>
                Su Miktarı Analizi
              </h2>
              
              <p style={{ 
                fontSize: '13px',
                color: COLORS.medium,
                margin: '0 0 12px 0',
                lineHeight: '1.4'
              }}>
                Göl seviyeleri, tahmin modelleri ve trend analizleri
              </p>

              {/* Gerçek Veriler */}
              {!metricsLoading && metrics && metrics.data ? (
                <div className="real-metrics" style={{
                  background: `linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)`,
                  borderRadius: '8px',
                  padding: '12px',
                  border: `1px solid rgba(14, 165, 233, 0.2)`
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '800',
                        color: '#0ea5e9',
                        marginBottom: '2px'
                      }}>
                        {metrics.data.H1 ? (100 - metrics.data.H1.avg_wmape).toFixed(1) : '95.0'}%
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: COLORS.medium,
                        fontWeight: '600'
                      }}>
                        Model Doğruluğu
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '800',
                        color: COLORS.accent,
                        marginBottom: '2px'
                      }}>
                        {metrics.data.H1 ? metrics.data.H1.avg_wmape.toFixed(1) : '5.0'}%
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: COLORS.medium,
                        fontWeight: '600'
                      }}>
                        Ortalama Hata
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: COLORS.light,
                  borderRadius: '8px',
                  padding: '12px',
                  color: COLORS.medium,
                  fontSize: '12px'
                }}>
                  Veriler yükleniyor...
                </div>
              )}
            </div>

            <div style={{
              background: `linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)`,
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-block',
              boxShadow: `0 4px 12px rgba(14, 165, 233, 0.3)`,
              marginTop: '6px'
            }}>
              Analizleri Görüntüle →
            </div>
          </div>

          {/* SU KALİTESİ KARTI */}
          <div className="water-quality-card" style={{
            background: COLORS.white,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: `1px solid ${COLORS.light}`,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '240px'
          }}
          onClick={() => handlePageChange('general-water-quality')}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
          }}>
              
            <div>
              <h2 style={{ 
                fontSize: '24px',
                fontWeight: '800',
                color: COLORS.dark,
                margin: '0 0 6px 0'
              }}>
                Su Kalitesi Analizi
              </h2>
              
              <p style={{
                fontSize: '13px',
                color: COLORS.medium,
                margin: '0 0 12px 0',
                lineHeight: '1.4'
              }}>
                Su kalitesi parametreleri, renk analizi ve kirlilik seviyeleri
              </p>

              <div style={{
                background: `linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)`,
                borderRadius: '8px',
                padding: '12px',
                border: `1px solid rgba(16, 185, 129, 0.2)`,
                fontSize: '12px',
                color: COLORS.medium,
                fontWeight: '600'
              }}>
                7 Göl • Su Kalitesi İzleme
              </div>
            </div>

            <div style={{
              background: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-block',
              boxShadow: `0 4px 12px rgba(16, 185, 129, 0.3)`,
              marginTop: '6px'
            }}>
              Analizleri Görüntüle →
            </div>
          </div>
        </div>

      </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
          .homepage-content {
            padding: 32px 16px !important;
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          
          .main-cards-container {
            grid-template-columns: 1fr !important;
            gap: 200px !important;
          }
        }
        
        @media (max-width: 768px) {
          h1 {
            font-size: 28px !important;
          }
          
          p {
            font-size: 14px !important;
          }
          
          .homepage-content {
            padding: 24px 12px !important;
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          .map-section-card {
            height: 400px !important;
            padding: 16px !important;
          }
          
          .main-cards-container {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          .water-quantity-card,
          .water-quality-card {
            padding: 24px 16px !important;
          }
          
          .card-icon {
            width: 60px !important;
            height: 60px !important;
            font-size: 28px !important;
          }
          
          .water-quantity-card h2 {
            font-size: 24px !important;
          }
          
          .water-quality-card h2 {
            font-size: 20px !important;
          }
          
          .water-quantity-card p,
          .water-quality-card p {
            font-size: 14px !important;
          }
          
          .card-header {
            flex-direction: column;
            text-align: center;
            align-items: center !important;
          }
          
          .icon-wrapper {
            margin-right: 0 !important;
            margin-bottom: 12px !important;
            width: 48px !important;
            height: 48px !important;
          }
          
          .icon-wrapper svg {
            width: 24px !important;
            height: 24px !important;
          }
          
          .section-title {
            font-size: 22px !important;
            text-align: center;
          }
          
          .section-subtitle {
            font-size: 14px !important;
            text-align: center;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          .metric-card {
            padding: 20px !important;
          }
          
          .info-box {
            flex-direction: column;
            text-align: center;
            align-items: center !important;
          }
          
          .lakes-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
        
        @media (max-width: 480px) {
          
          .homepage-content {
            padding: 20px 10px !important;
          }
          
          .map-section-card {
            height: 350px !important;
            padding: 12px !important;
          }
          
          .performance-card,
          .comparison-card {
            padding: 20px 12px !important;
          }
          
          .icon-wrapper {
            width: 40px !important;
            height: 40px !important;
          }
          
          .icon-wrapper svg {
            width: 20px !important;
            height: 20px !important;
          }
          
          .section-title {
            font-size: 20px !important;
          }
          
          .section-subtitle {
            font-size: 13px !important;
          }
          
          .metric-card {
            padding: 16px !important;
          }
          
          .metric-card > div:nth-child(2) {
            font-size: 28px !important;
          }
        }
      `}</style>
    </div>
  )
}
