export default function Navigation({ currentPage, setCurrentPage, setSearchParams, user, onShowLogin, onLogout }) {
  return (
    <nav className="navigation">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="nav-brand">
          AquaTrack
        </h1>
        <div className="nav-buttons">
          <button
            onClick={() => {
              setCurrentPage('home')
              setSearchParams(new URLSearchParams())
            }}
            className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
          >
            Ana Sayfa
          </button>
          <button
            onClick={() => {
              setCurrentPage('forecast')
              setSearchParams(new URLSearchParams([['page', 'forecast']]))
            }}
            className={`nav-button ${currentPage === 'forecast' ? 'active' : ''}`}
          >
            Su Miktarı
          </button>
          <button
            onClick={() => {
              setCurrentPage('quality')
              setSearchParams(new URLSearchParams([['page', 'quality']]))
            }}
            className={`nav-button ${currentPage === 'quality' ? 'active' : ''}`}
          >
            Su Kalitesi
          </button>
          
          {/* Login/Logout */}
          {user ? (
            <div className="user-section">
              <span className="user-welcome">
                {user.city}
              </span>
              <button className="nav-button logout-btn" onClick={onLogout}>
                Çıkış
              </button>
            </div>
          ) : (
            <button className="nav-button login-btn" onClick={onShowLogin}>
              Giriş
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
