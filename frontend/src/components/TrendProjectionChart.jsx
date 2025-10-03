import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function TrendProjectionChart({ selectedLake }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/forecast/trend-analysis?lake_id=${selectedLake}`);
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

  if (loading) return <div className="text-center py-8">Trend analizi yükleniyor...</div>;
  if (!data || data.status === 'no_data') return <div className="text-gray-500">Veri yok</div>;

  // Tarihsel + projeksiyon verilerini birleştir
  const chartData = [
    ...data.historical_years.map((year, i) => ({
      year,
      actual: data.historical_values[i],
      type: 'historical'
    })),
    ...data.projections.map(p => ({
      year: p.year,
      projected: p.projected_area,
      type: 'projection'
    }))
  ];

  const formatArea = (value) => {
    if (!value) return '';
    return `${(value / 1e6).toFixed(0)}M m²`;
  };

  return (
    <div className="space-y-6">
      {/* Özet Bilgi */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Yıllık Değişim</div>
          <div className={`text-2xl font-bold ${data.trend_direction === 'azalış' ? 'text-red-600' : 'text-green-600'}`}>
            {data.yearly_change_percent.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">{data.trend_direction}</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">2025 Tahmini</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatArea(data.projections[0]?.projected_area)}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">2027 Tahmini</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatArea(data.projections[2]?.projected_area)}
          </div>
        </div>
      </div>

      {/* Grafik */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="year" 
            stroke="#546e7a"
            tick={{ fill: '#546e7a', fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={formatArea}
            stroke="#546e7a"
            tick={{ fill: '#546e7a', fontSize: 12 }}
            domain={[0, 'auto']}
          />
          <Tooltip 
            formatter={formatArea}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #cfd8dc',
              borderRadius: '4px'
            }}
          />
          <Legend />
          <ReferenceLine x={2024} stroke="#f57c00" strokeDasharray="3 3" label="Bugün" />
          
          <Line 
            type="monotone" 
            dataKey="actual" 
            stroke="#1565c0" 
            strokeWidth={2}
            name="Gerçek Veri"
            dot={{ r: 4, fill: '#1565c0' }}
            connectNulls
          />
          <Line 
            type="monotone" 
            dataKey="projected" 
            stroke="#f57c00" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Projeksiyon"
            dot={{ r: 4, fill: '#f57c00' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Açıklama */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <div className="text-sm text-yellow-800">
          <strong>Trend Analizi:</strong> Lineer regresyon ile hesaplanmıştır. 
          Yıllık {data.trend_direction === 'azalış' ? 'azalma' : 'artma'} oranı {Math.abs(data.yearly_change_percent).toFixed(2)}% olarak tespit edilmiştir.
          Projeksiyonlar mevcut trendin devam ettiği varsayımına dayanır.
        </div>
      </div>
    </div>
  );
}