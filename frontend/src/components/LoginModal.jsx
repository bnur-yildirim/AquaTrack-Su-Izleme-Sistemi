import { useState } from 'react'

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    userType: 'public',
    city: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login'
      const requestData = isRegistering ? {
        username: credentials.username,
        password: credentials.password,
        user_type: credentials.userType,
        city: credentials.city,
        email: credentials.email
      } : {
        username: credentials.username,
        password: credentials.password
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (data.success) {
        // Token'ı localStorage'a kaydet
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Kullanıcı bilgilerini parent'a gönder
        onLogin({
          ...data.user,
          permissions: getUserPermissions(data.user.type)
        })
        onClose()
        
        // Form'u temizle
        setCredentials({
          username: '',
          password: '',
          userType: 'public',
          city: '',
          email: ''
        })
        
      } else {
        alert(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert('Bağlantı hatası. Backend çalışıyor mu?')
    }
    
    setLoading(false)
  }

  const getUserPermissions = (type) => {
    switch(type) {
      case 'admin':
        return ['view_all', 'export_data', 'manage_users', 'advanced_analytics']
      case 'municipality':
        return ['view_regional', 'export_regional', 'alerts', 'reports']
      case 'public':
      default:
        return ['view_basic']
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isRegistering ? 'AquaTrack Kayıt' : 'AquaTrack Giriş'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Kullanıcı Tipi</label>
            <select 
              value={credentials.userType}
              onChange={(e) => setCredentials({...credentials, userType: e.target.value})}
              className="form-control"
            >
              <option value="public">Genel Kullanıcı</option>
              <option value="municipality">Belediye</option>
              <option value="admin">Sistem Yöneticisi</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder={
                credentials.userType === 'municipality' ? 'ankara.belediye' :
                credentials.userType === 'admin' ? 'admin' : 'misafir'
              }
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Şifrenizi girin"
              className="form-control"
              required
            />
          </div>
          
          {/* Kayıt için ek alanlar */}
          {isRegistering && (
            <>
              <div className="form-group">
                <label>Şehir/Kurum</label>
                <input
                  type="text"
                  value={credentials.city}
                  onChange={(e) => setCredentials({...credentials, city: e.target.value})}
                  placeholder="Ankara, Van, vs."
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>İletişim Email</label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  placeholder="ornek@belediye.gov.tr"
                  className="form-control"
                  required
                />
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? 
              (isRegistering ? 'Kayıt oluşturuluyor...' : 'Giriş yapılıyor...') : 
              (isRegistering ? 'Kayıt Ol' : 'Giriş Yap')
            }
          </button>
          
          {/* Giriş/Kayıt Değiştirme */}
          <div style={{ textAlign: 'center', marginTop: 15 }}>
            <button 
              type="button"
              className="btn btn-link"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? 
                'Zaten hesabınız var mı? Giriş yapın' : 
                'Hesabınız yok mu? Kayıt olun'
              }
            </button>
          </div>
        </form>
        
        {/* Sadece geliştirme aşamasında görünür */}
        <div className="test-info">
          <p style={{ fontSize: '0.8em', color: '#6c757d', textAlign: 'center', margin: '15px 0 0 0' }}>
            Geliştirme sürümü - Test için: <strong>misafir</strong> / <strong>misafir</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
