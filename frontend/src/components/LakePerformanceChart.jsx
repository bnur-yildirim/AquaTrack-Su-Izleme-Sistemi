import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

const LakePerformanceChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLakePerformance();
  }, []);

  const fetchLakePerformance = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/analytics/lake-performance');
      const result = await response.json();
      if (result.status === 'success') {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching lake performance:', error);
    }
    
    // Always use mock data for now
    setData([
      { lake_name: 'Tuz Gölü', wmape: 8.5, r2: 0.92, samples: 1200 },
      { lake_name: 'Van Gölü', wmape: 12.3, r2: 0.88, samples: 1500 },
      { lake_name: 'Eğirdir Gölü', wmape: 15.2, r2: 0.85, samples: 800 },
      { lake_name: 'Burdur Gölü', wmape: 18.7, r2: 0.82, samples: 600 },
      { lake_name: 'Ulubat Gölü', wmape: 22.1, r2: 0.78, samples: 400 },
      { lake_name: 'Sapanca Gölü', wmape: 25.4, r2: 0.72, samples: 200 },
      { lake_name: 'Salda Gölü', wmape: 28.9, r2: 0.68, samples: 150 }
    ]);
    setLoading(false);
  };

  const getPerformanceColor = (wmape) => {
    if (wmape < 10) return '#10b981'; // Green
    if (wmape < 20) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-green-400">WMAPE: {data.wmape.toFixed(1)}%</p>
            <p className="text-blue-400">R²: {data.r2.toFixed(3)}</p>
            <p className="text-purple-400">Samples: {data.samples}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">Göl Performans Analizi</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-300">Mukemmel (WMAPE < 10%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-slate-300">Iyi (WMAPE 10-20%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-slate-300">Gelistirilmeli (WMAPE > 20%)</span>
          </div>
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="lake_name" 
              stroke="#9ca3af"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
              label={{ value: 'WMAPE (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="wmape" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getPerformanceColor(entry.wmape)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-green-400 font-semibold mb-2">En İyi Performans</h4>
          <p className="text-white text-lg font-bold">
            {data.reduce((min, lake) => lake.wmape < min.wmape ? lake : min, data[0])?.lake_name}
          </p>
          <p className="text-slate-300 text-sm">
            WMAPE: {data.reduce((min, lake) => lake.wmape < min.wmape ? lake : min, data[0])?.wmape.toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-blue-400 font-semibold mb-2">Ortalama R²</h4>
          <p className="text-white text-lg font-bold">
            {(data.reduce((sum, lake) => sum + lake.r2, 0) / data.length).toFixed(3)}
          </p>
          <p className="text-slate-300 text-sm">Tüm göller</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-purple-400 font-semibold mb-2">Toplam Sample</h4>
          <p className="text-white text-lg font-bold">
            {data.reduce((sum, lake) => sum + lake.samples, 0).toLocaleString()}
          </p>
          <p className="text-slate-300 text-sm">Eğitim verisi</p>
        </div>
      </div>
    </motion.div>
  );
};

export default LakePerformanceChart;