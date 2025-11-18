import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const AuthContext = createContext(null)

function inferApiBaseCandidates() {
  const fromEnv = import.meta.env.VITE_BACKEND_URL
  const cands = []
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) {
    cands.push(fromEnv.replace(/\/$/, ''))
  }
  const { origin, hostname, protocol } = window.location
  // Modal-style host rewrite (-3000 -> -8000)
  if (hostname.includes('-3000.')) {
    cands.push(`${protocol}//${hostname.replace('-3000.', '-8000.')}`)
  }
  // Local dev port rewrite
  if (origin.includes(':3000')) {
    cands.push(origin.replace(':3000', ':8000'))
  }
  // Fallback to same origin (useful if frontend is served by backend proxy)
  cands.push(origin)
  // Deduplicate while preserving order
  return [...new Set(cands)]
}

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
  const [apiBase, setApiBase] = useState('')
  const triedFallbackRef = useRef(false)

  // Resolve the best API base by probing candidates
  useEffect(() => {
    let cancelled = false
    const candidates = inferApiBaseCandidates()

    async function probeAndSelect() {
      for (const base of candidates) {
        try {
          const r = await fetchWithTimeout(`${base}/test`, { method: 'GET' }, 6000)
          const ok = r.ok
          let body = null
          try { body = await r.json() } catch(_) {}
          if (!cancelled && ok) {
            setApiBase(base)
            setApiStatus({ ok, body })
            console.debug('[PixelPicks] Selected API base:', base, 'status:', ok, 'body:', body)
            return
          }
        } catch (e) {
          // try next candidate
          console.warn('[PixelPicks] Probe failed for', base, e)
        }
      }
      // If none worked, still set to first for visibility
      if (!cancelled) {
        const first = candidates[0] || ''
        setApiBase(first)
        setApiStatus({ ok: false, error: 'Unreachable' })
        console.warn('[PixelPicks] No API base reachable. Tried:', candidates)
      }
    }

    probeAndSelect()

    return () => { cancelled = true }
  }, [])

  const fetchMe = async (tkn, base) => {
    const b = base || apiBase
    const res = await fetchWithTimeout(`${b}/auth/me`, {
      headers: { Authorization: `Bearer ${tkn}` },
    })
    if (!res.ok) throw new Error('Unable to fetch profile')
    const data = await res.json()
    setUser(data)
    return data
  }

  // Load token after apiBase is determined
  useEffect(() => {
    if (!apiBase) return
    const stored = localStorage.getItem('pp_token')
    if (stored) {
      setToken(stored)
      fetchMe(stored, apiBase).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [apiBase])

  const networkErrorMessage = (base) => `Cannot reach the server at ${base}. Please check Status below and try again.`

  // Attempt auth request; on network error, try a fallback base once
  const withFallback = async (fn) => {
    try {
      return await fn(apiBase)
    } catch (e) {
      const isNetwork = e?.name === 'AbortError' || /Failed to fetch|NetworkError|TypeError/i.test(String(e))
      if (!isNetwork) throw e
      if (triedFallbackRef.current) throw new Error(networkErrorMessage(apiBase))

      // Try alternate candidate
      const candidates = inferApiBaseCandidates().filter((b) => b !== apiBase)
      for (const cand of candidates) {
        try {
          // quick probe
          await fetchWithTimeout(`${cand}/test`, { method: 'GET' }, 4000)
          triedFallbackRef.current = true
          setApiBase(cand)
          return await fn(cand)
        } catch(_) { /* try next */ }
      }
      throw new Error(networkErrorMessage(apiBase))
    }
  }

  const login = async (email, password) => {
    setError('')
    return withFallback(async (base) => {
      try {
        const res = await fetchWithTimeout(`${base}/auth/login-json`, {
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
        await fetchMe(data.access_token, base)
      } catch (e) {
        if (!e.message) e.message = networkErrorMessage(base)
        console.error('Login error:', e)
        setError(e.message)
        throw e
      }
    })
  }

  const register = async (name, email, password) => {
    setError('')
    return withFallback(async (base) => {
      try {
        const res = await fetchWithTimeout(`${base}/auth/register`, {
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
        if (!e.message) e.message = networkErrorMessage(base)
        console.error('Registration error:', e)
        setError(e.message)
        throw e
      }
    })
  }

  const logout = () => {
    localStorage.removeItem('pp_token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ user, token, loading, error, login, register, logout, API_BASE: apiBase, apiStatus }), [user, token, loading, error, apiStatus, apiBase])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
