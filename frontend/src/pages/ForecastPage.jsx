import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, Droplets, Calendar, Activity, AlertCircle, BarChart3, Info } from 'lucide-react';

// CSS Animations
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ComposedChart, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine, ScatterChart, Scatter
} from 'recharts';

const API_BASE = 'http://localhost:5000';

// ============= MODERN CHARTS COMPONENT =============
const ModernCharts = ({ data }) => {
  const [timeRange, setTimeRange] = useState('all');
  const [showActual, setShowActual] = useState(true);
  const [showPredicted, setShowPredicted] = useState(true);

  if (!data) return <LoadingState />;

  let chartData = data.years?.map((year, i) => ({
    year,
    actual: data.actual?.[i],
    predicted: data.predicted?.[i],
  })).filter(item => item.actual !== null && item.actual !== undefined && 
                     item.predicted !== null && item.predicted !== undefined) || [];

  if (timeRange === 'recent' && chartData.length > 3) chartData = chartData.slice(-3);
  else if (timeRange === 'mid' && chartData.length > 5) chartData = chartData.slice(-5);

  // Backend'den gelen model metriklerini kullan, yoksa hesapla
  const backendMetrics = data.model_metrics;
  const frontendMetrics = calculateMetrics(chartData);
  
  // En iyi model performansını seç (H2 genellikle en iyi)
  const bestModel = backendMetrics?.H2 || backendMetrics?.H1 || backendMetrics?.H3;
  
  // Backend'den gelen metrikleri kullan, yoksa frontend hesaplamasını kullan
  const r2Score = bestModel?.performance?.R2 || frontendMetrics.r2 || 0;
  const mapeScore = bestModel?.performance?.MAE || frontendMetrics.mape || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <MetricCard 
          label="Model Doğruluğu (R²)" 
          value={`${(r2Score * 100).toFixed(1)}%`}
          icon={<Activity style={{ width: '20px', height: '20px' }} />}
          color="blue"
        />
        <MetricCard 
          label="Ortalama Hata (MAE)" 
          value={`${(mapeScore / 1000000).toFixed(1)}M m²`}
          icon={<AlertCircle style={{ width: '20px', height: '20px' }} />}
          color="orange"
        />
        <MetricCard 
          label="Toplam Veri Noktası" 
          value={data.data_points || chartData.length}
          icon={<BarChart3 style={{ width: '20px', height: '20px' }} />}
          color="purple"
        />
      </div>

      {/* Time Range Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'Tüm Veri' },
          { value: 'mid', label: 'Son 5 Yıl' },
          { value: 'recent', label: 'Son 3 Yıl' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTimeRange(value)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              background: timeRange === value 
                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                : 'rgba(255, 255, 255, 0.9)',
              color: timeRange === value ? 'white' : '#64748b',
              border: timeRange === value ? 'none' : '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: timeRange === value ? '0 4px 15px rgba(59, 130, 246, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (timeRange !== value) {
                e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                e.target.style.color = '#1e40af';
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (timeRange !== value) {
                e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                e.target.style.color = '#64748b';
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}>
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="year" stroke="#9ca3af" style={{ fontSize: '13px' }} />
            <YAxis 
              tickFormatter={formatArea} 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              domain={['dataMin - 10000000', 'dataMax + 10000000']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {showActual && (
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorActual)"
                name="Gerçek Değerler (Sentinel-2)"
                dot={{ fill: '#3b82f6', r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
              />
            )}
            {showPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="AI Model Tahminleri"
                dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Toggle Controls */}
        <div className="flex gap-4 mt-8 justify-center">
          <ToggleButton
            active={showActual}
            onClick={() => setShowActual(!showActual)}
            color="blue"
            label="Gerçek Değerler"
          />
          <ToggleButton
            active={showPredicted}
            onClick={() => setShowPredicted(!showPredicted)}
            color="green"
            label="Model Tahminleri"
          />
        </div>
      </div>

      {/* Year Performance Grid */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <h4 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          <BarChart3 style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
          Yıllık Performans Detayı
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px'
        }}>
          {chartData.map((item) => {
            const error = ((item.predicted - item.actual) / item.actual) * 100;
            const errorAbs = Math.abs(error);
            const isGood = errorAbs < 1;
            const isFair = errorAbs < 3;
            
            return (
              <div 
                key={item.year}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  background: isGood ? 
                    'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))' :
                    isFair ? 
                    'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))' :
                    'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))',
                  border: `2px solid ${isGood ? 'rgba(16, 185, 129, 0.3)' : isFair ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-4px) scale(1.02)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* Shimmer effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  animation: 'shimmer 2s infinite'
                }} />
                
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {item.year}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: isGood ? '#059669' : isFair ? '#2563eb' : '#d97706',
                  position: 'relative',
                  zIndex: 1,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>
                  {error > 0 ? '+' : ''}{error.toFixed(1)}%
                </div>
                
                {/* Performance indicator */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isGood ? '#10b981' : isFair ? '#3b82f6' : '#f59e0b',
                  boxShadow: `0 0 8px ${isGood ? 'rgba(16, 185, 129, 0.5)' : isFair ? 'rgba(59, 130, 246, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`
                }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============= TREND PROJECTION CHART =============
const TrendProjectionChart = ({ selectedLake }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      console.log('TrendProjectionChart: Fetching data for lake:', selectedLake);
      setLoading(true);
      try {
        const url = `${API_BASE}/api/analytics/lake/${selectedLake}/trend`;
        console.log('TrendProjectionChart: Fetching from URL:', url);
        const response = await fetch(url);
        console.log('TrendProjectionChart: Response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Trend analysis data:', result);
        setData(result);
      } catch (err) {
        console.error('Trend analysis error:', err);
        // Fallback to basic forecast endpoint
        try {
          const fallbackResponse = await fetch(`${API_BASE}/api/forecast?lake_id=${selectedLake}`);
          const fallbackResult = await fallbackResponse.json();
          console.log('Fallback forecast data:', fallbackResult);
          setData(fallbackResult);
        } catch (fallbackErr) {
          console.error('Fallback forecast error:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedLake]);

  if (loading) return <LoadingState />;
  if (!data || data.status === 'no_data') return <NoDataState />;

  // Yeni trend analizi API'sinden gelen veri yapısı
  const trendAnalysis = data.trend_analysis || {};
  const historicalYears = data.historical_years || [];
  const historicalValues = data.historical_values || [];
  const projections = data.projections || [];
  const yearlyChanges = data.yearly_changes || [];
  
  // Trend bilgileri
  const trendPercentage = trendAnalysis.trend_percentage || 0;
  const trendDirection = trendAnalysis.trend_direction === 'azalış' ? 'down' : 'up';
  const trendDirectionText = trendAnalysis.trend_direction || 'artış';
  const trendStrength = trendAnalysis.trend_strength || 'zayıf';
  const rSquared = trendAnalysis.r_squared || 0;
  
  // Grafik verisi oluştur - geçiş noktası ile yumuşak geçiş
  const chartData = [];
  
  // Geçmiş veriler
  historicalYears.forEach((year, i) => {
    chartData.push({
      year: String(year),
      value: historicalValues[i],
      type: 'actual',
      lower_bound: null,
      upper_bound: null,
      margin_of_error: null
    });
  });
  
  // Geçiş noktası ekle (son geçmiş veri ile ilk projeksiyon arası)
  if (historicalYears.length > 0 && projections.length > 0) {
    const lastHistoricalYear = historicalYears[historicalYears.length - 1];
    const lastHistoricalValue = historicalValues[historicalValues.length - 1];
    const firstProjection = projections[0];
    
    // Geçiş yılı ekle (son geçmiş yıldan sonraki yıl)
    const transitionYear = lastHistoricalYear + 1;
    
    // Geçiş değeri: son geçmiş değer ile ilk projeksiyon arasında yumuşak geçiş
    const transitionValue = (lastHistoricalValue + firstProjection.projected_area) / 2;
    
    chartData.push({
      year: String(transitionYear),
      value: transitionValue,
      type: 'transition',
      lower_bound: null,
      upper_bound: null,
      margin_of_error: null
    });
  }
  
  // Projeksiyonlar
  projections.forEach(p => {
    chartData.push({
      year: String(p.year),
      value: p.projected_area,
      type: 'projected',
      lower_bound: p.lower_bound,
      upper_bound: p.upper_bound,
      margin_of_error: p.margin_of_error,
      confidence: p.confidence
    });
  });

  console.log('Chart data:', chartData);
  console.log('Historical years:', historicalYears);
  console.log('Historical values:', historicalValues);
  console.log('Projections:', projections);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {trendDirection === 'down' ? 
              <TrendingDown style={{ width: '20px', height: '20px', color: '#dc2626' }} /> : 
              <TrendingUp style={{ width: '20px', height: '20px', color: '#16a34a' }} />
            }
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Yıllık Değişim</span>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: trendDirection === 'down' ? '#dc2626' : '#16a34a',
            marginBottom: '8px'
          }}>
            {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(2)}%
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'capitalize' }}>
            {trendDirectionText} trendi
          </div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '16px' }}>
            2025 Tahmini
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb', marginBottom: '8px' }}>
            {formatArea(data.projections?.[0]?.projected_area)}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Yakın dönem</div>
          {data.projections?.[0]?.margin_of_error && (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              ±{formatArea(data.projections[0].margin_of_error)} hata
            </div>
          )}
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '16px' }}>
            2027 Tahmini
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#0891b2', marginBottom: '8px' }}>
            {formatArea(data.projections?.[2]?.projected_area)}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Uzun dönem</div>
          {data.projections?.[2]?.margin_of_error && (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              ±{formatArea(data.projections[2].margin_of_error)} hata
            </div>
          )}
        </div>
      </div>

      {/* Projection Chart with Confidence Intervals */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis tickFormatter={formatArea} stroke="#6b7280" />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                
                const data = payload[0].payload;
                return (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.8)'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e293b', marginBottom: '8px' }}>
                      {label} Yılı
                    </div>
                    <div style={{ fontSize: '14px', color: '#3b82f6', marginBottom: '4px' }}>
                      {data.type === 'actual' ? '🌊 Gerçek Veri' : '🤖 Projeksiyon'}: {formatArea(data.value)}
                    </div>
                    {data.type === 'projected' && data.lower_bound && data.upper_bound && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                        <div>📊 Güven Aralığı:</div>
                        <div>Alt: {formatArea(data.lower_bound)}</div>
                        <div>Üst: {formatArea(data.upper_bound)}</div>
                        <div>Hata: ±{formatArea(data.margin_of_error)}</div>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend />
            <ReferenceLine x="2025" stroke="#f59e0b" strokeDasharray="5 5" label="Bugün" />
            
            {/* Confidence Interval Area for Projections */}
            <Area
              type="monotone"
              dataKey="upper_bound"
              stroke="none"
              fill="url(#confidenceGrad)"
              connectNulls={false}
              hide
            />
            
            {/* Main Trend Line */}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6"
              strokeWidth={3} 
              dot={{ r: 5, fill: '#3b82f6' }}
              connectNulls={false}
              name="Su Alanı"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Trend Analizi:</strong> Lineer regresyon ile hesaplanmıştır. 
          Yıllık {trendDirectionText} oranı {Math.abs(trendPercentage).toFixed(2)}% olarak tespit edilmiştir.
          {rSquared > 0 && (
            <span> (R² = {rSquared.toFixed(3)}, {trendStrength} trend)</span>
          )}
          Projeksiyonlar mevcut trendin devam ettiği varsayımına dayanır.
        </div>
      </div>
    </div>
  );
};

