import { useState, useEffect } from 'react';
import LakePerformanceChart from '../components/LakePerformanceChart';
import SeasonalPerformanceChart from '../components/SeasonalPerformanceChart';
import OverfittingDashboard from '../components/OverfittingDashboard';
import UnifiedMetricsTable from '../components/UnifiedMetricsTable';
import ModelComparisonCard from '../components/ModelComparisonCard';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/metrics/unified/summary');
      const result = await response.json();
      if (result.status === 'success') {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Genel Bakış', icon: '📊' },
    { id: 'lakes', name: 'Göl Analizi', icon: '🏔️' },
    { id: 'seasonal', name: 'Mevsimsel', icon: '🍂' },
    { id: 'quality', name: 'Model Kalitesi', icon: '⚡' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200/30 to-slate-300/30"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="text-6xl mb-4 animate-bounce">🎯</div>
              <h1 className="text-5xl font-black text-slate-800 mb-4">
                Model Performans Analizi
              </h1>
              <div className="w-32 h-1.5 bg-gradient-to-r from-slate-600 to-slate-500 mx-auto rounded-full"></div>
            </div>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Yapay zeka destekli su miktarı tahmin modelinin detaylı performans analizi
            </p>
          </div>

          {/* Stats Cards - Hero */}
          {!loading && summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {Object.entries(summary).map(([horizon, data]) => (
                <div key={horizon} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition"></div>
                  <div className="relative bg-slate-800 p-6 rounded-2xl border border-slate-600 shadow-lg">
                    <div className="text-sm text-slate-300 font-semibold mb-2">
                      {horizon === 'H1' ? '1 AY' : horizon === 'H2' ? '2 AY' : '3 AY'} İLERİ TAHMİN
                    </div>
                    <div className="text-4xl font-black text-slate-100 mb-3">
                      {data.avg_score.toFixed(1)}<span className="text-2xl text-slate-300">/100</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-emerald-400">✓ Mükemmel</span>
                          <span className="text-slate-100 font-bold">{data.excellent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">✓ İyi</span>
                          <span className="text-slate-100 font-bold">{data.good}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-600 text-xs text-slate-400">
                      Ort. WMAPE: {data.avg_wmape}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-lg border-b border-slate-600 shadow-xl">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg scale-105'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Model Comparison */}
            <div className="bg-slate-800 rounded-2xl border border-slate-600 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🔬</span>
                  Model Geliştirme Süreci
                </h2>
                <p className="text-slate-200 mt-2">Overfitting önleme ve optimizasyon sonuçları</p>
              </div>
              <div className="p-8">
                <ModelComparisonCard />
              </div>
            </div>

            {/* Overfitting Control */}
            <div className="bg-slate-800 rounded-2xl border border-slate-600 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-slate-500 to-slate-600 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🛡️</span>
                  Overfitting Kontrolü
                </h2>
                <p className="text-slate-200 mt-2">Model genelleştirme yeteneği analizi</p>
              </div>
              <div className="p-8">
                <OverfittingDashboard />
              </div>
            </div>

            {/* Unified Metrics Table */}
            <div className="bg-slate-800 rounded-2xl border border-slate-600 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">📈</span>
                  Tekdüze Normalize Metrikler
                </h2>
                <p className="text-slate-200 mt-2">Göl büyüklüğünden bağımsız başarı skorları</p>
              </div>
              <div className="p-8">
                <UnifiedMetricsTable />
              </div>
            </div>
          </div>
        )}

        {/* Lakes Tab */}
        {activeTab === 'lakes' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🏔️</span>
                Göl Bazında Performans Analizi
              </h2>
              <p className="text-slate-200 mt-2">7 göl için detaylı model başarı karşılaştırması</p>
            </div>
            <div className="p-8">
              <LakePerformanceChart />
            </div>
          </div>
        )}

        {/* Seasonal Tab */}
        {activeTab === 'seasonal' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🍂</span>
                Mevsimsel Performans Analizi
              </h2>
              <p className="text-slate-200 mt-2">Kış, İlkbahar, Yaz ve Sonbahar dönemlerinde model başarısı</p>
            </div>
            <div className="p-8">
              <SeasonalPerformanceChart />
            </div>
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === 'quality' && (
          <div className="space-y-8">
            {/* Data Quality */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">💎</span>
                  Veri Kalitesi ve Sample Dağılımı
                </h2>
                <p className="text-slate-200 mt-2">Her göl için veri miktarı ve kalite analizi</p>
              </div>
              <div className="p-8">
                <DataQualityAnalysis />
              </div>
            </div>

            {/* Feature Importance */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🔍</span>
                  En Önemli Özellikler (Feature Importance)
                </h2>
                <p className="text-slate-200 mt-2">Model tahminlerinde en etkili 40 özellik</p>
              </div>
              <div className="p-8">
                <FeatureImportanceChart />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-slate-100 border-t border-slate-200 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-black text-slate-600">7</div>
              <div className="text-sm text-slate-500 mt-1">Göl Analizi</div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-600">3</div>
              <div className="text-sm text-slate-500 mt-1">Horizon Modeli</div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-600">40</div>
              <div className="text-sm text-slate-500 mt-1">Optimize Feature</div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-600">8,109</div>
              <div className="text-sm text-slate-500 mt-1">Veri Noktası</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Yardımcı Component
function DataQualityAnalysis() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // API'den veri çek
    fetch('http://localhost:5000/api/analytics/lake-performance')
      .then(res => res.json())
      .then(result => {
        if (result.status === 'success') {
          setData(result.data);
        }
      });
  }, []);

  if (!data) return <div className="text-slate-500">Yükleniyor...</div>;

  const lakes = Object.entries(data).map(([id, lake]) => ({
    id,
    name: lake.lake_name,
    samples: lake.horizons?.H1?.samples || 0
  })).sort((a, b) => b.samples - a.samples);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {lakes.map(lake => {
        const quality = lake.samples > 1000 ? 'excellent' : 
                       lake.samples > 500 ? 'good' : 'limited';
        const colors = {
          excellent: 'from-emerald-500 to-emerald-600',
          good: 'from-slate-500 to-slate-600',
          limited: 'from-orange-500 to-orange-600'
        };
        
        return (
          <div key={lake.id} className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${colors[quality]} rounded-xl blur opacity-50 group-hover:opacity-75 transition`}></div>
            <div className="relative bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
              <div className="text-sm text-slate-600 mb-1">{lake.name}</div>
              <div className="text-3xl font-black text-slate-800 mb-2">{lake.samples}</div>
              <div className="text-xs text-slate-500">veri noktası</div>
              <div className={`mt-3 px-2 py-1 rounded text-xs font-semibold text-center ${
                quality === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                quality === 'good' ? 'bg-slate-100 text-slate-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {quality === 'excellent' ? '⭐ Mükemmel Veri' :
                 quality === 'good' ? '✓ İyi Veri' :
                 '⚠️ Sınırlı Veri'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureImportanceChart() {
  const [features, setFeatures] = useState(null);
  const [horizon, setHorizon] = useState(1);

  useEffect(() => {
    fetch(`http://localhost:5000/api/analytics/feature-importance?horizon=${horizon}`)
      .then(res => res.json())
      .then(result => {
        if (result.status === 'success') {
          setFeatures(result.features);
        }
      });
  }, [horizon]);

  if (!features) return <div className="text-slate-500">Yükleniyor...</div>;

  return (
    <div>
      {/* Horizon Selector */}
      <div className="flex gap-3 mb-6">
        {[1, 2, 3].map(h => (
          <button
            key={h}
            onClick={() => setHorizon(h)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              horizon === h
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {h} Ay İleri
          </button>
        ))}
      </div>

      {/* Feature List - Top 10 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {features.slice(0, 10).map((feature, index) => (
          <div key={index} className="relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-slate-500 to-slate-600"></div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 mb-1">#{index + 1}</div>
                  <div className="font-mono text-sm text-slate-700">{feature}</div>
                </div>
                <div className="text-2xl font-black text-slate-400">{index + 1}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center text-sm text-slate-500">
        Toplam {features.length} feature'dan en önemli 10'u gösteriliyor
      </div>
    </div>
  );
}

