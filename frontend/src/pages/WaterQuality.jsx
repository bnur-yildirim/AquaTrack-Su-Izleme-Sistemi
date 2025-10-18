import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import AnimatedScatterToBar from '../components/AnimatedScatterToBar'
import YearlyClusterPieCharts from '../components/YearlyClusterPieCharts'
import WaterQuality3DScatter from '../components/WaterQuality3DScatter'

/**
 * GÖLE ÖZEL SU KALİTESİ DETAY SAYFASI
 * Tek bir gölün 2018-2024 arası su kalitesi analizi
 * selectedLake prop'u ile çalışır
 */

const API_BASE = 'http://localhost:5000'

const CLUSTER_COLORS = {
  0: { bg: '#dcfce7', border: '#86efac', text: '#166534', name: 'Normal Su Kalitesi' },
  1: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', name: 'Alg Patlaması Riski' },
  2: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', name: 'Tuzlu Su' },
  3: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', name: 'Özel Coğrafi Durum' }
}

const LAKE_ID_MAP = {
    'tuz': 140,
    'van': 141,
    'ulubat': 1321,
    'egirdir': 1340,
    'burdur': 1342,
    'sapanca': 14510,
    'salda': 14741
  }

const LAKE_NAMES = {
      'tuz': 'Tuz Gölü',
      'van': 'Van Gölü',
      'ulubat': 'Ulubat Gölü',
      'egirdir': 'Eğirdir Gölü',
      'burdur': 'Burdur Gölü',
      'sapanca': 'Sapanca Gölü',
      'salda': 'Salda Gölü'
}

