import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function getLevelColor(level) {
  const colors = {
    severe: '#dc2626',
    moderate: '#ea580c',
    good: '#059669',
    normal: '#3b82f6'
  };
  return colors[level] || colors.normal;
}

// Animasyonlu marker ikonu oluştur
function createAnimatedIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="animated-marker" style="color: ${color};">
        <div class="marker-pin">
          <svg width="20" height="35" viewBox="0 0 20 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 0C4.477 0 0 4.477 0 10C0 20 10 32 10 32C10 32 20 20 20 10C20 4.477 15.523 0 10 0ZM10 16C6.686 16 4 13.314 4 10C4 6.686 6.686 4 10 4C13.314 4 16 6.686 16 10C16 13.314 13.314 16 10 16Z" 
                  fill="${color}"/>
          </svg>
        </div>
        <div class="ripple-container">
          <div class="ripple"></div>
          <div class="ripple"></div>
          <div class="ripple"></div>
          <div class="ripple"></div>
          <div class="ripple"></div>
        </div>
      </div>
    `,
    iconSize: [20, 35],
    iconAnchor: [10, 35],
    popupAnchor: [0, -35]
  });
}

// Göl fotoğrafları
const LAKE_PHOTOS = {
  'van': '/lake-photos/van.jpg',
  'tuz': '/lake-photos/tuz.jpg',
  'egirdir': '/lake-photos/egirdir.jpg',
  'burdur': '/lake-photos/burdur.jpg',
  'ulubat': '/lake-photos/ulubat.jpg',
  'sapanca': '/lake-photos/sapanca.jpg',
  'salda': '/lake-photos/salda.jpg',
  'default': '/lake-photos/van.jpg'
};

export default function MapPage({ onLakeSelect, setCurrentPage, setSearchParams, selectedLake: selectedLakeProp }) {
  const [lakes, setLakes] = useState({});
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([39.0, 35.0]);
  const [selectedLake, setSelectedLake] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const lakesRes = await fetch(`${API_BASE}/api/lakes`);
      
      if (!lakesRes.ok) {
        throw new Error('Göl verileri yüklenemedi');
      }

      const lakesData = await lakesRes.json();
      const dict = lakesData.lakes || {};
      setLakes(dict);

      const entries = Object.entries(dict);
      const markerPromises = entries.map(async ([key, info]) => {
        try {
          const forecastRes = await fetch(`${API_BASE}/api/forecast?lake_id=${key}`);
          const forecast = forecastRes.ok ? await forecastRes.json() : null;

          const change = forecast?.change_percent ?? 0;
          const area = forecast?.actual?.filter(a => a).slice(-1)[0] ?? 0;
          
          let level = 'normal';
          if (change < -15) level = 'severe';
          else if (change < -5) level = 'moderate';
          else if (change > 5) level = 'good';

          return {
            key,
            name: info.name,
            lat: info.lat,
            lng: info.lng,
            change,
            level,
            area
          };
        } catch (error) {
          console.error(`Lake ${key} error:`, error);
          return null;
        }
      });

      const markerList = await Promise.all(markerPromises);
      const validMarkers = markerList.filter(m => m && m.lat && m.lng);
      setMarkers(validMarkers);
      
      if (validMarkers.length > 0) {
        const avgLat = validMarkers.reduce((sum, m) => sum + m.lat, 0) / validMarkers.length;
        const avgLng = validMarkers.reduce((sum, m) => sum + m.lng, 0) / validMarkers.length;
        setMapCenter([avgLat, avgLng]);
      }
      
    } catch (error) {
      console.error('Map error:', error);
      setError(error.message || 'Harita verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLakeClick = useCallback((marker) => {
    setSelectedLake(marker);
    if (onLakeSelect) {
      onLakeSelect(marker.key);
    }
  }, [onLakeSelect]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '600px', 
        background: '#f9fafb',
        borderRadius: '12px'
      }}>
        <Loader2 style={{ color: '#3b82f6', marginBottom: '16px' }} size={40} className="animate-spin" />
        <div style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500' }}>
          Harita yükleniyor...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '600px',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        padding: '24px'
      }}>
        <AlertCircle style={{ color: '#dc2626', marginBottom: '16px' }} size={48} />
        <div style={{ color: '#dc2626', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          Harita Yükleme Hatası
        </div>
        <div style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
        <button
          onClick={fetchData}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <style>{`
        /* Marker Animasyonları */
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .animated-marker {
          position: relative;
          width: 20px;
          height: 35px;
        }
        
        .marker-pin {
          animation: markerJump 1.5s ease-in-out infinite;
          transform-origin: bottom center;
        }
        
        @keyframes markerJump {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .ripple-container {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        
        .ripple {
          position: absolute;
          border: 2px solid currentColor;
          border-radius: 50%;
          animation: rippleEffect 4s ease-out infinite;
          opacity: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .ripple:nth-child(1) { animation-delay: 0s; }
        .ripple:nth-child(2) { animation-delay: 0.8s; }
        .ripple:nth-child(3) { animation-delay: 1.6s; }
        .ripple:nth-child(4) { animation-delay: 2.4s; }
        .ripple:nth-child(5) { animation-delay: 3.2s; }
        
        @keyframes rippleEffect {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 60px;
            height: 24px;
            opacity: 0;
          }
        }

        /* Panel Animasyonları */
        .lake-popup-card {
          transition: all 0.3s ease !important;
          transform: translateX(-50%) translateY(0) !important;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
        }
        
        .lake-popup-card:hover {
          transform: translateX(-50%) translateY(-8px) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25) !important;
        }
        
        .lake-popup-card .popup-button {
          transition: all 0.2s ease !important;
          transform: translateY(0) !important;
        }
        
        .lake-popup-card .popup-button:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
        }
        
        .lake-popup-card .popup-button:first-child:hover {
          background: #0284c7 !important;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4) !important;
        }
        
        .lake-popup-card .popup-button:last-child:hover {
          background: #059669 !important;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4) !important;
        }
        
        .lake-popup-card .close-button {
          transition: all 0.2s ease !important;
        }
        
        .lake-popup-card .close-button:hover {
          transform: scale(1.1) !important;
          background: rgba(255, 255, 255, 1) !important;
          color: #dc2626 !important;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .lake-popup-card {
            max-width: 90% !important;
            bottom: 15px !important;
          }
          
          .lake-popup-card:hover {
            transform: translateX(-50%) translateY(-5px) !important;
          }
        }
        
        @media (max-width: 480px) {
          .lake-popup-card {
            max-width: 95% !important;
            bottom: 10px !important;
            padding: 10px !important;
          }
        }
      `}</style>
      
      <div style={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ height: '100%' }}>
          <MapContainer 
            center={mapCenter} 
            zoom={isMobile ? 5 : 6} 
            minZoom={5}
            maxZoom={8}
            zoomControl={!isMobile}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
            boxZoom={false}
            keyboard={true}
            dragging={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {markers.map(m => (
              <Marker
                key={m.key}
                position={[m.lat, m.lng]}
                icon={createAnimatedIcon(getLevelColor(m.level))}
                eventHandlers={{ 
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    handleLakeClick(m);
                  }
                }}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      {(selectedLake || selectedLakeProp) && (
        <div 
          className="lake-popup-card"
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            background: 'white',
            borderRadius: '16px',
            padding: '12px',
            border: '1px solid #e2e8f0',
            zIndex: 1001,
            maxWidth: isMobile ? '240px' : '280px',
            width: '85%',
            overflow: 'hidden',
            cursor: 'pointer',
            transformOrigin: 'center bottom'
          }}
          onClick={(e) => {
            e.stopPropagation();
            const targetElement = document.querySelector('.main-content') || document.body;
            targetElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }}
        >
          <div style={{
            width: '100%',
            height: isMobile ? '80px' : '100px',
            borderRadius: '8px',
            backgroundImage: `url(${LAKE_PHOTOS[(selectedLake || selectedLakeProp)?.key] || LAKE_PHOTOS.default})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            marginBottom: '8px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              color: 'white',
              padding: '8px',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}>
              {(selectedLake || selectedLakeProp)?.name || 'Göl'}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              className="popup-button"
              onClick={(e) => {
                e.stopPropagation();
                if (setCurrentPage) setCurrentPage('forecast');
                if (setSearchParams) {
                  setSearchParams(new URLSearchParams([
                    ['page', 'forecast'], 
                    ['lake', (selectedLake || selectedLakeProp)?.key]
                  ]));
                }
              }}
              style={{
                padding: isMobile ? '8px 12px' : '10px 16px',
                background: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: isMobile ? '11px' : '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flex: '1',
                minWidth: '80px',
                boxShadow: '0 2px 4px rgba(14, 165, 233, 0.3)'
              }}
            >
              Su Miktarı
            </button>

            <button
              className="popup-button"
              onClick={(e) => {
                e.stopPropagation();
                if (setCurrentPage) setCurrentPage('quality');
                if (setSearchParams) {
                  setSearchParams(new URLSearchParams([
                    ['page', 'quality'], 
                    ['lake', (selectedLake || selectedLakeProp)?.key]
                  ]));
                }
              }}
              style={{
                padding: isMobile ? '8px 12px' : '10px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: isMobile ? '11px' : '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flex: '1',
                minWidth: '80px',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
              }}
            >
              Su Kalitesi
            </button>
          </div>

          <button
            className="close-button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLake(null);
              if (onLakeSelect) onLakeSelect(null);
            }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '28px',
              height: '28px',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#6b7280',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}