import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Award, Target, Activity, AlertCircle, BarChart3 } from 'lucide-react';

const ModelPerformanceComparison = ({ data, loading }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const activeMetric = 'wmape'; // sadece WMAPE göster

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.horizons || data.horizons.status !== 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="flex items-center justify-center h-96 text-gray-500">
          <AlertCircle className="mr-2" size={20} />
          Performans verisi yüklenemedi
        </div>
      </div>
    );
  }

  // 🔧 DÜZENLENDİ: R² düşük (ör. 0.7 altı) horizon'ları filtrele
  const horizonData = (data.horizons?.comparison || [])
    .filter(h => h.r2 !== null && h.r2 >= 0.7)
    .map(h => ({
    name: h.horizon_name,
    r2: h.r2 * 100,
    wmape: h.wmape,
    samples: h.samples,
    reliability: h.reliability
  }));

  // 🔧 R² filtresi sonrası hiç veri kalmadıysa uyarı göster
  if (horizonData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 flex items-center justify-center h-96 text-gray-500">
        <AlertCircle className="mr-2 text-yellow-500" size={22} />
        <span>Uygun veri bulunamadı (R² düşük olabilir)</span>
      </div>
    );
  }

  const getBarColor = (value) => {
      if (value <= 2) return '#10b981';
    if (value <= 3.5) return '#3b82f6';
    return '#f59e0b';
  };

  const getPerformanceLabel = (value) => {
    if (value <= 2) return '🏆 Mükemmel';
    if (value <= 3.5) return '✅ İyi';
    return '⚠️ Orta';
  };

  const maxWmape = Math.ceil(Math.max(...horizonData.map(h => h.wmape)) + 0.5);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
      
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-orange-600" />
              Model Performans Analizi
          </h2>
            <p className="text-sm text-gray-600 mt-1">Tahmin Doğruluğu Karşılaştırması</p>
      </div>
          <div className="px-4 py-2 bg-orange-600 text-white rounded-lg shadow-sm font-semibold text-sm">
            WMAPE (Hata Oranı)
          </div>
          </div>
        </div>

      <div className="p-6">
        {/* WMAPE Özet Tablosu */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-orange-100 border-b border-orange-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-orange-900 uppercase">Metrik</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-orange-900 uppercase">Değer</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-orange-900 uppercase">Horizon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              <tr className="hover:bg-orange-50 transition-colors">
                <td className="px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
                    <Target size={14} className="text-white" />
          </div>
                  <span className="text-sm font-semibold text-gray-900">En Düşük WMAPE</span>
                </td>
                <td className="px-4 py-3 text-center text-xl font-bold text-green-700">
                  {Math.min(...horizonData.map(h => h.wmape)).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {horizonData.find(h => h.wmape === Math.min(...horizonData.map(h => h.wmape)))?.name}
                </td>
              </tr>

              <tr className="hover:bg-orange-50 transition-colors">
                <td className="px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Activity size={14} className="text-white" />
          </div>
                  <span className="text-sm font-semibold text-gray-900">Ortalama WMAPE</span>
                </td>
                <td className="px-4 py-3 text-center text-xl font-bold text-blue-700">
                  {(horizonData.reduce((sum, h) => sum + h.wmape, 0) / horizonData.length).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-700 font-medium">
                  Tüm horizonlar
                </td>
              </tr>

              <tr className="hover:bg-orange-50 transition-colors">
                <td className="px-4 py-3 flex items-center gap-2">
                  <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                    <BarChart3 size={14} className="text-white" />
          </div>
                  <span className="text-sm font-semibold text-gray-900">En Yüksek WMAPE</span>
                </td>
                <td className="px-4 py-3 text-center text-xl font-bold text-orange-700">
                  {Math.max(...horizonData.map(h => h.wmape)).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-700 font-medium">
                  {horizonData.find(h => h.wmape === Math.max(...horizonData.map(h => h.wmape)))?.name}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Performans Grafiği */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={horizonData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '13px' }} />
            <YAxis
              domain={[0, maxWmape]}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              label={{
                value: 'WMAPE (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '12px', fill: '#6b7280' }
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                      <div className="font-bold text-base text-gray-900 mb-2">{item.name}</div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">WMAPE:</span>
                          <span className="font-semibold text-orange-600">{item.wmape.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Samples:</span>
                          <span className="font-semibold text-gray-900">{item.samples}</span>
          </div>
                        <div className="pt-2 border-t border-gray-200 mt-2 text-green-600 font-semibold">
                          {getPerformanceLabel(item.wmape)}
          </div>
        </div>
      </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={2} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Mükemmel', position: 'right', fill: '#10b981', fontSize: 11 }} />
            <ReferenceLine y={3.5} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'İyi', position: 'right', fill: '#f59e0b', fontSize: 11 }} />
            <Bar dataKey="wmape" radius={[10, 10, 0, 0]} onMouseEnter={(_, i) => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
              {horizonData.map((h, i) => (
                <Cell key={i} fill={getBarColor(h.wmape)} opacity={hoveredBar === null || hoveredBar === i ? 1 : 0.5} style={{ transition: '0.3s' }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

        {/* Detaylı Horizon Tablosu */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">
                  Horizon
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-900 uppercase">
                  WMAPE
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-900 uppercase">
                  Performans
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-900 uppercase">
                  Samples
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {horizonData.map((horizon, i) => (
                <tr 
                  key={i}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        horizon.wmape <= 2 ? 'bg-green-500' : 
                        horizon.wmape <= 3.5 ? 'bg-blue-500' : 'bg-orange-500'
                      }`}></div>
                      <span className="text-sm font-bold text-gray-900">{horizon.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-xl font-bold text-orange-600">{horizon.wmape.toFixed(2)}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      horizon.wmape <= 2 ? 'bg-green-100 text-green-700' : 
                      horizon.wmape <= 3.5 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {horizon.wmape <= 2 ? '🏆 Mükemmel' : 
                       horizon.wmape <= 3.5 ? '✅ İyi' : '⚠️ Orta'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                    {horizon.samples}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

ModelPerformanceComparison.propTypes = {
  data: PropTypes.shape({
    horizons: PropTypes.shape({
      status: PropTypes.string,
      comparison: PropTypes.arrayOf(
        PropTypes.shape({
          horizon_name: PropTypes.string,
          r2: PropTypes.number,
          wmape: PropTypes.number,
          samples: PropTypes.number,
          reliability: PropTypes.string
        })
      )
    })
  }),
  loading: PropTypes.bool
};

ModelPerformanceComparison.defaultProps = {
  data: null,
  loading: false
};

export default ModelPerformanceComparison;