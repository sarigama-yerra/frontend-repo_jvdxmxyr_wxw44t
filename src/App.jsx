import { AuthProvider } from './components/AuthProvider'
import Header from './components/Header'
import AuthForms from './components/AuthForms'

function HomeContent(){
  return (
    <div className="relative min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <Header />

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Design picks that stand out
            </h2>
            <p className="text-blue-200/80 text-lg mb-6">
              A refreshed, professional look with secure account access. Sign up to save favorites, manage your picks, and access exclusive content.
            </p>
            <ul className="space-y-2 text-blue-200/80">
              <li>• Modern polished layout</li>
              <li>• Secure login and sign up</li>
              <li>• Connected to a real database</li>
            </ul>
          </div>

          <div id="auth">
            <AuthForms />
          </div>
        </div>

        <footer className="mt-16 text-center">
          <p className="text-sm text-blue-300/60">Your brand, elevated. Built with care.</p>
        </footer>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>
        <HomeContent />
      </div>
    </AuthProvider>
  )
}

export default App
