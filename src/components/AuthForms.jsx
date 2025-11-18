import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function AuthForms() {
  const { user, loading, error, login, register, logout, apiStatus, API_BASE } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
      setName(''); setEmail(''); setPassword('')
    } catch (_) {}
    setBusy(false)
  }

  if (loading) return <div className="text-center text-white">Loading...</div>

  if (user) {
    return (
      <div className="bg-slate-800/60 border border-blue-500/20 rounded-xl p-6 text-white space-y-4">
        <div>
          <p className="text-sm text-blue-200/80">Signed in as</p>
          <p className="text-xl font-semibold">{user.name}</p>
          <p className="text-blue-200/80 text-sm">{user.email}</p>
        </div>
        <button onClick={logout} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded transition">Sign out</button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/60 border border-blue-500/20 rounded-xl p-6 text-white">
      <div className="flex gap-2 mb-4">
        <button className={`flex-1 py-2 rounded ${mode==='login'?'bg-blue-600':'bg-slate-700 hover:bg-slate-600'}`} onClick={() => setMode('login')}>Log in</button>
        <button className={`flex-1 py-2 rounded ${mode==='register'?'bg-blue-600':'bg-slate-700 hover:bg-slate-600'}`} onClick={() => setMode('register')}>Sign up</button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode==='register' && (
          <div>
            <label className="block text-sm text-blue-200/80 mb-1">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} required className="w-full bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" />
          </div>
        )}
        <div>
          <label className="block text-sm text-blue-200/80 mb-1">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm text-blue-200/80 mb-1">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2 rounded transition">{busy? 'Please wait...' : (mode==='login' ? 'Log in' : 'Create account')}</button>
      </form>

      {/* Diagnostics (non-intrusive) */}
      <div className="mt-4 text-xs text-blue-200/60 space-y-1">
        <p>Server: <span className="text-blue-300">{API_BASE}</span></p>
        {apiStatus && (
          apiStatus.ok
            ? <p>Status: <span className="text-green-400">OK</span>{apiStatus.body?.database ? ` • DB: ${apiStatus.body.database}` : ''}</p>
            : <p>Status: <span className="text-red-400">Unavailable</span>{apiStatus.error ? ` • ${apiStatus.error}` : ''}</p>
        )}
      </div>
    </div>
  )
}
