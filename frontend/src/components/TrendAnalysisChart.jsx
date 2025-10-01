import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function TrendAnalysisChart({ data }) {
  if (!data) return <div className="text-gray-500">Veri yükleniyor...</div>;

  const trendData = data.years.slice(0, -1).map((year, i) => {
    const current = data.actual[i];
    const next = data.actual[i + 1];
    const change = next && current ? ((next - current) / current) * 100 : 0;
    
    return {
      year: `${year}-${year + 1}`,
      change: parseFloat(change.toFixed(2))
    };
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="year" 
          stroke="#6b7280"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          label={{ value: 'Değişim (%)', angle: -90, position: 'insideLeft' }}
          stroke="#6b7280"
        />
        <Tooltip 
          formatter={(value) => `${value}%`}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#000" />
        <Bar 
          dataKey="change" 
          fill="#8b5cf6"
          name="Yıllık Değişim (%)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}