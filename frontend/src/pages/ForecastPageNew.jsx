import { useState, useEffect } from 'react';
import { AlertCircle, Activity } from 'lucide-react';
import TrendAnalysisChart from '../components/TrendAnalysisChart';
import ModelPerformanceComparison from '../components/ModelPerformanceComparison';
import ProfessionalLakeDetail from '../components/ProfessionalLakeDetail';
import MainAnalysisChart from '../components/MainAnalysisChart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
  LineChart, Line,
  ComposedChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar,
  Cell
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Grafik renkleri
const CHART_COLORS = {
  actual: '#10b981',
  h1: '#3b82f6',
  h2: '#f59e0b',
  h3: '#ef4444'
};

export default function ForecastPageNew({ selectedLake: initialLake }) {
  const selectedLake = initialLake || 'van';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tüm veri analizlerini çek
  useEffect(() => {
    if (!selectedLake) return;
    
    setLoading(true);
    
    // Tüm gerekli API çağrılarını paralel olarak yap
    Promise.all([
      fetch(`${API_BASE}/api/forecast?lake_id=${selectedLake}`).then(r => r.json()),
      fetch(`${API_BASE}/api/forecast/unified?lake_id=${selectedLake}`).then(r => r.json()),
      fetch(`${API_BASE}/api/forecast/trend-analysis?lake_id=${selectedLake}`).then(r => r.json()),
      fetch(`${API_BASE}/api/forecast/horizon-comparison?lake_id=${selectedLake}`).then(r => r.json())
    ])
    .then(([lakeData, unifiedData, trendData, horizonData]) => {
      // Lake ID mapping
      const lakeIdMap = {
        'van': 141,
        'tuz': 140,
        'egirdir': 1340,
        'burdur': 1342,
        'ulubat': 1321,
        'sapanca': 14510,
        'salda': 14741
      };
      
      setData({
        ...unifiedData,
        lake_id: lakeIdMap[selectedLake] || 141, // Lake ID ekle
        lake: lakeData,
        trend: trendData,
        horizons: horizonData
      });
      setLoading(false);
    })
    .catch(err => {
      console.error('Data loading error:', err);
      setLoading(false);
    });
  }, [selectedLake]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-2xl p-12 max-w-md">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                <Activity size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-900">Veri Yükleniyor</h2>
            <p className="text-gray-600">Analiz verileri hazırlanıyor...</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.status !== 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-2xl p-12 max-w-md">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-900">Veri Yüklenemedi</h2>
            <p className="text-gray-600">Veriler alınamadı. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chartData = [
    ...data.historical.years.map((year, i) => ({
      year,
      actual: data.historical.actual[i],
      h1: data.historical.predicted_h1[i],
      h2: data.historical.predicted_h2[i],
      h3: data.historical.predicted_h3[i],
      isFuture: false
    })),
    ...data.future.years.map((year, i) => ({
      year,
      h1: data.future.predicted_h1[i],
      h2: data.future.predicted_h2[i],
      h3: data.future.predicted_h3[i],
      isFuture: true
    }))
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Lake Detail Header */}
      <ProfessionalLakeDetail data={data} loading={loading} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Ana Bileşenler */}
        <MainAnalysisChart chartData={chartData} />
        
        {/* YILLARA GÖRE DETAYLI ANALİZ */}
        {data && data.historical && data.historical.years && data.historical.years.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 28,
            marginBottom: 24,
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
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📅</div>
              <h2 style={{
                color: 'white',
                fontSize: '1.75rem',
                fontWeight: '800',
                marginBottom: 8,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {data.historical.years[0]}-{data.historical.years[data.historical.years.length-1]} Yıllık Detaylı Analiz
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '1rem',
                margin: 0
              }}>
                Gerçek veriler vs Model tahminleri - Yıl yıl karşılaştırma
              </p>
            </div>

            {/* Yıllık Veriler - Area Chart */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                color: '#1e293b',
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                🌊 Yıllık Su Alanı Trendi (Gerçek Veriler)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart 
                  data={data.historical.years.map((year, idx) => ({
                    year,
                    actual: data.historical.actual[idx]
                  }))}
                  margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.actual} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.actual} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    style={{ fontSize: '0.875rem', fill: '#64748b', fontWeight: '500' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    label={{ value: 'Su Alanı (m²)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                    style={{ fontSize: '0.875rem', fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    formatter={(value) => [value?.toLocaleString() + ' m²', 'Su Alanı']}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke={CHART_COLORS.actual}
                    strokeWidth={3}
                    fill="url(#actualGradient)"
                    name="Gerçek Veri"
                    dot={{ fill: CHART_COLORS.actual, r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Model Tahminleri Karşılaştırma - Bar Chart */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                color: '#1e293b',
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                🎯 Model Tahminleri vs Gerçek Veriler (Yıllık)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={data.historical.years.map((year, idx) => ({
                    year,
                    actual: data.historical.actual[idx],
                    'H1 (1 ay)': data.historical.predicted_h1[idx],
                    'H2 (2 ay)': data.historical.predicted_h2[idx],
                    'H3 (3 ay)': data.historical.predicted_h3[idx]
                  }))}
                  margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="actualBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.actual} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={CHART_COLORS.actual} stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="h1Bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.h1} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={CHART_COLORS.h1} stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="h2Bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.h2} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={CHART_COLORS.h2} stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="h3Bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.h3} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={CHART_COLORS.h3} stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    style={{ fontSize: '0.875rem', fill: '#64748b', fontWeight: '500' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    label={{ value: 'Su Alanı (m²)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                    style={{ fontSize: '0.875rem', fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    formatter={(value) => [value?.toLocaleString() + ' m²', '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: 16 }} />
                  <Bar dataKey="actual" fill="url(#actualBar)" name="Gerçek" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="H1 (1 ay)" fill="url(#h1Bar)" name="H1 Tahmin" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="H2 (2 ay)" fill="url(#h2Bar)" name="H2 Tahmin" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="H3 (3 ay)" fill="url(#h3Bar)" name="H3 Tahmin" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{
                marginTop: 16,
                padding: 14,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#1e293b'
              }}>
                <strong style={{ color: '#15803d' }}>Model Performansı:</strong> Gerçek veriler ile model tahminlerinin ne kadar uyumlu olduğunu görün
              </div>
            </div>

            {/* Yıllık Hata Analizi - Line Chart */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                color: '#1e293b',
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                📈 Yıllık Model Hata Oranları
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart 
                  data={data.historical.years.map((year, idx) => {
                    const actual = data.historical.actual[idx]
                    const h1 = data.historical.predicted_h1[idx]
                    const h2 = data.historical.predicted_h2[idx]
                    const h3 = data.historical.predicted_h3[idx]
                    return {
                      year,
                      'H1 Hata': actual && h1 ? parseFloat(Math.abs((h1 - actual) / actual * 100).toFixed(2)) : 0,
                      'H2 Hata': actual && h2 ? parseFloat(Math.abs((h2 - actual) / actual * 100).toFixed(2)) : 0,
                      'H3 Hata': actual && h3 ? parseFloat(Math.abs((h3 - actual) / actual * 100).toFixed(2)) : 0
                    }
                  })}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    style={{ fontSize: '0.875rem', fill: '#64748b', fontWeight: '500' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    label={{ value: 'Hata Oranı (%)', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                    style={{ fontSize: '0.875rem', fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    formatter={(value) => [value + '%', '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: 16 }} />
                  <Line 
                    type="monotone" 
                    dataKey="H1 Hata" 
                    stroke={CHART_COLORS.h1} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.h1, r: 6 }}
                    name="H1 Model"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="H2 Hata" 
                    stroke={CHART_COLORS.h2} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.h2, r: 6 }}
                    name="H2 Model"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="H3 Hata" 
                    stroke={CHART_COLORS.h3} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.h3, r: 6 }}
                    name="H3 Model"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{
                marginTop: 16,
                padding: 14,
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: 10,
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#1e293b',
                lineHeight: 1.6
              }}>
                <strong style={{ color: '#92400e' }}>Hata Analizi:</strong> Düşük hata = Daha iyi model performansı. 
                H1 (1 ay öncesi) genelde en düşük hataya sahiptir.
              </div>
            </div>

            {/* RADIAL BAR CHART - Model Performans (ECharts Polar Bar tarzı) */}
            <div>
              <h3 style={{
                color: '#1e293b',
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: 16,
                textAlign: 'center'
              }}>
                🔄 Radial Bar - Model Doğruluk Skorları
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="15%" 
                  outerRadius="85%" 
                  barSize={22}
                  data={(() => {
                    // Her model için ortalama doğruluk hesapla (100 - hata)
                    const h1Errors = []
                    const h2Errors = []
                    const h3Errors = []
                    
                    data.historical.years.forEach((year, idx) => {
                      const actual = data.historical.actual[idx]
                      const h1 = data.historical.predicted_h1[idx]
                      const h2 = data.historical.predicted_h2[idx]
                      const h3 = data.historical.predicted_h3[idx]
                      
                      if (actual && h1) h1Errors.push(Math.abs((h1 - actual) / actual * 100))
                      if (actual && h2) h2Errors.push(Math.abs((h2 - actual) / actual * 100))
                      if (actual && h3) h3Errors.push(Math.abs((h3 - actual) / actual * 100))
                    })
                    
                    const avgH1 = h1Errors.length > 0 ? 100 - (h1Errors.reduce((a,b) => a+b, 0) / h1Errors.length) : 0
                    const avgH2 = h2Errors.length > 0 ? 100 - (h2Errors.reduce((a,b) => a+b, 0) / h2Errors.length) : 0
                    const avgH3 = h3Errors.length > 0 ? 100 - (h3Errors.reduce((a,b) => a+b, 0) / h3Errors.length) : 0
                    
                    return [
                      { 
                        name: 'H1 (1 Ay)', 
                        value: parseFloat(avgH1.toFixed(1)),
                        fill: CHART_COLORS.h1
                      },
                      { 
                        name: 'H2 (2 Ay)', 
                        value: parseFloat(avgH2.toFixed(1)),
                        fill: CHART_COLORS.h2
                      },
                      { 
                        name: 'H3 (3 Ay)', 
                        value: parseFloat(avgH3.toFixed(1)),
                        fill: CHART_COLORS.h3
                      },
                      { 
                        name: 'CatBoost Max', 
                        value: 100,
                        fill: '#10b981'
                      }
                    ]
                  })()}
                  startAngle={90}
                  endAngle={450}
                >
                  <RadialBar
                    minAngle={15}
                    label={{ 
                      position: 'insideStart', 
                      fill: '#fff',
                      fontWeight: '700',
                      fontSize: 11,
                      formatter: '{value}%'
                    }}
                    background
                    clockWise
                    dataKey="value"
                  />
                  <Legend 
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: '0.8125rem', fontWeight: '600' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    formatter={(value, name) => [`${value.toFixed(1)}% Doğruluk`, name]}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{
                marginTop: 16,
                padding: 14,
                background: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: 10,
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#1e293b',
                lineHeight: 1.6
              }}>
                <strong style={{ color: '#1e40af' }}>Radial Bar Analizi:</strong> Modellerin ortalama doğruluk skorlarını dairesel çubuk grafikle gösterim. 
                Daha uzun çubuk = Daha yüksek doğruluk. H1 genelde en iyi performansı gösterir.
              </div>
            </div>
          </div>
        )}

        <TrendAnalysisChart data={data} loading={loading} />
        <ModelPerformanceComparison data={data} loading={loading} />
      </div>
    </div>
  );
}