export default function WaterQuality({ selectedLake = 'van' }) {
  const [lakeData, setLakeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Seçili göl değiştiğinde veri çek
  useEffect(() => {
    if (!selectedLake) return

    const lakeId = LAKE_ID_MAP[selectedLake]
    if (!lakeId) {
      setError('Geçersiz göl seçimi')
      setLoading(false)
      return
    }

    fetchLakeData(lakeId)
  }, [selectedLake])

  const fetchLakeData = async (lakeId) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/quality/lake/${lakeId}/cluster`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      setLakeData(data)
      setLoading(false)
    } catch (err) {
      console.error('Lake quality error:', err)
      setError('Veri yüklenemedi')
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc',
          display: 'flex',
                      alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
                      <div style={{
            width: 60,
            height: 60,
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ fontSize: '1.125rem', color: '#64748b', fontWeight: '600' }}>
            {LAKE_NAMES[selectedLake]} Su Kalitesi Verileri Yükleniyor...
          </p>
                      </div>
                    </div>
    )
  }

  // Error state
  if (error || !lakeData) {
    return (
                    <div style={{
        minHeight: '100vh', 
        background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
        justifyContent: 'center'
      }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
          padding: 40,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              textAlign: 'center',
          maxWidth: 400
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: 12 }}>
            Veri Yüklenemedi
                    </h2>
          <p style={{ color: '#64748b', marginBottom: 20 }}>
            {error || 'Su kalitesi verileri bulunamadı'}
          </p>
          <button
            onClick={() => fetchLakeData(LAKE_ID_MAP[selectedLake])}
            style={{
              background: '#3b82f6',
                          color: 'white',
              border: 'none',
                              borderRadius: 8,
              padding: '12px 24px',
              fontSize: '0.95rem',
                              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Tekrar Dene
          </button>
                          </div>
                        </div>
                      )
  }

  const lakeName = LAKE_NAMES[selectedLake]
  const latestData = lakeData.history?.[lakeData.history.length - 1]
  const clusterInfo = CLUSTER_COLORS[lakeData.current_cluster] || CLUSTER_COLORS[0]

  // Yıllara göre grupla
              const yearlyData = {}
  lakeData.history?.forEach(record => {
    const date = new Date(record.date)
    const year = date.getFullYear()
    
                if (!yearlyData[year]) {
      yearlyData[year] = []
    }
    yearlyData[year].push(record)
  })

  // Yıllık ortalamalar
  const yearlyAverages = Object.entries(yearlyData).map(([year, records]) => ({
    year,
    avg_ndwi: (records.reduce((sum, r) => sum + r.ndwi, 0) / records.length).toFixed(2),
    avg_chl_a: (records.reduce((sum, r) => sum + r.chl_a, 0) / records.length).toFixed(2),
    avg_turbidity: (records.reduce((sum, r) => sum + r.turbidity, 0) / records.length).toFixed(2),
    avg_wri: (records.reduce((sum, r) => sum + r.wri, 0) / records.length).toFixed(2),
    count: records.length
              })).sort((a, b) => a.year - b.year)

              return (
                  <div style={{
      minHeight: '100vh',
                    background: '#f8fafc',
      padding: '20px'
    }}>
      {/* HEADER */}
                  <div style={{
                    background: 'white',
        borderRadius: 16,
        padding: '32px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        marginBottom: 30,
        maxWidth: '1400px',
        margin: '0 auto 30px'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌊</div>
        <h1 style={{ 
          fontSize: '1.875rem',
                      fontWeight: '600',
          margin: 0,
          color: '#1e293b',
          marginBottom: 8
        }}>
          {lakeName} - Detaylı Su Kalitesi Analizi
        </h1>
                    <div style={{
          display: 'inline-block',
          background: clusterInfo.bg,
          border: `2px solid ${clusterInfo.border}`,
          borderRadius: 20,
          padding: '8px 20px',
          marginTop: 12
        }}>
          <span style={{ 
            fontSize: '0.95rem',
                              fontWeight: '700',
            color: clusterInfo.text
                            }}>
            {lakeData.interpretation || clusterInfo.name}
          </span>
                            </div>
        <p style={{ 
          fontSize: '0.875rem',
          margin: '12px 0 0 0',
          color: '#64748b'
        }}>
          K-Means Unsupervised Learning ile 2018-2024 arası {lakeData.total_records} ölçüm analizi
        </p>
                    </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
        
        {/* ANİMASYONLU SCATTER → BAR GRAFİK */}
        <AnimatedScatterToBar 
          lakeHistory={lakeData}
          lakeName={lakeName}
        />

        {/* YILLARA GÖRE CLUSTER DAĞILIMI - PIE CHARTS */}
        <YearlyClusterPieCharts 
          lakeHistory={lakeData}
          lakeName={lakeName}
        />

        {/* 3D SCATTER PLOT - İNTERAKTİF ANALİZ */}
        <WaterQuality3DScatter 
          data={lakeData.history}
          title={`${lakeName} - 3D Su Kalitesi Analizi`}
          selectedLake={selectedLake}
        />

        {/* GÜNCEL DURUM KARTLARİ */}
        {latestData && (
                      <div style={{
                        display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            {[
              { label: 'NDWI', value: latestData.ndwi.toFixed(2), desc: 'Su İndeksi', color: '#3b82f6' },
              { label: 'Chlorophyll-a', value: latestData.chl_a.toFixed(2), desc: 'μg/L', color: '#10b981' },
              { label: 'Turbidity', value: latestData.turbidity.toFixed(2), desc: 'Bulanıklık', color: '#f59e0b' },
              { label: 'WRI', value: latestData.wri.toFixed(2), desc: 'Su Yansıma', color: '#8b5cf6' }
            ].map((metric, i) => (
              <div key={i} style={{
                            background: 'white',
                borderRadius: 12,
                padding: 20,
                border: `2px solid ${metric.color}30`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            textAlign: 'center'
                          }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginBottom: 8 }}>
                  {metric.label}
                            </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: metric.color, marginBottom: 4 }}>
                  {metric.value}
                            </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {metric.desc}
                            </div>
                          </div>
                        ))}
                      </div>
        )}

        {/* YILLARA GÖRE ORTALAMALAR - BAR CHART */}
                  <div style={{
                    background: 'white',
          borderRadius: 16,
                    padding: 24,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0'
                  }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', marginBottom: 20 }}>
            📊 Yıllara Göre Su Kalitesi Parametreleri
          </h2>
          
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={yearlyAverages} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" style={{ fontSize: '0.875rem', fill: '#64748b' }} />
              <YAxis yAxisId="left" style={{ fontSize: '0.875rem', fill: '#64748b' }} />
              <YAxis yAxisId="right" orientation="right" style={{ fontSize: '0.875rem', fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: 8 
                          }}
                        />
              <Legend />
              <Bar yAxisId="left" dataKey="avg_ndwi" fill="#3b82f6" name="NDWI" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="avg_chl_a" fill="#10b981" name="Chl-a" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="avg_turbidity" fill="#f59e0b" name="Turbidity" radius={[8, 8, 0, 0]} />
            </BarChart>
                    </ResponsiveContainer>
                  </div>

        {/* BENZER GÖLLER */}
        {lakeData.similar_lakes && lakeData.similar_lakes.length > 0 && (
                <div style={{
                  background: 'white',
            borderRadius: 16,
                  padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0'
                }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', marginBottom: 16 }}>
              🔗 Benzer Su Kalitesine Sahip Göller
            </h2>
                  <div style={{ 
              display: 'flex',
              flexWrap: 'wrap',
                    gap: 12
                  }}>
              {lakeData.similar_lakes.map((similarLake, i) => (
                <div key={i} style={{
                        background: '#f8fafc',
                  padding: '10px 20px',
                  borderRadius: 8,
                        border: '1px solid #e2e8f0',
                  fontSize: '0.95rem',
                        fontWeight: '600',
                  color: '#1e293b'
                }}>
                  🏔️ {similarLake}
                    </div>
                  ))}
                </div>
                  </div>
        )}

        {/* İSTATİSTİKLER */}
                <div style={{ 
          background: clusterInfo.bg,
          borderRadius: 16,
                padding: 24,
          border: `2px solid ${clusterInfo.border}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
                <div style={{ 
                  display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 16 
                }}>
            {[
              { label: 'Toplam Ölçüm', value: lakeData.total_records, icon: '📊' },
              { label: 'Yıl Aralığı', value: `${yearlyAverages[0]?.year}-${yearlyAverages[yearlyAverages.length-1]?.year}`, icon: '📅' },
              { label: 'Cluster Türü', value: `C${lakeData.current_cluster}`, icon: '🎯' },
              { label: 'Güven Skoru', value: `${(lakeData.confidence * 100).toFixed(1)}%`, icon: '✅' }
            ].map((stat, i) => (
              <div key={i} style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 10,
                    textAlign: 'center',
                border: `1px solid ${clusterInfo.border}`
                  }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: clusterInfo.text }}>
                  {stat.value}
                    </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                  {stat.label}
                    </div>
                  </div>
            ))}
                  </div>
                  
                  <div style={{
            marginTop: 20,
                    padding: 16,
            background: 'white',
                    borderRadius: 10,
            border: `1px solid ${clusterInfo.border}`
                  }}>
            <div style={{ fontWeight: '700', color: clusterInfo.text, marginBottom: 8 }}>
              💡 {lakeData.interpretation}
                    </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
              {lakeData.current_cluster === 0 && 
                'Bu göl standart su kalitesi parametrelerine sahip. Dengeli NDWI ve düşük turbidity değerleri sağlıklı su yapısını gösteriyor.'}
              {lakeData.current_cluster === 1 && 
                'Yüksek Chlorophyll-a konsantrasyonu tespit edildi. Alg patlaması riski mevcut. Düzenli izleme önerilir.'}
              {lakeData.current_cluster === 2 && 
                'Tuzlu göl karakteristikleri. Yüksek WRI değerleri ve düşük NDWI tuzlu su yapısını gösteriyor.'}
              {lakeData.current_cluster === 3 && 
                'Özel coğrafi özelliklere sahip göl. Benzersiz spektral özellikler ve alkalin su yapısı.'}
                    </div>
                        </div>
                        </div>

      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
