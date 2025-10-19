import React from 'react';
import { Home, BarChart3, Droplets, Activity, User, LogIn } from 'lucide-react';

const Navigation = ({ currentPage, setCurrentPage, setSearchParams, user, onShowLogin, onLogout }) => {
  const navItems = [
    {
      id: 'home',
      label: 'Ana Sayfa',
      icon: Home,
      path: 'home'
    },
    {
      id: 'general-water-quantity',
      label: 'Su Miktarı',
      icon: Droplets,
      path: 'general-water-quantity'
    },
    {
      id: 'general-water-quality',
      label: 'Su Kalitesi',
      icon: Activity,
      path: 'general-water-quality'
    },
    {
      id: 'model-performance',
      label: 'Model Performans',
      icon: BarChart3,
      path: 'model-performance'
    }
  ];

  const handleNavClick = (item) => {
    setCurrentPage(item.path);
    setSearchParams(new URLSearchParams({ page: item.path }));
  };

  return (
    <nav style={{
        background: 'linear-gradient(135deg, rgb(83, 133, 209) 0%, rgb(19, 161, 55) 50%, #0ea5e9 100%)',
      padding: '16px 24px',
      boxShadow: '0 4px 20px rgba(13, 71, 161, 0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          fontWeight: '800',
          fontSize: '24px',
          letterSpacing: '-0.5px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={() => {
          setCurrentPage('home');
          setSearchParams(new URLSearchParams({ page: 'home' }));
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.textShadow = '0 2px 8px rgba(0,0,0,0.3)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.textShadow = 'none';
        }}>
          AquaTrack
        </div>

        {/* Desktop Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={16} />
                <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* User Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {user ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px'
              }}>
                <User size={16} />
                <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>
                  {user.name}
                </span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                Çıkış
              </button>
            </div>
          ) : (
            <button
              onClick={onShowLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <LogIn size={16} />
              <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>
                Giriş
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div style={{
        display: window.innerWidth < 768 ? 'flex' : 'none',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%',
                textAlign: 'left'
              }}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
