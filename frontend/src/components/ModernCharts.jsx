import { useState } from "react";
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
} from "recharts";

export default function ModernCharts({ data }) {
  const [timeRange, setTimeRange] = useState("all");
  const [showActual, setShowActual] = useState(true);
  const [showPredicted, setShowPredicted] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📊</div>
          <div className="w-32 h-2 bg-blue-200 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Prepare data
  let chartData = data.years?.map((year, i) => ({
    year,
    actual: data.actual?.[i],
    predicted: data.predicted?.[i],
  })).filter(item => 
    item.actual !== null && item.actual !== undefined && 
    item.predicted !== null && item.predicted !== undefined
  ) || [];

  // Time filter
  if (selectedYear) {
    chartData = chartData.filter(item => item.year === selectedYear);
  } else if (timeRange === "recent" && chartData.length > 3) {
    chartData = chartData.slice(-3);
  } else if (timeRange === "mid" && chartData.length > 5) {
    chartData = chartData.slice(-5);
  }

  // Metrics
  const calculateMetrics = () => {
    if (chartData.length === 0) return { mape: 0, r2: 0, mae: 0 };
    
    const errors = chartData.map(d => Math.abs((d.predicted - d.actual) / d.actual) * 100);
    const mape = errors.reduce((a, b) => a + b, 0) / errors.length;
    
    const actuals = chartData.map(d => d.actual);
    const predictions = chartData.map(d => d.predicted);
    const meanActual = actuals.reduce((a, b) => a + b, 0) / actuals.length;
    const ssRes = chartData.reduce((sum, d) => sum + Math.pow(d.predicted - d.actual, 2), 0);
    const ssTot = actuals.reduce((sum, a) => sum + Math.pow(a - meanActual, 2), 0);
    const r2 = Math.max(0, 1 - (ssRes / ssTot));
    
    const absErrors = chartData.map(d => Math.abs(d.predicted - d.actual));
    const mae = absErrors.reduce((a, b) => a + b, 0) / absErrors.length;
    
    return { mape, r2, mae };
  };

  const metrics = calculateMetrics();

  const formatArea = (value) => {
    if (!value) return "";
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B m²`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M m²`;
    return `${(value / 1e3).toFixed(0)}K m²`;
  };

  // Performance level
  const getPerformanceLevel = () => {
    if (metrics.mape < 1) return { level: 5, color: 'from-green-400 to-emerald-500', label: 'Excellent' };
    if (metrics.mape < 3) return { level: 4, color: 'from-blue-400 to-cyan-500', label: 'Very Good' };
    if (metrics.mape < 5) return { level: 3, color: 'from-yellow-400 to-amber-500', label: 'Good' };
    if (metrics.mape < 10) return { level: 2, color: 'from-orange-400 to-red-400', label: 'Fair' };
    return { level: 1, color: 'from-red-500 to-rose-600', label: 'Poor' };
  };

  const performance = getPerformanceLevel();

  return (
    <div className="w-full space-y-6">
      {/* Title Section - Visual Performance Indicator */}
      <div className={`bg-gradient-to-r ${performance.color} rounded-3xl p-8 text-white shadow-2xl`}>
        <div className="flex items-center justify-between flex-wrap gap-6">
          {/* Left: Performance Level Indicator */}
          <div className="flex items-center gap-6">
            {/* Circular Performance Indicator */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(metrics.r2 * 100 * 3.51)}, 351`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <div className="text-4xl font-bold">{(metrics.r2 * 100).toFixed(0)}%</div>
                <div className="text-xs opacity-90">R² Score</div>
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div
                    key={star}
                    className={`text-3xl transition-all duration-300 ${
                      star <= performance.level 
                        ? 'opacity-100 scale-110' 
                        : 'opacity-30'
                    }`}
                  >
                    ⭐
                  </div>
                ))}
              </div>
              <div className="text-2xl font-bold">{performance.label}</div>
              <div className="text-sm opacity-90">Model Performance</div>
            </div>
          </div>

          {/* Right: Error Indicators */}
          <div className="flex gap-4">
            {/* MAPE Indicator */}
            <div className="bg-white bg-opacity-20 backdrop-blur rounded-2xl p-4 min-w-[120px]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs opacity-75">Average Error</div>
                <div className="text-2xl">📊</div>
              </div>
              <div className="text-3xl font-bold">±{metrics.mape.toFixed(1)}%</div>
              {/* Visual Bar */}
              <div className="w-full h-2 bg-white bg-opacity-20 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(0, 100 - metrics.mape * 10)}%` }}
                ></div>
              </div>
            </div>

            {/* Data Count */}
            <div className="bg-white bg-opacity-20 backdrop-blur rounded-2xl p-4 min-w-[120px]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs opacity-75">Data Points</div>
                <div className="text-2xl">📈</div>
              </div>
              <div className="text-3xl font-bold">{chartData.length}</div>
              {/* Progress Bar */}
              <div className="flex gap-1 mt-2">
                {Array.from({ length: Math.min(10, chartData.length) }).map((_, i) => (
                  <div key={i} className="flex-1 h-2 bg-white rounded-full opacity-80"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons - More Graphical */}
      <div className="flex gap-3 flex-wrap">
        {[
          { value: 'all', label: 'All Data', icon: '📊', count: data.years?.length || 0 },
          { value: 'mid', label: 'Last 5 Years', icon: '📈', count: 5 },
          { value: 'recent', label: 'Last 3 Years', icon: '🔍', count: 3 },
        ].map(({ value, label, icon, count }) => (
          <button
            key={value}
            onClick={() => {
              setTimeRange(value);
              setSelectedYear(null);
            }}
            className={`relative px-6 py-3 rounded-xl font-semibold transition-all ${
              timeRange === value && !selectedYear
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow border border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <div className="text-left">
                <div className="text-sm">{label}</div>
                <div className={`text-xs ${timeRange === value ? 'opacity-90' : 'opacity-60'}`}>
                  {count} years
                </div>
              </div>
            </div>
            {timeRange === value && !selectedYear && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-white rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Year Selection Buttons */}
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📅</span>
          <div>
            <h4 className="text-lg font-bold text-gray-800">Year Selection</h4>
            <p className="text-sm text-gray-600">
              {selectedYear ? `Showing data for ${selectedYear}` : 'Click on a year to filter the data'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {data.years?.map((year, index) => (
            <button
              key={year}
              onClick={() => {
                setSelectedYear(selectedYear === year ? null : year);
                setTimeRange("all");
              }}
              className={`relative px-4 py-2 rounded-lg font-medium transition-all ${
                selectedYear === year
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 hover:scale-105"
              }`}
            >
              {year}
              {selectedYear === year && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </div>
        
        {selectedYear && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <span className="text-purple-600">🎯</span>
              <span className="text-sm font-medium text-purple-800">
                Currently showing data for {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear(null)}
                className="ml-auto text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Clear Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey="year"
              stroke="#6b7280"
              style={{ fontSize: "14px", fontWeight: 600 }}
              tick={{ fill: '#374151' }}
            />
            <YAxis
              tickFormatter={formatArea}
              stroke="#6b7280"
              style={{ fontSize: "12px", fontWeight: 500 }}
              tick={{ fill: '#374151' }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const error = ((data.predicted - data.actual) / data.actual) * 100;
                  const errorAbs = Math.abs(error);
                  
                  return (
                    <div className="bg-white rounded-2xl p-5 shadow-2xl border-2 border-blue-300">
                      {/* Year Header */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                        <div className="text-2xl font-bold text-gray-800">{data.year}</div>
                        {/* Status Icon */}
                        <div className="text-3xl">
                          {errorAbs < 1 ? '🎯' : errorAbs < 3 ? '✅' : '⚠️'}
                        </div>
                      </div>
                      
                      {/* Values - Graphical */}
                      <div className="space-y-4">
                        {/* Actual Value */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-semibold text-blue-800">Actual Value</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-900 mb-2">{formatArea(data.actual)}</div>
                          <div className="w-full h-3 bg-blue-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
                          </div>
                        </div>
                        
                        {/* Prediction Value */}
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            <span className="text-sm font-semibold text-green-800">Prediction Value</span>
                          </div>
                          <div className="text-2xl font-bold text-green-900 mb-2">{formatArea(data.predicted)}</div>
                          <div className="w-full h-3 bg-green-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ width: `${Math.min(100, (data.predicted / data.actual) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Error Indicator */}
                      <div className={`mt-4 pt-4 border-t-2 border-gray-200 rounded-lg p-4 ${
                        errorAbs < 1 ? 'bg-green-50 border-green-200' : errorAbs < 3 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-800">Prediction Error</span>
                          <div className={`text-2xl font-bold ${
                            errorAbs < 1 ? 'text-green-700' : errorAbs < 3 ? 'text-blue-700' : 'text-yellow-700'
                          }`}>
                            {error > 0 ? '+' : ''}{error.toFixed(2)}%
                          </div>
                        </div>
                        {/* Visual error bar */}
                        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              errorAbs < 1 ? 'bg-green-500' : errorAbs < 3 ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, 100 - errorAbs * 10))}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 text-center">
                          {errorAbs < 1 ? 'Excellent Accuracy' : errorAbs < 3 ? 'Good Accuracy' : 'Needs Improvement'}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend 
              wrapperStyle={{ paddingTop: "20px" }} 
              iconType="circle"
              iconSize={12}
            />

            {showActual && (
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={4}
                fill="url(#colorActual)"
                name="Actual Values"
                dot={{ fill: "#3b82f6", r: 6, strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 3 }}
              />
            )}

            {showPredicted && (
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#10b981"
                strokeWidth={4}
                strokeDasharray="8 4"
                name="Model Predictions"
                dot={{ fill: "#10b981", r: 6, strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 3 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Visibility Controls */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowActual(!showActual)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              showActual 
                ? "bg-blue-100 text-blue-700 border-2 border-blue-400 shadow-md" 
                : "bg-gray-100 text-gray-500 border-2 border-gray-300"
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${showActual ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
            {showActual ? "Actual Visible" : "Actual Hidden"}
          </button>
          <button
            onClick={() => setShowPredicted(!showPredicted)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              showPredicted
                ? "bg-green-100 text-green-700 border-2 border-green-400 shadow-md"
                : "bg-gray-100 text-gray-500 border-2 border-gray-300"
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${showPredicted ? 'bg-green-600' : 'bg-gray-400'}`}></div>
            {showPredicted ? "Prediction Visible" : "Prediction Hidden"}
          </button>
        </div>
      </div>

      {/* Annual Performance - Visual Heat Map */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">📊</span>
          <div>
            <h4 className="text-lg font-bold text-gray-800">Annual Performance Map</h4>
            <p className="text-sm text-gray-600">Each box shows the prediction accuracy for a year</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {chartData.map((item) => {
            const error = ((item.predicted - item.actual) / item.actual) * 100;
            const errorAbs = Math.abs(error);
            const isExcellent = errorAbs < 1;
            const isGood = errorAbs < 3;
            const isFair = errorAbs < 5;
            
            const bgColor = isExcellent 
              ? 'from-green-400 to-emerald-500' 
              : isGood 
              ? 'from-blue-400 to-cyan-500' 
              : isFair
              ? 'from-yellow-400 to-amber-500'
              : 'from-orange-400 to-red-500';
            
            const icon = isExcellent ? '🎯' : isGood ? '✅' : isFair ? '📊' : '⚠️';
            
            return (
              <div 
                key={item.year} 
                className={`bg-gradient-to-br ${bgColor} rounded-2xl p-4 text-white shadow-lg hover:scale-105 transition-all cursor-pointer`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{icon}</div>
                  <div className="text-xl font-bold mb-1">{item.year}</div>
                  <div className="text-2xl font-bold mb-2">
                    {error > 0 ? '+' : ''}{error.toFixed(1)}%
                  </div>
                  {/* Mini Progress Bar */}
                  <div className="w-full h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${Math.max(0, 100 - errorAbs * 10)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}