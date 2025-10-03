import React from 'react'

export default function WaterQuality({ selectedLake }) {
  return (
    <div className="container" style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ 
        padding: 40, 
        background: '#f8f9fa', 
        borderRadius: 8,
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 20 }}>💧</div>
        <h2 style={{ color: '#495057', marginBottom: 15 }}>
          Su Kalitesi Analizi
        </h2>
        <p style={{ color: '#6c757d', marginBottom: 20 }}>
          Su kalitesi tahmin modelleri geliştirme aşamasında...
        </p>
        <div style={{ 
          background: '#e9ecef', 
          padding: 15, 
          borderRadius: 5,
          fontSize: '0.9rem',
          color: '#495057'
        }}>
          <strong>Planlanan Özellikler:</strong><br/>
          • Turbidite (Bulanıklık) Analizi<br/>
          • Klorofil-a Konsantrasyonu<br/>
          • Su Berraklığı İndeksi<br/>
          • Spektral Bant Analizi (B5, B11)<br/>
          • Göl Bazlı Kalite Skorları
        </div>
      </div>
    </div>
  )
}
