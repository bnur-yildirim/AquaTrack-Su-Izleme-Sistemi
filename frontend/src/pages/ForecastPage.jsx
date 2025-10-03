import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Droplets, Calendar, Activity, AlertCircle, BarChart3, Info } from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ComposedChart, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine
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
  })).filter(item => item.actual && item.predicted) || [];

  if (timeRange === 'recent' && chartData.length > 3) chartData = chartData.slice(-3);
  else if (timeRange === 'mid' && chartData.length > 5) chartData = chartData.slice(-5);

  const metrics = calculateMetrics(chartData);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          label="Model Doğruluğu (R²)" 
          value={`${(metrics.r2 * 100).toFixed(1)}%`}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard 
          label="Ortalama Hata (MAPE)" 
          value={`±${metrics.mape.toFixed(1)}%`}
          icon={<AlertCircle className="w-5 h-5" />}
          color="orange"
        />
        <MetricCard 
          label="Toplam Veri Noktası" 
          value={chartData.length}
          icon={<BarChart3 className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Time Range Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'Tüm Veri' },
          { value: 'mid', label: 'Son 5 Yıl' },
          { value: 'recent', label: 'Son 3 Yıl' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTimeRange(value)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              timeRange === value
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '13px' }} />
            <YAxis tickFormatter={formatArea} stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {showActual && (
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorActual)"
                name="Gerçek Değerler"
                dot={{ fill: '#3b82f6', r: 5 }}
              />
            )}
            {showPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Model Tahminleri"
                dot={{ fill: '#10b981', r: 5 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Toggle Controls */}
        <div className="flex gap-3 mt-6">
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
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Yıllık Performans Detayı
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {chartData.map((item) => {
            const error = ((item.predicted - item.actual) / item.actual) * 100;
            const errorAbs = Math.abs(error);
            const isGood = errorAbs < 1;
            const isFair = errorAbs < 3;
            
            return (
              <div 
                key={item.year}
                className={`p-4 rounded-lg border-2 text-center transition-all hover:scale-105 ${
                  isGood ? 'bg-emerald-50 border-emerald-300' : 
                  isFair ? 'bg-blue-50 border-blue-300' : 
                  'bg-amber-50 border-amber-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-700 mb-2">{item.year}</div>
                <div className={`text-xl font-bold ${
                  isGood ? 'text-emerald-600' : 
                  isFair ? 'text-blue-600' : 
                  'text-amber-600'
                }`}>
                  {error > 0 ? '+' : ''}{error.toFixed(1)}%
                </div>
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
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/forecast/trend-analysis?lake_id=${selectedLake}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Trend analysis error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedLake]);

  if (loading) return <LoadingState />;
  if (!data || data.status === 'no_data') return <NoDataState />;

  // Güvenli veri kontrolü
  const historicalYears = data.historical_years || [];
  const historicalValues = data.historical_values || [];
  const projections = data.projections || [];

  const chartData = [
    ...historicalYears.map((year, i) => ({
      year,
      actual: historicalValues[i],
    })),
    ...projections.map(p => ({
      year: p.year,
      projected: p.projected_area,
    }))
  ];

  const trendDirection = data.trend_direction === 'azalış' ? 'down' : 'up';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            {trendDirection === 'down' ? 
              <TrendingDown className="w-5 h-5 text-red-600" /> : 
              <TrendingUp className="w-5 h-5 text-green-600" />
            }
            <span className="text-sm font-medium text-gray-600">Yıllık Değişim</span>
          </div>
          <div className={`text-3xl font-bold ${trendDirection === 'down' ? 'text-red-600' : 'text-green-600'}`}>
            {data.yearly_change_percent > 0 ? '+' : ''}{data.yearly_change_percent.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600 mt-1 capitalize">{data.trend_direction} trendi</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
          <div className="text-sm font-medium text-gray-600 mb-2">2025 Tahmini</div>
          <div className="text-3xl font-bold text-blue-600">
            {formatArea(data.projections[0]?.projected_area)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Yakın dönem</div>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-5 rounded-xl border border-cyan-200">
          <div className="text-sm font-medium text-gray-600 mb-2">2027 Tahmini</div>
          <div className="text-3xl font-bold text-cyan-600">
            {formatArea(data.projections[2]?.projected_area)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Uzun dönem</div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis tickFormatter={formatArea} stroke="#6b7280" />
            <Tooltip formatter={formatArea} />
            <Legend />
            <ReferenceLine x={2024} stroke="#f59e0b" strokeDasharray="5 5" label="Bugün" />
            <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="url(#trendGrad)" strokeWidth={3} name="Gerçek Veri" dot={{ r: 5 }} />
            <Line type="monotone" dataKey="projected" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="5 5" name="Projeksiyon" dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Trend Analizi:</strong> Lineer regresyon ile hesaplanmıştır. 
          Yıllık {data.trend_direction} oranı {Math.abs(data.yearly_change_percent).toFixed(2)}% olarak tespit edilmiştir.
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
const SeasonalChart = ({ data }) => {
  if (!data) return <LoadingState />;

  // Mevsimsel veri simülasyonu (gerçek API'nizden gelecek)
  const seasonalData = [
    { season: 'İlkbahar', average: 95, max: 105, min: 85 },
    { season: 'Yaz', average: 85, max: 95, min: 75 },
    { season: 'Sonbahar', average: 90, max: 100, min: 80 },
    { season: 'Kış', average: 100, max: 110, min: 90 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {seasonalData.map((season, idx) => (
          <div key={idx} className="bg-gradient-to-br from-cyan-50 to-blue-50 p-5 rounded-xl border border-cyan-200">
            <Calendar className="w-6 h-6 text-cyan-600 mb-2" />
            <div className="text-sm font-medium text-gray-600 mb-1">{season.season}</div>
            <div className="text-2xl font-bold text-cyan-600">{season.average}%</div>
            <div className="text-xs text-gray-500 mt-1">Ortalama doluluk</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={seasonalData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="season" stroke="#6b7280" />
            <PolarRadiusAxis stroke="#6b7280" />
            <Radar name="Ortalama" dataKey="average" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
            <Radar name="Maksimum" dataKey="max" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            <Radar name="Minimum" dataKey="min" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Mevsimsel Analiz:</strong> İlkbahar aylarında kar erimeleri nedeniyle su seviyesi artar. 
          Yaz aylarında buharlaşma nedeniyle azalır. Sonbahar ve kış aylarında yağışlarla toparlanma görülür.
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
        const response = await fetch(`${API_BASE}/api/forecast/future?lake_id=${selectedLake}&months=6`);
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
  const colors = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-600',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-600',
    green: 'from-green-50 to-green-100 border-green-200 text-green-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-5 rounded-xl border`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={colors[color].split(' ')[2]}>{icon}</div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${colors[color].split(' ')[2]}`}>{value}</div>
    </div>
  );
};

const ToggleButton = ({ active, onClick, color, label }) => {
  const colors = {
    blue: active ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-600',
    green: active ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-600',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all hover:scale-105 ${colors[color]}`}
    >
      <div className={`w-3 h-3 rounded-full ${active ? (color === 'blue' ? 'bg-blue-500' : 'bg-green-500') : 'bg-gray-400'}`} />
      {label}
    </button>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  
  const item = payload[0].payload;
  const error = ((item.predicted - item.actual) / item.actual) * 100;
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200">
      <div className="font-bold text-lg text-gray-900 mb-3 pb-2 border-b">{item.year}</div>
      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-500 mb-1">Gerçek Değer</div>
          <div className="text-lg font-bold text-blue-600">{formatArea(item.actual)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Tahmin Değeri</div>
          <div className="text-lg font-bold text-green-600">{formatArea(item.predicted)}</div>
        </div>
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 mb-1">Hata Oranı</div>
          <div className={`text-lg font-bold ${Math.abs(error) < 1 ? 'text-green-600' : 'text-orange-600'}`}>
            {error > 0 ? '+' : ''}{error.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600">Veri yükleniyor...</p>
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
  const [lakes, setLakes] = useState({});
  const [selectedLake, setSelectedLake] = useState(propSelectedLake || 'van');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prop değiştiğinde state'i güncelle
  useEffect(() => {
    if (propSelectedLake && propSelectedLake !== selectedLake) {
      setSelectedLake(propSelectedLake);
    }
  }, [propSelectedLake, selectedLake]);

  // Fetch lakes list
  useEffect(() => {
    fetch(`${API_BASE}/api/lakes`)
      .then(res => res.json())
      .then(result => {
        setLakes(result.lakes || {});
      })
      .catch(err => console.error('Lakes fetch error:', err));
  }, []);

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

  const lakeName = lakes[selectedLake]?.name || selectedLake.toUpperCase();
  const lastActual = data.actual?.filter(a => a).slice(-1)[0];
  const currentArea = lastActual ? (lastActual / 1e6).toFixed(1) : 'N/A';
  const r2Score = data.model_metrics?.r2 ? (data.model_metrics.r2 * 100).toFixed(1) : 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header Section */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-lg mb-6">
            <Droplets className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{lakeName}</h1>
          </div>
          <p className="text-lg text-gray-600 mb-6">
            Sentinel-2 Uydu Verileri ve Yapay Zeka Destekli Tahmin Sistemi
          </p>
          
          {/* Lake Selector */}
          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-xl shadow-md border border-gray-200">
            <label className="text-sm font-semibold text-gray-700">Göl Seçin:</label>
            <select
              value={selectedLake}
              onChange={(e) => setSelectedLake(e.target.value)}
              className="px-4 py-2 bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold cursor-pointer hover:border-blue-500 focus:outline-none focus:border-blue-600 transition-colors"
            >
              {Object.entries(lakes).map(([key, lake]) => (
                <option key={key} value={key}>{lake.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            icon={<Droplets className="w-8 h-8" />}
            label="Son Ölçüm"
            value={`${currentArea} km²`}
            subtitle={`${data.years?.slice(-1)[0] || ''} yılı`}
            color="blue"
          />
          <StatCard
            icon={data.change_percent >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
            label="Trend"
            value={`${data.change_percent >= 0 ? '+' : ''}${data.change_percent?.toFixed(1) || 0}%`}
            subtitle={data.change_percent >= 0 ? 'Artış eğilimi' : 'Azalış eğilimi'}
            color={data.change_percent >= 0 ? 'green' : 'red'}
          />
          <StatCard
            icon={<BarChart3 className="w-8 h-8" />}
            label="Veri Noktası"
            value={data.data_points || 'N/A'}
            subtitle="Toplam ölçüm"
            color="purple"
          />
          <StatCard
            icon={<Activity className="w-8 h-8" />}
            label="Model Başarısı"
            value={`${r2Score}%`}
            subtitle="R² skoru"
            color="green"
          />
        </div>

        {/* Charts Sections */}
        <div className="space-y-8">
          <ChartSection
            title="Su Alanı Değişimi (2018-2024)"
            subtitle="Gerçek değerler vs Model tahminleri"
            icon={<BarChart3 className="w-6 h-6" />}
            info="Mavi alan: Sentinel-2 uydu ölçümleri. Yeşil çizgi: AI model tahminleri."
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
            <SeasonalChart data={data} />
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
const StatCard = ({ icon, label, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white mb-4`}>
        {icon}
      </div>
      <div className="text-sm font-medium text-gray-600 mb-2">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
    </div>
  );
};

const ChartSection = ({ title, subtitle, icon, info, children }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{subtitle}</p>
          {info && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{info}</p>
            </div>
          )}
        </div>
      </div>
      <div>{children}</div>
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