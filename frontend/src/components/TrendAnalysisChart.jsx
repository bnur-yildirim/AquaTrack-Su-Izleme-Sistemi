import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  ComposedChart, Line, Area, Scatter, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { TrendingUp, AlertCircle, Activity, CheckCircle2, Target } from 'lucide-react';
import { formatArea } from '../utils';

const TrendAnalysisChart = ({ data, loading }) => {
  const [showConfidence, setShowConfidence] = useState(true);

  // Debug: API yanıtını console'a yazdır
  useEffect(() => {
    if (data) {
      console.log('🔍 Trend Data:', data.trend);
      console.log('🔍 Historical:', data.historical);
      console.log('🔍 Future:', data.future);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.trend || data.trend.status !== 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="flex items-center justify-center h-96 text-gray-500">
          <AlertCircle className="mr-2" size={20} />
          Trend verisi yüklenemedi
          {data?.trend && (
            <div className="mt-2 text-xs text-red-600">
              Status: {data.trend.status || 'undefined'}
            </div>
          )}
        </div>
      </div>
    );
  }

  const trendData = data.trend;

  // chartData oluştur - Alternatif alan adlarını kontrol et
  const chartData = [
    ...(data.historical?.years || []).map((year, i) => ({
      year,
      actual: data.historical.actual?.[i] || null,
      trend: trendData.trend_line?.[i] || trendData.trend?.[i] || null,
      confidenceUpper: null,
      confidenceLower: null
    })),
    ...(data.future?.years || []).map((year, i) => ({
      year,
      actual: null,
      trend: trendData.future_trend?.[i] || trendData.projected_trend?.[i] || trendData.forecast?.[i] || null,
      confidenceUpper: trendData.confidence_upper?.[i] || trendData.upper_bound?.[i] || null,
      confidenceLower: trendData.confidence_lower?.[i] || trendData.lower_bound?.[i] || null
    }))
  ];

  // Debug: Chart data'yı console'a yazdır
  console.log('📊 Chart Data:', chartData);

  // Confidence interval verisi var mı kontrolü
  const hasConfidenceData = chartData.some(d => d.confidenceUpper !== null && d.confidenceLower !== null);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
      
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              Trend Analizi
            </h2>
            <p className="text-sm text-gray-600 mt-1">İstatistiksel Gelecek Projeksiyonu</p>
          </div>
          
          <div className="flex items-center gap-3">
            {hasConfidenceData && (
              <button
                onClick={() => setShowConfidence(!showConfidence)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  showConfidence 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {showConfidence ? '✓' : ''} Güven Aralığı
              </button>
            )}
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              trendData.trend_direction === 'artış' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {trendData.trend_direction === 'artış' ? '📈' : '📉'} {trendData.trend_direction || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Trend İstatistikleri - Tablo Formatı */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-purple-100 border-b border-purple-200">
                <th className="px-6 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Metrik
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Değer
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Açıklama
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100">
              <tr className="hover:bg-purple-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">%</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">Yıllık Değişim</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-blue-900">
                    {trendData.yearly_change_percent !== undefined 
                      ? `${trendData.yearly_change_percent > 0 ? '+' : ''}${trendData.yearly_change_percent.toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  Uzun dönem eğilim
                </td>
              </tr>
              
              <tr className="hover:bg-purple-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Activity size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">Trend Yönü</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-purple-900 capitalize">
                    {trendData.trend_direction || 'Belirsiz'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  Genel yön
                </td>
              </tr>
              
              <tr className="hover:bg-purple-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">Güvenilirlik</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-green-900">
                    {trendData.reliability || 'Yüksek'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  Model performansı
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Trend Grafiği */}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '13px' }} />
            <YAxis tickFormatter={formatArea} stroke="#6b7280" style={{ fontSize: '12px' }} />

            <Tooltip
              formatter={(value, name) => {
                if (name === 'confidenceUpper' || name === 'confidenceLower') return null;
                return [formatArea(value), name === 'actual' ? 'Gerçek' : 'Trend'];
              }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '13px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            />
            
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
            
            <ReferenceLine 
              x={2024} 
              stroke="#94a3b8" 
              strokeDasharray="5 5"
              label={{ value: 'Bugün', position: 'top', fill: '#64748b', fontSize: '11px' }}
            />

            {showConfidence && hasConfidenceData && (
              <>
                <Area
                  dataKey="confidenceUpper"
                  stroke="none"
                  fill="url(#confidenceGrad)" 
                  fillOpacity={0.4}
                  connectNulls={true}
                />
                <Area
                  dataKey="confidenceLower"
                  stroke="none"
                  fill="url(#confidenceGrad)" 
                  fillOpacity={0.4}
                  connectNulls={true}
                />
              </>
            )}

            <Line
              type="monotone"
              dataKey="trend"
              stroke="#8b5cf6" 
              strokeWidth={3}
              dot={false}
              name="Trend Çizgisi"
              strokeDasharray="5 5"
              connectNulls={true}
            />
            <Scatter
              dataKey="actual"
              fill="#10b981"
              name="Gerçek Değerler"
              shape="circle"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Gelecek Projeksiyonları - Tablo Formatı */}
        {trendData.projections && trendData.projections.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl overflow-hidden">
            <div className="bg-purple-100 px-6 py-3 border-b border-purple-200">
              <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                <Target size={16} />
                Gelecek Projeksiyonları
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-purple-50 border-b border-purple-200">
                  <th className="px-6 py-3 text-left text-xs font-bold text-purple-900 uppercase">
                    Yıl
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-purple-900 uppercase">
                    Tahmin Alan
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-purple-900 uppercase">
                    Güven Seviyesi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {trendData.projections.map((proj, i) => (
                  <tr key={i} className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-purple-900">{proj.year}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-xl font-bold text-purple-900">{formatArea(proj.projected_area)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        proj.confidence === 'high' ? 'bg-green-100 text-green-700' : 
                        proj.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {proj.confidence === 'high' ? '⭐ Yüksek' : proj.confidence === 'medium' ? '⚠️ Orta' : '❗ Düşük'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

TrendAnalysisChart.propTypes = {
  data: PropTypes.shape({
    trend: PropTypes.shape({
      status: PropTypes.string,
      yearly_change_percent: PropTypes.number,
      trend_direction: PropTypes.string,
      reliability: PropTypes.string,
      trend_line: PropTypes.arrayOf(PropTypes.number),
      trend: PropTypes.arrayOf(PropTypes.number),
      future_trend: PropTypes.arrayOf(PropTypes.number),
      projected_trend: PropTypes.arrayOf(PropTypes.number),
      forecast: PropTypes.arrayOf(PropTypes.number),
      confidence_upper: PropTypes.arrayOf(PropTypes.number),
      upper_bound: PropTypes.arrayOf(PropTypes.number),
      confidence_lower: PropTypes.arrayOf(PropTypes.number),
      lower_bound: PropTypes.arrayOf(PropTypes.number),
      projections: PropTypes.arrayOf(
        PropTypes.shape({
          year: PropTypes.number,
          projected_area: PropTypes.number,
          confidence: PropTypes.string
        })
      )
    }),
    historical: PropTypes.shape({
      years: PropTypes.arrayOf(PropTypes.number),
      actual: PropTypes.arrayOf(PropTypes.number)
    }),
    future: PropTypes.shape({
      years: PropTypes.arrayOf(PropTypes.number)
    })
  }),
  loading: PropTypes.bool
};

TrendAnalysisChart.defaultProps = {
  data: null,
  loading: false
};

export default TrendAnalysisChart;
