import { useEffect, useState } from 'react';

export default function DataQualityIndicator({ selectedLake }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/forecast/data-quality?lake_id=${selectedLake}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Data quality error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLake]);

  if (loading) return <div className="text-center py-8">Veri kalitesi yükleniyor...</div>;
  if (!data || data.status === 'no_data' || data.status === 'no_cloud_data') {
    return <div className="text-gray-500">Bulut verisi bulunamadı</div>;
  }

  const qualityColors = {
    excellent: 'bg-green-100 border-green-300 text-green-900',
    good: 'bg-blue-100 border-blue-300 text-blue-900',
    fair: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    poor: 'bg-red-100 border-red-300 text-red-900'
  };

  const qualityLabels = {
    excellent: 'Mükemmel',
    good: 'İyi',
    fair: 'Orta',
    poor: 'Zayıf'
  };

  return (
    <div className="space-y-6">
      {/* Genel Kalite Skoru */}
      <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-gray-600 uppercase mb-1">Genel Veri Kalitesi</div>
            <div className="text-4xl font-bold text-blue-900">{data.overall_quality_score.toFixed(1)}%</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Ortalama Bulut Oranı</div>
            <div className="text-2xl font-bold text-gray-700">{data.overall_cloud_percent.toFixed(1)}%</div>
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${data.overall_quality_score}%` }}
          ></div>
        </div>
      </div>

      {/* Aylık Kalite Göstergeleri */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3">Aylık Veri Kalitesi (2018-2023)</div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.monthly_quality.slice(-24).reverse().map((month, i) => (
            <div key={i} className={`p-3 rounded border ${qualityColors[month.quality_level]}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="font-semibold">{month.month}</div>
                  <div className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                    {qualityLabels[month.quality_level]}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    Kalite: <strong>{month.quality_score.toFixed(1)}%</strong>
                  </div>
                  <div className="text-sm">
                    Bulut: <strong>{month.cloud_percent.toFixed(1)}%</strong>
                  </div>
                  <div className="text-xs text-gray-600">
                    {month.samples} görüntü
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Toplam Örnek</div>
          <div className="text-2xl font-bold text-gray-900">{data.total_samples}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Mükemmel Kalite</div>
          <div className="text-2xl font-bold text-green-600">
            {data.monthly_quality.filter(m => m.quality_level === 'excellent').length} ay
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Zayıf Kalite</div>
          <div className="text-2xl font-bold text-red-600">
            {data.monthly_quality.filter(m => m.quality_level === 'poor').length} ay
          </div>
        </div>
      </div>

      {/* Açıklama */}
      <div className="bg-gray-50 border border-gray-300 rounded p-4">
        <div className="text-sm text-gray-700">
          <strong>Veri Kalitesi Açıklaması:</strong> Kalite seviyeleri Sentinel-2 uydu görüntülerindeki 
          bulut oranına göre belirlenir. 
          <br/>• <strong>Mükemmel:</strong> %10 ve altı bulut
          <br/>• <strong>İyi:</strong> %11-25 bulut  
          <br/>• <strong>Orta:</strong> %26-50 bulut
          <br/>• <strong>Zayıf:</strong> %50 üzeri bulut
          <br/>Ortalama bulut oranı: <strong>{data.overall_cloud_percent.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
}