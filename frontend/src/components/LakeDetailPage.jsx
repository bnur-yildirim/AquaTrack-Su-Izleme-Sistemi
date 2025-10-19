import React, { useState, useEffect } from 'react';
import { Droplets, TrendingUp, TrendingDown, Activity, MapPin, Calendar, Database, Award, AlertCircle, Info } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const LakeDetailPage = ({ lakeId = 'salda' }) => {
  const [data, setData] = useState(null);
  const [waterQuality, setWaterQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qualityLoading, setQualityLoading] = useState(true);

  // Su miktarı verilerini çek
  useEffect(() => {
    if (!lakeId) return;
    
    setLoading(true);
    fetch(`${API_BASE}/api/forecast?lake_id=${lakeId}`)
      .then(res => res.json())
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        console.error('Lake detail error:', err);
        setLoading(false);
      });
  }, [lakeId]);

  // Su kalitesi verilerini çek
  useEffect(() => {
    if (!lakeId) return;
    
    setQualityLoading(true);
    fetch(`${API_BASE}/api/quality/lake/${lakeId}/cluster`)
      .then(res => res.json())
      .then(result => {
        setWaterQuality(result);
        setQualityLoading(false);
      })
      .catch(err => {
        console.error('Water quality error:', err);
        setQualityLoading(false);
      });
  }, [lakeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg font-semibold">Veri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!data || data.status !== 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 text-xl font-semibold">Veri yüklenemedi</p>
        </div>
      </div>
    );
  }

  const lakeName = data.lake_name;
  const currentArea = data.actual && data.actual.length > 0 
    ? (data.actual[data.actual.length - 1] / 1e6).toFixed(1) 
    : 'N/A';
  const changePercent = data.change_percent || 0;
  const r2Score = data.model_metrics?.r2 
    ? (data.model_metrics.r2 * 100).toFixed(1) 
    : 'N/A';
  const dataPoints = data.data_points || 0;
  const reliability = data.model_metrics?.reliability || 'Unknown';

  // Trend ikonu ve rengi
  const TrendIcon = changePercent >= 0 ? TrendingUp : TrendingDown;
  const trendColor = changePercent >= 0 ? 'text-green-600' : 'text-red-600';
  const trendBg = changePercent >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600';

  // Reliability rengi
  const getReliabilityColor = (rel) => {
    if (rel === 'High' || rel === 'Excellent') return 'from-green-500 to-green-600';
    if (rel === 'Good') return 'from-blue-500 to-blue-600';
    if (rel === 'Medium') return 'from-yellow-500 to-yellow-600';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-6 py-12">
        
        {/* Hero Section */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 px-8 py-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl">
                  <Droplets className="w-16 h-16 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-white mb-3">{lakeName}</h1>
                  <p className="text-blue-100 text-lg font-medium">
                    Sentinel-2 Uydu Verileri ile Su Alanı İzleme Sistemi
                  </p>
                </div>
              </div>
              
              {data.coordinates && (
                <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-xl">
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-5 h-5" />
                    <div className="text-sm">
                      <div className="font-semibold">{data.coordinates.lat}°N</div>
                      <div className="font-semibold">{data.coordinates.lng}°E</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Güncel Alan */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-white border-2 border-blue-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <Info className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Güncel Alan
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {currentArea}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    km² (Son Ölçüm)
                  </div>
                </div>
              </div>

              {/* Yıllık Değişim */}
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r ${trendBg} rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity`}></div>
                <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`bg-gradient-to-br ${trendBg} p-3 rounded-xl`}>
                      <TrendIcon className="w-6 h-6 text-white" />
                    </div>
                    <Info className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Yıllık Değişim
                  </div>
                  <div className={`text-4xl font-bold ${trendColor} mb-1`}>
                    {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    Trend Analizi
                  </div>
                </div>
              </div>

              {/* Model R² Skoru */}
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r ${getReliabilityColor(reliability)} rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity`}></div>
                <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`bg-gradient-to-br ${getReliabilityColor(reliability)} p-3 rounded-xl`}>
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <Info className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Model R² Skoru
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {r2Score}
                    {r2Score !== 'N/A' && '%'}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {reliability}
                  </div>
                </div>
              </div>

              {/* Veri Noktası */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <Info className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Veri Noktası
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {dataPoints}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    Toplam Ölçüm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Model Metrikleri - Alt Bölüm */}
        {data.model_metrics && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Award className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Model Performans Detayları</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* WMAPE */}
              {data.model_metrics.wmape !== undefined && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
                  <div className="text-sm font-semibold text-orange-700 mb-2 uppercase tracking-wide">
                    WMAPE (Hata Oranı)
                  </div>
                  <div className="text-3xl font-bold text-orange-900 mb-1">
                    {(data.model_metrics?.wmape || 0).toFixed(2)}%
                  </div>
                  <div className="text-xs text-orange-700">
                    {(data.model_metrics?.wmape || 0) < 2 ? 'Mükemmel' : 
                     (data.model_metrics?.wmape || 0) < 5 ? 'İyi' : 'Kabul Edilebilir'}
                  </div>
                </div>
              )}

              {/* Unified Score */}
              {data.model_metrics.unified_score !== undefined && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                  <div className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                    Unified Score
                  </div>
                  <div className="text-3xl font-bold text-blue-900 mb-1">
                    {(data.model_metrics?.unified_score || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-blue-700">Birleşik Performans</div>
                </div>
              )}

              {/* Data Quality */}
              {data.model_metrics.data_quality && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                  <div className="text-sm font-semibold text-green-700 mb-2 uppercase tracking-wide">
                    Veri Kalitesi
                  </div>
                  <div className="text-3xl font-bold text-green-900 mb-1">
                    {data.model_metrics.data_quality}
                  </div>
                  <div className="text-xs text-green-700">Uydu Görüntü Kalitesi</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SU KALİTESİ BÖLÜMÜ - YENİ! */}
        {!qualityLoading && waterQuality && waterQuality.current_cluster !== undefined && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-8 h-8 text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-900">Su Kalitesi Analizi</h2>
              <div className={`ml-auto px-4 py-2 rounded-full text-sm font-bold ${
                waterQuality.current_cluster === 0 ? 'bg-green-100 text-green-700' :
                waterQuality.current_cluster === 1 ? 'bg-red-100 text-red-700' :
                waterQuality.current_cluster === 2 ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {waterQuality.interpretation || `Cluster ${waterQuality.current_cluster}`}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* NDWI */}
              {waterQuality.history && waterQuality.history.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-white border-2 border-blue-100 rounded-2xl p-6">
                    <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      NDWI
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {waterQuality.history[waterQuality.history.length - 1].ndwi.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Su İndeksi
                    </div>
                  </div>
                </div>
              )}

              {/* Chlorophyll-a */}
              {waterQuality.history && waterQuality.history.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-white border-2 border-green-100 rounded-2xl p-6">
                    <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Chlorophyll-a
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {waterQuality.history[waterQuality.history.length - 1].chl_a.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      μg/L (Alg Yoğunluğu)
                    </div>
                  </div>
                </div>
              )}

              {/* Turbidity */}
              {waterQuality.history && waterQuality.history.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-white border-2 border-orange-100 rounded-2xl p-6">
                    <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Turbidity
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {waterQuality.history[waterQuality.history.length - 1].turbidity.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Bulanıklık
                    </div>
                  </div>
                </div>
              )}

              {/* WRI */}
              {waterQuality.history && waterQuality.history.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-white border-2 border-purple-100 rounded-2xl p-6">
                    <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      WRI
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {waterQuality.history[waterQuality.history.length - 1].wri.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Su Yansıma İndeksi
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cluster Açıklaması */}
            {waterQuality.interpretation && (
              <div className={`p-6 rounded-2xl border-2 ${
                waterQuality.current_cluster === 0 ? 'bg-green-50 border-green-200' :
                waterQuality.current_cluster === 1 ? 'bg-red-50 border-red-200' :
                waterQuality.current_cluster === 2 ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {waterQuality.current_cluster === 0 ? '🟢' :
                     waterQuality.current_cluster === 1 ? '🔴' :
                     waterQuality.current_cluster === 2 ? '🟡' : '🔵'}
                  </div>
                  <div>
                    <div className={`text-lg font-bold mb-2 ${
                      waterQuality.current_cluster === 0 ? 'text-green-800' :
                      waterQuality.current_cluster === 1 ? 'text-red-800' :
                      waterQuality.current_cluster === 2 ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      {waterQuality.interpretation}
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {waterQuality.current_cluster === 0 && 
                        'Bu göl standart su kalitesi parametrelerine sahip. Dengeli NDWI ve düşük turbidity değerleri sağlıklı su yapısını gösteriyor.'}
                      {waterQuality.current_cluster === 1 && 
                        'Yüksek Chlorophyll-a konsantrasyonu tespit edildi. Alg patlaması riski mevcut. Düzenli izleme önerilir.'}
                      {waterQuality.current_cluster === 2 && 
                        'Tuzlu göl karakteristikleri. Yüksek WRI değerleri ve düşük NDWI tuzlu su yapısını gösteriyor.'}
                      {waterQuality.current_cluster === 3 && 
                        'Özel coğrafi özelliklere sahip göl. Benzersiz spektral özellikler ve alkalin su yapısı.'}
                    </div>
                    {waterQuality.similar_lakes && waterQuality.similar_lakes.length > 0 && (
                      <div className="mt-3 text-sm text-gray-600">
                        <strong>Benzer Göller:</strong> {waterQuality.similar_lakes.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Veri Sayısı */}
            {waterQuality.total_records && (
              <div className="mt-4 text-center text-sm text-gray-600">
                <Database className="w-4 h-4 inline mr-2" />
                Toplam {waterQuality.total_records} su kalitesi ölçümü (2018-2024)
              </div>
            )}
          </div>
        )}

        {/* Son Güncelleme */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div>
                <div className="text-sm font-semibold text-blue-900">Son Güncelleme</div>
                <div className="text-xs text-blue-700">
                  {new Date(data.last_update).toLocaleString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
            <div className="text-sm text-blue-700 font-medium">
              CatBoost ML Model
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LakeDetailPage;
