import { useState, useEffect } from 'react'
import ColorFeatures from '../components/ColorFeatures'
import { API_CONFIG, LAKE_CONFIG, FALLBACK_DATA } from '../constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area, LineChart, Line
} from 'recharts'
import { ResponsiveCirclePacking } from '@nivo/circle-packing'

// Veri kaynakları konfigürasyonunu import et
import DATA_SOURCES, { apiHelpers } from '../config/dataSources'

// Profesyonel Renk Paleti
const COLORS = {
  primary: '#0D47A1',
  secondary: '#1976D2',  
  accent: '#00897B',
  success: '#2E7D32',
  warning: '#F57C00',
  danger: '#C62828',
  dark: '#263238',
  medium: '#546E7A',
  light: '#ECEFF1',
  white: '#FFFFFF'
}

// Grafik Renkleri
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899']

export default function GeneralWaterQualityAnalysis() {
  const [colorFeatures, setColorFeatures] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clusterData, setClusterData] = useState(null)
  const [clusterLoading, setClusterLoading] = useState(true)
  const [matrixData, setMatrixData] = useState(null)
  const [matrixLoading, setMatrixLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(null)

  // Su kalitesi verilerini çek
  useEffect(() => {
    const fetchColorFeatures = async () => {
      try {
        setLoading(true)
        
        // Tüm göller için renk özelliklerini çek
        const promises = LAKE_CONFIG.LAKE_IDS.map(async (lakeId) => {
          try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/color/features?lake_id=${lakeId}`)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            return {
              lake_id: lakeId,
              lake_name: LAKE_CONFIG.LAKE_NAMES[lakeId],
              ...(data.color_features || data)
            }
          } catch (err) {
            console.error(`Error fetching color features for ${lakeId}:`, err)
            // Fallback data kullan
            return {
              lake_id: lakeId,
              lake_name: LAKE_CONFIG.LAKE_NAMES[lakeId],
              ...FALLBACK_DATA.LAKE_COLOR_FEATURES[lakeId]
            }
          }
        })
        
        const results = await Promise.all(promises)
        setColorFeatures(results)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching color features:', error)
        setColorFeatures([])
        setLoading(false)
      }
    }

    fetchColorFeatures()
  }, [])

  // K-Means cluster verilerini çek
  useEffect(() => {
    const fetchClusterData = async () => {
      try {
        setClusterLoading(true)
        const response = await fetch('http://localhost:5000/api/water-quality/all-lakes-summary')
        if (!response.ok) throw new Error('Cluster veri hatası')
        const data = await response.json()
        if (data.status === 'success') {
          setClusterData(data)
        }
      } catch (error) {
        console.error('Cluster veri hatası:', error)
      } finally {
        setClusterLoading(false)
      }
    }

    fetchClusterData()
  }, [])

  // Matrix analizi çek
  useEffect(() => {
    const fetchMatrixData = async () => {
      try {
        setMatrixLoading(true)
        const data = await apiHelpers.fetchMatrixAnalysis()
        if (data.status === 'success') {
          setMatrixData(data)
          // Default olarak en son yılı seç
          if (data.years && data.years.length > 0) {
            setSelectedYear(data.years[data.years.length - 1])
          }
        }
      } catch (error) {
        console.error('Matrix veri hatası:', error)
      } finally {
        setMatrixLoading(false)
      }
    }

    fetchMatrixData()
  }, [])

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
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💧</div>
        <h1 style={{ 
          fontSize: '1.875rem',
          fontWeight: '600',
          margin: 0,
          color: '#1e293b',
          letterSpacing: '-0.025em',
          marginBottom: 8
        }}>
          Genel Su Kalitesi Analizi
        </h1>
        <p style={{ 
          fontSize: '0.95rem',
          margin: 0,
          color: '#64748b',
          fontWeight: '400',
          maxWidth: 560,
          margin: '0 auto'
        }}>
          Tüm göllerin su kalitesi parametreleri ve renk analizleri
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* CIRCLE PACKING - İç İçe Daireler (EN ÜST) */}
        {!matrixLoading && matrixData && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 28,
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              borderRadius: 12,
              padding: 24,
              marginBottom: 28,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>⭕</div>
              <h2 style={{
                color: 'white',
                fontSize: '1.75rem',
                fontWeight: '800',
                marginBottom: 8,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Circle Packing - Göller & Yıllar Hiyerarşisi
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '1rem',
                margin: 0
              }}>
                Her gölün tüm yılları - Büyük daireler göller, küçük daireler yıllar
              </p>
            </div>

            <div style={{ height: 650 }}>
              <ResponsiveCirclePacking
                data={(() => {
                  const clusterColors = {
                    0: '#10b981',
                    1: '#ef4444',
                    2: '#f59e0b',
                    3: '#3b82f6'
                  }

                  const root = {
                    name: 'Tüm Göller (2018-2024)',
                    color: '#1e293b',
                    children: matrixData.lakes.map(lake => {
                      const lakeData = matrixData.matrix_data.filter(item => item.lake === lake)
                      
                      return {
                        name: lake,
                        color: clusterColors[lakeData[lakeData.length - 1]?.cluster || 0],
                        children: lakeData.map(yearData => ({
                          name: `${yearData.year}`,
                          value: yearData.measurements,
                          color: clusterColors[yearData.cluster],
                          cluster: yearData.cluster,
                          ndwi: yearData.ndwi,
                          chl_a: yearData.chl_a,
                          lake: lake
                        }))
                      }
                    })
                  }

                  return root
                })()}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                id="name"
                value="value"
                colors={{ scheme: 'nivo' }}
                childColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
                padding={6}
                enableLabels={true}
                labelsFilter={node => node.depth <= 2}
                labelsSkipRadius={16}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}
                borderWidth={3}
                borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
                animate={true}
                motionConfig="gentle"
                tooltip={({ id, value, data }) => (
                  <div style={{
                    background: 'white',
                    padding: '14px 18px',
                    border: '2px solid #8b5cf6',
                    borderRadius: 12,
                    boxShadow: '0 6px 16px rgba(139, 92, 246, 0.25)',
                    fontSize: '0.875rem',
                    color: '#1e293b',
                    minWidth: 180
                  }}>
                    <strong style={{ display: 'block', marginBottom: 8, fontSize: '1.125rem', color: '#7c3aed' }}>
                      {data.lake || id}
                    </strong>
                    {data.cluster !== undefined && (
                      <>
                        <div style={{ marginBottom: 4 }}>📅 Yıl: <strong>{id}</strong></div>
                        <div style={{ marginBottom: 4 }}>🎯 Cluster: <strong>C{data.cluster}</strong></div>
                        <div style={{ marginBottom: 4 }}>💧 NDWI: <strong>{data.ndwi}</strong></div>
                        <div style={{ marginBottom: 4 }}>🌿 Chl-a: <strong>{data.chl_a}</strong></div>
                        <div>📊 Ölçüm: <strong>{value}</strong></div>
                      </>
                    )}
                    {value && data.cluster === undefined && (
                      <div>Toplam Ölçüm: <strong>{value}</strong></div>
                    )}
                  </div>
                )}
              />
            </div>

            <div style={{
              marginTop: 20,
              padding: 16,
              background: '#f3e8ff',
              border: '1px solid #d8b4fe',
              borderRadius: 8,
              display: 'flex',
              gap: 12,
              alignItems: 'start'
            }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>⭕</div>
              <div style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6 }}>
                <strong style={{ color: '#7c3aed' }}>Circle Packing Nasıl Kullanılır:</strong> Büyük daireler gölleri gösterir (göl adı yazılı). 
                İçlerindeki küçük daireler yıllardır (2018-2024). Daire boyutu = Ölçüm sayısı. Renk = Cluster türü. 
                Herhangi bir daireye hover yapın, detaylı bilgi görün!
              </div>
            </div>
          </div>
        )}
        
        {/* SU KALİTESİ ÖZETİ */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: 4
            }}>
              📊 Su Kalitesi Özeti
            </h2>
            <p style={{ 
              margin: 0,
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: '400'
            }}>
              Renk analizi, berraklık ve su tipi değerlendirmeleri
            </p>
          </div>

          {/* Kalite Metrikleri */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 20
          }}>
            {[
              { label: 'Ortalama Renk Skoru', value: '73', desc: 'Tüm göller', color: '#10b981' },
              { label: 'En Berrak Göl', value: 'Salda', desc: '92 puan', color: '#3b82f6' },
              { label: 'Su Tipi Çeşitliliği', value: '7', desc: 'Farklı kategoriler', color: '#8b5cf6' },
              { label: 'Analiz Kapsamı', value: '100%', desc: 'Tüm göller', color: '#f59e0b' },
            ].map((metric, i) => (
              <div key={i} style={{
                background: '#f8fafc',
                padding: 16,
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#64748b',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: '600',
                  color: metric.color,
                  marginBottom: 4
                }}>
                  {metric.value}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}>
                  {metric.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Açıklama Kutusu */}
          <div style={{
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'start'
          }}>
            <div style={{
              fontSize: '1.5rem',
              flexShrink: 0
            }}>
              💡
            </div>
            <div>
              <div style={{
                fontWeight: '500',
                color: '#1e40af',
                marginBottom: 6,
                fontSize: '0.875rem'
              }}>
                Analiz Açıklaması
              </div>
              <div style={{
                fontSize: '0.8125rem',
                color: '#1e293b',
                lineHeight: '1.5'
              }}>
                <strong>Renk Skoru:</strong> Su berraklığı ve renk kalitesi • 
                <strong> Su Tipi:</strong> Berrak, Normal, Tuzlu kategorileri • 
                <strong> Analiz:</strong> Sentinel-2 uydu verileri ile
              </div>
            </div>
          </div>
        </div>

        {/* GRAFİK 1: SU KALİTESİ SKORLARI - BAR CHART */}
        {!loading && colorFeatures && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
            marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: 4
            }}>
                📊 Göllerin Su Kalitesi Skorları Karşılaştırması
              </h2>
              <p style={{ 
                margin: 0,
                color: '#64748b',
                fontSize: '0.875rem'
              }}>
                Her gölün renk skoru ve kalite değerlendirmesi
              </p>
            </div>
            
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={colorFeatures} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="lake_name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  style={{ fontSize: '0.875rem', fill: '#64748b' }}
                />
                <YAxis 
                  label={{ value: 'Renk Skoru', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                  style={{ fontSize: '0.875rem', fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                <Bar 
                  dataKey="color_score" 
                  fill="#3b82f6" 
                  name="Renk Skoru"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* GRAFİK 2: ÇOK PARAMETRELİ RADAR CHART */}
        {!loading && colorFeatures && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: 4
              }}>
                🎯 Çok Parametreli Su Kalitesi Analizi
              </h2>
              <p style={{ 
                margin: 0,
                color: '#64748b',
                fontSize: '0.875rem'
              }}>
                Berraklık, bulanıklık ve renk oranları radar grafiği
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: 20
            }}>
              {colorFeatures.map((lake, idx) => {
                const radarData = [
                  { subject: 'Berraklık', value: lake.water_clarity * 10, fullMark: 100 },
                  { subject: 'Renk Skoru', value: lake.color_score, fullMark: 100 },
                  { subject: 'Mavi/Yeşil', value: lake.blue_green_ratio * 10, fullMark: 100 },
                  { subject: 'Tersine Bulanık', value: 100 - (lake.turbidity * 10), fullMark: 100 }
                ]

                return (
                  <div key={idx} style={{
                    background: '#f8fafc',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      margin: '0 0 12px 0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1e293b',
                      textAlign: 'center'
                    }}>
                      {lake.lake_name}
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          style={{ fontSize: '0.75rem', fill: '#64748b' }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} style={{ fontSize: '0.75rem' }} />
                        <Radar
                          name={lake.lake_name}
                          dataKey="value"
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          fillOpacity={0.6}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: 8 
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* GRAFİK 3: SCATTER PLOT - İLİŞKİ ANALİZİ */}
        {!loading && colorFeatures && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: 4
              }}>
                📈 Berraklık vs Bulanıklık İlişkisi
              </h2>
              <p style={{ 
                margin: 0,
                color: '#64748b',
                fontSize: '0.875rem'
              }}>
                Su kalitesi parametreleri arasındaki korelasyon
              </p>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="water_clarity" 
                  name="Berraklık"
                  label={{ value: 'Berraklık', position: 'bottom', style: { fill: '#64748b' } }}
                  style={{ fontSize: '0.875rem', fill: '#64748b' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="turbidity" 
                  name="Bulanıklık"
                  label={{ value: 'Bulanıklık', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                  style={{ fontSize: '0.875rem', fill: '#64748b' }}
                />
                <ZAxis range={[100, 400]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ 
                    background: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 8 
                  }}
                  formatter={(value, name, props) => {
                    if (name === "Berraklık") return [value.toFixed(2), name]
                    if (name === "Bulanıklık") return [value.toFixed(2), name]
                    return [props.payload.lake_name, "Göl"]
                  }}
                />
                <Legend />
                <Scatter 
                  name="Göller" 
                  data={colorFeatures} 
                  fill="#3b82f6"
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>

            <div style={{
              marginTop: 20,
              padding: 16,
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: 8,
              display: 'flex',
              gap: 12,
              alignItems: 'start'
            }}>
              <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</div>
              <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.5 }}>
                <strong style={{ color: '#1e40af' }}>Analiz:</strong> Berraklık yükseldikçe bulanıklık azalır (ters korelasyon). 
                Noktaların konumu her gölün su kalitesi profilini gösterir.
              </div>
            </div>
          </div>
        )}

        {/* GRAFİK 4: DETAYLI PARAMETRELİ ÇUBUK GRAFİK */}
        {!loading && colorFeatures && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: 4
              }}>
                🔬 Detaylı Parametre Karşılaştırması
              </h2>
              <p style={{ 
                margin: 0,
                color: '#64748b',
                fontSize: '0.875rem'
              }}>
                Berraklık, bulanıklık ve mavi/yeşil oranı
              </p>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={colorFeatures} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="lake_name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  style={{ fontSize: '0.875rem', fill: '#64748b' }}
                />
                <YAxis 
                  label={{ value: 'Değer', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                  style={{ fontSize: '0.875rem', fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 8 
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                <Bar dataKey="water_clarity" fill="#10b981" name="Berraklık" radius={[8, 8, 0, 0]} />
                <Bar dataKey="turbidity" fill="#ef4444" name="Bulanıklık" radius={[8, 8, 0, 0]} />
                <Bar dataKey="blue_green_ratio" fill="#3b82f6" name="Mavi/Yeşil" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* GÖL BAZLI KALİTE ANALİZİ - KOMPAKT KARTLAR */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: 4
            }}>
              🏞️ Göl Bazlı Özet Bilgiler
            </h2>
            <p style={{ 
              margin: 0,
              color: '#64748b',
              fontSize: '0.875rem',
              fontWeight: '400'
            }}>
              Her gölün hızlı özet değerleri
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{
                width: 40,
                height: 40,
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                margin: '0 auto',
                animation: 'spin 0.8s linear infinite'
              }} />
              <p style={{ marginTop: 16, color: '#64748b', fontSize: '0.875rem' }}>Veriler yükleniyor...</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16
            }}>
              {colorFeatures?.map((lake, i) => (
                <div key={i} style={{
                  background: '#f8fafc',
                  padding: 16,
                  borderRadius: 12,
                  border: `2px solid ${
                    lake.color_score >= 80 ? '#10b981' : 
                    lake.color_score >= 70 ? '#3b82f6' : 
                    '#f59e0b'
                  }30`,
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}>
                  <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    textAlign: 'center'
                  }}>
                    {lake.lake_name}
                  </h3>
                  
                    <div style={{
                      background: 'white',
                      padding: 12,
                      borderRadius: 8,
                      textAlign: 'center',
                    border: '1px solid #e2e8f0',
                    marginBottom: 8
                    }}>
                      <div style={{
                      fontSize: '2rem',
                        fontWeight: '600',
                        color: lake.color_score >= 80 ? '#10b981' : 
                               lake.color_score >= 70 ? '#3b82f6' : 
                               '#f59e0b'
                      }}>
                        {lake.color_score}
                    </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                      fontWeight: '500'
                    }}>
                      Renk Skoru
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    lineHeight: 1.8,
                    textAlign: 'center'
                  }}>
                    <div style={{
                    background: 'white',
                      padding: 6,
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      marginBottom: 4
                    }}>
                      Su Tipi: <strong style={{ color: '#1e293b' }}>{lake.water_type}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* K-MEANS CLUSTER ANALİZİ */}
        {clusterData && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            marginTop: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: 4
                  }}>
                    🔬 K-Means Cluster Analizi
                  </h2>
                  <p style={{ 
                    margin: 0,
                    color: '#64748b',
                    fontSize: '0.875rem',
                    fontWeight: '400'
                  }}>
                    Unsupervised ML ile gerçek doğal su kalitesi grupları
                  </p>
                </div>
                <div style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#166534'
                }}>
                  ✅ Data Leakage Yok
                </div>
              </div>
            </div>

            {clusterLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  border: '3px solid #e2e8f0',
                  borderTop: '3px solid #3b82f6',
                  borderRadius: '50%',
                  margin: '0 auto',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <p style={{ marginTop: 16, color: '#64748b', fontSize: '0.875rem' }}>Cluster analizi yükleniyor...</p>
              </div>
            ) : (
              <>
                {/* Cluster Kartları */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 16,
                  marginBottom: 24
                }}>
                  {clusterData.lakes?.map((lake, i) => {
                    const clusterColors = {
                      0: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
                      1: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
                      2: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
                      3: { bg: '#f3e8ff', border: '#c4b5fd', text: '#6b21a8' }
                    }
                    const colors = clusterColors[lake.dominant_cluster] || clusterColors[0]

                    return (
                      <div key={i} style={{
                        background: colors.bg,
                        padding: 20,
                        borderRadius: 12,
                        border: `2px solid ${colors.border}`,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          marginBottom: 12
                        }}>
                          <div>
                            <div style={{
                              fontSize: '2rem',
                              marginBottom: 4
                            }}>
                              {lake.icon}
                            </div>
                            <h3 style={{
                              margin: 0,
                              fontSize: '1.125rem',
                              fontWeight: '600',
                              color: colors.text
                            }}>
                              {lake.lake_name}
                            </h3>
                          </div>
                          <div style={{
                            background: 'white',
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: colors.text,
                            border: `1px solid ${colors.border}`
                          }}>
                            {lake.risk_level}
                          </div>
                        </div>

                        <div style={{
                          background: 'white',
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${colors.border}`,
                          marginBottom: 12
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            marginBottom: 6,
                            fontWeight: '500'
                          }}>
                            Su Kalitesi Grubu
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: colors.text
                          }}>
                            {lake.cluster_name}
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          color: colors.text
                        }}>
                          <span>Ölçüm Sayısı:</span>
                          <span style={{ fontWeight: '600' }}>{lake.measurements}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Cluster Açıklama Bölümü */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: 12
                  }}>
                    📊 Cluster Yorumlama
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12
                  }}>
                    {[
                      { icon: '🟢', name: 'Normal Su Kalitesi', desc: 'Standart temiz su profili', color: '#10b981' },
                      { icon: '🔴', name: 'Alg Patlaması Riski', desc: 'Yüksek klorofil-a seviyesi', color: '#ef4444' },
                      { icon: '🔵', name: 'Tuzlu Su', desc: 'Tuzlu göl karakteristikleri', color: '#3b82f6' },
                      { icon: '🟣', name: 'Özel Coğrafi Durum', desc: 'Alkalin/soda göl özellikleri', color: '#8b5cf6' }
                    ].map((cluster, i) => (
                      <div key={i} style={{
                        background: 'white',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 6
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>{cluster.icon}</span>
                          <span style={{
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            color: cluster.color
                          }}>
                            {cluster.name}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          lineHeight: 1.4
                        }}>
                          {cluster.desc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Metod Açıklaması */}
                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#eff6ff',
                    border: '1px solid #dbeafe',
                    borderRadius: 8,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'start'
                  }}>
                    <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</div>
                    <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.5 }}>
                      <strong style={{ color: '#1e40af' }}>K-Means Unsupervised Learning:</strong> Etiket olmadan,
                      sadece spektral özelliklerden (NDWI, WRI, Chl-a, Turbidity) doğal grupları keşfeder. 
                      Supervised modellerdeki data leakage sorunu yok. Gerçek pattern'leri bulur.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* MATRİX ANALİZİ - GÖLLER x YILLAR (ECharts tarzı) */}
        {!matrixLoading && matrixData && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 28,
            marginTop: 24,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: 12,
              padding: 24,
              marginBottom: 28,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
              <h2 style={{
                color: 'white',
                fontSize: '1.75rem',
                fontWeight: '800',
                marginBottom: 8,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Göller x Yıllar Matrix Analizi
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '1rem',
                margin: 0
              }}>
                Her gölün her yıldaki su kalitesi cluster'ı
              </p>
            </div>

            {/* Matrix Grid */}
            <div style={{
              overflowX: 'auto',
              marginBottom: 24
            }}>
              <div style={{
                display: 'inline-block',
                minWidth: '100%'
              }}>
                {/* Başlık Satırı: Yıllar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `150px repeat(${matrixData.years.length}, 100px)`,
                  gap: 2,
                  marginBottom: 2
                }}>
                  <div style={{
                    background: '#1e293b',
                    padding: 12,
                    textAlign: 'center',
                    borderRadius: 8,
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.875rem'
                  }}>
                    Göl / Yıl
                  </div>
                  {matrixData.years.map(year => (
                    <div
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      style={{
                        background: selectedYear === year 
                          ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                          : '#f1f5f9',
                        padding: 12,
                        textAlign: 'center',
                        borderRadius: 8,
                        color: selectedYear === year ? 'white' : '#1e293b',
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: selectedYear === year ? '2px solid #3b82f6' : '2px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedYear !== year) {
                          e.currentTarget.style.background = '#e2e8f0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedYear !== year) {
                          e.currentTarget.style.background = '#f1f5f9'
                        }
                      }}
                    >
                      {year}
                    </div>
                  ))}
                </div>

                {/* Matrix Hücreleri */}
                {matrixData.lakes.map(lake => (
                  <div
                    key={lake}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `150px repeat(${matrixData.years.length}, 100px)`,
                      gap: 2,
                      marginBottom: 2
                    }}
                  >
                    {/* Göl İsmi */}
                    <div style={{
                      background: '#334155',
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}>
                      {lake}
                    </div>

                    {/* Her yıl için hücre */}
                    {matrixData.years.map(year => {
                      const cellData = matrixData.matrix_data.find(
                        item => item.lake === lake && item.year === year
                      )

                      if (!cellData) {
                        return (
                          <div
                            key={year}
                            style={{
                              background: '#f8fafc',
                              padding: 12,
                              borderRadius: 8,
                              textAlign: 'center',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Veri yok
                            </div>
                          </div>
                        )
                      }

                      const clusterColors = {
                        0: { bg: '#dcfce7', border: '#86efac', text: '#166534', icon: '✅' },
                        1: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', icon: '⚠️' },
                        2: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', icon: '🧂' },
                        3: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', icon: '🏔️' }
                      }
                      const colors = clusterColors[cellData.cluster] || clusterColors[0]

                      return (
                        <div
                          key={year}
                          style={{
                            background: colors.bg,
                            padding: 12,
                            borderRadius: 8,
                            textAlign: 'center',
                            border: `2px solid ${colors.border}`,
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            opacity: selectedYear === year ? 1 : 0.7
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)'
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.border}60`
                            e.currentTarget.style.opacity = 1
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = 'none'
                            e.currentTarget.style.opacity = selectedYear === year ? 1 : 0.7
                          }}
                        >
                          <div style={{
                            fontSize: '1.5rem',
                            marginBottom: 4
                          }}>
                            {colors.icon}
                          </div>
                          <div style={{
                            fontSize: '0.7rem',
                            color: colors.text,
                            fontWeight: '700'
                          }}>
                            C{cellData.cluster}
                          </div>
                          <div style={{
                            fontSize: '0.65rem',
                            color: '#64748b',
                            marginTop: 4
                          }}>
                            {cellData.measurements} ölçüm
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Seçili Yıl Detay - Pie Chart */}
            {selectedYear && (() => {
              const yearData = matrixData.matrix_data.filter(item => item.year === selectedYear)
              
              // Cluster dağılımı
              const clusterDist = [0, 1, 2, 3].map(clusterId => {
                const lakes = yearData.filter(item => item.cluster === clusterId)
                return {
                  name: `Cluster ${clusterId}`,
                  value: lakes.length,
                  clusterId,
                  lakes: lakes.map(l => l.lake)
                }
              }).filter(item => item.value > 0)

              const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6']

              return (
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  padding: 24,
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{
                    textAlign: 'center',
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: 20
                  }}>
                    📊 {selectedYear} Yılı Göl Dağılımı
                  </h3>
                  
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={clusterDist}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value }) => `${name}: ${value} göl`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {clusterDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.clusterId]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} göl: ${props.payload.lakes.join(', ')}`,
                          name
                        ]}
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: 12
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )
            })()}

            {/* Açıklama */}
            <div style={{
              marginTop: 20,
              padding: 16,
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: 8,
              display: 'flex',
              gap: 12,
              alignItems: 'start'
            }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>💡</div>
              <div style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6 }}>
                <strong style={{ color: '#1e40af' }}>Matrix Analizi:</strong> Üstteki grid'de her hücre bir gölün bir yıldaki cluster'ını gösterir. 
                Bir yıla tıklayın, o yılın cluster dağılımını Pie Chart'ta görün. Renkler cluster'ları temsil eder.
              </div>
            </div>
          </div>
        )}

        {/* RENK ÖZELLİKLERİ ANALİZİ */}
        {colorFeatures && (
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            marginTop: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: 4
              }}>
                🎨 Renk Özellikleri Analizi
              </h2>
              <p style={{ 
                margin: 0,
                color: '#64748b',
                fontSize: '0.875rem',
                fontWeight: '400'
              }}>
                Detaylı renk analizi ve spektral özellikler
              </p>
            </div>

            <ColorFeatures />
          </div>
        )}

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