// ============= TREND ANALYSIS CHART =============
const TrendAnalysisChart = ({ data }) => {
  if (!data) return <LoadingState />;

  const trendData = data.years.slice(0, -1).map((year, i) => {
    const current = data.actual[i];
    const next = data.actual[i + 1];
    const change = next && current ? ((next - current) / current) * 100 : 0;
    
    return {
      year: `${year}-${year + 1}`,
      change: parseFloat(change.toFixed(2)),
      changeAbs: Math.abs(change)
    };
  });

  const avgChange = trendData.reduce((sum, d) => sum + d.change, 0) / trendData.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-600 mb-1">Ortalama Yıllık Değişim</div>
            <div className={`text-4xl font-bold ${avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgChange > 0 ? '+' : ''}{avgChange.toFixed(2)}%
            </div>
          </div>
          <Activity className="w-12 h-12 text-purple-400" />
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
            <YAxis label={{ value: 'Değişim (%)', angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => `${value}%`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
            <Bar 
              dataKey="change" 
              fill="#8b5cf6"
              name="Yıllık Değişim (%)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============= COMPARISON CHART =============
const ComparisonChart = ({ data }) => {
  if (!data) return <LoadingState />;

  const comparisonData = data.years.map((year, i) => ({
    year,
    actual: data.actual[i],
    predicted: data.predicted[i],
    diff: Math.abs(data.predicted[i] - data.actual[i])
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis yAxisId="left" tickFormatter={formatArea} stroke="#6b7280" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={formatArea} stroke="#ef4444" />
            <Tooltip formatter={formatArea} />
            <Legend />
            <Bar yAxisId="left" dataKey="actual" fill="#3b82f6" name="Gerçek Değer" radius={[8, 8, 0, 0]} />
            <Bar yAxisId="left" dataKey="predicted" fill="#10b981" name="Tahmin Değeri" radius={[8, 8, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="diff" stroke="#ef4444" strokeWidth={2} name="Fark" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============= SEASONAL CHART =============
const SeasonalChart = ({ selectedLake }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/analytics/lake/${selectedLake}/trend`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Seasonal analysis error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedLake]);

  if (loading) return <LoadingState />;
  
  // Debug bilgisi
  console.log('SeasonalChart data:', data);
  console.log('SeasonalChart seasonal_analysis:', data?.seasonal_analysis);
  
  if (!data || !data.seasonal_analysis) {
    console.log('SeasonalChart: No data or seasonal_analysis');
    return <NoDataState />;
  }

  const seasonalAnalysis = data.seasonal_analysis;
  const monthlyTrends = seasonalAnalysis.monthly_trends || [];
  const seasonalCycle = seasonalAnalysis.seasonal_cycle || [];
  
  console.log('SeasonalChart monthlyTrends:', monthlyTrends);
  console.log('SeasonalChart seasonalCycle:', seasonalCycle);

  // Aylık trend kartları
  const monthlyCards = monthlyTrends.map(month => ({
    ...month,
    trendColor: month.avg_change_percent > 0 ? '#10b981' : '#ef4444',
    trendIcon: month.avg_change_percent > 0 ? '↗️' : '↘️'
  }));

  // Mevsimsel döngü grafiği için veri
  let cycleData = [];
  
  if (seasonalCycle && seasonalCycle.length > 0) {
    cycleData = seasonalCycle.map(month => ({
      month: month.month_name,
      area: month.avg_area / 1000000, // m²'den km²'ye çevir
      monthNum: month.month
    }));
  } else {
    // Fallback: Demo mevsimsel veri
    console.log('SeasonalChart: Using fallback data');
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const baseArea = 100; // km²
    cycleData = monthNames.map((name, index) => ({
      month: name,
      area: baseArea + Math.sin((index / 12) * 2 * Math.PI) * 10, // Mevsimsel değişim
      monthNum: index + 1
    }));
  }
  
  console.log('SeasonalChart cycleData:', cycleData);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Aylık Trend Kartları */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {monthlyCards.map((month, idx) => (
          <div key={idx} style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-4px)';
            e.target.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Calendar style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{month.month_name}</span>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: month.trendColor,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {month.trendIcon} {month.avg_change_percent > 0 ? '+' : ''}{month.avg_change_percent.toFixed(1)}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              Volatilite: {month.volatility_percent.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {month.data_points} veri noktası
            </div>
          </div>
        ))}
      </div>

      {/* Mevsimsel Döngü Grafiği */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}>
        <h4 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: '24px',
          textAlign: 'center'
        }}>Yıllık Mevsimsel Döngü</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cycleData}>
            <defs>
              <linearGradient id="seasonalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis tickFormatter={(value) => `${value.toFixed(1)} km²`} stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => [`${value.toFixed(1)} km²`, 'Su Alanı']}
              labelStyle={{ color: '#1e293b' }}
            />
            <Area
              type="monotone"
              dataKey="area"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#seasonalGrad)"
              dot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Peak/Low Months Info */}
      {seasonalAnalysis.peak_month && seasonalAnalysis.low_month && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <TrendingUp style={{ width: '20px', height: '20px', color: '#10b981' }} />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>En Yüksek Ay</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
              {get_season_name(seasonalAnalysis.peak_month)}
            </div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <TrendingDown style={{ width: '20px', height: '20px', color: '#ef4444' }} />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>En Düşük Ay</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>
              {get_season_name(seasonalAnalysis.low_month)}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        gap: '16px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
      }}>
        <Info style={{ width: '20px', height: '20px', color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          <strong>Mevsimsel Analiz:</strong> İlkbahar aylarında kar erimeleri nedeniyle su seviyesi artar. 
          Yaz aylarında buharlaşma nedeniyle azalır. Sonbahar ve kış aylarında yağışlarla toparlanma görülür.
          Volatilite değeri, o ayın ne kadar değişken olduğunu gösterir.
        </div>
      </div>
    </div>
  );
};

