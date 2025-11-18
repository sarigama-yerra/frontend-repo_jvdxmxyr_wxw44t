import { useAuth } from './AuthProvider'

export default function Header(){
  const { user, logout } = useAuth()
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <img src="/flame-icon.svg" alt="Logo" className="w-10 h-10"/>
        <h1 className="text-2xl font-bold text-white tracking-tight">PixelPicks</h1>
      </div>
      <div>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-blue-200/90 text-sm">Hi, {user.name.split(' ')[0]}</span>
            <button onClick={logout} className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-1.5 rounded">Sign out</button>
          </div>
        ) : (
          <a href="#auth" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded">Sign in</a>
        )}
      </div>
    </header>
  )
}
