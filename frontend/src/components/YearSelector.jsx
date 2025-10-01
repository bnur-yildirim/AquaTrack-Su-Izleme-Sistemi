import { useState } from 'react';

export default function YearSelector({ selectedYear, onYearChange, availableYears }) {
  const years = availableYears || [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Yıl Seçimi</h3>
        <div className="text-sm text-gray-500">
          {selectedYear} yılı verileri
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedYear === year
                ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
      
      {/* Tüm Yıllar Butonu */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => onYearChange('all')}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            selectedYear === 'all'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:shadow-md border border-gray-200'
          }`}
        >
          📊 Tüm Yıllar (2018-2024)
        </button>
      </div>
    </div>
  );
}
