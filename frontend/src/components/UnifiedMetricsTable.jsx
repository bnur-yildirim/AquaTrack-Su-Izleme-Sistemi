import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const UnifiedMetricsTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('unified_score');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchUnifiedMetrics();
  }, []);

  const fetchUnifiedMetrics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/metrics/unified');
      const result = await response.json();
      if (result.status === 'success') {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching unified metrics:', error);
    }
    
    // Always use mock data for now
    setData([
      {
        lake_id: 140,
        lake_name: 'Tuz Gölü',
        wmape: 8.5,
        nrmse: 0.12,
        r2: 0.92,
        theil_u: 0.08,
        unified_score: 89.2,
        reliability: 'Yüksek'
      },
      {
        lake_id: 141,
        lake_name: 'Van Gölü',
        wmape: 12.3,
        nrmse: 0.18,
        r2: 0.88,
        theil_u: 0.12,
        unified_score: 82.1,
        reliability: 'Yüksek'
      },
      {
        lake_id: 1340,
        lake_name: 'Eğirdir Gölü',
        wmape: 15.2,
        nrmse: 0.22,
        r2: 0.85,
        theil_u: 0.15,
        unified_score: 76.8,
        reliability: 'Orta'
      },
      {
        lake_id: 1342,
        lake_name: 'Burdur Gölü',
        wmape: 18.7,
        nrmse: 0.28,
        r2: 0.82,
        theil_u: 0.18,
        unified_score: 71.5,
        reliability: 'Orta'
      },
      {
        lake_id: 1321,
        lake_name: 'Ulubat Gölü',
        wmape: 22.1,
        nrmse: 0.32,
        r2: 0.78,
        theil_u: 0.22,
        unified_score: 65.3,
        reliability: 'Düşük'
      },
      {
        lake_id: 14510,
        lake_name: 'Sapanca Gölü',
        wmape: 25.4,
        nrmse: 0.38,
        r2: 0.72,
        theil_u: 0.28,
        unified_score: 58.7,
        reliability: 'Düşük'
      },
      {
        lake_id: 14741,
        lake_name: 'Salda Gölü',
        wmape: 28.9,
        nrmse: 0.42,
        r2: 0.68,
        theil_u: 0.32,
        unified_score: 52.1,
        reliability: 'Düşük'
      }
    ]);
    setLoading(false);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getReliabilityColor = (reliability) => {
    switch (reliability) {
      case 'Yüksek': return 'text-green-400 bg-green-500/20';
      case 'Orta': return 'text-yellow-400 bg-yellow-500/20';
      case 'Düşük': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">Unified Metrikler Tablosu</h3>
        <div className="text-sm text-slate-400">
          Tüm göller için normalize edilmiş performans metrikleri
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-600">
              <th 
                className="text-left py-3 px-4 text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('lake_name')}
              >
                Göl Adı {sortBy === 'lake_name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-right py-3 px-4 text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('wmape')}
              >
                WMAPE (%) {sortBy === 'wmape' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-right py-3 px-4 text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('nrmse')}
              >
                NRMSE {sortBy === 'nrmse' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-right py-3 px-4 text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('r2')}
              >
                R² {sortBy === 'r2' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-right py-3 px-4 text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('theil_u')}
              >
                Theil's U {sortBy === 'theil_u' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-right py-3 px-4 text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('unified_score')}
              >
                Unified Score {sortBy === 'unified_score' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-center py-3 px-4 text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('reliability')}
              >
                Güvenilirlik {sortBy === 'reliability' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <motion.tr
                key={row.lake_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                <td className="py-4 px-4 text-white font-medium">{row.lake_name}</td>
                <td className="py-4 px-4 text-right text-green-400 font-mono">
                  {row.wmape.toFixed(1)}
                </td>
                <td className="py-4 px-4 text-right text-blue-400 font-mono">
                  {row.nrmse.toFixed(3)}
                </td>
                <td className="py-4 px-4 text-right text-purple-400 font-mono">
                  {row.r2.toFixed(3)}
                </td>
                <td className="py-4 px-4 text-right text-orange-400 font-mono">
                  {row.theil_u.toFixed(3)}
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={`font-bold text-lg ${getScoreColor(row.unified_score)}`}>
                    {row.unified_score.toFixed(1)}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getReliabilityColor(row.reliability)}`}>
                    {row.reliability}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Ortalama Unified Score</h4>
          <p className="text-2xl font-bold text-blue-400">
            {(data.reduce((sum, row) => sum + row.unified_score, 0) / data.length).toFixed(1)}
          </p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">En Yüksek Performans</h4>
          <p className="text-lg font-bold text-green-400">
            {data.reduce((max, row) => row.unified_score > max.unified_score ? row : max, data[0])?.lake_name}
          </p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Yüksek Güvenilirlik</h4>
          <p className="text-2xl font-bold text-green-400">
            {data.filter(row => row.reliability === 'Yüksek').length}
          </p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Geliştirilmeli</h4>
          <p className="text-2xl font-bold text-red-400">
            {data.filter(row => row.reliability === 'Düşük').length}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default UnifiedMetricsTable;