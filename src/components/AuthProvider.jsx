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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
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
        const msg = (await res.json().catch(() => ({}))).detail || 'Login failed'
        setError(msg)
        throw new Error(msg)
      }
      const data = await res.json()
      localStorage.setItem('pp_token', data.access_token)
      setToken(data.access_token)
      await fetchMe(data.access_token)
    } catch (e) {
      console.error('Login error:', e)
      if (!error) setError('Login failed. Please try again.')
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
        const msg = (await res.json().catch(() => ({}))).detail || 'Registration failed'
        setError(msg)
        throw new Error(msg)
      }
      await login(email, password)
    } catch (e) {
      console.error('Registration error:', e)
      if (!error) setError('Registration failed. Please check your details and try again.')
      throw e
    }
  }

  const logout = () => {
    localStorage.removeItem('pp_token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ user, token, loading, error, login, register, logout, API_BASE }), [user, token, loading, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
