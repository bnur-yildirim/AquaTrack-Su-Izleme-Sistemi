import { useEffect, useState } from 'react';

export default function RiskLevelCard({ selectedLake }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/forecast/risk-levels?lake_id=${selectedLake}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Risk levels error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLake]);

  if (loading) return <div className="text-center py-8">Risk analizi yükleniyor...</div>;
  if (!data || data.status === 'no_data') return <div className="text-gray-500">Veri yok</div>;

  const formatArea = (value) => {
    if (!value) return '';
    return `${(value / 1e6).toFixed(0)}M m²`;
  };

  const colorClasses = {
    red: 'bg-red-100 border-red-300 text-red-900',
    orange: 'bg-orange-100 border-orange-300 text-orange-900',
    green: 'bg-green-100 border-green-300 text-green-900'
  };

  const riskColors = {
    red: '#dc2626',
    orange: '#f97316',
    green: '#16a34a'
  };

  return (
    <div className="space-y-6">
      {/* Risk Durumu Kartı */}
      <div className={`p-6 rounded-lg border-2 ${colorClasses[data.risk_color]}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide mb-1">Mevcut Durum</div>
            <div className="text-3xl font-bold">{data.risk_text}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Yüzdelik Dilim</div>
            <div className="text-2xl font-bold">{data.percentile.toFixed(0)}%</div>
          </div>
        </div>
        <div className="text-sm">
          Mevcut değer: <strong>{formatArea(data.current_value)}</strong>
        </div>
      </div>

      {/* Eşik Değerleri Göstergesi */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-700 mb-3">Eşik Değerleri</div>
        
        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-600">Kritik Düşük</div>
          <div className="flex-1 h-2 bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute h-full bg-red-500" style={{ width: '20%' }}></div>
          </div>
          <div className="w-24 text-sm text-gray-900 text-right">{formatArea(data.thresholds.critical_low)}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-600">Dikkat Düşük</div>
          <div className="flex-1 h-2 bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute h-full bg-orange-400" style={{ width: '40%' }}></div>
          </div>
          <div className="w-24 text-sm text-gray-900 text-right">{formatArea(data.thresholds.warning_low)}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-600">Ortalama</div>
          <div className="flex-1 h-2 bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute h-full bg-green-500" style={{ width: '60%' }}></div>
          </div>
          <div className="w-24 text-sm text-gray-900 text-right font-semibold">{formatArea(data.thresholds.mean)}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-600">Dikkat Yüksek</div>
          <div className="flex-1 h-2 bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute h-full bg-orange-400" style={{ width: '80%' }}></div>
          </div>
          <div className="w-24 text-sm text-gray-900 text-right">{formatArea(data.thresholds.warning_high)}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-600">Kritik Yüksek</div>
          <div className="flex-1 h-2 bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute h-full bg-red-500" style={{ width: '100%' }}></div>
          </div>
          <div className="w-24 text-sm text-gray-900 text-right">{formatArea(data.thresholds.critical_high)}</div>
        </div>
      </div>

      {/* Min-Max */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Minimum (2018-2024)</div>
          <div className="text-xl font-bold text-gray-900">{formatArea(data.thresholds.min)}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Maximum (2018-2024)</div>
          <div className="text-xl font-bold text-gray-900">{formatArea(data.thresholds.max)}</div>
        </div>
      </div>

      {/* Açıklama */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <div className="text-sm text-blue-800">
          <strong>Risk Değerlendirmesi:</strong> Eşik değerleri, 2018-2024 dönemi verileri kullanılarak 
          istatistiksel olarak hesaplanmıştır (ortalama ± standart sapma). 
          Mevcut değer tarihi verilerin {data.percentile.toFixed(0)}. yüzdelik dilimindedir.
        </div>
      </div>
    </div>
  );
}