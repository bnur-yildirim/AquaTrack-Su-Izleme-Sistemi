import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          backgroundColor: '#fee',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2 style={{ color: '#c00' }}>Bir hata oluştu</h2>
          <p style={{ color: '#666' }}>
            {this.state.error?.message || 'Bilinmeyen hata'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sayfayı Yenile
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
