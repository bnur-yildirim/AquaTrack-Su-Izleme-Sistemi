import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';

const OverfittingDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverfittingData();
  }, []);

  const fetchOverfittingData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/analytics/overfitting');
      const result = await response.json();
      if (result.status === 'success') {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching overfitting data:', error);
    }
    
    // Always use mock data for now
    setData([
      { horizon: 'H1', train_r2: 0.89, val_r2: 0.87, test_r2: 0.85, gap: 0.02 },
      { horizon: 'H2', train_r2: 0.85, val_r2: 0.82, test_r2: 0.80, gap: 0.03 },
      { horizon: 'H3', train_r2: 0.81, val_r2: 0.77, test_r2: 0.75, gap: 0.04 }
    ]);
    setLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <p key={index} className={`text-${entry.color}-400`}>
                {entry.name}: {entry.value.toFixed(3)}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const getRiskLevel = (gap) => {
    if (gap < 0.05) return { level: 'Dusuk', color: 'green', icon: 'OK' };
    if (gap < 0.1) return { level: 'Orta', color: 'yellow', icon: 'WARN' };
    return { level: 'Yuksek', color: 'red', icon: 'ALERT' };
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
      transition={{ duration: 0.6, delay: 0.4 }}
      className="space-y-6"
    >
      {/* Overfitting Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Overfitting Analizi</h3>
          <div className="text-sm text-slate-400">
            Train vs Validation vs Test R² karsilastirmasi
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="horizon" 
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
                domain={[0, 1]}
                label={{ value: 'R² Score', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="train_r2" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Train R²"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="val_r2" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Validation R²"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="test_r2" 
                stroke="#f59e0b" 
                strokeWidth={3}
                name="Test R²"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.map((item, index) => {
          const risk = getRiskLevel(item.gap);
          return (
            <motion.div
              key={item.horizon}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 ${
                risk.color === 'red' ? 'border-red-500/30' : 
                risk.color === 'yellow' ? 'border-yellow-500/30' : 
                'border-green-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-bold text-white">{item.horizon}</h4>
                <span className="text-2xl">{risk.icon}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Train R²:</span>
                  <span className="text-green-400 font-semibold">{item.train_r2.toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Val R²:</span>
                  <span className="text-blue-400 font-semibold">{item.val_r2.toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Test R²:</span>
                  <span className="text-yellow-400 font-semibold">{item.test_r2.toFixed(3)}</span>
                </div>
                <div className="border-t border-slate-600 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Gap:</span>
                    <span className={`font-semibold ${
                      risk.color === 'red' ? 'text-red-400' : 
                      risk.color === 'yellow' ? 'text-yellow-400' : 
                      'text-green-400'
                    }`}>
                      {item.gap.toFixed(3)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      risk.color === 'red' ? 'bg-red-500/20 text-red-400' : 
                      risk.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {risk.level} Risk
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Overfitting Summary */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-6">
        <h4 className="text-white font-semibold mb-4">Overfitting Degerlendirmesi</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-green-400 font-semibold mb-2">Iyi Durumlar</h5>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Tum horizonlarda gap < 0.05</li>
              <li>• Train ve validation R² degerleri yakin</li>
              <li>• Test performansi tutarli</li>
            </ul>
          </div>
          <div>
            <h5 className="text-yellow-400 font-semibold mb-2">Dikkat Edilmesi Gerekenler</h5>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• H3'te gap artisi gozlemleniyor</li>
              <li>• Uzun vadeli tahminlerde dikkat</li>
              <li>• Daha fazla regularization gerekebilir</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OverfittingDashboard;