import React from 'react'

/**
 * Python matplotlib/seaborn benzeri dashboard layout
 */
export function DashboardLayout({ 
  title, 
  subtitle, 
  children, 
  className = "",
  showHeader = true 
}) {
  return (
    <div className={`dashboard-layout ${className}`}>
      {showHeader && (
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">{title}</h1>
            {subtitle && <p className="dashboard-subtitle">{subtitle}</p>}
          </div>
          <div className="header-decoration">
            <div className="decoration-line"></div>
            <div className="decoration-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
      
      <div className="dashboard-content">
        {children}
      </div>
      
      <style jsx>{`
        .dashboard-layout {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 24px;
          font-family: 'Inter', sans-serif;
        }
        
        .dashboard-header {
          margin-bottom: 32px;
          position: relative;
        }
        
        .header-content {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .dashboard-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #2c3e50;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .dashboard-subtitle {
          font-size: 1.1rem;
          color: #7f8c8d;
          margin: 0;
          font-weight: 400;
        }
        
        .header-decoration {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .decoration-line {
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 2px;
        }
        
        .decoration-dots {
          display: flex;
          gap: 8px;
        }
        
        .decoration-dots span {
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .decoration-dots span:nth-child(2) {
          animation-delay: 0.3s;
        }
        
        .decoration-dots span:nth-child(3) {
          animation-delay: 0.6s;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        
        .dashboard-content {
          max-width: 1400px;
          margin: 0 auto;
        }
        
        @media (max-width: 768px) {
          .dashboard-layout {
            padding: 16px;
          }
          
          .dashboard-title {
            font-size: 2rem;
          }
          
          .dashboard-subtitle {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Python matplotlib subplot benzeri grid container
 */
export function ChartGrid({ children, columns = 2 }) {
  return (
    <div className={`chart-grid chart-grid-${columns}`}>
      {children}
      <style jsx>{`
        .chart-grid {
          display: grid;
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .chart-grid-1 {
          grid-template-columns: 1fr;
        }
        
        .chart-grid-2 {
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
        }
        
        .chart-grid-3 {
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        }
        
        .chart-grid-4 {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        
        @media (max-width: 768px) {
          .chart-grid {
            grid-template-columns: 1fr !important;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Python seaborn benzeri section container
 */
export function SectionContainer({ 
  title, 
  children, 
  className = "",
  collapsible = false,
  defaultCollapsed = false 
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  
  return (
    <div className={`section-container ${className}`}>
      <div 
        className="section-header"
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <h2 className="section-title">{title}</h2>
        {collapsible && (
          <div className="collapse-icon">
            {isCollapsed ? '▶️' : '🔽'}
          </div>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="section-content">
          {children}
        </div>
      )}
      
      <style jsx>{`
        .section-container {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2c3e50;
          margin: 0;
          font-family: 'Inter', sans-serif;
        }
        
        .collapse-icon {
          font-size: 16px;
          transition: transform 0.3s ease;
        }
        
        .section-content {
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
