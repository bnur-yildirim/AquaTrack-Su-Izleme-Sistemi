/**
 * Model performans kartı bileşeni
 */

import { useState } from 'react'

const PerformanceCard = ({ percentage, mape, onClick }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)

  return (
    <div 
      className="card"
      style={{
        boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-icon">
        📊
      </div>
      
      <h3 className="card-title">
        Model Performansı
      </h3>
      
      <div style={{ 
        fontSize: '42px',
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: '10px',
        textAlign: 'center'
      }}>
        {percentage}%
      </div>
      
      <p style={{ 
        fontSize: '13px',
        color: '#64748b',
        textAlign: 'center',
        lineHeight: '1.5',
        marginBottom: '18px'
      }}>
        Ortalama Doğruluk Oranı
        <br />
        <span style={{ fontSize: '12px' }}>
          7 göl üzerinde WMAPE: {mape}%
        </span>
      </p>
      
      <button
        onClick={onClick}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        className="btn btn-primary"
        style={{
          width: '100%',
          background: isButtonHovered ? '#0284c7' : '#0ea5e9'
        }}
      >
        Detaylı Metrikler
      </button>
    </div>
  )
}

export default PerformanceCard
