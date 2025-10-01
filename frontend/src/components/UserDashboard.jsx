import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:5000'

export default function UserDashboard({ user, onLogout }) {
  const [alerts, setAlerts] = useState([])
  const [quickStats, setQuickStats] = useState(null)

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    // Kullanıcı tipine göre veri yükle
    try {
      // Hızlı istatistikler
      const statsRes = await fetch(`${API_BASE}/api/user/dashboard?type=${user.type}`)
      const stats = await statsRes.json()
      setQuickStats(stats)
      
      // Uyarılar
      const alertsRes = await fetch(`${API_BASE}/api/alerts?user=${user.username}`)
      const alertsData = await alertsRes.json()
      setAlerts(alertsData.alerts || [])
      
    } catch (error) {
      console.error('Kullanıcı verileri yüklenemedi:', error)
    }
  }

  const getUserGreeting = () => {
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'
    
    switch(user.type) {
      case 'municipality':
        return `${timeGreeting}, ${user.city} Belediyesi`
      case 'admin':
        return `${timeGreeting}, Sistem Yöneticisi`
      default:
        return `${timeGreeting}`
    }
  }

  const getRelevantLakes = () => {
    // Kullanıcı tipine göre ilgili göller
    const lakeMappings = {
      'ankara.belediye': ['ulubat', 'sapanca'],
      'van.belediye': ['van'],
      'burdur.belediye': ['burdur', 'salda'],
      'admin': ['van', 'tuz', 'ulubat', 'egirdir', 'burdur', 'sapanca', 'salda']
    }
    
    return lakeMappings[user.username] || ['van']
  }

  return (
    <div className="user-dashboard">
      {/* Kullanıcı Bilgi Çubuğu */}
      <div className="user-header">
        <div className="user-info">
          <div className="greeting">{getUserGreeting()}</div>
          <div className="user-details">
            <span className="user-type">{user.type === 'municipality' ? '🏛️ Belediye' : user.type === 'admin' ? '⚙️ Admin' : '👤 Genel'}</span>
            <span className="user-city">{user.city}</span>
          </div>
        </div>
        
        <div className="user-actions">
          <button className="btn btn-outline" onClick={() => window.print()}>
            📄 Rapor Al
          </button>
          <button className="btn btn-secondary" onClick={onLogout}>
            🚪 Çıkış
          </button>
        </div>
      </div>

      {/* Hızlı Durum Kartları */}
      <div className="quick-status-cards">
        {getRelevantLakes().map(lakeKey => (
          <QuickLakeCard key={lakeKey} lakeKey={lakeKey} userType={user.type} />
        ))}
      </div>

      {/* Uyarılar */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h3>🚨 Önemli Uyarılar</h3>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={index} className={`alert alert-${alert.level}`}>
                <div className="alert-icon">
                  {alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵'}
                </div>
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">{alert.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Belediye Özel Özellikler */}
      {user.type === 'municipality' && (
        <div className="municipality-features">
          <h3>🏛️ Belediye Özel İşlemler</h3>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <div className="feature-title">Aylık Rapor</div>
              <div className="feature-desc">Su durumu aylık raporu</div>
              <button className="btn btn-sm btn-primary">Oluştur</button>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🚨</div>
              <div className="feature-title">Uyarı Ayarları</div>
              <div className="feature-desc">Kritik seviye uyarıları</div>
              <button className="btn btn-sm btn-primary">Ayarla</button>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <div className="feature-title">Trend Analizi</div>
              <div className="feature-desc">Uzun dönem eğilimler</div>
              <button className="btn btn-sm btn-primary">Görüntüle</button>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📧</div>
              <div className="feature-title">Bildirim Ayarları</div>
              <div className="feature-desc">Email/SMS uyarıları</div>
              <button className="btn btn-sm btn-primary">Düzenle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickLakeCard({ lakeKey, userType }) {
  const [lakeData, setLakeData] = useState(null)
  
  useEffect(() => {
    fetch(`${API_BASE}/api/forecast?lake_id=${lakeKey}`)
      .then(res => res.json())
      .then(data => setLakeData(data))
      .catch(err => console.error('Göl verisi yüklenemedi:', err))
  }, [lakeKey])

  if (!lakeData) {
    return (
      <div className="quick-lake-card loading">
        <div className="loading-spinner"></div>
        <div>Yükleniyor...</div>
      </div>
    )
  }

  const getStatusColor = (changePercent) => {
    if (changePercent < -20) return '#dc3545' // Kritik düşüş
    if (changePercent < -10) return '#fd7e14' // Uyarı
    if (changePercent > 10) return '#20c997'  // İyi artış
    return '#6c757d' // Normal
  }

  const getStatusText = (changePercent) => {
    if (changePercent < -20) return 'Kritik Düşüş'
    if (changePercent < -10) return 'Dikkat Gerekli'
    if (changePercent > 10) return 'İyi Durum'
    return 'Normal'
  }

  return (
    <div className="quick-lake-card">
      <div className="lake-card-header">
        <div className="lake-name">{lakeData.lake_name}</div>
        <div 
          className="status-badge"
          style={{ background: getStatusColor(lakeData.change_percent) }}
        >
          {getStatusText(lakeData.change_percent)}
        </div>
      </div>
      
      <div className="lake-metrics">
        <div className="metric-item">
          <div className="metric-label">Mevcut Tahmin</div>
          <div className="metric-value">
            {lakeData.predictions_3months?.[0] ? 
              `${(lakeData.predictions_3months[0] / 1e6).toFixed(1)} km²` : 
              'N/A'
            }
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-label">3 Aylık Trend</div>
          <div className="metric-value" style={{ color: getStatusColor(lakeData.change_percent) }}>
            {lakeData.change_percent > 0 ? '+' : ''}{lakeData.change_percent?.toFixed(1)}%
          </div>
        </div>
      </div>
      
      {/* Belediye için ek bilgiler */}
      {userType === 'municipality' && (
        <div className="municipality-actions">
          <button className="btn btn-sm btn-outline">📊 Detay</button>
          <button className="btn btn-sm btn-outline">📧 Rapor</button>
        </div>
      )}
    </div>
  )
}
