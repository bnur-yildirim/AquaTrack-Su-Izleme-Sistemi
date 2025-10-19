import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, AlertCircle, Check } from 'lucide-react';
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

const SOURCES = [
  'DSİ (Devlet Su İşleri)',
  'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
  'Tarım ve Orman Bakanlığı',
  'İstanbul Büyükşehir Belediyesi',
  'Ankara Büyükşehir Belediyesi',
  'İzmir Büyükşehir Belediyesi',
  'Bursa Büyükşehir Belediyesi',
  'Van Büyükşehir Belediyesi',
  'Burdur Belediyesi',
  'Isparta Belediyesi',
  'Sakarya Büyükşehir Belediyesi',
  'TÜBİTAK',
  'Meteoroloji Genel Müdürlüğü',
  'Diğer'
];

const CATEGORIES = ['Su Miktarı', 'Su Kalitesi', 'Koruma', 'Genel'];
const PRIORITIES = ['low', 'medium', 'high'];

const LAKE_OPTIONS = [
  { id: 'van', name: 'Van Gölü' },
  { id: 'tuz', name: 'Tuz Gölü' },
  { id: 'egirdir', name: 'Eğirdir Gölü' },
  { id: 'burdur', name: 'Burdur Gölü' },
  { id: 'ulubat', name: 'Ulubat Gölü' },
  { id: 'sapanca', name: 'Sapanca Gölü' },
  { id: 'salda', name: 'Salda Gölü' }
];

export default function NewsAdminModal({ isOpen, onClose, user }) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'Genel',
    priority: 'medium',
    source: '',
    author: user?.username || '',
    lake_id: '',
    image_url: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.username) {
      setFormData(prev => ({
        ...prev,
        author: user.username
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          handleReset();
          onClose();
          window.location.reload(); // Refresh to show new news
        }, 1500);
      } else {
        setError(data.error || 'Haber eklenirken bir hata oluştu');
      }
    } catch (err) {
      setError('Sunucu hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      summary: '',
      content: '',
      category: 'Genel',
      priority: 'medium',
      source: '',
      author: user?.username || '',
      lake_id: '',
      image_url: ''
    });
    setError('');
    setSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: COLORS.white,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: `2px solid ${COLORS.light}`
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: COLORS.dark,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Plus size={24} style={{ color: COLORS.primary }} />
            Yeni Haber Ekle
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = COLORS.light;
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <X size={24} color={COLORS.medium} />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div style={{
            background: `linear-gradient(135deg, ${COLORS.success}20 0%, ${COLORS.success}10 100%)`,
            border: `1px solid ${COLORS.success}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Check size={20} color={COLORS.success} />
            <span style={{ color: COLORS.success, fontWeight: '600', fontSize: '14px' }}>
              Haber başarıyla eklendi!
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: `linear-gradient(135deg, ${COLORS.danger}20 0%, ${COLORS.danger}10 100%)`,
            border: `1px solid ${COLORS.danger}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertCircle size={20} color={COLORS.danger} />
            <span style={{ color: COLORS.danger, fontWeight: '600', fontSize: '14px' }}>
              {error}
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Başlık */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '8px'
            }}>
              Haber Başlığı *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Örn: Van Gölü Seviyesi Kritik Seviyede"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.light;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Özet */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '8px'
            }}>
              Kısa Özet *
            </label>
            <textarea
              required
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Haberin kısa özeti (max 200 karakter)"
              maxLength={200}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.light;
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '12px', color: COLORS.medium, marginTop: '4px' }}>
              {formData.summary.length}/200
            </div>
          </div>

          {/* Detaylı İçerik */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '8px'
            }}>
              Detaylı İçerik (Opsiyonel)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Haberin detaylı açıklaması"
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.light;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Kategori ve Öncelik */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: COLORS.dark,
                marginBottom: '8px'
              }}>
                Kategori *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.light}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: COLORS.white
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: COLORS.dark,
                marginBottom: '8px'
              }}>
                Öncelik *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.light}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: COLORS.white
                }}
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
          </div>

          {/* Kaynak */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '8px'
            }}>
              Kaynak Kuruluş *
            </label>
            <select
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                background: COLORS.white
              }}
            >
              <option value="">Seçiniz...</option>
              {SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          {/* Göl Seçimi */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '8px'
            }}>
              İlgili Göl (Opsiyonel)
            </label>
            <select
              value={formData.lake_id}
              onChange={(e) => setFormData({ ...formData, lake_id: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${COLORS.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                background: COLORS.white
              }}
            >
              <option value="">Tüm Göller</option>
              {LAKE_OPTIONS.map(lake => (
                <option key={lake.id} value={lake.id}>{lake.name}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                border: `2px solid ${COLORS.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: COLORS.white,
                color: COLORS.medium,
                transition: 'all 0.2s ease',
                opacity: loading ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.background = COLORS.light;
                }
              }}
              onMouseOut={(e) => {
                e.target.style.background = COLORS.white;
              }}
            >
              Temizle
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
                color: COLORS.white,
                transition: 'all 0.2s ease',
                boxShadow: `0 4px 12px ${COLORS.primary}40`,
                opacity: loading ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = `0 6px 16px ${COLORS.primary}50`;
                }
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = `0 4px 12px ${COLORS.primary}40`;
              }}
            >
              {loading ? 'Ekleniyor...' : 'Haberi Yayınla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

