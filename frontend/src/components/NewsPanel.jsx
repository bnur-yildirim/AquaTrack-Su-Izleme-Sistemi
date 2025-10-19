import { useState, useEffect } from 'react';
import { Droplets, AlertTriangle, TrendingUp, Globe, Plus } from 'lucide-react';
import NewsAdminModal from './NewsAdminModal';
import { API_CONFIG } from '../constants';

const COLORS = {
  primary: '#0D47A1',
  secondary: '#1976D2',
  accent: '#00897B',
  success: '#2E7D32',
  warning: '#F57C00',
  danger: '#C62828',
  dark: '#263238',
  medium: '#546E7A',
  light: '#ECEFF1',
  white: '#FFFFFF'
};

export default function NewsPanel({ user }) {
  const [news, setNews] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expandedNews, setExpandedNews] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Haberleri API'den çek
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/news`);
        const data = await response.json();
        
        if (data.success) {
          setNews(data.news);
        } else {
          // Fallback to static data
          setNews(NEWS_DATA);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        // Fallback to static data
        setNews(NEWS_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return COLORS.danger;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.success;
      default: return COLORS.medium;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Su Miktarı': return <Droplets size={16} />;
      case 'Su Kalitesi': return <TrendingUp size={16} />;
      case 'Koruma': return <Globe size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const filteredNews = news.filter(item => 
    filter === 'all' || item.category === filter
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Check if user can add news (admin or municipality)
  const canAddNews = user && (user.type === 'admin' || user.type === 'municipality');

  return (
    <div style={{
      background: COLORS.white,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      border: `1px solid ${COLORS.light}`,
      height: 'fit-content',
      maxHeight: '650px',
      overflow: 'hidden'
    }}>
      {/* Başlık */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '10px',
        borderBottom: `2px solid ${COLORS.light}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <AlertTriangle 
            size={20} 
            style={{ 
              color: COLORS.primary, 
              marginRight: '8px' 
            }} 
          />
          <h3 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: COLORS.dark,
            margin: '0'
          }}>
            Su & Göl Haberleri
          </h3>
        </div>
        
        {/* Haber Ekleme Butonu */}
        {canAddNews && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
              color: COLORS.white,
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              boxShadow: `0 2px 8px ${COLORS.primary}30`
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = `0 4px 12px ${COLORS.primary}40`;
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = `0 2px 8px ${COLORS.primary}30`;
            }}
          >
            <Plus size={14} />
            Haber Ekle
          </button>
        )}
      </div>

      {/* Filtre Butonları */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {['all', 'Su Miktarı', 'Su Kalitesi', 'Koruma'].map(category => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            style={{
              padding: '5px 10px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: filter === category 
                ? COLORS.primary 
                : COLORS.light,
              color: filter === category 
                ? COLORS.white 
                : COLORS.medium
            }}
          >
            {category === 'all' ? 'Tümü' : category}
          </button>
        ))}
      </div>

      {/* Haber Listesi */}
      <div style={{
        maxHeight: '450px',
        overflowY: 'auto',
        paddingRight: '6px'
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: COLORS.medium
          }}>
            Haberler yükleniyor...
          </div>
        ) : filteredNews.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: COLORS.medium
          }}>
            Henüz haber bulunmuyor.
          </div>
        ) : (
          filteredNews.map((item, index) => (
          <div
            key={item.news_id || item.id || index}
            style={{
              background: expandedNews === (item.news_id || item.id)
                ? `linear-gradient(135deg, ${COLORS.light} 0%, rgba(13, 71, 161, 0.05) 100%)`
                : COLORS.white,
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '10px',
              border: `1px solid ${expandedNews === (item.news_id || item.id) ? COLORS.primary : COLORS.light}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onClick={() => setExpandedNews(expandedNews === (item.news_id || item.id) ? null : (item.news_id || item.id))}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {/* Öncelik İndikatorü */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: getPriorityColor(item.priority)
            }} />

            {/* Kategori ve Tarih */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: COLORS.medium,
                fontWeight: '600'
              }}>
                {getCategoryIcon(item.category)}
                {item.category}
              </div>
              <div style={{
                fontSize: '11px',
                color: COLORS.medium
              }}>
                {formatDate(item.published_at || item.date)}
              </div>
            </div>

            {/* Başlık */}
            <h4 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: COLORS.dark,
              margin: '0 0 8px 0',
              lineHeight: '1.4'
            }}>
              {item.title}
            </h4>

            {/* Özet */}
            <p style={{
              fontSize: '12px',
              color: COLORS.medium,
              margin: '0 0 8px 0',
              lineHeight: '1.5',
              display: expandedNews === (item.news_id || item.id) ? 'block' : '-webkit-box',
              WebkitLineClamp: expandedNews === (item.news_id || item.id) ? 'none' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {item.summary}
            </p>

            {/* Kaynak */}
            <div style={{
              fontSize: '11px',
              color: COLORS.medium,
              fontStyle: 'italic',
              textAlign: 'right'
            }}>
              Kaynak: {item.source}
            </div>
          </div>
        ))
        )}
      </div>

      {/* Daha Fazla Butonu */}
      <div style={{
        textAlign: 'center',
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${COLORS.light}`
      }}>
        <button style={{
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
          color: COLORS.white,
          border: 'none',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: `0 2px 8px rgba(13, 71, 161, 0.3)`
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 12px rgba(13, 71, 161, 0.4)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 2px 8px rgba(13, 71, 161, 0.3)';
        }}
        >
          Tüm Haberleri Görüntüle
        </button>
      </div>

      <style>{`
        /* Scrollbar Styling */
        div::-webkit-scrollbar {
          width: 4px;
        }
        
        div::-webkit-scrollbar-track {
          background: ${COLORS.light};
          border-radius: 2px;
        }
        
        div::-webkit-scrollbar-thumb {
          background: ${COLORS.medium};
          border-radius: 2px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.primary};
        }
      `}</style>

      {/* Haber Ekleme Modal */}
      <NewsAdminModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        user={user}
      />
    </div>
  );
}
