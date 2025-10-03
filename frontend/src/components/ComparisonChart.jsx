import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ComparisonChart({ data }) {
  if (!data) return <div className="text-gray-500">Veri yükleniyor...</div>;

  const comparisonData = data.years.map((year, i) => ({
    year,
    actual: data.actual[i],
    predicted: data.predicted[i],
    difference: data.actual[i] && data.predicted[i] 
      ? Math.abs(data.actual[i] - data.predicted[i]) 
      : null
  })).filter(d => d.actual && d.predicted);

  const formatArea = (value) => {
    if (!value) return '';
    return `${(value / 1e6).toFixed(1)}M m²`;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="year" stroke="#6b7280" />
        <YAxis yAxisId="left" tickFormatter={formatArea} stroke="#6b7280" domain={[0, 'auto']} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={formatArea} stroke="#6b7280" domain={[0, 'auto']} />
        <Tooltip 
          formatter={formatArea}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="actual" fill="#3b82f6" name="Gerçek" radius={[8, 8, 0, 0]} />
        <Bar yAxisId="left" dataKey="predicted" fill="#10b981" name="Tahmin" radius={[8, 8, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="difference" stroke="#ef4444" strokeWidth={2} name="Fark" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}