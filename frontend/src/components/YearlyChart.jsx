import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

export default function YearlyChart({ selectedLake, selectedYear }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchYearlyData = async () => {
      if (!selectedLake) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:5000/api/forecast/detail/${selectedLake}`);
        const result = await response.json();
        
        if (result.monthly_data) {
          let filteredData = result.monthly_data;
          
          // Eğer belirli bir yıl seçilmişse filtrele
          if (selectedYear !== 'all' && selectedYear) {
            filteredData = result.monthly_data.filter(item => item.year === selectedYear);
          }
          
          // Tarih sırasına göre sırala
          filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // Grafik için veriyi formatla
          const chartData = filteredData.map(item => ({
            date: new Date(item.date).toLocaleDateString('tr-TR', { 
              month: 'short', 
              day: 'numeric' 
            }),
            fullDate: item.date,
            actual: item.actual ? Math.round(item.actual / 1e6) : null,
            predicted: item.predicted ? Math.round(item.predicted / 1e6) : null,
            month: new Date(item.date).getMonth() + 1,
            year: item.year
          })).filter(item => item.actual !== null || item.predicted !== null);
          
          setData(chartData);
        }
      } catch (err) {
        console.error('Yearly data fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchYearlyData();
  }, [selectedLake, selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Veri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg font-semibold mb-2">Hata</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg font-semibold mb-2">
          {selectedYear === 'all' ? 'Veri Bulunamadı' : `${selectedYear} Yılı Verisi Bulunamadı`}
        </div>
        <p className="text-gray-400">Seçilen kriterler için veri mevcut değil.</p>
      </div>
    );
  }

  const formatTooltip = (value, name) => {
    if (name === 'actual') return [`${value}M m²`, 'Gerçek Değer'];
    if (name === 'predicted') return [`${value}M m²`, 'Model Tahmini'];
    return [value, name];
  };

  const getChartTitle = () => {
    if (selectedYear === 'all') {
      return 'Tüm Yıllar Su Alanı Değişimi (2018-2024)';
    }
    return `${selectedYear} Yılı Su Alanı Değişimi`;
  };

  const getChartSubtitle = () => {
    if (selectedYear === 'all') {
      return 'Yıllar boyunca su alanındaki değişimler';
    }
    return `${selectedYear} yılı boyunca aylık su alanı değişimleri`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      {/* Başlık */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{getChartTitle()}</h3>
        <p className="text-gray-600">{getChartSubtitle()}</p>
      </div>

      {/* Grafik */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              angle={selectedYear === 'all' ? -45 : 0}
              textAnchor={selectedYear === 'all' ? "end" : "middle"}
              height={selectedYear === 'all' ? 80 : 40}
            />
            <YAxis 
              label={{ value: 'Su Alanı (M m²)', angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
              domain={[0, 'auto']}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  const data = payload[0].payload;
                  return `${data.fullDate} (${data.month}. ay)`;
                }
                return label;
              }}
            />
            <Legend />
            
            {/* Gerçek Değerler */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorActual)"
              name="Gerçek Değer"
              connectNulls={false}
            />
            
            {/* Model Tahminleri */}
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#colorPredicted)"
              name="Model Tahmini"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* İstatistikler */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="text-sm font-medium text-blue-600 mb-1">Toplam Veri Noktası</div>
          <div className="text-2xl font-bold text-blue-800">{data.length}</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm font-medium text-green-600 mb-1">Ortalama Su Alanı</div>
          <div className="text-2xl font-bold text-green-800">
            {Math.round(data.filter(d => d.actual).reduce((sum, d) => sum + d.actual, 0) / data.filter(d => d.actual).length)}M m²
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="text-sm font-medium text-purple-600 mb-1">Tarih Aralığı</div>
          <div className="text-sm font-bold text-purple-800">
            {data[0]?.fullDate} - {data[data.length - 1]?.fullDate}
          </div>
        </div>
      </div>
    </div>
  );
}
