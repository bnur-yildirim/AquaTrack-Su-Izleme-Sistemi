import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:5000'

export function useLakes() {
  const [lakes, setLakes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/lakes`)
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        const data = await res.json()
        setLakes(data.lakes || {})
      } catch (e) {
        console.error('Lakes fetch error:', e)
        setError(String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { lakes, loading, error }
}
