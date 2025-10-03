import { useState } from 'react'

export default function UserDashboard({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)

  const getUserTypeLabel = (type) => {
    switch(type) {
      case 'admin': return 'Yönetici'
      case 'municipality': return 'Belediye'
      case 'public': return 'Genel Kullanıcı'
      default: return 'Kullanıcı'
    }
  }

  const getPermissions = () => {
    if (!user?.permissions) return []
    return user.permissions.map(perm => {
      const labels = {
        'view_all': 'Tüm Verileri Görüntüle',
        'export_data': 'Veri Dışa Aktar',
        'manage_users': 'Kullanıcı Yönetimi',
        'advanced_analytics': 'Gelişmiş Analitik',
        'view_regional': 'Bölgesel Görünüm',
        'export_regional': 'Bölgesel Dışa Aktarım',
        'alerts': 'Uyarılar',
        'reports': 'Raporlar',
        'view_basic': 'Temel Görünüm'
      }
      return labels[perm] || perm
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 100
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* User Info Header */}
        <div 
          style={{
            padding: '16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '16px'
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#0f172a'
            }}>
              {user?.name || 'Kullanıcı'}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#64748b'
            }}>
              {getUserTypeLabel(user?.type)}
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </div>
        </div>

        {/* Dropdown Content */}
        {isOpen && (
          <div style={{
            padding: '16px',
            background: 'white'
          }}>
            {/* User Details */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                marginBottom: '8px'
              }}>
                E-posta
              </div>
              <div style={{
                fontSize: '14px',
                color: '#0f172a',
                fontWeight: '500'
              }}>
                {user?.email || 'N/A'}
              </div>
            </div>

            {/* Permissions */}
            {user?.permissions && user.permissions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginBottom: '8px'
                }}>
                  Yetkiler
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  {getPermissions().map((permission, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: '11px',
                        background: '#f0f9ff',
                        color: '#0369a1',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #bae6fd'
                      }}
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#dc2626'}
              onMouseOut={(e) => e.target.style.background = '#ef4444'}
            >
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
