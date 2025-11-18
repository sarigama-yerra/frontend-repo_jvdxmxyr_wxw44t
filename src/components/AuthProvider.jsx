import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

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
      const res = await fetch(`${API_BASE}/auth/me`, {
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
    const res = await fetch(`${API_BASE}/auth/login-json`, {
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
  }

  const register = async (name, email, password) => {
    setError('')
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).detail || 'Registration failed'
      setError(msg)
      throw new Error(msg)
    }
    // Auto-login after register
    await login(email, password)
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
