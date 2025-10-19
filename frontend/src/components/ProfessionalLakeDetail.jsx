import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Droplets, TrendingUp, TrendingDown, Target, Activity, Award, Calendar
} from 'lucide-react';
import { formatArea, formatAreaWithComparison } from '../utils';

// API Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ProfessionalLakeDetail = ({ data, loading }) => {
  const [clusterData, setClusterData] = useState(null);
  const [clusterLoading, setClusterLoading] = useState(true);

  // K-Means cluster verilerini çek
  useEffect(() => {
    if (data && data.lake_id) {
      fetchClusterData(data.lake_id);
    }
  }, [data]);

  const fetchClusterData = async (lakeId) => {
    try {
      setClusterLoading(true);
      const response = await fetch(`${API_BASE}/api/water-quality/lake-analysis/${lakeId}`);
      if (!response.ok) throw new Error('Cluster veri hatası');
      const result = await response.json();
      if (result.status === 'success') {
        setClusterData(result);
      }
    } catch (error) {
      console.error('Cluster veri hatası:', error);
      setClusterData(null);
    } finally {
      setClusterLoading(false);
    }
  };

  if (loading) return null;
  if (!data || data.status !== "success") return null;

  const currentArea = data.historical?.actual?.[data.historical.actual.length - 1];
  const futureArea = data.future?.predicted_h1?.[0];
  const changePercent = currentArea && futureArea 
    ? (((futureArea - currentArea) / currentArea) * 100).toFixed(2)
    : 0;
  
  const isNegativeChange = parseFloat(changePercent) < 0;
  
  // Model metrikleri - horizons'dan çek
  const h1Wmape = data.horizons?.comparison?.find(h => h.horizon_name === 'H1 (1 Ay Öncesi)')?.wmape || 0;
  const h2Wmape = data.horizons?.comparison?.find(h => h.horizon_name === 'H2 (2 Ay Öncesi)')?.wmape || 0;
  const h3Wmape = data.horizons?.comparison?.find(h => h.horizon_name === 'H3 (3 Ay Öncesi)')?.wmape || 0;
  const avgWmape = data.horizons?.comparison?.length > 0 
    ? (data.horizons.comparison.reduce((sum, h) => sum + h.wmape, 0) / data.horizons.comparison.length).toFixed(2)
    : 0;

  return (
    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Başlık ve Güncelleme */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Droplets className="w-10 h-10" />
              <h1 className="text-4xl lg:text-5xl font-bold">{data.lake_name}</h1>
            </div>
            <p className="text-blue-100 text-lg">Su Alanı Tahmin ve Analiz Raporu</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
            <Calendar className="w-5 h-5" />
            <div>
              <div className="text-xs text-blue-200">Son Güncelleme</div>
              <div className="font-semibold">
                {new Date().toLocaleDateString('tr-TR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
                    </div>
                  </div>
                </div>
              </div>

        {/* Model Metrikleri - Tablo Formatı */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/20">
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Horizon
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Tahmin Periyodu
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-blue-100 uppercase tracking-wider">
                  WMAPE
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Performans
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500/30 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">H1</span>
                </div>
                    <span className="text-sm font-semibold text-white">Horizon 1</span>
            </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-blue-100">
                  1 Ay İleri
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-white">{h1Wmape.toFixed(2)}%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    h1Wmape <= 2 ? 'bg-green-500/30 text-green-200' :
                    h1Wmape <= 3.5 ? 'bg-blue-500/30 text-blue-200' :
                    'bg-orange-500/30 text-orange-200'
                  }`}>
                    {h1Wmape <= 2 ? '🏆 Mükemmel' : h1Wmape <= 3.5 ? '✅ İyi' : '⚠️ Orta'}
                  </span>
                </td>
              </tr>
              
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/30 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">H2</span>
                </div>
                    <span className="text-sm font-semibold text-white">Horizon 2</span>
                </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-blue-100">
                  2 Ay İleri
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-white">{h2Wmape.toFixed(2)}%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    h2Wmape <= 2 ? 'bg-green-500/30 text-green-200' :
                    h2Wmape <= 3.5 ? 'bg-blue-500/30 text-blue-200' :
                    'bg-orange-500/30 text-orange-200'
                  }`}>
                    {h2Wmape <= 2 ? '🏆 Mükemmel' : h2Wmape <= 3.5 ? '✅ İyi' : '⚠️ Orta'}
                  </span>
                </td>
              </tr>
              
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500/30 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">H3</span>
                  </div>
                    <span className="text-sm font-semibold text-white">Horizon 3</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-blue-100">
                  3 Ay İleri
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-white">{h3Wmape.toFixed(2)}%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    h3Wmape <= 2 ? 'bg-green-500/30 text-green-200' :
                    h3Wmape <= 3.5 ? 'bg-blue-500/30 text-blue-200' :
                    'bg-orange-500/30 text-orange-200'
                  }`}>
                    {h3Wmape <= 2 ? '🏆 Mükemmel' : h3Wmape <= 3.5 ? '✅ İyi' : '⚠️ Orta'}
                  </span>
                </td>
              </tr>
              
              <tr className="bg-white/5 border-t-2 border-white/30">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500/30 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5" />
                      </div>
                    <span className="text-sm font-bold text-white">Ortalama</span>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-blue-100 font-semibold">
                  Tüm Horizonlar
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-yellow-300">{avgWmape}%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    parseFloat(avgWmape) <= 2 ? 'bg-green-500/30 text-green-200' :
                    parseFloat(avgWmape) <= 3.5 ? 'bg-blue-500/30 text-blue-200' :
                    'bg-orange-500/30 text-orange-200'
                  }`}>
                    {parseFloat(avgWmape) <= 2 ? '🏆 Mükemmel' : parseFloat(avgWmape) <= 3.5 ? '✅ İyi' : '⚠️ Orta'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
              </div>

        {/* Alan Karşılaştırması - Tablo Formatı */}
        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/10 border-b border-white/20">
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase">
                  Yıl
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-blue-100 uppercase">
                  Alan (km²)
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-blue-100 uppercase">
                  Değişim
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase">
                  Karşılaştırma
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-300" />
                    <span className="text-sm font-semibold text-white">2024 (Mevcut)</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-white">{formatArea(currentArea)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm text-blue-200">-</span>
                </td>
                <td className="px-6 py-4 text-sm text-blue-200">
                  {currentArea ? formatAreaWithComparison(currentArea) : 'Veri yok'}
                </td>
              </tr>
              
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {isNegativeChange ? (
                      <TrendingDown className="w-5 h-5 text-red-300" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-green-300" />
                    )}
                    <span className="text-sm font-semibold text-white">2025 (Tahmin)</span>
          </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-2xl font-bold text-white">{formatArea(futureArea)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isNegativeChange ? 'bg-red-500/30 text-red-200' : 'bg-green-500/30 text-green-200'
                  }`}>
                    {isNegativeChange ? '↓' : '↑'} {Math.abs(parseFloat(changePercent))}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-blue-200">
                  {futureArea ? formatAreaWithComparison(futureArea) : 'Veri yok'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SU KALİTESİ CLUSTER ANALİZİ */}
        {clusterLoading ? (
          <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="text-center py-8">
              <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-sm">Su kalitesi analizi yükleniyor...</p>
            </div>
          </div>
        ) : clusterData ? (
          <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
            <div className="px-6 py-4 bg-white/5 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔬</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Su Kalitesi Analizi</h2>
                    <p className="text-sm text-blue-100">K-Means Unsupervised Learning</p>
                  </div>
                </div>
                <div className="bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-semibold text-green-100">✅ Data Leakage Yok</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Baskın Cluster Kartı */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <div className="text-sm text-blue-100 mb-2">Baskın Durum</div>
                  <div className="text-4xl mb-3">
                    {clusterData.dominant_cluster.cluster === 0 ? '🟢' :
                     clusterData.dominant_cluster.cluster === 1 ? '🔴' :
                     clusterData.dominant_cluster.cluster === 2 ? '🔵' : '🟣'}
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">
                    {clusterData.dominant_cluster.name}
                  </div>
                  <div className="text-3xl font-black text-white mb-2">
                    {clusterData.dominant_cluster.percentage}%
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    clusterData.dominant_cluster.risk_level === 'Düşük' ? 'bg-green-500/30 text-green-200' :
                    clusterData.dominant_cluster.risk_level === 'Normal' ? 'bg-blue-500/30 text-blue-200' :
                    clusterData.dominant_cluster.risk_level === 'Özel' ? 'bg-purple-500/30 text-purple-200' :
                    'bg-red-500/30 text-red-200'
                  }`}>
                    {clusterData.dominant_cluster.risk_level} Risk
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <div className="text-sm text-blue-100 mb-2">Toplam Ölçüm</div>
                  <div className="text-5xl font-black text-white mb-2">{clusterData.total_measurements}</div>
                  <div className="text-sm text-blue-100">
                    {clusterData.date_range.start} - {clusterData.date_range.end}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/20 text-xs text-blue-200">
                    Sentinel-2 Uydu Verileri
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <div className="text-sm text-blue-100 mb-4">Ortalama Spektral Değerler</div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-blue-200">NDWI</span>
                        <span className="text-white font-bold">{clusterData.average_values.ndwi_mean.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min(clusterData.average_values.ndwi_mean * 5, 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-blue-200">Turbidity</span>
                        <span className="text-white font-bold">{clusterData.average_values.turbidity_mean.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${Math.min(clusterData.average_values.turbidity_mean * 20, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cluster Dağılımı */}
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Cluster Dağılımı</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(clusterData.cluster_distribution).map(([clusterId, data]) => {
                    const clusterIcons = { '0': '🟢', '1': '🔴', '2': '🔵', '3': '🟣' };
                    const clusterColors = {
                      '0': 'bg-green-500/20 border-green-400/30',
                      '1': 'bg-red-500/20 border-red-400/30',
                      '2': 'bg-blue-500/20 border-blue-400/30',
                      '3': 'bg-purple-500/20 border-purple-400/30'
                    };
                    
                    return (
                      <div key={clusterId} className={`rounded-lg p-4 border ${clusterColors[clusterId] || 'bg-white/10 border-white/20'}`}>
                        <div className="text-3xl mb-2">{clusterIcons[clusterId]}</div>
                        <div className="text-sm text-white font-semibold mb-1">{data.name}</div>
                        <div className="text-2xl font-bold text-white">{data.percentage}%</div>
                        <div className="text-xs text-blue-200">{data.count} ölçüm</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Açıklama */}
              <div className="mt-6 bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 flex gap-3">
                <div className="text-2xl flex-shrink-0">💡</div>
                <div className="text-sm text-blue-100 leading-relaxed">
                  <strong className="text-white">K-Means Unsupervised Learning:</strong> Etiket olmadan,
                  sadece spektral özelliklerden (NDWI, WRI, Chlorophyll-a, Turbidity) doğal grupları keşfeder. 
                  Supervised modellerdeki data leakage sorunu yok.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-2">Su Kalitesi Verisi Hazırlanıyor</h3>
              <p className="text-blue-100 text-sm">
                Bu göl için henüz spektral analiz verileri eklenmemiş.
                <br/>
                Mevcut göller: Van, Tuz, Burdur, Ulubat, Sapanca, Salda
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ProfessionalLakeDetail.propTypes = {
  data: PropTypes.shape({
    status: PropTypes.string,
    lake_name: PropTypes.string,
    historical: PropTypes.shape({
      actual: PropTypes.arrayOf(PropTypes.number),
      years: PropTypes.arrayOf(PropTypes.number)
    }),
    future: PropTypes.shape({
      predicted_h1: PropTypes.arrayOf(PropTypes.number)
    }),
    horizons: PropTypes.shape({
      comparison: PropTypes.arrayOf(
        PropTypes.shape({
          horizon_name: PropTypes.string,
          wmape: PropTypes.number
        })
      )
    })
  }),
  loading: PropTypes.bool
};

ProfessionalLakeDetail.defaultProps = {
  data: null,
  loading: false
};

export default ProfessionalLakeDetail;
