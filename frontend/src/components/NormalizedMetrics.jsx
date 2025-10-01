import { useEffect, useState } from 'react';

export default function NormalizedMetrics({ data }) {
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // API'den normalize metrikleri çek
    fetch('http://localhost:5000/api/forecast/metrics/normalized')
      .then(res => res.json())
      .then(result => {
        setMetricsData(result);
        setLoading(false);
      })
      .catch(err => {
        console.error('Metrik yükleme hatası:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-gray-500">Metrikler yükleniyor...</div>;
  }

  if (!metricsData?.lake_metrics) {
    return <div className="text-gray-500">Metrik verisi bulunamadı</div>;
  }

  // Tüm göllerin ortalama metriklerini hesapla
  const allMetrics = Object.values(metricsData.lake_metrics);
  const avgMape = allMetrics.reduce((sum, m) => sum + m.mape, 0) / allMetrics.length;
  const avgWmape = allMetrics.reduce((sum, m) => sum + m.wmape, 0) / allMetrics.length;
  const avgR2 = allMetrics.reduce((sum, m) => sum + m.r2, 0) / allMetrics.length;

  const metrics = [
    { 
      label: 'R² Skoru', 
      value: avgR2, 
      format: (v) => v.toFixed(3), 
      color: 'blue',
      description: 'Model açıklayıcılığı'
    },
    { 
      label: 'MAPE (%)', 
      value: avgMape, 
      format: (v) => v.toFixed(1), 
      color: 'orange',
      description: 'Ortalama yüzde hata'
    },
    { 
      label: 'WMAPE (%)', 
      value: avgWmape, 
      format: (v) => v.toFixed(1), 
      color: 'purple',
      description: 'Ağırlıklı yüzde hata'
    },
    { 
      label: 'Güvenilirlik', 
      value: avgR2 > 0.9 ? 'Mükemmel' : avgR2 > 0.7 ? 'İyi' : 'Orta', 
      format: (v) => v, 
      color: 'green',
      description: 'Model güvenilirlik seviyesi'
    }
  ];

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-2">{metric.label}</div>
            <div className={`text-3xl font-bold bg-gradient-to-r ${colorClasses[metric.color]} bg-clip-text text-transparent mb-1`}>
              {metric.format(metric.value)}
            </div>
            <div className="text-xs text-gray-500">{metric.description}</div>
          </div>
        ))}
      </div>

      {/* Detaylı açıklama */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Model Performansı</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• R² = {avgR2.toFixed(3)}: Model varyansın %{(avgR2 * 100).toFixed(1)}'ini açıklıyor</li>
          <li>• MAPE = {avgMape.toFixed(1)}%: Ortalama %{avgMape.toFixed(1)} tahmin hatası</li>
          <li>• WMAPE = {avgWmape.toFixed(1)}%: Göl boyutuna göre normalize hata</li>
        </ul>
      </div>
    </div>
  );
}