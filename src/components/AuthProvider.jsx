import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

function inferApiBase() {
  const fromEnv = import.meta.env.VITE_BACKEND_URL
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '')
  }
  const { origin, hostname, protocol } = window.location
  if (hostname.includes('-3000.')) {
    return `${protocol}//${hostname.replace('-3000.', '-8000.')}`
  }
  if (origin.includes(':3000')) {
    return origin.replace(':3000', ':8000')
  }
  return origin
}

const API_BASE = inferApiBase()

async function fetchWithTimeout(resource, options = {}, timeoutMs = 12000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

const extractErrorMessage = async (res) => {
  try {
    const data = await res.json()
    if (data) {
      if (Array.isArray(data.detail)) {
        // FastAPI validation error array
        const first = data.detail[0]
        return first?.msg || 'Validation error'
      }
      if (typeof data.detail === 'string') return data.detail
      if (typeof data.message === 'string') return data.message
      if (typeof data.error === 'string') return data.error
      if (typeof data === 'string') return data
    }
  } catch (_) {
    try {
      const text = await res.text()
      if (text) return text
    } catch (_) {}
  }
  return 'Request failed'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiStatus, setApiStatus] = useState(null)

  useEffect(() => {
    // Quick reachability check for diagnostics
    fetchWithTimeout(`${API_BASE}/test`, { method: 'GET' }, 6000)
      .then(async (r) => {
        const ok = r.ok
        let body = null
        try { body = await r.json() } catch(_) {}
        setApiStatus({ ok, body })
        console.debug('[PixelPicks] API base:', API_BASE, 'status:', ok, 'body:', body)
      })
      .catch((e) => {
        setApiStatus({ ok: false, error: String(e) })
        console.warn('[PixelPicks] API probe failed:', e, 'base:', API_BASE)
      })

    const stored = localStorage.getItem('pp_token')
    if (stored) {
      setToken(stored)
      fetchMe(stored).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMe = async (tkn) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${tkn}` },
      })
      if (!res.ok) throw new Error('Unable to fetch profile')
      const data = await res.json()
      setUser(data)
      return data
    } catch (e) {
      setUser(null)
      localStorage.removeItem('pp_token')
      setToken(null)
      throw e
    }
  }

  const login = async (email, password) => {
    setError('')
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/login-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const msg = await extractErrorMessage(res)
        setError(msg)
        throw new Error(msg)
      }
      const data = await res.json()
      localStorage.setItem('pp_token', data.access_token)
      setToken(data.access_token)
      await fetchMe(data.access_token)
    } catch (e) {
      console.error('Login error:', e)
      // Preserve specific error message if available
      setError(e?.message || 'Login failed. Please try again.')
      throw e
    }
  }

  const register = async (name, email, password) => {
    setError('')
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      if (!res.ok) {
        const msg = await extractErrorMessage(res)
        setError(msg)
        throw new Error(msg)
      }
      await login(email, password)
    } catch (e) {
      console.error('Registration error:', e)
      // Preserve specific error message if available
      setError(e?.message || 'Registration failed. Please check your details and try again.')
      throw e
    }
  }

  const logout = () => {
    localStorage.removeItem('pp_token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ user, token, loading, error, login, register, logout, API_BASE, apiStatus }), [user, token, loading, error, apiStatus])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
