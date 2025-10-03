import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  Cell
} from 'recharts';

export default function LakeComparisonChart() {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/forecast/compare-all');
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        setComparisonData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, []);

  if (loading) return <div className="text-center py-8">Göl verileri yükleniyor...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Hata: {error}</div>;
  if (!comparisonData?.lakes) return <div className="text-center py-8">Veri bulunamadı</div>;

  const formatArea = (value) => {
    if (!value) return "N/A";
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B m²`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M m²`;
    return `${(value / 1e3).toFixed(0)}K m²`;
  };

  const getReliabilityColor = (reliability) => {
    switch (reliability) {
      case 'Mukemmel': return '#10B981';
      case 'Iyi': return '#3B82F6';
      case 'Orta': return '#F59E0B';
      case 'Zayif': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const chartData = comparisonData.lakes.map(lake => ({
    name: lake.lake_name,
    unified_score: lake.unified_score || 0,
    wmape: lake.wmape || 0,
    r2: lake.r2 || 0,
    reliability: lake.reliability,
    latest_area: lake.latest_area || 0,
    trend_percent: lake.trend_percent || 0,
    data_points: lake.data_points || 0
  }));

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Göl Performans Karşılaştırması</h3>
        <p className="text-gray-600">Tüm göllerin AI model performansları</p>
      </div>

      {/* Unified Score Grafiği */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">🎯</span>
          Unified Score Karşılaştırması
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis 
              label={{ value: 'Unified Score (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={(value, name) => [
                `${value.toFixed(1)}%`, 
                name === 'unified_score' ? 'Unified Score' : name
              ]}
              labelFormatter={(label) => `Göl: ${label}`}
            />
            <Legend />
            <Bar dataKey="unified_score" fill="#3B82F6" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getReliabilityColor(entry.reliability)} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* WMAPE Grafiği */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">📉</span>
          WMAPE (Ağırlıklı Ortalama Hata) Karşılaştırması
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis 
              label={{ value: 'WMAPE (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => [
                `${value.toFixed(2)}%`, 
                name === 'wmape' ? 'WMAPE' : name
              ]}
              labelFormatter={(label) => `Göl: ${label}`}
            />
            <Legend />
            <Bar dataKey="wmape" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Göl Detay Tablosu */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          Detaylı Performans Tablosu
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Göl</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Unified Score</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">WMAPE</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">R²</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Güvenilirlik</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Son Alan</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Trend</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Veri</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((lake, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium text-gray-800">{lake.name}</td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-bold ${
                      lake.unified_score >= 90 ? 'text-green-600' :
                      lake.unified_score >= 75 ? 'text-blue-600' :
                      lake.unified_score >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {lake.unified_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-medium ${
                      lake.wmape <= 2 ? 'text-green-600' :
                      lake.wmape <= 5 ? 'text-blue-600' :
                      lake.wmape <= 10 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {lake.wmape.toFixed(2)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-2">
                    <span className="font-medium text-gray-700">
                      {lake.r2.toFixed(4)}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      lake.reliability === 'Mukemmel' ? 'bg-green-100 text-green-800' :
                      lake.reliability === 'Iyi' ? 'bg-blue-100 text-blue-800' :
                      lake.reliability === 'Orta' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {lake.reliability}
                    </span>
                  </td>
                  <td className="text-right py-3 px-2 text-gray-600">
                    {formatArea(lake.latest_area)}
                  </td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-medium ${
                      lake.trend_percent > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {lake.trend_percent > 0 ? '+' : ''}{lake.trend_percent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-2 text-gray-500">
                    {lake.data_points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}