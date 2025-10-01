import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import './App.css'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CategoryScale,
  BarElement,
  RadialLinearScale,
  ArcElement,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

// Components
import Navigation from './components/Navigation'
import LoginModal from './components/LoginModal'
import UserDashboard from './components/UserDashboard'
import ErrorBoundary from './components/ErrorBoundary'

// Pages
import HomePage from './pages/HomePage'
import ForecastPage from './pages/ForecastPage'
import WaterQuality from './pages/WaterQuality'

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, CategoryScale, BarElement, RadialLinearScale, ArcElement)

function App() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState('home')
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  // URL parametrelerini oku
  useEffect(() => {
    const pageParam = searchParams.get('page')
    setCurrentPage(pageParam || 'home')
  }, [searchParams])

  // Otomatik login kontrolü
  useEffect(() => {
    const checkAutoLogin = async () => {
      const token = localStorage.getItem('authToken')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        try {
          // Token'ı doğrula
          const response = await fetch('http://localhost:5000/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
          })
          
          const data = await response.json()
          
          if (data.success) {
            // Kullanıcıyı otomatik giriş yap
            const userData = JSON.parse(savedUser)
            setUser({
              ...userData,
              permissions: getUserPermissions(userData.type)
            })
          } else {
            // Token geçersiz, temizle
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
          }
        } catch (error) {
          console.error('Auto-login error:', error)
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
        }
      }
    }
    
    checkAutoLogin()
  }, [])

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

  // Sayfa içeriğini render et
  const renderPageContent = () => {
    const selectedLake = searchParams.get('lake') || 'van'
    
    switch (currentPage) {
      case 'home':
        return <HomePage setCurrentPage={setCurrentPage} setSearchParams={setSearchParams} />

      case 'forecast':
        return <ForecastPage selectedLake={selectedLake} />

      case 'quality':
        return <WaterQuality selectedLake={selectedLake} />


      default:
        return (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <h2>Sayfa bulunamadı</h2>
            <button onClick={() => {
              setCurrentPage('home')
              setSearchParams(new URLSearchParams())
            }}>
              Ana Sayfaya Dön
            </button>
          </div>
        )
    }
  }

  return (
    <ErrorBoundary>
      <div className="app-container fade-in">
        <Navigation 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          setSearchParams={setSearchParams}
          user={user}
          onShowLogin={() => setShowLogin(true)}
          onLogout={() => {
            setUser(null)
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
          }}
        />
        
        {/* Kullanıcı Dashboard'u */}
        {user && <UserDashboard user={user} onLogout={() => {
          setUser(null)
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
        }} />}
        
        <ErrorBoundary>
          {renderPageContent()}
        </ErrorBoundary>
        
        {/* Login Modal */}
        <LoginModal 
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLogin={(userData) => setUser(userData)}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App
