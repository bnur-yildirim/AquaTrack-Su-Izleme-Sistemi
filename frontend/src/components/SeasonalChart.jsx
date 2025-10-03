import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

export default function SeasonalChart({ data }) {
  const [seasonalData, setSeasonalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeasonalData = async () => {
      if (!data?.lake_id) return;
      
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/forecast/detail/${data.lake_id}`);
        const result = await response.json();
        
        if (result.monthly_data) {
          // Aylık verileri grupla ve ortalama hesapla
          const monthlyAverages = {};
          
          result.monthly_data.forEach(item => {
            if (item.actual && item.month) {
              const monthKey = item.month;
              if (!monthlyAverages[monthKey]) {
                monthlyAverages[monthKey] = [];
              }
              monthlyAverages[monthKey].push(item.actual);
            }
          });

          const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
          
          const processedData = months.map((monthName, index) => {
            const monthNumber = index + 1;
            const values = monthlyAverages[monthNumber] || [];
            const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            
            return {
              month: monthName,
              value: avgValue,
              season: monthNumber < 3 || monthNumber >= 12 ? 'Kış' : 
                     monthNumber < 6 ? 'İlkbahar' : 
                     monthNumber < 9 ? 'Yaz' : 'Sonbahar'
            };
          }).filter(item => item.value > 0);
          
          setSeasonalData(processedData);
        }
      } catch (error) {
        console.error('Seasonal data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonalData();
  }, [data?.lake_id]);

  if (loading) return <div className="text-gray-500">Mevsimsel veri yükleniyor...</div>;
  if (!seasonalData || seasonalData.length === 0) return <div className="text-gray-500">Mevsimsel veri bulunamadı</div>;

  const formatArea = (value) => `${(value / 1e6).toFixed(0)}M m²`;

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={seasonalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorSeasonal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" stroke="#6b7280" />
          <YAxis tickFormatter={formatArea} stroke="#6b7280" domain={[0, 'auto']} />
          <Tooltip 
            formatter={formatArea}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#06b6d4" 
            strokeWidth={3}
            fill="url(#colorSeasonal)" 
            name="Su Alanı"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Mevsimsel Açıklama */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Mevsimsel Etkiler</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>İlkbahar:</strong> Kar erimeleri nedeniyle su seviyesi yükselir.</p>
          <p><strong>Yaz:</strong> Buharlaşma artışı ile seviye düşer.</p>
          <p><strong>Sonbahar-Kış:</strong> Yağışlarla kısmi toparlanma.</p>
          <p className="text-xs text-blue-600 mt-2">
            Bu pattern göl ekosistemi için kritik öneme sahiptir.
          </p>
        </div>
      </div>
    </div>
  );
}