/**
 * Alan formatı - m² yerine km² ve daha anlaşılır gösterim
 */
export const formatArea = (value) => {
  if (!value || value === 0) return 'N/A';
  
  // m² → km² dönüşümü (1 km² = 1,000,000 m²)
  const km2 = value / 1e6;
  
  if (km2 >= 1000) {
    return `${(km2 / 1000).toFixed(1)} bin km²`;
  } else if (km2 >= 1) {
    return `${km2.toFixed(1)} km²`;
  } else if (km2 >= 0.1) {
    return `${km2.toFixed(2)} km²`;
  } else {
    return `${km2.toFixed(3)} km²`;
  }
};

/**
 * Alan karşılaştırması - Futbol sahası gibi
 */
export const formatAreaWithComparison = (value) => {
  if (!value || value === 0) return 'N/A';
  
  const km2 = value / 1e6;
  const footballFields = Math.round(km2 / 0.00714); // 1 futbol sahası ≈ 0.00714 km²
  
  let formatted = formatArea(value);
  
  if (footballFields > 1) {
    formatted += ` (~${footballFields.toLocaleString('tr-TR')} futbol sahası)`;
  }
  
  return formatted;
};

/**
 * Yüzde formatı
 */
export const formatPercent = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

/**
 * Sayı formatı - Binlik ayırıcı ile
 */
export const formatNumber = (value) => {
  if (!value && value !== 0) return 'N/A';
  return value.toLocaleString('tr-TR');
};