// ============= FUTURE FORECAST =============
const FutureForecast = ({ selectedLake, data }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/forecast?lake_id=${selectedLake}`);
        const result = await response.json();
        setForecast(result);
      } catch (err) {
        console.error('Future forecast error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [selectedLake]);

  if (loading) return <LoadingState />;
  if (!forecast || !forecast.predictions) return <NoDataState />;

  return (
    <div className="space-y-6">
      {/* Forecast Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {forecast.predictions.slice(0, 6).map((pred, idx) => (
          <div key={idx} className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <Droplets className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">{pred.date || `Ay ${idx + 1}`}</span>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {formatArea(pred.predicted_area)}
            </div>
            <div className="text-xs text-gray-500">Tahmin edilen alan</div>
            {pred.confidence && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs text-gray-600 mb-1">Güven Aralığı</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{formatArea(pred.confidence.lower)}</span>
                  <span className="text-gray-500">{formatArea(pred.confidence.upper)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Forecast Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">6 Aylık Tahmin Grafiği</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecast.predictions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis tickFormatter={formatArea} stroke="#6b7280" />
            <Tooltip formatter={formatArea} />
            <Legend />
            <Line type="monotone" dataKey="predicted_area" stroke="#3b82f6" strokeWidth={3} name="Tahmin" dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============= HELPER COMPONENTS =============
const MetricCard = ({ label, value, icon, color }) => {
  const colorStyles = {
    blue: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      iconColor: '#3b82f6',
      textColor: '#64748b',
      valueColor: '#1e40af'
    },
    orange: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid rgba(249, 115, 22, 0.2)',
      iconColor: '#f97316',
      textColor: '#64748b',
      valueColor: '#ea580c'
    },
    purple: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      iconColor: '#8b5cf6',
      textColor: '#64748b',
      valueColor: '#7c3aed'
    },
    green: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid rgba(16, 185, 129, 0.2)',
      iconColor: '#10b981',
      textColor: '#64748b',
      valueColor: '#166534'
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div style={{
      background: style.background,
      padding: '20px',
      borderRadius: '12px',
      border: style.border,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ color: style.iconColor }}>{icon}</div>
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: style.textColor
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: style.valueColor
      }}>{value}</div>
    </div>
  );
};

const ToggleButton = ({ active, onClick, color, label }) => {
  const colors = {
    blue: {
      active: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl border-blue-500',
      inactive: 'bg-white/80 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border-gray-200 hover:border-blue-300'
    },
    green: {
      active: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl border-green-500',
      inactive: 'bg-white/80 text-gray-600 hover:bg-green-50 hover:text-green-600 border-gray-200 hover:border-green-300'
    },
  };

  const icons = {
    blue: '🌊',
    green: '🤖'
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-semibold text-sm transition-all duration-300 hover:scale-105 ${
        active ? colors[color].active : colors[color].inactive
      }`}
    >
      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
        active ? 'bg-white shadow-lg' : 'bg-gray-400'
      }`} />
      <span>{icons[color]} {label}</span>
    </button>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  const item = payload[0].payload;
  const error = item.actual && item.predicted ? ((item.predicted - item.actual) / item.actual) * 100 : 0;
  const difference = item.actual && item.predicted ? Math.abs(item.predicted - item.actual) : 0;
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.8)',
      maxWidth: '320px'
    }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '18px',
        color: '#1e293b',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
      }}>{label} Yılı</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{
            fontSize: '12px',
            color: '#3b82f6',
            marginBottom: '4px',
            fontWeight: '500'
          }}>🌊 Gerçek Değer (Sentinel-2)</div>
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1e40af'
          }}>{formatArea(item.actual)}</div>
        </div>
        <div>
          <div style={{
            fontSize: '12px',
            color: '#10b981',
            marginBottom: '4px',
            fontWeight: '500'
          }}>🤖 AI Model Tahmini</div>
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#166534'
          }}>{formatArea(item.predicted)}</div>
        </div>
        <div style={{
          paddingTop: '8px',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '4px',
              fontWeight: '500'
            }}>📊 Hata Oranı</div>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: Math.abs(error) < 5 ? '#166534' : Math.abs(error) < 15 ? '#d97706' : '#dc2626'
            }}>
              {error > 0 ? '+' : ''}{error.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '4px',
              fontWeight: '500'
            }}>📏 Fark Miktarı</div>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#475569'
            }}>{formatArea(difference)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '256px',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid rgba(59, 130, 246, 0.2)',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <p style={{ color: '#64748b', fontWeight: '500' }}>Veri yükleniyor...</p>
    </div>
  </div>
);

const NoDataState = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
    <div className="text-center">
      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600">Veri bulunamadı</p>
    </div>
  </div>
);

// ============= UTILITIES =============
const formatArea = (value) => {
  if (!value) return '';
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B m²`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M m²`;
  return `${(value / 1e3).toFixed(0)}K m²`;
};

const get_season_name = (month) => {
  const monthNames = {
    1: 'Ocak',
    2: 'Şubat', 
    3: 'Mart',
    4: 'Nisan',
    5: 'Mayıs',
    6: 'Haziran',
    7: 'Temmuz',
    8: 'Ağustos',
    9: 'Eylül',
    10: 'Ekim',
    11: 'Kasım',
    12: 'Aralık'
  };
  return monthNames[month] || 'Bilinmeyen';
};

const calculateMetrics = (chartData) => {
  if (chartData.length === 0) return { mape: 0, r2: 0 };
  
  const errors = chartData.map(d => Math.abs((d.predicted - d.actual) / d.actual) * 100);
  const mape = errors.reduce((a, b) => a + b, 0) / errors.length;
  
  const actuals = chartData.map(d => d.actual);
  const meanActual = actuals.reduce((a, b) => a + b, 0) / actuals.length;
  const ssRes = chartData.reduce((sum, d) => sum + Math.pow(d.predicted - d.actual, 2), 0);
  const ssTot = actuals.reduce((sum, a) => sum + Math.pow(a - meanActual, 2), 0);
  const r2 = Math.max(0, 1 - (ssRes / ssTot));
  
  return { mape, r2 };
};

// ============= MAIN FORECAST PAGE =============
export default function ForecastPage({ selectedLake: propSelectedLake }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lakes, setLakes] = useState({});
  const [selectedLake, setSelectedLake] = useState(propSelectedLake || 'van');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get lake name from lakes data or fallback to selectedLake
  const lakeName = useMemo(() => {
    console.log('Selected lake:', selectedLake);
    console.log('Available lakes:', lakes);
    
    // First try exact match
    if (lakes[selectedLake]?.name) {
      console.log('Found lake by exact key:', lakes[selectedLake].name);
      return lakes[selectedLake].name;
    }
    
    // Try to find by lake_id
    const foundLake = Object.values(lakes).find(lake => lake.id === selectedLake);
    if (foundLake?.name) {
      console.log('Found lake by ID:', foundLake.name);
      return foundLake.name;
    }
    
    // Try to find by partial key match (e.g., 'van' -> 'van_golu')
    const partialMatch = Object.keys(lakes).find(key => 
      key.includes(selectedLake) || selectedLake.includes(key.replace('_golu', ''))
    );
    if (partialMatch && lakes[partialMatch]?.name) {
      console.log('Found lake by partial match:', lakes[partialMatch].name);
      return lakes[partialMatch].name;
    }
    
    // Fallback to uppercase selectedLake
    console.log('Using fallback name:', selectedLake.toUpperCase());
    return selectedLake.toUpperCase();
  }, [selectedLake, lakes]);

  // Göl seçimi yapıldığında URL parametrelerini güncelle
  const handleLakeSelect = (lakeKey) => {
    setSelectedLake(lakeKey);
    
    // URL parametrelerini güncelle
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('lake', lakeKey);
    setSearchParams(newSearchParams);
  };

  // Prop değiştiğinde state'i güncelle
  useEffect(() => {
    if (propSelectedLake && propSelectedLake !== selectedLake) {
      setSelectedLake(propSelectedLake);
    }
  }, [propSelectedLake, selectedLake]);

  // Fetch lakes list
  useEffect(() => {
    console.log('Fetching lakes from:', `${API_BASE}/api/lakes`);
    fetch(`${API_BASE}/api/lakes`)
      .then(res => {
        console.log('Lakes API response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(result => {
        console.log('Lakes API response:', result);
        console.log('Lakes data:', result.lakes);
        console.log('Lakes count:', Object.keys(result.lakes || {}).length);
        
        // API response structure: { lakes: { key: { name, id, ... } } }
        const lakesData = result.lakes || {};
        console.log('Setting lakes:', lakesData);
        setLakes(lakesData);
        
        // If no lake is selected and we have lakes data, select the first available lake
        if (!propSelectedLake && !selectedLake && Object.keys(lakesData).length > 0) {
          const firstLakeKey = Object.keys(lakesData)[0];
          console.log('Auto-selecting first lake:', firstLakeKey);
          setSelectedLake(firstLakeKey);
        }
      })
      .catch(err => {
        console.error('Lakes fetch error:', err);
        // Fallback: set some default lakes if API fails
        const fallbackLakes = {
          'van': { name: 'Van Gölü', id: '141' },
          'tuz': { name: 'Tuz Gölü', id: '140' }
        };
        console.log('Using fallback lakes:', fallbackLakes);
        setLakes(fallbackLakes);
      });
  }, []); // Remove selectedLake dependency to prevent infinite loop

  // Fetch forecast data
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedLake) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_BASE}/api/forecast?lake_id=${selectedLake}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLake]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Veri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Veri Yüklenemedi</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-gray-200 rounded-xl p-8 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Veri Bulunamadı</h2>
          <p className="text-gray-500">Seçilen göl için veri mevcut değil.</p>
        </div>
      </div>
    );
  }

  const lastActual = data.actual?.filter(a => a).slice(-1)[0];
  const currentArea = lastActual ? (lastActual / 1e6).toFixed(1) : 'N/A';
  
  // Backend'den gelen model metriklerini kullan
  const bestModel = data.model_metrics?.H2 || data.model_metrics?.H1 || data.model_metrics?.H3;
  const r2Score = bestModel ? (1 - (bestModel.performance.RMSE / Math.sqrt(bestModel.performance.MAE)) * 100).toFixed(1) : 'N/A';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* Floating geometric shapes */}
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '40px',
          width: '128px',
          height: '128px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '160px',
          right: '80px',
          width: '96px',
          height: '96px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'float 6s ease-in-out infinite 2s'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '25%',
          width: '160px',
          height: '160px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'float 6s ease-in-out infinite 4s'
        }}></div>
        
        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.4,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2364748b' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Hero Section */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 16px' }}>
        {/* Header Section */}
          <header style={{ textAlign: 'center', marginBottom: '80px' }}>
            {/* Main Title Card */}
            <div style={{ display: 'inline-block', marginBottom: '32px' }}>
              <div style={{ position: 'relative' }}>
                {/* Glow effect */}
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '-4px',
                  right: '-4px',
                  bottom: '-4px',
                  background: 'linear-gradient(45deg, #3b82f6, #10b981, #8b5cf6)',
                  borderRadius: '24px',
                  filter: 'blur(8px)',
                  opacity: 0.3,
                  transition: 'opacity 1s ease'
                }}></div>
                
                {/* Main card */}
                <div style={{
                  position: 'relative',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  padding: '32px 48px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
                    }}>
                      <Droplets style={{ width: '40px', height: '40px', color: 'white' }} />
          </div>
                    <div>
                      <h1 style={{
                        fontSize: '48px',
                        fontWeight: 'bold',
                        background: 'linear-gradient(90deg, #1e293b 0%, #3b82f6 50%, #1d4ed8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                        margin: 0
                      }}>
                        {lakeName}
                      </h1>
                      <p style={{
                        color: '#64748b',
                        fontSize: '18px',
                        fontWeight: '500',
                        margin: 0
                      }}>Su Alanı Analiz Merkezi</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div style={{ maxWidth: '1024px', margin: '0 auto 48px' }}>
              <div style={{ marginBottom: '24px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  color: '#1e40af',
                  fontWeight: '600',
                  marginRight: '16px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                }}>
                  🌊 Sentinel-2 Uydu Verileri
                </span>
                <span style={{ color: '#64748b', margin: '0 16px', fontWeight: 'bold' }}>×</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  color: '#166534',
                  fontWeight: '600',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
                }}>
                  🤖 AI Destekli Tahmin Sistemi
                </span>
              </div>
              <p style={{
                fontSize: '18px',
                color: '#475569',
                lineHeight: '1.6',
                margin: 0,
                fontWeight: '500'
              }}>
                Gelişmiş makine öğrenmesi algoritmaları ile göl su alanı değişimlerini analiz edin ve gelecek projeksiyonları görün
              </p>
            </div>
          
          {/* Lake Selector */}
            <div style={{ display: 'inline-block' }}>
              <div style={{ position: 'relative' }}>
                {/* Main container */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  padding: '32px 40px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Background glow effect */}
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '-2px',
                    right: '-2px',
                    bottom: '-2px',
                    background: 'linear-gradient(45deg, #3b82f6, #10b981, #8b5cf6)',
                    borderRadius: '24px',
                    opacity: '0.2',
                    filter: 'blur(8px)',
                    zIndex: '-1'
                  }}></div>
                  
                  {/* Enhanced Header */}
                  <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '16px', 
                      marginBottom: '16px',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                      padding: '12px 24px',
                      borderRadius: '20px',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite',
                        boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)'
                      }}></div>
                      <h3 style={{
                        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontWeight: '800',
                        fontSize: '24px',
                        margin: 0,
                        letterSpacing: '-0.5px'
                      }}>Göl Seçimi</h3>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite 1s',
                        boxShadow: '0 0 25px rgba(16, 185, 129, 0.6)'
                      }}></div>
                    </div>
                    <p style={{
                      color: '#64748b',
                      fontSize: '16px',
                      margin: 0,
                      fontWeight: '500',
                      lineHeight: '1.5'
                    }}>Analiz etmek istediğiniz gölü seçin ve detaylı su alanı analizlerini görün</p>
                  </div>
                  
                  {/* Custom Select Container */}
                  <div style={{ position: 'relative' }}>
                    {/* Enhanced Selected Lake Display */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '3px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '20px',
                      padding: '24px 32px',
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      marginBottom: '24px',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)';
                    }}>
                      {/* Shimmer effect */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                        animation: 'shimmer 3s infinite'
                      }}></div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{
                            padding: '12px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '16px',
                            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
                            position: 'relative'
                          }}>
                            <Droplets style={{ width: '24px', height: '24px', color: 'white' }} />
                            {/* Glow effect */}
                            <div style={{
                              position: 'absolute',
                              top: '-2px',
                              left: '-2px',
                              right: '-2px',
                              bottom: '-2px',
                              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              borderRadius: '16px',
                              opacity: '0.3',
                              filter: 'blur(8px)',
                              zIndex: '-1'
                            }}></div>
                          </div>
                          <div>
                            <div style={{
                              color: '#1e293b',
                              fontWeight: '700',
                              fontSize: '20px',
                              marginBottom: '6px',
                              letterSpacing: '-0.3px'
                            }}>
                              {(() => {
                                if (lakes[selectedLake]?.name) return lakes[selectedLake].name;
                                const foundById = Object.values(lakes).find(lake => lake.id === selectedLake);
                                if (foundById?.name) return foundById.name;
                                const partialMatch = Object.keys(lakes).find(key => 
                                  key.includes(selectedLake) || selectedLake.includes(key.replace('_golu', ''))
                                );
                                if (partialMatch && lakes[partialMatch]?.name) return lakes[partialMatch].name;
                                return selectedLake.toUpperCase();
                              })()}
                            </div>
                            <div style={{
                              color: '#64748b',
                              fontSize: '15px',
                              fontWeight: '500'
                            }}>
                              {(() => {
                                if (lakes[selectedLake]?.name) return 'Aktif analiz gölü';
                                const foundById = Object.values(lakes).find(lake => lake.id === selectedLake);
                                if (foundById?.name) return 'Aktif analiz gölü';
                                const partialMatch = Object.keys(lakes).find(key => 
                                  key.includes(selectedLake) || selectedLake.includes(key.replace('_golu', ''))
                                );
                                if (partialMatch && lakes[partialMatch]?.name) return 'Aktif analiz gölü';
                                return 'Göl yükleniyor...';
                              })()}
                            </div>
                          </div>
                        </div>
                        <div style={{ 
                          color: '#64748b',
                          transition: 'transform 0.3s ease'
                        }}>
                          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Hidden Native Select */}
            <select
              value={selectedLake}
              onChange={(e) => handleLakeSelect(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 10
                      }}
            >
              {Object.entries(lakes).map(([key, lake]) => (
                <option key={key} value={key}>{lake.name}</option>
              ))}
            </select>
                    
                    {/* Enhanced Lake Options Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '16px'
                    }}>
                      {Object.entries(lakes).map(([key, lake]) => (
                        <div
                          key={key}
                          style={{
                            padding: '20px',
                            borderRadius: '16px',
                            border: `3px solid ${selectedLake === key ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.2)'}`,
                            background: selectedLake === key 
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(29, 78, 216, 0.1) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
                            cursor: 'pointer',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: selectedLake === key 
                              ? '0 8px 25px rgba(59, 130, 246, 0.2)'
                              : '0 4px 15px rgba(0, 0, 0, 0.05)'
                          }}
                          onClick={() => handleLakeSelect(key)}
                          onMouseEnter={(e) => {
                            if (selectedLake !== key) {
                              e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(29, 78, 216, 0.05) 100%)';
                              e.target.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                              e.target.style.transform = 'translateY(-4px) scale(1.02)';
                              e.target.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedLake !== key) {
                              e.target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)';
                              e.target.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                              e.target.style.transform = 'translateY(0) scale(1)';
                              e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
                            }
                          }}
                        >
                          {/* Selection indicator */}
                          {selectedLake === key && (
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              width: '12px',
                              height: '12px',
                              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              borderRadius: '50%',
                              boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)',
                              animation: 'pulse 2s infinite'
                            }}></div>
                          )}
                          
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: selectedLake === key ? '#1e40af' : '#475569',
                            marginBottom: '8px',
                            letterSpacing: '-0.2px'
                          }}>
                            {lake.name}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#64748b',
                            fontWeight: '500',
                            marginBottom: '4px'
                          }}>
                            {lake.area_km2 ? `${lake.area_km2} km²` : 'Veri yok'}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            fontWeight: '400'
                          }}>
                            {lake.basin || 'Havza bilgisi yok'}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Total Lakes Count */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#10b981',
                          borderRadius: '50%',
                          animation: 'pulse 2s infinite'
                        }}></div>
                        <span style={{
                          color: '#166534',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {Object.keys(lakes).length} göl mevcut
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </header>
        </div>
      </div>

        {/* Stats Dashboard */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '0 16px', marginTop: '-32px', marginBottom: '80px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px'
        }}>
          {/* Son Ölçüm Card */}
          <div style={{ position: 'relative' }}>
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              right: '-4px',
              bottom: '-4px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              borderRadius: '24px',
              filter: 'blur(8px)',
              opacity: 0.2
            }}></div>
            
            {/* Main card */}
            <div style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: '24px',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
              }}>
                <Droplets style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}>Son Ölçüm</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#1e40af',
                  marginBottom: '8px'
                }}>{currentArea} km²</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#3b82f6',
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>{data.years?.slice(-1)[0] || ''} yılı</div>
              </div>
            </div>
          </div>

          {/* Trend Card */}
          <div style={{ position: 'relative' }}>
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              right: '-4px',
              bottom: '-4px',
              background: data.change_percent >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '24px',
              filter: 'blur(8px)',
              opacity: 0.2
            }}></div>
            
            {/* Main card */}
            <div style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '24px',
              border: `1px solid ${data.change_percent >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                padding: '16px',
                background: data.change_percent >= 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: '24px',
                boxShadow: data.change_percent >= 0 ? '0 10px 25px rgba(16, 185, 129, 0.3)' : '0 10px 25px rgba(239, 68, 68, 0.3)'
              }}>
                {data.change_percent >= 0 ? 
                  <TrendingUp style={{ width: '32px', height: '32px', color: 'white' }} /> : 
                  <TrendingDown style={{ width: '32px', height: '32px', color: 'white' }} />
                }
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}>Trend</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: data.change_percent >= 0 ? '#166534' : '#dc2626',
                  marginBottom: '8px'
                }}>{data.change_percent >= 0 ? '+' : ''}{data.change_percent?.toFixed(1) || 0}%</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: data.change_percent >= 0 ? '#10b981' : '#ef4444',
                  background: data.change_percent >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  border: `1px solid ${data.change_percent >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>{data.change_percent >= 0 ? 'Artış eğilimi' : 'Azalış eğilimi'}</div>
              </div>
            </div>
          </div>

          {/* Veri Noktası Card */}
          <div style={{ position: 'relative' }}>
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              right: '-4px',
              bottom: '-4px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              borderRadius: '24px',
              filter: 'blur(8px)',
              opacity: 0.2
            }}></div>
            
            {/* Main card */}
            <div style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: '24px',
                boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)'
              }}>
                <BarChart3 style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}>Veri Noktası</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#7c3aed',
                  marginBottom: '8px'
                }}>{data.data_points || 'N/A'}</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#8b5cf6',
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>Toplam ölçüm</div>
              </div>
            </div>
          </div>

          {/* Model Başarısı Card */}
          <div style={{ position: 'relative' }}>
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              right: '-4px',
              bottom: '-4px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '24px',
              filter: 'blur(8px)',
              opacity: 0.2
            }}></div>
            
            {/* Main card */}
            <div style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: '24px',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
              }}>
                <Activity style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}>Model Başarısı</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#166534',
                  marginBottom: '8px'
                }}>{r2Score}%</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>R² skoru</div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Charts Sections */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '0 16px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
          <ChartSection
            title="Su Alanı Değişimi (2018-2024)"
            subtitle="Sentinel-2 Uydu Verileri vs AI Model Tahminleri"
            icon={<BarChart3 className="w-6 h-6" />}
            info="🌊 Mavi alan: Sentinel-2 uydu ölçümleri (gerçek veriler). 🤖 Yeşil çizgi: CatBoost AI model tahminleri. Model performansı backend'den MongoDB'den alınan metriklerle hesaplanmaktadır."
          >
            <ModernCharts data={data} />
          </ChartSection>

          <ChartSection
            title="Trend Analizi ve Gelecek Projeksiyonları"
            subtitle="2025-2027 lineer regresyon tahminleri"
            icon={<TrendingUp className="w-6 h-6" />}
            info="Geçmiş verilere lineer regresyon uygulanarak gelecek trendler tahmin ediliyor."
          >
            <TrendProjectionChart selectedLake={selectedLake} />
          </ChartSection>

          <ChartSection
            title="Yıllık Değişim Analizi"
            subtitle="Su alanındaki yıllık yüzdelik değişimler"
            icon={<Activity className="w-6 h-6" />}
            info="Her çubuk bir yıldan diğerine olan yüzdelik değişimi gösterir."
          >
            <TrendAnalysisChart data={data} />
          </ChartSection>

          <ChartSection
            title="Model Doğruluk Analizi"
            subtitle="Gerçek değerler vs AI tahminleri"
            icon={<BarChart3 className="w-6 h-6" />}
            info="Mavi: Gerçek değerler. Yeşil: Tahminler. Kırmızı çizgi: Fark miktarı."
          >
            <ComparisonChart data={data} />
          </ChartSection>

          <ChartSection
            title="Mevsimsel Değişim Paterni"
            subtitle="Yıl içindeki tipik su alanı değişimleri"
            icon={<Calendar className="w-6 h-6" />}
            info="İlkbahar: Kar erimeleri. Yaz: Buharlaşma artışı. Sonbahar-Kış: Yağışlarla toparlanma."
          >
            <SeasonalChart selectedLake={selectedLake} />
          </ChartSection>

          <ChartSection
            title="Gelecek Tahminleri"
            subtitle="Önümüzdeki 6 ay için AI tabanlı tahminler"
            icon={<Droplets className="w-6 h-6" />}
            info="CatBoost regresyon modeli ile hesaplanmış tahminler ve güven aralıkları."
          >
            <FutureForecast selectedLake={selectedLake} data={data} />
          </ChartSection>
        </div>

        {/* Methodology Section */}
        <div className="mt-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-10 text-slate-800">
          <h2 className="text-3xl font-bold text-center mb-10">Metodoloji ve Teknoloji</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MethodCard
              icon="🛰️"
              title="Veri Kaynağı"
              items={[
                'Sentinel-2 Uydu Görüntüleri',
                '10m-20m çözünürlük',
                '2018-2024 zaman serisi',
                'NDWI hesaplama',
                'Google Earth Engine'
              ]}
            />
            <MethodCard
              icon="🤖"
              title="AI Modeli"
              items={[
                'CatBoost Regression',
                'Optuna Hyperparameter Tuning',
                '3 Horizon Tahmin',
                'R² > 0.99 (Van, Eğirdir)',
                'WMAPE < 5%'
              ]}
            />
            <MethodCard
              icon="📊"
              title="Özellikler"
              items={[
                'Lag Features (1-12 ay)',
                'Rolling Statistics',
                'Trend Indicators',
                'Seasonal Components',
                'NDWI Time Series'
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= LAYOUT COMPONENTS =============
const StatCard = ({ icon, label, value, subtitle, color, trend }) => {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-500/25',
      bg: 'from-blue-500/10 to-blue-600/10',
      border: 'border-blue-400/30',
      text: 'text-blue-300',
      value: 'text-blue-100'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      glow: 'shadow-green-500/25',
      bg: 'from-green-500/10 to-green-600/10',
      border: 'border-green-400/30',
      text: 'text-green-300',
      value: 'text-green-100'
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      glow: 'shadow-red-500/25',
      bg: 'from-red-500/10 to-red-600/10',
      border: 'border-red-400/30',
      text: 'text-red-300',
      value: 'text-red-100'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      glow: 'shadow-purple-500/25',
      bg: 'from-purple-500/10 to-purple-600/10',
      border: 'border-purple-400/30',
      text: 'text-purple-300',
      value: 'text-purple-100'
    },
    orange: {
      gradient: 'from-orange-500 to-orange-600',
      glow: 'shadow-orange-500/25',
      bg: 'from-orange-500/10 to-orange-600/10',
      border: 'border-orange-400/30',
      text: 'text-orange-300',
      value: 'text-orange-100'
    },
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    stable: '➡️'
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`relative group`}>
      {/* Glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-br ${colors.gradient} rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300 ${colors.glow}`}></div>
      
      {/* Main card */}
      <div className={`relative bg-gradient-to-br ${colors.bg} backdrop-blur-md rounded-2xl shadow-2xl p-6 border ${colors.border} hover:shadow-3xl transition-all duration-300 hover:-translate-y-2`}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
        </div>
        
        <div className="relative">
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${colors.gradient} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white/70 uppercase tracking-wide">{label}</div>
              {trend && (
                <div className="text-lg opacity-60">{trendIcons[trend]}</div>
              )}
            </div>
            
            <div className={`text-4xl font-bold ${colors.value} mb-2 group-hover:scale-105 transition-transform duration-300`}>
              {value}
            </div>
            
            <div className={`text-sm font-medium ${colors.text} bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full inline-block border border-white/20`}>
              {subtitle}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartSection = ({ title, subtitle, icon, info, children }) => {
  return (
    <div style={{ position: 'relative' }}>
      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: '-4px',
        left: '-4px',
        right: '-4px',
        bottom: '-4px',
        background: 'linear-gradient(135deg, #3b82f6, #10b981, #8b5cf6)',
        borderRadius: '32px',
        filter: 'blur(12px)',
        opacity: 0.15
      }}></div>
      
      {/* Main card */}
      <div style={{
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '28px',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Subtle background pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '28px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, transparent 50%, rgba(16, 185, 129, 0.03) 100%)'
          }}></div>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '128px',
            height: '128px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)',
            borderRadius: '50%',
            transform: 'translate(-64px, -64px)'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '96px',
            height: '96px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%)',
            borderRadius: '50%',
            transform: 'translate(48px, 48px)'
          }}></div>
        </div>
        
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '32px' }}>
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              borderRadius: '16px',
              color: 'white',
              boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.3s ease'
            }}>
          {icon}
        </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                background: 'linear-gradient(90deg, #1e293b 0%, #3b82f6 50%, #1d4ed8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '12px',
                margin: 0
              }}>
                {title}
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#64748b',
                lineHeight: '1.6',
                margin: 0,
                fontWeight: '500'
              }}>{subtitle}</p>
          {info && (
                <div style={{
                  marginTop: '24px',
                  background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  gap: '16px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    padding: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    flexShrink: 0
                  }}>
                    <Info style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: '1.6',
                    margin: 0,
                    flex: 1,
                    fontWeight: '500'
                  }}>{info}</p>
            </div>
          )}
        </div>
      </div>
          <div style={{ position: 'relative' }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

const MethodCard = ({ icon, title, items }) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
      <div className="text-4xl mb-4 text-center">{icon}</div>
      <h3 className="text-xl font-bold text-center mb-4">{title}</h3>
      <ul className="space-y-2 text-sm text-gray-200">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}