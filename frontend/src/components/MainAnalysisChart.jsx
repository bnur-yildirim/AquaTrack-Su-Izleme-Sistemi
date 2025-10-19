import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Eye, Layers } from 'lucide-react';
import { formatArea } from '../utils';

const MainAnalysisChart = ({ chartData }) => {
  const [selectedHorizon, setSelectedHorizon] = useState('all');
  const [showLegend, setShowLegend] = useState(true);

  const filteredData = chartData.map(d => {
    if (selectedHorizon === 'all') return d;
    if (selectedHorizon === 'h1') return { ...d, h2: null, h3: null };
    if (selectedHorizon === 'h2') return { ...d, h1: null, h3: null };
    if (selectedHorizon === 'h3') return { ...d, h1: null, h2: null };
    return d;
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
      
      {/* Grafik Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              Su Alanı Analizi
            </h2>
            <p className="text-sm text-gray-600 mt-1">Geçmiş Ölçümler ve Gelecek Tahminleri (2018-2027)</p>
          </div>
          
          {/* Kontroller */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              Legend
            </button>
            <select
              value={selectedHorizon}
              onChange={(e) => setSelectedHorizon(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium"
            >
              <option value="all">Tüm Tahminler</option>
              <option value="h1">H1 (1 ay)</option>
              <option value="h2">H2 (2 ay)</option>
              <option value="h3">H3 (3 ay)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grafik */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="h1Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="h2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="h3Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="year" 
              stroke="#6b7280" 
              style={{ fontSize: '13px', fontWeight: '500' }}
            />
            <YAxis 
              tickFormatter={formatArea} 
              stroke="#6b7280" 
              style={{ fontSize: '12px' }}
            />
            
            <Tooltip
              formatter={(value, name) => [
                formatArea(value), 
                name === 'actual' ? 'Gerçek Değer' :
                name === 'h1' ? 'H1 (1 ay)' :
                name === 'h2' ? 'H2 (2 ay)' :
                name === 'h3' ? 'H3 (3 ay)' : name
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '13px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            />
            
            {showLegend && (
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: '500' }} 
                iconType="circle"
              />
            )}

            <ReferenceLine 
              x={2024.5} 
              stroke="#94a3b8" 
              strokeDasharray="5 5" 
              strokeWidth={2}
              label={{ 
                value: '← Geçmiş | Tahmin →', 
                position: 'top', 
                fill: '#64748b',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            />

            <Bar dataKey="actual" fill="url(#actualGrad)" name="Gerçek Değer" radius={[6, 6, 0, 0]} />
            
            {(selectedHorizon === 'all' || selectedHorizon === 'h1') && (
              <Bar dataKey="h1" fill="url(#h1Grad)" name="H1 (1 ay)" radius={[6, 6, 0, 0]} />
            )}
            {(selectedHorizon === 'all' || selectedHorizon === 'h2') && (
              <Bar dataKey="h2" fill="url(#h2Grad)" name="H2 (2 ay)" radius={[6, 6, 0, 0]} />
            )}
            {(selectedHorizon === 'all' || selectedHorizon === 'h3') && (
              <Bar dataKey="h3" fill="url(#h3Grad)" name="H3 (3 ay)" radius={[6, 6, 0, 0]} />
            )}
          </ComposedChart>
        </ResponsiveContainer>

      </div>
    </div>
  );
};

MainAnalysisChart.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      year: PropTypes.number.isRequired,
      actual: PropTypes.number,
      h1: PropTypes.number,
      h2: PropTypes.number,
      h3: PropTypes.number,
      isFuture: PropTypes.bool
    })
  ).isRequired
};

export default MainAnalysisChart;
